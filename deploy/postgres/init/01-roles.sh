#!/bin/bash
# =====================================================================
#  Comptes PostgreSQL aux droits limités (exécuté au PREMIER démarrage du volume).
#    synego_owner    : propriétaire du schéma, utilisé uniquement par les migrations
#    synego_app      : l'API (lecture/écriture des lignes, aucun droit sur la structure)
#    synego_backup   : sauvegardes (lecture seule)
#    synego_readonly : consultation par l'équipe via le VPN (lecture seule)
#  Le superutilisateur "postgres" n'est utilisé par aucune application.
# =====================================================================
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -v db="$POSTGRES_DB" \
    -v owner_pw="$SYNEGO_OWNER_PASSWORD" \
    -v app_pw="$SYNEGO_APP_PASSWORD" \
    -v backup_pw="$SYNEGO_BACKUP_PASSWORD" \
    -v readonly_pw="$SYNEGO_READONLY_PASSWORD" <<'SQL'
CREATE ROLE synego_owner LOGIN PASSWORD :'owner_pw';
CREATE ROLE synego_app LOGIN PASSWORD :'app_pw' CONNECTION LIMIT 40;
CREATE ROLE synego_backup LOGIN PASSWORD :'backup_pw' CONNECTION LIMIT 2;
CREATE ROLE synego_readonly LOGIN PASSWORD :'readonly_pw' CONNECTION LIMIT 5;

REVOKE ALL ON DATABASE :"db" FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO synego_owner, synego_app, synego_backup, synego_readonly;
GRANT CREATE ON DATABASE :"db" TO synego_owner;

CREATE SCHEMA synego AUTHORIZATION synego_owner;
GRANT USAGE ON SCHEMA synego TO synego_app, synego_backup, synego_readonly;

-- Droits appliqués automatiquement à chaque table créée par les migrations
ALTER DEFAULT PRIVILEGES FOR ROLE synego_owner IN SCHEMA synego
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO synego_app;
ALTER DEFAULT PRIVILEGES FOR ROLE synego_owner IN SCHEMA synego
    GRANT USAGE, SELECT ON SEQUENCES TO synego_app;
ALTER DEFAULT PRIVILEGES FOR ROLE synego_owner IN SCHEMA synego
    GRANT SELECT ON TABLES TO synego_backup, synego_readonly;
ALTER DEFAULT PRIVILEGES FOR ROLE synego_owner IN SCHEMA synego
    GRANT SELECT ON SEQUENCES TO synego_backup;
SQL
echo "[synego] Rôles PostgreSQL créés."
