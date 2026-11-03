using System.Net;
using System.Net.Http.Headers;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;

namespace Synego.Server.Booking;

/// <summary>
///     API Calendly v2. Le jeton est celui que la gérante a connecté dans le back-office
///     (repli : configuration). Fonctionne avec l'offre gratuite ; seuls les webhooks demandent une offre payante.
/// </summary>
public sealed class CalendlyClient(HttpClient http, CalendlySettings settings, IMemoryCache cache)
{
    public const string ApiBase = "https://api.calendly.com/";

    public async Task<bool> IsConfiguredAsync(CancellationToken ct) => await settings.GetTokenAsync(ct) is not null;

    /// <summary>N'accepte que des URI d'API Calendly (évite que l'API serve de proxy vers n'importe où).</summary>
    public static bool IsInviteeUri(string? uri) =>
        Uri.TryCreate(uri, UriKind.Absolute, out var parsed)
     && parsed.Scheme == Uri.UriSchemeHttps
     && parsed.Host == "api.calendly.com"
     && parsed.AbsolutePath.StartsWith("/scheduled_events/", StringComparison.Ordinal)
     && parsed.AbsolutePath.Contains("/invitees/", StringComparison.Ordinal);

    /// <summary>Vérifie un jeton et renvoie le compte associé (null si le jeton est refusé).</summary>
    public async Task<CalendlyUser?> GetUserAsync(string token, CancellationToken ct)
    {
        try
        {
            return (await GetAsync<Envelope<CalendlyUser>>($"{ApiBase}users/me", ct, token)).Resource;
        }
        catch (HttpRequestException e) when (e.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
        {
            return null;
        }
    }

    public async Task<List<CalendlyEventType>> ListEventTypesAsync(string userUri, CancellationToken ct) =>
        (await GetAsync<Collection<CalendlyEventType>>(
            $"{ApiBase}event_types?user={Uri.EscapeDataString(userUri)}&active=true&count=100&sort=name:asc", ct))
        .Items;

    public async Task<List<CalendlyEvent>> ListScheduledEventsAsync(string userUri, DateTimeOffset from,
                                                                    CancellationToken ct) =>
        (await GetAsync<Collection<CalendlyEvent>>(
            $"{ApiBase}scheduled_events?user={Uri.EscapeDataString(userUri)}&count=100&sort=start_time:asc"
          + $"&min_start_time={Uri.EscapeDataString(from.UtcDateTime.ToString("O"))}", ct))
        .Items;

    public async Task<List<CalendlyInvitee>> ListInviteesAsync(string eventUri, CancellationToken ct) =>
        (await GetAsync<Collection<CalendlyInvitee>>($"{eventUri}/invitees?count=100", ct)).Items;

    public async Task<CalendlyInvitee> GetInviteeAsync(string inviteeUri, CancellationToken ct) =>
        (await GetAsync<Envelope<CalendlyInvitee>>(inviteeUri, ct)).Resource;

    public async Task<CalendlyEvent> GetEventAsync(string eventUri, CancellationToken ct) =>
        (await GetAsync<Envelope<CalendlyEvent>>(eventUri, ct)).Resource;

    /// <summary>URL publique (calendly.com/...) d'un type d'événement, mise en cache.</summary>
    public async Task<string?> GetSchedulingUrlAsync(string? eventTypeUri, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(eventTypeUri) || !await IsConfiguredAsync(ct)) return null;
        return await cache.GetOrCreateAsync($"calendly:event-type:{eventTypeUri}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(6);
            return (await GetAsync<Envelope<CalendlyEventType>>(eventTypeUri, ct)).Resource.SchedulingUrl;
        });
    }

    /// <summary>Crée le webhook. Renvoie null si l'offre Calendly ne le permet pas (offre gratuite).</summary>
    public async Task<string?> CreateWebhookAsync(
        string callbackUrl, CalendlyUser user, string signingKey, CancellationToken ct)
    {
        using var request = await NewRequestAsync(HttpMethod.Post, $"{ApiBase}webhook_subscriptions", ct);
        request.Content = JsonContent.Create(new
        {
            url = callbackUrl,
            events = new[] { "invitee.created", "invitee.canceled" },
            organization = user.Organization,
            user = user.Uri,
            scope = "user",
            signing_key = signingKey,
        });
        using var response = await http.SendAsync(request, ct);
        if (response.StatusCode is HttpStatusCode.Forbidden or HttpStatusCode.PaymentRequired) return null;
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<Envelope<CalendlyWebhookSubscription>>(ct))?.Resource.Uri;
    }

    /// <summary>Annule le rendez-vous chez Calendly (l'invité reçoit l'e-mail d'annulation de Calendly).</summary>
    public async Task CancelEventAsync(string eventUri, string reason, CancellationToken ct)
    {
        using var request = await NewRequestAsync(HttpMethod.Post, $"{eventUri}/cancellation", ct);
        request.Content = JsonContent.Create(new { reason });
        using var response = await http.SendAsync(request, ct);
        // 403 « déjà annulé » : l'état voulu est atteint.
        if (response.StatusCode != HttpStatusCode.Forbidden) response.EnsureSuccessStatusCode();
    }

    public async Task DeleteWebhookAsync(string webhookUri, CancellationToken ct)
    {
        if (!webhookUri.StartsWith(ApiBase, StringComparison.Ordinal)) return;
        using var request = await NewRequestAsync(HttpMethod.Delete, webhookUri, ct);
        using var response = await http.SendAsync(request, ct);
        // 404 : déjà supprimé côté Calendly, rien à faire.
    }

    async Task<HttpRequestMessage> NewRequestAsync(HttpMethod method, string uri, CancellationToken ct,
                                                   string? token = null)
    {
        if (!uri.StartsWith(ApiBase, StringComparison.Ordinal))
            throw new ArgumentException("URI Calendly inattendue.", nameof(uri));
        token ??= await settings.GetTokenAsync(ct)
               ?? throw new InvalidOperationException("Aucun compte Calendly connecté.");
        var request = new HttpRequestMessage(method, uri);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    async Task<T> GetAsync<T>(string uri, CancellationToken ct, string? token = null)
    {
        using var request = await NewRequestAsync(HttpMethod.Get, uri, ct, token);
        using var response = await http.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<T>(ct)
            ?? throw new InvalidOperationException("Réponse Calendly vide.");
    }

    sealed record Envelope<T>(
        [property: JsonPropertyName("resource")]
        T Resource);

    sealed record Collection<T>(
        [property: JsonPropertyName("collection")]
        List<T> Items);

    sealed record CalendlyWebhookSubscription([property: JsonPropertyName("uri")] string Uri);
}

