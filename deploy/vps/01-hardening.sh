#!/bin/bash
# =====================================================================
#  Durcissement du VPS (Debian 12 / Ubuntu 24.04), à lancer en root UNE fois.
#  Prérequis : votre clé SSH est déjà dans ~/.ssh/authorized_keys de DEPLOY_USER,
#  sinon vous perdrez l'accès quand les mots de passe SSH seront désactivés.
#    DEPLOY_USER=deploy bash 01-hardening.sh
# =====================================================================
set -euo pipefail
DEPLOY_USER="${DEPLOY_USER:-deploy}"

apt-get update && apt-get -y upgrade
apt-get install -y ufw fail2ban unattended-upgrades docker.io docker-compose-v2 wireguard qrencode

# Mises à jour de sécurité automatiques
dpkg-reconfigure -f noninteractive unattended-upgrades

# Utilisateur d'administration (pas de connexion root)
id "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY_USER"
usermod -aG sudo,docker "$DEPLOY_USER"

# SSH : clés uniquement, pas de root
cat > /etc/ssh/sshd_config.d/10-synego.conf <<'CONF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
MaxAuthTries 3
CONF
systemctl reload ssh

# Pare-feu : seuls le web, le VPN et SSH sont ouverts.
# NB : Docker contourne UFW pour les ports publiés ; c'est pourquoi compose.yaml ne publie
# publiquement que 80/443, tout le reste est lié à l'IP du VPN (ADMIN_BIND_IP).
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH (à restreindre au VPN, voir 02-wireguard.sh)'
ufw allow 80/tcp comment 'HTTP (Let''s Encrypt + redirection)'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 51820/udp comment 'WireGuard'
ufw --force enable

systemctl enable --now fail2ban docker
echo "[synego] VPS durci. Étape suivante : bash 02-wireguard.sh"
