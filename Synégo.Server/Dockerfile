# syntax=docker/dockerfile:1

# ---------- 1. Build du front React ----------
FROM node:24-slim AS client
WORKDIR /src/Synego.Client
COPY Synego.Client/package.json Synego.Client/package-lock.json ./
RUN npm ci
COPY Synego.Client/ ./
# vite.config.ts écrit dans ../Synégo.Server/wwwroot
RUN npm run build

# ---------- 2. Build de l'API ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS server
WORKDIR /src/Synégo.Server
COPY Synégo.Server/Synégo.Server.csproj ./
RUN dotnet restore
COPY Synégo.Server/ ./
COPY --from=client /src/Synégo.Server/wwwroot ./wwwroot
RUN dotnet publish -c Release -o /app/publish --no-restore

# ---------- 3. Image finale (runtime seul, utilisateur non-root) ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
RUN mkdir -p /app/data && chown -R $APP_UID /app/data
COPY --from=server /app/publish .
USER $APP_UID
ENV ASPNETCORE_HTTP_PORTS=8080 \
    ConnectionStrings__Default="Data Source=/app/data/synego.db" \
    DataProtection__KeysPath=/app/data/keys
EXPOSE 8080
VOLUME /app/data
ENTRYPOINT ["dotnet", "Synégo.Server.dll"]
