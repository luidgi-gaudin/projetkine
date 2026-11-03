namespace Synego.Server.Data;

/// <summary>Document de l'espace client. Le fichier est dans le bucket, jamais sous son nom d'origine.</summary>
public sealed class ClientDocument
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public UserAccount? Owner { get; set; }

    public required string FileName { get; set; }
    public required string ContentType { get; set; }
    public long SizeBytes { get; set; }

    /// <summary>Clé de l'objet dans le stockage (ex. <c>{ownerId}/{guid}</c>).</summary>
    public required string StorageKey { get; set; }

    public required string Category { get; set; }
    public bool SharedByStaff { get; set; }
    public Guid UploadedById { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Suppression douce : purgé définitivement après <c>Storage:PurgeAfterDays</c>.</summary>
    public DateTimeOffset? DeletedAt { get; set; }
}
