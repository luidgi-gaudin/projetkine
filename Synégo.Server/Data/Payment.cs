namespace Synego.Server.Data;

public enum PaymentKind
{
    /// <summary>Achat d'une formation : l'accès est ouvert dès le paiement.</summary>
    Course,

    /// <summary>Séminaire, toujours sur devis : la coach envoie un lien de paiement.</summary>
    Seminar,

    /// <summary>Accompagnement, acompte ou toute autre prestation.</summary>
    Other,
}

public enum PaymentStatus
{
    Pending, Paid, Failed,
    Canceled, Refunded,
}

/// <summary>
///     Un paiement Stripe (carte ou Klarna en plusieurs fois) : achat direct d'une formation, ou lien de
///     paiement envoyé par la coach. Le lien public /paiement/{Token} reste valable jusqu'à <see cref="ExpiresAt" />.
/// </summary>
public sealed class Payment
{
    public Guid Id { get; set; }

    /// <summary>Jeton aléatoire du lien de paiement (non devinable).</summary>
    public required string Token { get; set; }

    public PaymentKind Kind { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    public Guid? CourseId { get; set; }
    public Course? Course { get; set; }
    public Guid? UserId { get; set; }
    public UserAccount? User { get; set; }

    /// <summary>Demande de devis à l'origine du paiement, le cas échéant.</summary>
    public int? TicketId { get; set; }

    public string? Email { get; set; }
    public string? CustomerName { get; set; }

    /// <summary>Libellé affiché au client et sur le reçu Stripe.</summary>
    public required string Label { get; set; }

    public long AmountCents { get; set; }
    public string Currency { get; set; } = "eur";
    public string Locale { get; set; } = "fr";

    public string? StripeSessionId { get; set; }
    public string? StripePaymentIntentId { get; set; }

    /// <summary>card, klarna…</summary>
    public string? PaymentMethod { get; set; }

    public string? ReceiptUrl { get; set; }
    public Guid? CreatedById { get; set; }
    public DateTimeOffset? TermsAcceptedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
