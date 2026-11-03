namespace Synego.Server.Data;

public enum TicketCategory
{
    /// <summary>Demande d'un client depuis son espace.</summary>
    Support,

    /// <summary>Demande de devis depuis le site (aucun prix n'est affiché).</summary>
    Devis,

    /// <summary>Message libre depuis la page contact.</summary>
    Contact,
}

public enum TicketStatus
{
    Open,
    InProgress,
    Closed,
}

/// <summary>Espace de tickets : devis, contact et support passent tous par ici.</summary>
public sealed class Ticket
{
    public int Id { get; set; }
    public Guid? AuthorId { get; set; }
    public UserAccount? Author { get; set; }

    public required string ContactName { get; set; }
    public required string ContactEmail { get; set; }
    public string? ContactPhone { get; set; }
    public string? Company { get; set; }

    public required string Subject { get; set; }
    public TicketCategory Category { get; set; }
    public TicketStatus Status { get; set; } = TicketStatus.Open;

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }

    public List<TicketMessage> Messages { get; set; } = [];
}

public sealed class TicketMessage
{
    public Guid Id { get; set; }
    public int TicketId { get; set; }
    public Ticket? Ticket { get; set; }
    public Guid? AuthorId { get; set; }
    public required string AuthorName { get; set; }
    public bool FromStaff { get; set; }
    public required string Body { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
