using System.Globalization;
using System.Text;
using Microsoft.Extensions.Options;
using Synego.Server.Authentication;
using Synego.Server.Booking;
using Synego.Server.Security;

namespace Synego.Server.Endpoints;

/// <summary>
///     Connexion du Calendly de la gérante depuis le back-office : elle colle son jeton personnel,
///     choisit quel événement correspond à chaque type de rendez-vous, et synchronise.
/// </summary>
public static class CalendlyAdminEndpoints
{
    public static void MapCalendlyAdminEndpoints(this IEndpointRouteBuilder app, IConfiguration configuration)
    {
        var group = app.MapGroup("/api/admin/calendly")
            .WithTags("Back-office")
            .RequireAuthorization(Policies.Admin)
            .RequireAdminZone(configuration);

        group.MapGet("/", (CalendlySettings settings, CalendlyClient calendly, IConfiguration config,
                           CancellationToken ct) =>
                         StatusAsync(settings, calendly, config, ct));

        group.MapPost("/connect", async (
                          ConnectRequest request, CalendlySettings settings, CalendlyClient calendly,
                          IOptions<BookingOptions> options, IConfiguration config, CancellationToken ct) =>
                      {
                          string token = request.Token?.Trim() ?? "";
                          var user = token.Length < 20 ? null : await calendly.GetUserAsync(token, ct);
                          if (user is null)
                              return Results.ValidationProblem(new Dictionary<string, string[]>
                              {
                                  ["token"] = ["Calendly a refusé ce jeton. Vérifiez qu'il a été copié en entier."],
                              });

                          await RemoveWebhookAsync(settings, calendly, ct); // ancien compte éventuel
                          await settings.ConnectAsync(token, new CalendlyAccount(
                                                          user.Uri, user.Organization, user.Name, user.Email,
                                                          user.SchedulingUrl), ct);

                          // Correspondance automatique par le nom : « Audit séminaire » ↔ « Audit », etc.
                          var eventTypes = await calendly.ListEventTypesAsync(user.Uri, ct);
                          var overrides = await settings.GetOverridesAsync(ct);
                          foreach (var type in options.Value.Types.Where(t => !overrides.ContainsKey(t.Key)))
                          {
                              if (eventTypes.FirstOrDefault(e => Resembles(e.Name, type.Title)) is { } match)
                                  overrides[type.Key] =
                                      new BookingOverride(match.Uri, match.SchedulingUrl, match.Duration, true);
                          }
                          await settings.SaveOverridesAsync(overrides, ct);

                          await TryCreateWebhookAsync(settings, calendly, user, config, ct);
                          return await StatusAsync(settings, calendly, config, ct);
                      });

        group.MapDelete("/", async (CalendlySettings settings, CalendlyClient calendly, CancellationToken ct) =>
        {
            await RemoveWebhookAsync(settings, calendly, ct);
            await settings.DisconnectAsync(ct);
            return Results.NoContent();
        });

        group.MapPut("/types", async (
                         TypesRequest request, CalendlySettings settings, CalendlyClient calendly,
                         IConfiguration config, CancellationToken ct) =>
                     {
                         if (await settings.GetAccountAsync(ct) is not { } account) return Results.Conflict();
                         var eventTypes = await calendly.ListEventTypesAsync(account.UserUri, ct);

                         var overrides = new Dictionary<string, BookingOverride>();
                         foreach (var choice in request.Items)
                         {
                             var match = eventTypes.FirstOrDefault(e => e.Uri == choice.EventTypeUri);
                             overrides[choice.Key] = match is null
                                 ? new BookingOverride(null, null, null, choice.Enabled)
                                 : new BookingOverride(match.Uri, match.SchedulingUrl, match.Duration, choice.Enabled);
                         }
                         await settings.SaveOverridesAsync(overrides, ct);
                         return await StatusAsync(settings, calendly, config, ct);
                     });

        // Recopie tous les rendez-vous (y compris ceux pris hors du site) des 30 derniers jours et à venir.
        group.MapPost("/sync", async (
                          CalendlySettings settings, CalendlyClient calendly, AppointmentSync sync, TimeProvider clock,
                          CancellationToken ct) =>
                      {
                          if (await settings.GetAccountAsync(ct) is not { } account) return Results.Conflict();
                          int count = 0;
                          foreach (var scheduled in await calendly.ListScheduledEventsAsync(
                                       account.UserUri, clock.GetUtcNow().AddDays(-30), ct))
                          {
                              foreach (var invitee in await calendly.ListInviteesAsync(scheduled.Uri, ct))
                              {
                                  await sync.UpsertAsync(invitee, scheduled, null, ct);
                                  count++;
                              }
                          }
                          return Results.Ok(new { synced = count });
                      });
    }

