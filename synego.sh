#!/bin/sh
# =====================================================================
#  Lanceur Docker de Synégo
#    ./synego.sh init              crée .env (depuis .env.example) avec des mots de passe aléatoires
#    ./synego.sh up -d --build     n'importe quelle commande docker compose
#    ./synego.sh logs -f api
#    ./synego.sh down
#    ./synego.sh dev up            stack de DÉVELOPPEMENT (front Vite + API dotnet watch, voir compose.dev.yaml)
#
#  Pourquoi ce script : Docker Compose échoue (« x-docker-expose-session-sharedkey … non-printable
#  ASCII ») quand il construit plusieurs images depuis un dossier accentué (« projetkiné »).
#  Le script passe alors par un lien symbolique sans accent : rien d'autre ne change.
# =====================================================================
set -eu
ROOT="$(cd "$(dirname "$0")" && pwd)"

if [ "${1:-}" = "init" ]; then
    if [ -f "$ROOT/.env" ]; then
        echo ".env existe déjà : seuls les mots de passe vides sont complétés."
    else
        cp "$ROOT/.env.example" "$ROOT/.env"
    fi
    for key in POSTGRES_PASSWORD SYNEGO_OWNER_PASSWORD SYNEGO_APP_PASSWORD SYNEGO_BACKUP_PASSWORD \
               SYNEGO_READONLY_PASSWORD BACKUP_PASSPHRASE; do
        value="$(openssl rand -hex 24)"
        if grep -q "^$key=" "$ROOT/.env"; then
            # Remplit uniquement une valeur vide (ne touche jamais un mot de passe existant)
            sed -i.bak "s|^$key=\$|$key=$value|" "$ROOT/.env" && rm -f "$ROOT/.env.bak"
        else
            echo "$key=$value" >> "$ROOT/.env"
        fi
    done
    echo "OK : .env prêt. Complétez Firebase__ProjectId et Admin__Emails, puis : ./synego.sh up -d --build"
    exit 0
fi

# Dossier des sauvegardes créé côté machine (sinon Docker le créerait dans sa VM, via le lien)
mkdir -p "$ROOT/backups"

DIR="$ROOT"
if printf '%s' "$ROOT" | LC_ALL=C grep -q '[^ -~]'; then
    DIR="${TMPDIR:-/tmp}"
    DIR="${DIR%/}/synego-compose"
    ln -sfn "$ROOT" "$DIR"
fi
cd "$DIR"
if [ "${1:-}" = "dev" ]; then
    shift
    exec docker compose -f compose.dev.yaml "$@"
fi
exec docker compose "$@"
