#!/bin/bash
# =====================================================================
#  Déploiement continu (lancé toutes les 2 minutes par synego-deploy.timer).
#  1. Récupère la branche main du dépôt GitHub.
#  2. Ne déploie un nouveau commit que si TOUTE sa CI GitHub Actions est verte.
#  3. Sauvegarde la base, reconstruit et redémarre la stack.
#  4. Vérifie la santé du site ; en cas d'échec, revient au commit précédent.
#
#    synego-deploy.sh            déploie s'il y a du nouveau
#    synego-deploy.sh --force    redéploie le commit courant (sans attendre la CI)
#    journalctl -u synego-deploy -f    suivre les déploiements
# =====================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/synego}"
BRANCH="${DEPLOY_BRANCH:-main}"
REQUIRE_GREEN_CI="${REQUIRE_GREEN_CI:-true}"
HEALTH_URL="${HEALTH_URL:-https://localhost/api/health}"
FORCE=false
[ "${1:-}" = "--force" ] && FORCE=true

log() { echo "[synego-deploy] $(date '+%Y-%m-%d %H:%M:%S') $*"; }

# Un seul déploiement à la fois
exec 9>/run/lock/synego-deploy.lock
flock -n 9 || { log "Déploiement déjà en cours."; exit 0; }

cd "$APP_DIR"
git fetch --quiet origin "$BRANCH"
current=$(git rev-parse HEAD)
target=$(git rev-parse "origin/$BRANCH")

if [ "$current" = "$target" ] && [ "$FORCE" = false ]; then
    exit 0
fi

# ---------- Feu vert de la CI (API GitHub publique, sans jeton) ----------
ci_state() {
    local slug auth=()
    slug=$(git remote get-url origin | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##')
    # Dépôt privé : GITHUB_TOKEN (lecture seule) dans /etc/synego-deploy.env
    [ -n "${GITHUB_TOKEN:-}" ] && auth=(-H "Authorization: Bearer $GITHUB_TOKEN")
    curl -fsSL -H "Accept: application/vnd.github+json" ${auth[@]+"${auth[@]}"} \
        "https://api.github.com/repos/$slug/commits/$1/check-runs?per_page=100" |
        jq -r '
            if .total_count == 0 then "pending"
            elif any(.check_runs[]; .status != "completed") then "pending"
            elif all(.check_runs[]; .conclusion == "success" or .conclusion == "skipped" or .conclusion == "neutral") then "success"
            else "failure" end'
}

if [ "$FORCE" = false ] && [ "$REQUIRE_GREEN_CI" = true ]; then
    state=$(ci_state "$target" || echo "unknown")
    case "$state" in
        success) ;;
        pending|unknown) log "CI en cours pour ${target:0:7} : on attend le feu vert."; exit 0 ;;
        *) log "CI en échec pour ${target:0:7} : commit ignoré, la production reste sur ${current:0:7}."; exit 0 ;;
    esac
fi

healthy() {
    for _ in $(seq 1 40); do
        curl -skf --max-time 5 "$HEALTH_URL" >/dev/null && return 0
        sleep 3
    done
    return 1
}

log "Déploiement ${current:0:7} → ${target:0:7} : $(git log -1 --format=%s "$target")"

# Filet de sécurité : sauvegarde de la base avant toute migration
if docker compose ps --status running --services 2>/dev/null | grep -qx backup; then
    docker compose exec -T backup backup.sh || log "Sauvegarde pré-déploiement impossible (on continue)."
fi

git checkout --quiet --force --detach "$target"
if docker compose up -d --build --remove-orphans && healthy; then
    echo "$target" > .deployed
    docker image prune -f >/dev/null
    log "En ligne : ${target:0:7}."
else
    log "Échec du déploiement de ${target:0:7} : retour à ${current:0:7}."
    git checkout --quiet --force --detach "$current"
    docker compose up -d --build --remove-orphans || true
    healthy && log "Version précédente rétablie." || log "ATTENTION : le site ne répond pas, intervention nécessaire."
    exit 1
fi
