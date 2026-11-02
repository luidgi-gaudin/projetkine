# Synégo

- `Synégo.Server/` : API ASP.NET Core (.NET 10), Identity, EF Core (SQLite)
- `Synego.Client/` : React + TypeScript (Vite)

## Lancer en dev

```bash
dotnet tool restore                      # dotnet-ef
dotnet dev-certs https --trust           # une seule fois

# Terminal 1 : API sur https://localhost:7253
dotnet run --project Synégo.Server --launch-profile https

# Terminal 2 : front sur https://localhost:5173 (proxy /api vers l'API)
cd Synego.Client && npm install && npm run dev
```

## Build de production

```bash
cd Synego.Client && npm run build        # écrit dans Synégo.Server/wwwroot
dotnet publish Synégo.Server -c Release
```

En production, ASP.NET sert le front et l'API sur la même origine (pas de CORS).

## Migrations

```bash
dotnet ef migrations add <Nom> --project Synégo.Server -o Data/Migrations
```

## Sécurité en place

- Session par cookie `__Host-synego` : HttpOnly, Secure, SameSite=Strict. Aucun token n'est accessible en JS.
- CSRF : SameSite=Strict, plus l'en-tête `X-Requested-With` obligatoire sur les requêtes `/api` qui modifient des
  données.
- Mots de passe de 12 caractères minimum (complexité exigée), verrouillage du compte après 5 échecs (15 min).
- Rate limiting : 100 req/min/IP en global, 10 req/min/IP sur `/api/auth/*`.
- En-têtes : CSP stricte, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS (prod).
- Erreurs au format ProblemDetails, pas de stack trace en prod.

## Firebase / Firestore

Firestore est utilisé **côté serveur** (`Google.Cloud.Firestore`). Le navigateur passe toujours par l'API.

1. `cp .env.example .env` (déjà fait), puis renseigne `Firestore__ProjectId`.
2. Console Firebase → Paramètres du projet → Comptes de service → **Générer une clé privée**,
   puis enregistre le fichier sous `secrets/firebase-service-account.json`.
3. Injecte `FirestoreDb` dans tes endpoints :
   ```csharp
   app.MapGet("/api/patients", async (FirestoreDb db) =>
       (await db.Collection("patients").GetSnapshotAsync()).Select(d => d.ToDictionary()))
      .RequireAuthorization();
   ```
4. Test de connexion (une fois connecté) : `GET /api/firestore/ping`.

**Émulateur local** : décommente `FIRESTORE_EMULATOR_HOST=localhost:8085` dans `.env`, puis
`docker compose --profile emulator up -d firestore-emulator`. Aucune clé n'est nécessaire.

`.env` et `secrets/` sont ignorés par git ; seul `.env.example` est commité.

## Docker

Prérequis (une fois) : Docker Desktop lancé, `.env` rempli, et le certificat HTTPS de dev :

```bash
dotnet dev-certs https --trust
dotnet dev-certs https --export-path ~/.aspnet/https/synego.client.pem --format Pem --no-password
```

### Dev : stack complète avec hot reload

```bash
docker compose -f compose.dev.yaml up --build
```

| Service             | URL                    |
|---------------------|------------------------|
| Front (Vite, HMR)   | https://localhost:5173 |
| API (dotnet watch)  | http://localhost:8080  |
| Émulateur Firestore | localhost:8085         |

Le code est monté dans les conteneurs : toute modification recharge automatiquement le front ou l'API.
Pour tout supprimer (base SQLite de dev comprise) : `docker compose -f compose.dev.yaml down -v`.

### Prod : image unique (front + API)

```bash
docker compose up --build -d          # http://localhost:${SYNEGO_PORT:-8080}
```
