#!/bin/sh
# Prépare les certificats TLS avant le démarrage de nginx.
# - Certificat Let's Encrypt présent : on l'utilise.
# - Sinon (premier démarrage, ou DOMAIN=localhost) : certificat auto-signé temporaire,
#   le temps que certbot obtienne le vrai (voir docs/deploiement.md).
set -eu
CERTS=/etc/nginx/certs
mkdir -p "$CERTS"
/usr/local/bin/synego-reload-certs --no-reload
if [ ! -s "$CERTS/fullchain.pem" ]; then
    echo "[synego] Aucun certificat Let's Encrypt pour ${DOMAIN} : certificat auto-signé temporaire."
    openssl req -x509 -nodes -newkey rsa:2048 -days 30 -subj "/CN=${DOMAIN}" \
        -keyout "$CERTS/privkey.pem" -out "$CERTS/fullchain.pem" 2>/dev/null
fi
# Recharge nginx toutes les 12 h pour prendre en compte les certificats renouvelés.
( while :; do sleep 43200; /usr/local/bin/synego-reload-certs; done ) &
