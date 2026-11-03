using System.Net;
using Google;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Storage.V1;
using Synego.Server.Configuration;

namespace Synego.Server.Documents;

public sealed class StorageOptions
{
    public const string Section = "Storage";

    /// <summary>"Firebase" (bucket Firebase Storage) ou "Local" (disque, pratique en dev sans clé).</summary>
    public string Provider { get; set; } = "Local";

    /// <summary>Bucket Firebase Storage, ex. mon-projet.firebasestorage.app.</summary>
    public string? Bucket { get; set; }

    /// <summary>Compte de service Firebase (JSON) : seul le serveur accède au bucket.</summary>
    public string? CredentialsPath { get; set; }

    public string LocalPath { get; set; } = "./data/documents";

    public long MaxUploadBytes { get; set; } = 10 * 1024 * 1024;

    /// <summary>Un document supprimé reste récupérable (restauration de sauvegarde) pendant ce délai.</summary>
    public int PurgeAfterDays { get; set; } = 30;
}

/// <summary>Où sont rangés les fichiers. Les métadonnées, elles, sont toujours dans PostgreSQL.</summary>
public interface IDocumentStore
{
    string Name { get; }
    Task SaveAsync(string key, Stream content, string contentType, CancellationToken ct);
    Task CopyToAsync(string key, Stream destination, CancellationToken ct);
    Task DeleteAsync(string key, CancellationToken ct);
    Task<bool> IsHealthyAsync(CancellationToken ct);
}

/// <summary>
///     Firebase Storage (bucket Google Cloud). Les règles Storage doivent tout refuser au navigateur
///     (<c>allow read, write: if false;</c>) : les fichiers ne transitent que par l'API, après contrôle des droits.
/// </summary>
public sealed class FirebaseDocumentStore(StorageClient client, string bucket) : IDocumentStore
{
    const string Prefix = "client-documents/";

    public string Name => "firebase";

    public Task SaveAsync(string key, Stream content, string contentType, CancellationToken ct) =>
        client.UploadObjectAsync(bucket, Prefix + key, contentType, content, cancellationToken: ct);

    public Task CopyToAsync(string key, Stream destination, CancellationToken ct) =>
        client.DownloadObjectAsync(bucket, Prefix + key, destination, cancellationToken: ct);

    public async Task DeleteAsync(string key, CancellationToken ct)
    {
        try
        {
            await client.DeleteObjectAsync(bucket, Prefix + key, cancellationToken: ct);
        }
        catch (GoogleApiException e) when (e.HttpStatusCode == HttpStatusCode.NotFound)
        {
            // Déjà supprimé.
        }
    }

    public async Task<bool> IsHealthyAsync(CancellationToken ct)
    {
        try
        {
            await client.GetBucketAsync(bucket, cancellationToken: ct);
            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }

    public static FirebaseDocumentStore Create(StorageOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Bucket))
            throw new InvalidOperationException("Storage__Bucket manquant (bucket Firebase Storage).");

        var credential = string.IsNullOrWhiteSpace(options.CredentialsPath)
            ? GoogleCredential.GetApplicationDefault()
            : CredentialFactory.FromFile<ServiceAccountCredential>(DotEnv.ResolvePath(options.CredentialsPath))
                .ToGoogleCredential();
        return new FirebaseDocumentStore(StorageClient.Create(credential), options.Bucket);
    }
}

/// <summary>Stockage sur disque : dev local ou démo hors-ligne.</summary>
public sealed class LocalDocumentStore : IDocumentStore
{
    readonly string _root;

    public LocalDocumentStore(StorageOptions options)
    {
        _root = Path.TrimEndingDirectorySeparator(Path.GetFullPath(DotEnv.ResolvePath(options.LocalPath)));
        Directory.CreateDirectory(_root);
    }

    public string Name => "local";

    public async Task SaveAsync(string key, Stream content, string contentType, CancellationToken ct)
    {
        string path = Resolve(key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await using FileStream target = new FileStream(path, FileMode.CreateNew, FileAccess.Write);
        await content.CopyToAsync(target, ct);
    }

    public async Task CopyToAsync(string key, Stream destination, CancellationToken ct)
    {
        await using var source = File.OpenRead(Resolve(key));
        await source.CopyToAsync(destination, ct);
    }

    public Task DeleteAsync(string key, CancellationToken ct)
    {
        string path = Resolve(key);
        if (File.Exists(path)) File.Delete(path);
        return Task.CompletedTask;
    }

    public Task<bool> IsHealthyAsync(CancellationToken ct) => Task.FromResult(Directory.Exists(_root));

    string Resolve(string key)
    {
        string path = Path.GetFullPath(Path.Combine(_root, key));
        if (!path.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            throw new InvalidOperationException("Chemin de document invalide.");
        return path;
    }
}
