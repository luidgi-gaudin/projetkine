# Script de démonstration (Sprint Review)

Le PO raconte, un membre de l'équipe manipule. On **montre**, on ne raconte pas.

| # | Ce que le client veut                                      | Ce qu'on montre                                                                                                                | Durée |
|---|------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|-------|
| 1 | « Mes visiteurs me trouvent à une adresse simple »         | Ouvrir `https://DOMAINE` sur un téléphone en 4G (hors réseau de l'école) : cadenas, site en FR puis EN, thème sombre           | 2 min |
| 2 | « Je mets en avant mes séminaires, sans afficher de prix » | Page Séminaires : formats, journée type, « sur devis » ; envoyer une demande de devis                                          | 2 min |
| 3 | « Un prospect prend rendez-vous sans m'appeler »           | Page Rendez-vous, section prospects : réserver un audit séminaire dans Calendly                                                | 2 min |
| 4 | « Mes clients ont un espace privé »                        | Connexion Google, puis par SMS ; espace client : documents, rendez-vous                                                        | 2 min |
| 5 | « Les séances de suivi sont réservées aux clients signés » | Compte non signé : séance verrouillée. Back-office : passer en « Client signé ». Rafraîchir : le créneau s'ouvre               | 2 min |
| 6 | « Mes informations sensibles sont protégées »              | Sans VPN : Adminer (`http://10.8.0.1:8082`) et la base ne répondent pas. Activer WireGuard : Adminer s'ouvre, en lecture seule | 2 min |
| 7 | « Une erreur ne fait rien perdre »                         | Supprimer un document dans l'espace client → `restore.sh` → le document réapparaît                                             | 3 min |
| 8 | « Mes clients posent leurs questions »                     | Ticket créé à l'étape 2 : réponse depuis le back-office, réponse visible côté client, clôture                                  | 2 min |
| 9 | « Je sais quand quelque chose ne va pas »                  | `docker compose stop api` → l'alerte arrive sur le téléphone → `docker compose start api`                                      | 2 min |

## Avant la démo

- [ ] VPN installé et testé sur le téléphone de démo
- [ ] Un compte client de démo (non signé) et un compte admin
- [ ] Une sauvegarde récente : `docker compose exec backup backup.sh`
- [ ] Alerte Uptime Kuma testée
- [ ] Onglets ouverts dans l'ordre du tableau
