#!/bin/sh
# Sauvegarde du schéma "synego" avec le compte en lecture seule synego_backup.
# Fichier chiffré (AES-256) si BACKUP_PASSPHRASE est défini. Rotation : BACKUP_RETENTION_DAYS.
set -eu
DIR=/backups
STAMP=$(date +%Y-%m-%d_%H%M%S)
FILE="$DIR/synego_$STAMP.dump"
mkdir -p "$DIR"

pg_dump --format=custom --schema=synego --no-owner --file="$FILE"

if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
    openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_PASSPHRASE -in "$FILE" -out "$FILE.enc"
    rm "$FILE"
    FILE="$FILE.enc"
fi

find "$DIR" -name 'synego_*.dump*' -mtime +"${BACKUP_RETENTION_DAYS:-14}" -delete
echo "[backup] $(date -Iseconds) OK : $(basename "$FILE") ($(du -h "$FILE" | cut -f1))"
