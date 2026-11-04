# Synégo

Site vitrine et espace client sécurisé pour une activité de **bien-être et de séminaires en entreprise**
(prévention, posture, respiration : pas de soin médical, aucune donnée de santé).

| Brique          | Technologie                                                                                                                                  |
|-----------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| Front           | React 19 + TypeScript (Vite), animations `motion`, FR/EN, thème clair/sombre                                                                 |
| API             | ASP.NET Core (.NET 10), minimal APIs                                                                                                         |
| Connexion       | Firebase Authentication : e-mail + mot de passe, SMS, Google                                                                                 |
| Données         | PostgreSQL 17 (Docker), comptes aux droits limités                                                                                           |
| Documents       | Firebase Storage (bucket), accès uniquement via l'API                                                                                        |
| Rendez-vous     | Calendly (iframe), recopiés en base (API + webhook)                                                                                          |
| Serveur web     | nginx (TLS Let's Encrypt, CSP, rate limiting)                                                                                                |
| Admin           | VPN WireGuard : Adminer, Uptime Kuma, Mailpit, PostgreSQL, SSH (back-office aussi si `ADMIN_VPN_ONLY=true`)                                  |
| Sauvegardes     | `pg_dump` chiffré chaque nuit, restauration en une commande                                                                                  |
| CI/CD | GitHub Actions + déploiement automatique de `main` (pull toutes les 2 min, CI verte obligatoire) |
| Suivi de projet | Trello : tableau créé par [`scripts/trello_import.py`](scripts/trello_import.py) depuis [`docs/scrum/backlog.json`](docs/scrum/backlog.json) |

## Démarrer en local

### Tout dans Docker (le plus simple)

```bash
./synego.sh dev up
```

| Service                            | Adresse               | Rôle                                            |
|------------------------------------|-----------------------|-------------------------------------------------|
| Front (Vite, rechargement à chaud) | http://localhost:5173 | chaque modification s'affiche aussitôt          |
| API (dotnet watch)                 | http://localhost:5280 | redémarre à chaque modification C#              |
| Mailpit                            | http://localhost:8035 | tous les e-mails envoyés (rappels) arrivent ici |
| Adminer                            | http://localhost:8083 | base de données (lecture seule)                 |

### Ou API et front depuis Rider / le terminal

Prérequis : .NET 10, Node 24, Docker Desktop, un `.env` rempli (`cp .env.example .env`).

```bash
./synego.sh dev up -d db adminer mailpit
```

```bash
dotnet run --project Synégo.Server --launch-profile http
```

```bash
cd Synego.Client && npm install && npm run dev
```

- Site : https://localhost:5173 (ou `SYNEGO_DEV_HTTP=1 npm run dev` pour du HTTP simple)
- API : http://localhost:5270 (migrations appliquées au démarrage en dev, OpenAPI sur `/openapi/v1.json`)
- Adminer : http://localhost:8083 (serveur `db`, base `synego`, compte `synego_readonly` / `dev-readonly`)

Pour devenir administrateur : mettez votre e-mail dans `Admin__Emails` (`.env`), connectez-vous (avec un e-mail
vérifié : Google, par exemple), puis ouvrez `/admin`.
En dev, les documents sont stockés sur disque (`Storage__Provider=Local`) ; passez à `Firebase` pour utiliser le bucket.

## Lancer toute la stack avec Docker

```bash
./synego.sh init
```

```bash
./synego.sh up -d --build
```

`init` crée `.env` avec des mots de passe aléatoires (à faire une fois ; complétez ensuite `Firebase__ProjectId`
et `Admin__Emails`). `./synego.sh` accepte toutes les commandes `docker compose` (`logs -f api`, `ps`, `down`…).

| Service                           | Adresse locale                                       | Sur le VPS                                                        |
|-----------------------------------|------------------------------------------------------|-------------------------------------------------------------------|
| Site                              | https://localhost (certificat auto-signé à accepter) | https://DOMAINE                                                   |
| Back-office du coach              | https://localhost/admin                              | https://DOMAINE/admin (ou VPN seulement si `ADMIN_VPN_ONLY=true`) |
| Adminer (base, lecture seule)     | http://localhost:8082                                | http://10.8.0.1:8082 (VPN)                                        |
| Uptime Kuma (alertes)             | http://localhost:3001                                | http://10.8.0.1:3001 (VPN)                                        |
| Mailpit (e-mails, si pas de SMTP) | http://localhost:8025                                | http://10.8.0.1:8025 (VPN)                                        |
| PostgreSQL                        | localhost:5433                                       | 10.8.0.1:5433 (VPN)                                               |

Pourquoi un script plutôt que `docker compose` directement : Docker Compose échoue
(`x-docker-expose-session-sharedkey … non-printable ASCII`) quand il construit plusieurs images depuis
un dossier accentué (`projetkiné`). Le script passe par un lien symbolique sans accent. Dans un dossier
sans accent (`~/synego` sur le VPS), `docker compose up -d --build` fonctionne aussi tel quel.

## Rendez-vous : rappels et agenda

- **Rappel 48 h avant** (e-mail) : récapitulatif, bouton *Annuler le rendez-vous* et *Choisir un autre créneau*,
  avec la règle « annulation possible jusqu'à 24 h avant ».
- **Rappel 24 h avant** : plus de bouton d'annulation (« les annulations se font au plus tard 24 h à l'avance »)
  et bouton *Rejoindre la visio Google Meet*.
