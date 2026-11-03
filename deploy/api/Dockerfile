# syntax=docker/dockerfile:1
# API ASP.NET seule : le front React est servi par nginx (deploy/nginx/Dockerfile).
# Hors de Synégo.Server/ : Docker Compose ne gère pas les chemins de Dockerfile accentués.
# Construit depuis la racine de la solution (context: . dans compose.yaml).

ARG BUILD_CONFIGURATION=Release

# ---------- base : runtime ASP.NET (utilisé aussi par le debug "fast mode" de Rider) ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
RUN mkdir -p /app/data && chown -R $APP_UID /app
ENV ASPNETCORE_HTTP_PORTS=8080
# Utilisateur non root fourni par l'image Microsoft
USER $APP_UID
EXPOSE 8080

# ---------- build : compilation + publication ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION
WORKDIR /src/Synégo.Server
COPY Synégo.Server/Synégo.Server.csproj ./
RUN dotnet restore
COPY Synégo.Server/ ./
RUN dotnet publish -c $BUILD_CONFIGURATION -o /app/publish --no-restore /p:UseAppHost=false

# ---------- final : image de production ----------
FROM base AS final
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Synégo.Server.dll"]
