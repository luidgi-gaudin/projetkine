#!/bin/sh
# Planifie la sauvegarde (BACKUP_CRON, par défaut 2 h du matin) et en fait une au démarrage.
set -eu
echo "${BACKUP_CRON:-0 2 * * *} /usr/local/bin/backup.sh >> /proc/1/fd/1 2>&1" > /etc/crontabs/root
until pg_isready -q; do sleep 2; done
/usr/local/bin/backup.sh || echo "[backup] Première sauvegarde impossible (base vide ?)."
exec crond -f -l 8
