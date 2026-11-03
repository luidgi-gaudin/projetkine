#!/bin/bash
# =====================================================================
#  Installation de Synégo sur un serveur neuf (Ubuntu 22.04 / 24.04, Debian 12), en root.
#  Idempotent : peut être relancé sans risque.
#
#    git clone https://github.com/luidgi-gaudin/projetkine.git /opt/synego
#    ADMIN_EMAILS=coach@exemple.fr bash /opt/synego/deploy/vps/install.sh
#
#  Variables facultatives :
#    DOMAIN              nom de domaine (défaut : <ip>.sslip.io, HTTPS valide sans rien acheter)
#    ADMIN_EMAILS        e-mail(s) du/des coach(s)
#    LETSENCRYPT_EMAIL   e-mail pour les avis d'expiration Let's Encrypt
#    FIREBASE_PROJECT_ID projet Firebase (défaut : celui du dépôt)
# =====================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/luidgi-gaudin/projetkine.git}"
APP_DIR="${APP_DIR:-/opt/synego}"
BRANCH="${DEPLOY_BRANCH:-main}"

log() { echo -e "\n\033[1;34m[synego]\033[0m $*"; }
[ "$(id -u)" -eq 0 ] || { echo "À lancer en root (sudo -i)."; exit 1; }

# ---------- 1. Paquets : git, Docker, Compose v2 ----------
log "Installation des paquets"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -yq git curl jq ca-certificates openssl ufw
if ! docker compose version >/dev/null 2>&1; then
    apt-get install -yq docker.io docker-compose-v2 >/dev/null 2>&1 || true
fi
if ! docker compose version >/dev/null 2>&1; then
    log "Docker Compose v2 absent des dépôts : installation officielle Docker"
    curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# ---------- 2. Mémoire d'échange : les builds .NET et Vite sont gourmands ----------
if [ "$(free -m | awk '/^Mem:/{print $2}')" -lt 3000 ] && ! swapon --show | grep -q /swapfile; then
    log "Moins de 3 Go de RAM : ajout de 2 Go de swap"
    fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---------- 3. Pare-feu : web, VPN et SSH uniquement ----------
log "Pare-feu"
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 51820/udp >/dev/null
ufw --force enable >/dev/null

# ---------- 4. Code ----------
if [ -d "$APP_DIR/.git" ]; then
    log "Mise à jour du dépôt dans $APP_DIR"
    git -C "$APP_DIR" fetch --quiet origin "$BRANCH"
    git -C "$APP_DIR" checkout --quiet --force --detach "origin/$BRANCH"
else
    previous=""
    if [ -e "$APP_DIR" ] && [ -n "$(ls -A "$APP_DIR" 2>/dev/null)" ]; then
        # Dossier déjà présent mais pas un dépôt git (copie manuelle, essai précédent…) : on le met de côté, rien n'est supprimé.
        previous="$APP_DIR.avant-install-$(date +%Y%m%d-%H%M%S)"
        log "$APP_DIR existe déjà sans dépôt git : déplacé dans $previous"
        find "$APP_DIR" -mindepth 1 -maxdepth 1 | head -n 25 || true
        mv "$APP_DIR" "$previous"
    fi
    log "Clonage de $REPO_URL"
    git clone --quiet --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
    # Reprend la configuration existante : ses mots de passe correspondent aux volumes Postgres déjà créés.
    if [ -n "$previous" ] && [ -f "$previous/.env" ]; then
        log "Reprise du .env de $previous"
        cp -p "$previous/.env" "$APP_DIR/.env"
    fi
    if [ -n "$previous" ] && [ -d "$previous/secrets" ]; then
        cp -pn "$previous"/secrets/*.json "$APP_DIR/secrets/" 2>/dev/null || true
    fi
fi
cd "$APP_DIR"

# ---------- 5. Configuration (.env, mots de passe aléatoires) ----------
set_env() {
    if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else echo "$1=$2" >> .env; fi
}
PUBLIC_IP=$(curl -4 -fsS --max-time 5 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
DOMAIN="${DOMAIN:-${PUBLIC_IP//./-}.sslip.io}"
if [ ! -f .env ]; then
    log "Création de .env"
    ./synego.sh init >/dev/null
fi
set_env DOMAIN "$DOMAIN"
set_env ADMIN_BIND_IP "${ADMIN_BIND_IP:-127.0.0.1}"
set_env Firebase__ProjectId "${FIREBASE_PROJECT_ID:-$(grep -oP "projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID \|\| '\K[^']+" Synego.Client/src/auth/firebase.ts || echo synego)}"
[ -n "${ADMIN_EMAILS:-}" ] && set_env Admin__Emails "$ADMIN_EMAILS"
chmod 600 .env

# ---------- 6. Démarrage ----------
log "Construction et démarrage (quelques minutes la première fois)"
docker compose up -d --build
for _ in $(seq 1 60); do curl -skf https://localhost/api/health >/dev/null && break; sleep 3; done
curl -skf https://localhost/api/health >/dev/null || { docker compose logs --tail 80; exit 1; }
git rev-parse HEAD > .deployed

# ---------- 7. Certificat HTTPS Let's Encrypt ----------
if [ ! -s "$(docker volume inspect -f '{{.Mountpoint}}' synego_letsencrypt 2>/dev/null)/live/$DOMAIN/fullchain.pem" ]; then
    log "Certificat Let's Encrypt pour $DOMAIN"
    email_args=(--register-unsafely-without-email)
    [ -n "${LETSENCRYPT_EMAIL:-}" ] && email_args=(--email "$LETSENCRYPT_EMAIL")
    if docker compose run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
        -d "$DOMAIN" --agree-tos --non-interactive "${email_args[@]}"; then
        docker compose exec -T nginx synego-reload-certs
    else
        log "Certificat non obtenu (le domaine pointe-t-il vers ce serveur ?) : certificat temporaire conservé."
    fi
fi

# ---------- 8. Déploiement continu : pull de main toutes les 2 minutes ----------
log "Activation du déploiement automatique"
install -m 644 deploy/vps/synego-deploy.service deploy/vps/synego-deploy.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now synego-deploy.timer >/dev/null

log "Terminé."
cat <<SUMMARY

  Site              https://$DOMAIN
  Back-office       https://$DOMAIN/admin
  Version en ligne  $(git log -1 --format='%h %s')
  Déploiements      journalctl -u synego-deploy -f
  Forcer            $APP_DIR/deploy/vps/synego-deploy.sh --force

  À faire dans Firebase > Authentication > Paramètres > Domaines autorisés : ajouter $DOMAIN
SUMMARY
