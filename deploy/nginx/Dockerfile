# syntax=docker/dockerfile:1
# Serveur web : nginx sert le site React et relaie /api vers l'API .NET.
# Construit depuis la racine de la solution (context: . dans compose.yaml).

# ---------- client : build du front React ----------
FROM node:24-slim AS client
# Configuration Firebase Web : valeurs publiques, embarquées dans le JS
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
WORKDIR /src
COPY Synego.Client/package.json Synego.Client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY Synego.Client/ ./
RUN npm run build

# ---------- nginx ----------
FROM nginx:1.27-alpine
RUN apk add --no-cache openssl && rm /etc/nginx/conf.d/default.conf
# Les *.template sont rendus par envsubst au démarrage (DOMAIN, FIREBASE_AUTH_DOMAIN)
COPY deploy/nginx/templates/ /etc/nginx/templates/
COPY --chmod=755 deploy/nginx/30-synego-admin-guard.sh /docker-entrypoint.d/30-synego-admin-guard.sh
COPY --chmod=755 deploy/nginx/40-synego-certs.sh /docker-entrypoint.d/40-synego-certs.sh
COPY --chmod=755 deploy/nginx/synego-reload-certs /usr/local/bin/synego-reload-certs
COPY --from=client /src/dist /usr/share/nginx/html
