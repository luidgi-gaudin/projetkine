#!/bin/bash
# =====================================================================
#  Serveur VPN WireGuard : réseau privé 10.8.0.0/24, le VPS est 10.8.0.1.
#  Le back-office, l'outil base de données et le monitoring ne sont publiés que sur 10.8.0.1.
#    bash 02-wireguard.sh
#    bash wg-add-peer.sh gerante 10.8.0.2
# =====================================================================
set -euo pipefail
WG_DIR=/etc/wireguard
umask 077

if [ ! -f "$WG_DIR/server.key" ]; then
    wg genkey | tee "$WG_DIR/server.key" | wg pubkey > "$WG_DIR/server.pub"
fi

cat > "$WG_DIR/wg0.conf" <<CONF
[Interface]
Address = 10.8.0.1/24
ListenPort = 51820
PrivateKey = $(cat "$WG_DIR/server.key")
CONF

systemctl enable --now wg-quick@wg0
# Docker doit démarrer après le VPN pour pouvoir publier des ports sur 10.8.0.1
mkdir -p /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/after-wireguard.conf <<'CONF'
[Unit]
After=wg-quick@wg0.service
Wants=wg-quick@wg0.service
CONF
systemctl daemon-reload

echo "[synego] WireGuard actif. Clé publique du serveur : $(cat "$WG_DIR/server.pub")"
echo "Une fois le VPN testé, réservez SSH au VPN :"
echo "  ufw allow in on wg0 to any port 22 proto tcp && ufw delete allow 22/tcp"
