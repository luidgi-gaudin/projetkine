namespace Synego.Server.Data;

/// <summary>
///     Note privée du coach sur un client (observations, objectifs, points à revoir).
///     Jamais exposée au client. Bien-être uniquement : aucune donnée de santé.
/// </summary>
public sealed class ClientNote
{
    public Guid Id { get; set; }
    public Guid ClientId { get; set; }
    public UserAccount? Client { get; set; }
    public Guid AuthorId { get; set; }
    public required string AuthorName { get; set; }
    public required string Body { get; set; }

    /// <summary>Note épinglée : affichée en premier (objectif du moment, point d'attention…).</summary>
    public bool Pinned { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
