#!/bin/bash
# Ajoute un appareil au VPN et affiche sa configuration (texte + QR code pour l'app WireGuard).
#   bash wg-add-peer.sh <nom> <ip>     ex. bash wg-add-peer.sh gerante 10.8.0.2
set -euo pipefail
NAME="$1"
IP="$2"
WG_DIR=/etc/wireguard
ENDPOINT="${WG_ENDPOINT:-$(curl -4 -s https://ifconfig.me)}"
umask 077
mkdir -p "$WG_DIR/peers"

wg genkey | tee "$WG_DIR/peers/$NAME.key" | wg pubkey > "$WG_DIR/peers/$NAME.pub"
cat >> "$WG_DIR/wg0.conf" <<CONF

[Peer]
# $NAME
PublicKey = $(cat "$WG_DIR/peers/$NAME.pub")
AllowedIPs = $IP/32
CONF
wg syncconf wg0 <(wg-quick strip wg0)

# Tunnel partagé : seul le trafic vers 10.8.0.0/24 passe par le VPN.
cat > "$WG_DIR/peers/$NAME.conf" <<CONF
[Interface]
PrivateKey = $(cat "$WG_DIR/peers/$NAME.key")
Address = $IP/32

[Peer]
PublicKey = $(cat "$WG_DIR/server.pub")
Endpoint = $ENDPOINT:51820
AllowedIPs = 10.8.0.0/24
PersistentKeepalive = 25
CONF

cat "$WG_DIR/peers/$NAME.conf"
qrencode -t ansiutf8 < "$WG_DIR/peers/$NAME.conf"
