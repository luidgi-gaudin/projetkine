namespace Synego.Server.Booking;

public enum BookingAudience
{
    /// <summary>Section « Vous découvrez Synégo » : ouverte à tous.</summary>
    Prospect,

    /// <summary>Section « Vous êtes déjà client » : clients signés uniquement.</summary>
    Client,
}

/// <summary>
///     Types de rendez-vous, entièrement pilotés par la configuration (section <c>Booking</c>).
///     Ajouter, renommer ou masquer un type = modifier appsettings.json / .env, sans toucher au code.
/// </summary>
public sealed class BookingOptions
{
    public const string Section = "Booking";

    public CalendlyOptions Calendly { get; set; } = new CalendlyOptions();
    public List<BookingType> Types { get; set; } = [];

    public BookingType? FindBySchedulingUrl(string? schedulingUrl) =>
        schedulingUrl is null
            ? null
            : Types.FirstOrDefault(t => Normalize(t.CalendlyUrl) == Normalize(schedulingUrl));

    public BookingType? FindByEventType(string? eventTypeUri) =>
        eventTypeUri is null ? null : Types.FirstOrDefault(t => t.EventTypeUri == eventTypeUri);

    public BookingType? FindByTitle(string? title) =>
        Types.FirstOrDefault(t => string.Equals(t.Title, title, StringComparison.OrdinalIgnoreCase));

    static string Normalize(string url) => url.Split('?')[0].TrimEnd('/').ToLowerInvariant();
}

public sealed class CalendlyOptions
{
    /// <summary>Calendly > Integrations > API & Webhooks > Personal access token.</summary>
    public string? PersonalAccessToken { get; set; }

    /// <summary>Clé de signature fournie à la création du webhook (offre Calendly Standard ou plus).</summary>
    public string? WebhookSigningKey { get; set; }
}

public sealed class BookingType
{
    public required string Key { get; set; }
    public required string Title { get; set; }
    public string Summary { get; set; } = "";
    public int DurationMinutes { get; set; }
    public BookingAudience Audience { get; set; }
    public required string CalendlyUrl { get; set; }

    /// <summary>Type d'événement Calendly choisi par la gérante dans le back-office.</summary>
    public string? EventTypeUri { get; set; }

    public bool Enabled { get; set; } = true;
    public BookingType Clone() => (BookingType)MemberwiseClone();
}
