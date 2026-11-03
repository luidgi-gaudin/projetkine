using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Synego.Server.Data;

namespace Synego.Server.Authentication;

public static class Policies
{
    /// <summary>La gérante : back-office complet.</summary>
    public const string Admin = "Admin";

    /// <summary>Client signé (ou admin) : séances de suivi.</summary>
    public const string SignedClient = "SignedClient";
}

public static class FirebaseAuthenticationSetup
{
    /// <summary>
    ///     Le navigateur se connecte avec Firebase Auth (e-mail + mot de passe, SMS ou Google)
    ///     et envoie son ID token en <c>Authorization: Bearer</c>.
    ///     L'API vérifie la signature avec les clés publiques de Google : aucune clé de service n'est nécessaire.
    /// </summary>
    public static IServiceCollection AddFirebaseAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        string projectId = configuration["Firebase:ProjectId"] is { Length: > 0 } id
            ? id
            : throw new InvalidOperationException("Firebase__ProjectId manquant (voir .env.example).");
        string issuer = $"https://securetoken.google.com/{projectId}";

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = issuer;
                options.MapInboundClaims = false; // garde les noms de claims Firebase (sub, email…)
                options.TokenValidationParameters.ValidIssuer = issuer;
                options.TokenValidationParameters.ValidAudience = projectId;
                options.TokenValidationParameters.NameClaimType = "name";
                options.TokenValidationParameters.RoleClaimType = UserClaims.Role;
            });

        services.AddScoped<IClaimsTransformation, UserProvisioning>();
        services.AddAuthorizationBuilder()
            .AddPolicy(Policies.Admin, policy => policy.RequireRole(nameof(UserRole.Coach)))
            .AddPolicy(Policies.SignedClient, policy =>
                           policy.RequireRole(nameof(UserRole.Client), nameof(UserRole.Coach)));
        return services;
    }
}
