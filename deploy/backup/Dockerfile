# Sauvegardes PostgreSQL : pg_dump chiffré chaque nuit, rotation automatique.
FROM postgres:17-alpine
RUN apk add --no-cache openssl
COPY --chmod=755 deploy/backup/backup.sh deploy/backup/restore.sh deploy/backup/entrypoint.sh /usr/local/bin/
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