- E-mails aux couleurs de Synégo, en français ou en anglais selon la langue utilisée lors de la réservation.
- Un rendez-vous pris moins de 48 h à l'avance ne reçoit que le rappel encore pertinent ; un rendez-vous annulé
  n'en reçoit aucun ; une annulation à moins de 24 h est signalée au coach dans *Rendez-vous*.
- **Lien Google Meet** : dans Calendly, choisir « Google Meet » comme lieu de l'événement (agenda Google connecté
  à Calendly). Le lien est récupéré automatiquement avec la réservation.
- **Envoi** : SMTP à renseigner dans `.env` (`SMTP_HOST`…, par exemple Brevo, 300 e-mails/jour gratuits).
  Sans SMTP, les e-mails arrivent dans Mailpit : rien ne part vers de vraies adresses.
- **Ajouter à mon agenda** : juste après la réservation et dans l'espace client, pour Google Agenda, Outlook,
  Apple Calendar, Samsung Calendar et tout agenda compatible `.ics` (avec une alerte 1 h avant).

## Connexion par téléphone (SMS) : si elle ne marche pas

L'écran de connexion affiche désormais la cause exacte. Les plus fréquentes :

| Message                                      | À faire                                                                                    |
|----------------------------------------------|--------------------------------------------------------------------------------------------|
| « La connexion par SMS n'est pas activée »   | Firebase > Authentication > Méthodes de connexion > **Téléphone** : activer                |
| « Firebase refuse l'envoi de SMS réels »     | Le projet est sur l'offre gratuite : passer en **Blaze**, ou utiliser des numéros de test  |
| « La vérification anti-robot a été refusée » | Fréquent en local : utiliser un **numéro de test**, ou tester sur le domaine de production |
| « Ce domaine n'est pas autorisé »            | Firebase > Authentication > Paramètres > **Domaines autorisés** : ajouter le domaine       |

**Numéros de test (démo sans SMS ni frais)** : Firebase > Authentication > Méthodes de connexion > Téléphone >
*Numéros de téléphone pour les tests* (ex. `+33 6 00 00 00 01` / code `123456`), puis
`VITE_FIREBASE_PHONE_TEST_MODE=true`
dans `.env` en développement.

## Le coach : son accès et son interface

**Qui est coach ?**

1. **Le premier coach** : son e-mail dans `Admin__Emails` (`.env`, plusieurs séparés par des virgules).
   Ici : `luidgi.gaudin+coach@gmail.com`.
2. **Les suivants** : un coach les nomme dans le back-office, menu **Coachs**. Si le compte existe déjà, il
   devient coach tout de suite ; sinon l'adresse est invitée et deviendra coach à sa première connexion.
   Un coach peut aussi choisir « Coach » dans la liste des clients, ou retirer les droits d'un autre coach (jamais les
   siens : il reste toujours au moins un coach).

Dans tous les cas, **l'adresse e-mail doit être vérifiée** (sinon n'importe qui pourrait créer un compte
avec l'adresse du coach). Connexion Google : vérifiée d'office. E-mail + mot de passe : un lien de
confirmation est envoyé à l'inscription ; après l'avoir ouvert, cliquer sur **J'ai confirmé** dans l'espace.
Un alias `+coach` ne fonctionne pas avec Google : utilisez e-mail + mot de passe.

**Son interface** : une fois connecté, le coach arrive directement sur `/admin` :

| Menu        | Ce qu'il y fait                                                                                                                                                                                              |
|-------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Clients     | Voit les comptes, passe un prospect en « client signé » (ouvre les séances de suivi). La **fiche** d'un client contient ses **notes privées** (observations, objectifs, à épingler en haut) et ses documents |
| Rendez-vous | Tous les RDV Calendly, statut (effectué, absent…), rappels 48 h / 24 h envoyés, lien Meet, alertes (suivi réservé par un non-client, annulation tardive)                                                     |
| Demandes    | Devis, contacts et questions clients : répondre, clôturer                                                                                                                                                    |
| Calendly    | Relie son compte Calendly et choisit ses événements (ci-dessous)                                                                                                                                             |

**Relier son Calendly (2 minutes, sans toucher au code)** : menu *Calendly* > lien « Ouvrir Calendly »
> *Générer un nouveau jeton* > le coller > *Relier mon compte*. Le site vérifie le jeton, le stocke chiffré,
> associe automatiquement ses événements aux trois types de rendez-vous (par leur nom), et crée le webhook
> de synchronisation instantanée si son offre Calendly le permet. Il peut ensuite changer chaque association
> dans un menu déroulant, retirer un type du site, ou cliquer sur *Synchroniser maintenant*.

Par défaut, le back-office est sur le site (`/admin`), protégé par la connexion et le rôle Coach. Avec
`ADMIN_VPN_ONLY=true` dans `.env`, il n'est plus joignable que par le VPN. La base de données, Adminer,
Uptime Kuma et Mailpit restent toujours réservés au VPN.

