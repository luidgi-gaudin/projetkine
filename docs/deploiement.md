# Déploiement sur le VPS

> **Le plus simple** : `git clone https://github.com/luidgi-gaudin/projetkine.git /opt/synego` puis
> `bash /opt/synego/deploy/vps/install.sh` fait tout (Docker, pare-feu, .env, HTTPS, déploiement automatique).
> Ensuite, chaque commit poussé sur `main` dont la CI est verte part en production en ~2 minutes.
> Les étapes ci-dessous détaillent l'installation manuelle et le durcissement (VPN, SSH par clé).

Cible : Ubuntu 24.04 (ou Debian 12). **Pourquoi Linux** (à dire au client) : c'est le standard des
serveurs web, il est léger, gratuit, et toutes nos briques (nginx, PostgreSQL, WireGuard) y tournent nativement.

## 1. Préparer le serveur

```bash
scp -r deploy/vps root@IP_DU_VPS:/root/
ssh root@IP_DU_VPS
```

```bash
DEPLOY_USER=deploy bash /root/vps/01-hardening.sh
bash /root/vps/02-wireguard.sh
bash /root/vps/wg-add-peer.sh gerante 10.8.0.2
```

La dernière commande affiche un QR code : à scanner dans l'application WireGuard (iOS, Android, macOS, Windows).
Une fois le VPN testé, réservez SSH au VPN :

```bash
ufw allow in on wg0 to any port 22 proto tcp && ufw delete allow 22/tcp
```

## 2. Nom de domaine

Chez le registrar : un enregistrement `A` de `synego.example.fr` vers l'IP du VPS.

## 3. Firebase

1. **Authentication > Sign-in method** : activer E-mail/Mot de passe, Téléphone, Google.
2. **Authentication > Settings > Authorized domains** : ajouter le domaine de production.
3. **Storage** : créer le bucket, puis publier les règles de `firebase/storage.rules` (tout refusé au navigateur).
4. **Paramètres > Comptes de service** : générer une clé, la copier sur le VPS dans `secrets/`.

Le back-office est sur le domaine (`/admin`) : toutes les méthodes de connexion y fonctionnent. Avec
`ADMIN_VPN_ONLY=true`, il passe par l'IP du VPN : se connecter alors par **e-mail + mot de passe**.

## 4. Calendly

Créer trois types d'événements : *Audit séminaire* (45 min), *Appel découverte* (20 min), *Séance de suivi* (60 min).
Mettre la séance de suivi en **événement secret** (absent de la page publique) : son lien n'est envoyé
par l'API qu'aux clients signés.

Le coach relie ensuite son compte **depuis son back-office** (menu *Calendly*) : rien à copier dans `.env`.
Sur une offre Calendly payante, le webhook de synchronisation instantanée est créé automatiquement (`App__PublicUrl` =
`https://DOMAINE`, défini par compose.yaml).

## 4 bis. Stripe (formations et liens de paiement)

Rien à copier dans `.env` : la coach relie Stripe depuis son back-office (*Paiements*), en collant sa clé
secrète. Le webhook (`https://DOMAINE/api/webhooks/stripe`) est créé automatiquement quand `App__PublicUrl`
est une adresse HTTPS publique. Pour le paiement en 3 fois, activer Klarna dans Stripe › Paramètres ›
Moyens de paiement. Alternative : `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` dans `.env`.

## 5. Lancer

```bash
git clone <dépôt> ~/synego && cd ~/synego
```

```bash
./synego.sh init
```

Dans `.env` : `DOMAIN`, `ADMIN_BIND_IP=10.8.0.1`, `Firebase__ProjectId`, `Admin__Emails`, `VITE_FIREBASE_*`,
et pour les documents dans Firebase : `Storage__Provider=Firebase`, `Storage__Bucket`, `FIREBASE_CREDENTIALS_NAME`
(nom du fichier de clé posé dans `secrets/`, lisible par le conteneur : `chmod 644`).

```bash
./synego.sh up -d --build
```

Obtenir le certificat HTTPS (le site tourne d'abord avec un certificat temporaire) :

```bash
docker compose run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot -d synego.example.fr --email vous@example.fr --agree-tos --no-eff-email
```

```bash
docker compose exec nginx synego-reload-certs
```

Le renouvellement est ensuite automatique (conteneur `certbot` + rechargement de nginx toutes les 12 h).

## 6. Surveillance et alerte

Depuis le VPN, ouvrir http://10.8.0.1:3001 (Uptime Kuma), créer le compte, puis :

1. Moniteur **HTTP (s) - Mot-clé** sur `https://DOMAINE/api/health`, mot-clé `"ok"`, toutes les 60 s.
2. Moniteur **Certificat** (expiration du certificat TLS, alerte à 14 jours).
3. Notification : e-mail (SMTP), Telegram ou Discord, puis « Tester ».

`/api/health` répond 503 dès que la base ou le stockage des documents ne répond plus.

## 7. Sauvegardes

- Automatique chaque nuit à 2 h (`BACKUP_CRON`), chiffrée, conservée 14 jours dans `./backups`.
- Manuelle : `docker compose exec backup backup.sh`
- Restauration :

```bash
docker compose stop api && docker compose exec backup restore.sh && docker compose start api
```

À faire en plus en production : copier `./backups` hors du VPS (autre serveur, stockage objet),
sinon une panne du VPS emporte aussi les sauvegardes.

## Tester la prod en local

```bash
./synego.sh up -d --build
```

Avec `DOMAIN=localhost` et `ADMIN_BIND_IP=127.0.0.1` (valeurs par défaut) : voir le tableau du README.
