# Kit Scrum : sprint de 4 jours

## Rôles

| Rôle          | Qui    | Rappel                                                                                               |
|---------------|--------|------------------------------------------------------------------------------------------------------|
| Product Owner | [nom]  | **Seul** interlocuteur du client. Parle valeur, jamais technique.                                    |
| Scrum Master  | [nom]  | Trace chaque obstacle dans Trello (carte rouge `Obstacle`), surtout quand dev et réseau s'attendent. |
| Équipe        | [noms] | Dev et réseau ensemble sur chaque story.                                                             |

## Trello : mise en place (jour 1, matin)

Le tableau complet se crée en une commande à partir de [`backlog.json`](backlog.json) :

1. https://trello.com/power-ups/admin : créer une Power-Up (nom libre), onglet **API key** :
   copier la clé, puis cliquer sur **Token** pour générer un jeton.
2. Lancer :

```bash
TRELLO_KEY=la-cle TRELLO_TOKEN=le-jeton python3 scripts/trello_import.py
```

Le script crée :

| Liste                                  | Contenu                                                                                      |
|----------------------------------------|----------------------------------------------------------------------------------------------|
| Infos sprint                           | Sprint Goal, Definition of Done (checklist), règles du tableau                               |
| Product Backlog                        | 13 stories verticales (étiquette Mixte), chacune avec sa checklist DoD et sa fiche de preuve |
| Sprint Backlog                         | 47 tâches `[S1] …` étiquetées **Dev** ou **Réseau**, reliées à leur story                    |
| En cours · À démontrer au PO · Terminé | le flux de travail                                                                           |
| Daily & Rétro                          | modèles de compte-rendu à dupliquer chaque jour                                              |

Étiquettes : `Dev` (bleu), `Réseau` (vert), `Mixte` (violet), `Obstacle` (rouge), `Urgence` (orange), `Changement`
(jaune).

3. **Partager** le tableau avec le client (bouton « Partager », rôle observateur) dès le premier jour.
4. Chaque matin : dupliquer la carte « Modèle · Compte-rendu de Daily », la remplir, la laisser dans « Daily & Rétro ».

Sans script : créer les listes à la main, puis coller plusieurs titres de cartes d'un coup dans
« Ajouter une carte » (une ligne = une carte, Trello propose de toutes les créer).

## Sprint Goal (proposition)

> À la fin du sprint, un visiteur trouve Synégo à une adresse sécurisée, découvre les séminaires,
> réserve un premier rendez-vous ou demande un devis, et un client retrouve ses documents dans un espace privé.
> La gérante administre le tout depuis un accès réservé, surveillé et sauvegardé.

## Definition of Done

Une story est « Terminée » seulement si :

- [ ] elle fonctionne depuis l'extérieur du réseau de test (adresse publique) ;
- [ ] l'accès est en HTTPS valide (cadenas, pas d'avertissement) ;
- [ ] les règles d'accès sont à jour dans [`docs/architecture.md`](../architecture.md) (qui parle à quoi) ;
- [ ] le schéma d'architecture est à jour ;
- [ ] la brique est surveillée par Uptime Kuma, avec une alerte testée ;
- [ ] les données sensibles ne sont accessibles que par le VPN ;
- [ ] une sauvegarde existe et sa restauration a été testée ;
- [ ] les textes existent en français et en anglais, en thème clair et sombre, et l'affichage mobile est vérifié ;
- [ ] `dotnet build` et `npm run build` passent sans erreur ni avertissement ;
- [ ] la fiche de preuve est remplie dans la carte Trello ;
- [ ] elle a été démontrée au PO, puis acceptée.

## Daily (15 min) : modèle de compte-rendu (carte Trello)

```
Daily du [date] · présents : …
Hier : …
Aujourd'hui : …
Obstacles : … (carte Obstacle créée ? qui la lève ?)
Dev ↔ Réseau : qui attend qui ? …
```

## Fiche de preuve (à coller dans chaque story terminée)

```
1. Ce que veut le client (une phrase simple) :
2. Comment on le prouve (le test que le PO montrera) :
3. Résultat : capture / vidéo / démo en direct (lien) :
4. Definition of Done : cases cochées + preuve associée :
```

## Rétrospective : Start / Stop / Continue

```
Start    : …
Stop     : …
Continue : …
Collaboration dev / réseau : ce qui a marché, ce qui a bloqué
Actions concrètes (qui, quoi, quand) : …
```