**Rendez-vous dans l'espace client** : menu *Rendez-vous* : réserver, déplacer (le nouveau créneau remplace
l'ancien, annulé automatiquement), annuler jusqu'à 24 h avant, rejoindre la visio, ajouter à l'agenda.

## CI/CD : de `main` à la production, automatiquement

```
push / pull request ──► GitHub Actions (CI) ──► tout est vert ? ──► le serveur déploie main
```

**Intégration continue** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), à chaque push et pull request :

| Job | Contrôles |
|---|---|
| API .NET | compilation stricte (avertissements = erreurs), 28 tests xUnit, migrations à jour avec le modèle, aucun paquet NuGet vulnérable |
| Front React | lint, types TypeScript, build de production, `npm audit` (gravité haute) |
| Scripts shell | `shellcheck` sur tous les scripts de déploiement |
| Docker | construction des images, démarrage de **toute la stack**, vérification de la santé et des règles d'accès (401, 404, redirection HTTPS) |

**Déploiement continu** (pull, rien à ouvrir côté GitHub) : sur le serveur, `synego-deploy.timer` lance
[`deploy/vps/synego-deploy.sh`](deploy/vps/synego-deploy.sh) toutes les 2 minutes. S'il y a un nouveau commit
sur `main` **et que toute sa CI est verte** : sauvegarde de la base, reconstruction, redémarrage, contrôle de
santé ; en cas d'échec, retour automatique à la version précédente. Un commit dont la CI échoue n'est jamais déployé.

**Installer un serveur** (Ubuntu 22.04/24.04 ou Debian 12, une seule fois, en root) :

```bash
git clone https://github.com/luidgi-gaudin/projetkine.git /opt/synego
```

```bash
ADMIN_EMAILS=luidgi.gaudin+coach@gmail.com FIREBASE_API_KEY=<clé web Firebase> bash /opt/synego/deploy/vps/install.sh
```

> La clé web Firebase n'est écrite nulle part dans le dépôt : elle vit uniquement dans `.env`
> (`VITE_FIREBASE_API_KEY`), en local comme sur le serveur. Elle est restreinte dans Google Cloud aux
> domaines du site et aux seules API de connexion (Identity Toolkit, Token Service).

Le script installe Docker, le pare-feu, génère les mots de passe, démarre la stack, obtient le certificat HTTPS
(adresse `<ip>.sslip.io` par défaut, ou `DOMAIN=…`) et active le déploiement automatique.

| Sur le serveur | Commande |
|---|---|
| Suivre les déploiements | `journalctl -u synego-deploy -f` |
| Déployer tout de suite | `systemctl start synego-deploy` |
| Redéployer sans attendre la CI | `/opt/synego/deploy/vps/synego-deploy.sh --force` |
| Version en ligne | `cat /opt/synego/.deployed` |
| Suspendre les déploiements | `systemctl stop synego-deploy.timer` |

## Organisation du code

```
Synégo.Server/            API .NET
  Authentication/         Vérification des jetons Firebase, rôles lus en base
  Booking/                Types de RDV (configuration), client Calendly, synchronisation
  Data/                   EF Core + migrations PostgreSQL (schéma "synego")
  Documents/              Contrôles des fichiers, stockage Firebase ou local, purge
  Endpoints/              /api/me, booking, documents, tickets, contact, admin, health
  Security/               En-têtes, zone admin (VPN)
Synego.Client/            Front React
  src/i18n/               TOUS les textes (fr.ts = référence, en.ts = traduction)
  src/theme/              Thème clair / sombre
  src/components/brand/   Logo et cadrans animés
  src/pages/site|auth|espace|admin
deploy/                   nginx, PostgreSQL (rôles), sauvegardes, scripts VPS / WireGuard
docs/                     Architecture, déploiement, kit Scrum
firebase/                 Règles Firebase Storage
```

## Modifier sans développeur (ou presque)

| Demande                                           | Où                                                                         |
|---------------------------------------------------|----------------------------------------------------------------------------|
| Un texte du site                                  | `Synego.Client/src/i18n/fr.ts` (+ `en.ts`)                                 |
| Ajouter, renommer, masquer un type de rendez-vous | `Booking:Types` dans `appsettings.json` (+ titre traduit dans `i18n`)      |
| Un événement Calendly, masquer un type de RDV     | Back-office du coach > Calendly                                            |
| Une couleur                                       | `Synego.Client/src/index.css` (`:root` et `[data-theme='dark']`)           |
| Ajouter une langue                                | copier `en.ts`, l'ajouter dans `src/i18n/context.ts` et `I18nProvider.tsx` |

## Documentation

- [Architecture et règles d'accès](docs/architecture.md)
- [Déploiement sur le VPS](docs/deploiement.md)
- [Kit Scrum : Trello, Sprint Goal, DoD, cérémonies, fiches de preuve](docs/scrum/sprint.md)
- [Changements et urgences : quoi faire, quoi dire au client](docs/scrum/urgences.md)
- [Script de démo](docs/scrum/demo.md)
