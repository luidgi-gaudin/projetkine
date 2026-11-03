# Changements et urgences

Le cahier des charges annonce **un changement de besoin** (jour 2) et **une urgence surprise**.
Ce guide prépare les deux. Pour chaque cas : *repérer, tracer dans Trello, traiter, expliquer au client*.

## Procédure commune

1. Le PO reçoit l'information, la reformule au client pour vérifier qu'il a bien compris.
2. Carte Trello avec l'étiquette `Urgence` ou `Changement` (+ `Dev`, `Réseau` ou `Mixte`), en haut du Sprint Backlog.
3. Le Scrum Master réunit les deux profils 5 minutes : qui fait quoi, et ce qu'on met de côté.
4. Correction, puis démonstration au PO.
5. Le PO explique au client en une phrase, sans jargon (exemples ci-dessous).

## Changements probables : déjà prévus dans le code

| Le client demande…                        | Où                                                                            | Temps estimé     |
|-------------------------------------------|-------------------------------------------------------------------------------|------------------|
| Un nouveau type de rendez-vous            | `Booking:Types` (appsettings) + lien Calendly + titre dans `i18n`             | 15 min           |
| De masquer un type de rendez-vous         | Back-office > Calendly : décocher « Sur le site »                             | 1 min            |
| De changer l'événement Calendly d'un type | Back-office > Calendly : menu déroulant                                       | 1 min            |
| De changer un texte, un titre, une FAQ    | `Synego.Client/src/i18n/fr.ts` et `en.ts`                                     | 5 min            |
| Une autre langue                          | copier `en.ts`, déclarer la langue dans `i18n/context.ts`                     | 1 h + traduction |
| Une nouvelle catégorie de document        | `DocumentRules.Categories`                                                    | 5 min            |
| D'autres formats de fichiers              | `DocumentRules.Allowed` (avec la signature du format)                         | 15 min           |
| Une couleur                               | variables CSS dans `index.css` (clair et sombre)                              | 10 min           |
| Afficher des prix                         | **à négocier** : c'est contraire à la demande initiale (sur devis uniquement) |                  |

> Phrase type : « C'est prévu : votre site a été construit pour que ce genre de changement se fasse sans tout refaire. »

## Urgences probables

### Le site ne répond plus

- **Repérer** : alerte Uptime Kuma (`/api/health` en erreur).
- **Traiter** : `docker compose ps` puis `docker compose logs --tail 100 api nginx db`, puis `docker compose up -d`.
- **Dire** : « Le site a été indisponible X minutes. Nous avons été prévenus automatiquement et l'avons relancé. »

### Une donnée a été effacée par erreur

- **Traiter** : `docker compose stop api && docker compose exec backup restore.sh && docker compose start api`.
- **Dire** : « Nous avons récupéré l'information grâce à la sauvegarde de cette nuit. »

### Un compte est compromis (mot de passe volé, téléphone perdu)

- Console Firebase > Authentication : **désactiver** l'utilisateur.
- Back-office : repasser le compte en Prospect.
- Téléphone de la gérante perdu : supprimer son `[Peer]` dans `/etc/wireguard/wg0.conf`, puis
  `wg syncconf wg0 <(wg-quick strip wg0)`.
- **Dire** : « Nous avons bloqué l'accès. Même avec le mot de passe, personne ne peut entrer dans l'administration sans
  le VPN. »

### Attaque ou trafic anormal

- nginx limite déjà les requêtes (réponses 429), fail2ban bloque les tentatives SSH.
- Bloquer une IP : `ufw insert 1 deny from <IP>`.
- **Dire** : « Quelqu'un a tenté d'abuser du formulaire. Les protections l'ont bloqué, aucune donnée n'a été touchée. »

### Le certificat HTTPS a expiré

- `docker compose run --rm --entrypoint certbot certbot renew` puis `docker compose exec nginx synego-reload-certs`.
- **Dire** : « Le cadenas de sécurité est rétabli. Une alerte nous préviendra désormais 14 jours avant. »

### Le disque est plein

- `df -h`, `du -sh backups`, baisser `BACKUP_RETENTION_DAYS`, puis `docker system prune`.

### Calendly ou Firebase en panne

- Le site reste en ligne. Pendant la panne : renvoyer vers la page Contact (les demandes arrivent dans les tickets).
- **Dire** : « Un service partenaire a eu une panne ; vos clients pouvaient toujours vous écrire. »
