namespace Synego.Server.Data;

public enum AppointmentStatus
{
    Scheduled,
    Canceled,
    Done,
    NoShow,
}

/// <summary>Rendez-vous pris via Calendly, recopié en base pour l'espace client et le back-office.</summary>
public sealed class Appointment
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public UserAccount? User { get; set; }

    /// <summary>Clé du type de rendez-vous (voir <c>Booking:Types</c> dans appsettings.json).</summary>
    public required string TypeKey { get; set; }

    public required string Title { get; set; }
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Scheduled;

    public string? InviteeName { get; set; }
    public string? InviteeEmail { get; set; }

    /// <summary>Identifiant unique de la réservation côté Calendly (sert de clé d'idempotence).</summary>
    public required string CalendlyInviteeUri { get; set; }

    public string? CalendlyEventUri { get; set; }
    public string? CancelUrl { get; set; }
    public string? RescheduleUrl { get; set; }

    /// <summary>Lien de visio (Google Meet…) fourni par Calendly quand l'événement est en ligne.</summary>
    public string? MeetingUrl { get; set; }

    /// <summary>Lieu ou modalité lisible (adresse, téléphone…) quand ce n'est pas une visio.</summary>
    public string? Location { get; set; }

    /// <summary>Langue des e-mails de rappel (fr, en).</summary>
    public string Locale { get; set; } = "fr";

    public DateTimeOffset? Reminder48SentAt { get; set; }
    public DateTimeOffset? Reminder24SentAt { get; set; }

    /// <summary>Ex. séance de suivi réservée par quelqu'un qui n'est pas client signé.</summary>
    public string? ReviewReason { get; set; }

    public string? AdminNotes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