public sealed record CalendlyUser(
    [property: JsonPropertyName("uri")] string Uri,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("email")] string Email,
    [property: JsonPropertyName("scheduling_url")]
    string? SchedulingUrl,
    [property: JsonPropertyName("current_organization")]
    string Organization);

public sealed record CalendlyEventType(
    [property: JsonPropertyName("uri")] string Uri,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("scheduling_url")]
    string SchedulingUrl,
    [property: JsonPropertyName("duration")]
    int Duration,
    [property: JsonPropertyName("secret")] bool Secret,
    [property: JsonPropertyName("locations")]
    List<CalendlyEventTypeLocation>? Locations = null)
{
    public bool UsesGoogleMeet => Locations?.Any(l => l.Kind == "google_conference") == true;
}

public sealed record CalendlyEventTypeLocation([property: JsonPropertyName("kind")] string? Kind);

public sealed record CalendlyInvitee(
    [property: JsonPropertyName("uri")] string Uri,
    [property: JsonPropertyName("email")] string? Email,
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("status")] string? Status,
    [property: JsonPropertyName("event")] string Event,
    [property: JsonPropertyName("cancel_url")]
    string? CancelUrl,
    [property: JsonPropertyName("reschedule_url")]
    string? RescheduleUrl);

public sealed record CalendlyEvent(
    [property: JsonPropertyName("uri")] string Uri,
    [property: JsonPropertyName("name")] string? Name,
    [property: JsonPropertyName("status")] string? Status,
    [property: JsonPropertyName("start_time")]
    DateTimeOffset StartTime,
    [property: JsonPropertyName("end_time")]
    DateTimeOffset EndTime,
    [property: JsonPropertyName("event_type")]
    string? EventType,
    [property: JsonPropertyName("location")]
    CalendlyLocation? Location = null);

/// <summary>Lieu Calendly : join_url pour Google Meet / Zoom / Teams, location pour une adresse.</summary>
public sealed record CalendlyLocation(
    [property: JsonPropertyName("type")] string? Type,
    [property: JsonPropertyName("join_url")]
    string? JoinUrl,
    [property: JsonPropertyName("location")]
    string? Location);