    static async Task<IResult> StatusAsync(
        CalendlySettings settings, CalendlyClient calendly, IConfiguration config, CancellationToken ct)
    {
        var account = await settings.GetAccountAsync(ct);
        bool connected = account is not null && await settings.GetTokenAsync(ct) is not null;
        List<CalendlyEventType> eventTypes = [];
        string? error = null;
        if (connected)
        {
            try
            {
                eventTypes = await calendly.ListEventTypesAsync(account!.UserUri, ct);
            }
            catch (HttpRequestException)
            {
                error = "Calendly ne répond pas, ou le jeton a été révoqué : reconnectez votre compte.";
            }
        }

        var types = await settings.GetTypesAsync(ct);
        return Results.Ok(new CalendlyStatusDto(
                              connected,
                              connected ? account : null,
                              await settings.GetWebhookUriAsync(ct) is not null,
                              !IsPublicHttps(config["App:PublicUrl"]),
                              error,
                              eventTypes.Select(e => new EventTypeDto(e.Uri, e.Name, e.Duration, e.Secret,
                                                                      e.SchedulingUrl, e.UsesGoogleMeet)).ToList(),
                              types.Select(t => new TypeMappingDto(t.Key, t.Title, t.Audience, t.DurationMinutes,
                                                                   t.Enabled,
                                                                   t.EventTypeUri, t.CalendlyUrl)).ToList()));
    }

    /// <summary>Webhook = synchronisation instantanée. Refusé sur l'offre gratuite : on s'en passe.</summary>
    static async Task TryCreateWebhookAsync(
        CalendlySettings settings, CalendlyClient calendly, CalendlyUser user, IConfiguration config,
        CancellationToken ct)
    {
        string? publicUrl = config["App:PublicUrl"];
        if (!IsPublicHttps(publicUrl)) return;

        string signingKey = CalendlySettings.NewSigningKey();
        try
        {
            string? uri = await calendly.CreateWebhookAsync($"{publicUrl!.TrimEnd('/')}/api/webhooks/calendly", user,
                                                            signingKey, ct);
            await settings.SetWebhookAsync(uri, uri is null ? null : signingKey, ct);
        }
        catch (HttpRequestException)
        {
            await settings.SetWebhookAsync(null, null, ct);
        }
    }

    static async Task RemoveWebhookAsync(CalendlySettings settings, CalendlyClient calendly, CancellationToken ct)
    {
        if (await settings.GetWebhookUriAsync(ct) is not { } webhook) return;
        try
        {
            await calendly.DeleteWebhookAsync(webhook, ct);
        }
        catch (Exception e) when (e is HttpRequestException or InvalidOperationException)
        {
            // Jeton déjà révoqué : le webhook sera nettoyé côté Calendly.
        }
        await settings.SetWebhookAsync(null, null, ct);
    }

    static bool IsPublicHttps(string? url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri)
     && uri.Scheme == Uri.UriSchemeHttps
     && !uri.IsLoopback
     && uri.Host != "localhost";

    /// <summary>Un mot significatif du titre (plus de 3 lettres) apparaît dans le nom de l'événement.</summary>
    static bool Resembles(string eventName, string title)
    {
        string name = Simplify(eventName);
        return Simplify(title).Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Any(word => word.Length > 3 && name.Contains(word, StringComparison.Ordinal));
    }

    static string Simplify(string text) =>
        new string(text.Normalize(NormalizationForm.FormD)
                       .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                       .ToArray())
            .ToLowerInvariant();

    public sealed record ConnectRequest(string? Token);

    public sealed record TypeChoice(string Key, string? EventTypeUri, bool Enabled);

    public sealed record TypesRequest(List<TypeChoice> Items);

    public sealed record EventTypeDto(
        string Uri,
        string Name,
        int Duration,
        bool Secret,
        string SchedulingUrl,
        bool UsesGoogleMeet);

    public sealed record TypeMappingDto(
        string Key,
        string Title,
        BookingAudience Audience,
        int DurationMinutes,
        bool Enabled,
        string? EventTypeUri,
        string CalendlyUrl);

    public sealed record CalendlyStatusDto(
        bool Connected,
        CalendlyAccount? Account,
        bool WebhookActive,
        bool PublicUrlIsLocal,
        string? Error,
        List<EventTypeDto> EventTypes,
        List<TypeMappingDto> Types);
}
