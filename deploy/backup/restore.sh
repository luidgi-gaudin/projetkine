#!/bin/sh
# Restaure une sauvegarde (la plus récente par défaut) avec le compte propriétaire du schéma.
#   docker compose stop api
#   docker compose exec backup restore.sh [synego_2026-11-03_020000.dump.enc]
#   docker compose start api
set -eu
DIR=/backups
FILE="${1:-$(ls -1t "$DIR"/synego_*.dump* 2>/dev/null | head -n 1)}"
[ -n "$FILE" ] || { echo "Aucune sauvegarde dans $DIR"; exit 1; }
[ -f "$FILE" ] || FILE="$DIR/$FILE"
echo "[restore] Restauration de $(basename "$FILE")"

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
case "$FILE" in
    *.enc) openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in "$FILE" -out "$TMP" ;;
    *) cp "$FILE" "$TMP" ;;
esac

PGUSER=synego_owner PGPASSWORD="$SYNEGO_OWNER_PASSWORD" \
    pg_restore --clean --if-exists --no-owner --schema=synego --dbname="$PGDATABASE" "$TMP"
echo "[restore] Terminé. Les documents supprimés depuis réapparaissent (fichiers conservés 30 jours dans le bucket)."
