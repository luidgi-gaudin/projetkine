#!/bin/sh
# ADMIN_VPN_ONLY=true : le back-office (/api/admin) devient introuvable depuis Internet,
# et n'est servi que par la zone admin (port 8443, publié sur l'IP du VPN).
# Par défaut (false) : back-office accessible sur le site, protégé par la connexion et le rôle Coach.
set -eu
mkdir -p /etc/nginx/conf.d/snippets
GUARD=/etc/nginx/conf.d/snippets/admin-guard.conf
if [ "${ADMIN_VPN_ONLY:-false}" = "true" ]; then
    printf 'location /api/admin/ {\n    return 404;\n}\n' > "$GUARD"
    echo "[synego] Back-office réservé au VPN."
else
    : > "$GUARD"
fi
