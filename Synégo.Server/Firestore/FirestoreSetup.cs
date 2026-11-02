using Google.Api.Gax;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using Synego.Server.Configuration;

namespace Synego.Server.Firestore;

public sealed class FirestoreOptions
{
    public const string Section = "Firestore";

    /// <summary>ID du projet Firebase / Google Cloud.</summary>
    public string? ProjectId { get; set; }

    /// <summary>ID de la base Firestore (par défaut "(default)").</summary>
    public string DatabaseId { get; set; } = "(default)";

    /// <summary>Chemin vers le JSON du compte de service. Ignoré si l'émulateur est utilisé.</summary>
    public string? CredentialsPath { get; set; }
}

public static class FirestoreSetup
{
    /// <summary>
    ///     Enregistre <see cref="FirestoreDb" /> en singleton.
    ///     Si la variable FIRESTORE_EMULATOR_HOST est définie, l'émulateur local est utilisé
    ///     (aucun identifiant requis).
    /// </summary>
    public static IServiceCollection AddFirestore(this IServiceCollection services, IConfiguration configuration)
    {
        var options = configuration.GetSection(FirestoreOptions.Section).Get<FirestoreOptions>()
                   ?? new FirestoreOptions();
        if (string.IsNullOrWhiteSpace(options.ProjectId))
            return services; // Firestore non configuré : l'appli démarre quand même.

        services.AddSingleton(_ =>
        {
            var builder = new FirestoreDbBuilder
            {
                ProjectId = options.ProjectId,
                DatabaseId = options.DatabaseId,
                EmulatorDetection = EmulatorDetection.EmulatorOrProduction,
            };

            bool useEmulator = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FIRESTORE_EMULATOR_HOST"));
            if (!useEmulator && !string.IsNullOrWhiteSpace(options.CredentialsPath))
            {
                string path = DotEnv.ResolvePath(options.CredentialsPath);
                if (!File.Exists(path))
                    throw new FileNotFoundException($"Compte de service Firebase introuvable : {path}");
                // Charge explicitement un compte de service (refuse tout autre type de credential).
                builder.GoogleCredential = CredentialFactory
                    .FromFile<ServiceAccountCredential>(path)
                    .ToGoogleCredential();
            }
            // Sinon : Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS, gcloud, Cloud Run…)

            return builder.Build();
        });

        return services;
    }
}
