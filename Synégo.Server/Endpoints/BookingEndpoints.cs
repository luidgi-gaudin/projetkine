using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Synego.Server.Authentication;
using Synego.Server.Booking;
using Synego.Server.Data;

namespace Synego.Server.Endpoints;

public static class BookingEndpoints
{
    public static void MapBookingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/booking").WithTags("Rendez-vous");

        // Types de rendez-vous visibles par le visiteur. Le lien Calendly des séances de suivi
        // n'est envoyé qu'aux clients signés (lien « secret » côté Calendly).
        group.MapGet("/types", async (ClaimsPrincipal principal, CalendlySettings settings, CancellationToken ct) =>
            {
                bool signed = principal.IsInRole(nameof(UserRole.Client)) || principal.IsCoach();
                return (await settings.GetTypesAsync(ct))
                    .Where(t => t.Enabled)
                    .Select(t =>
                    {
                        bool locked = t.Audience == BookingAudience.Client && !signed;
                        return new BookingTypeDto(t.Key, t.Title, t.Summary, t.DurationMinutes, t.Audience,
                                                  locked ? null : t.CalendlyUrl, locked);
                    });
            })
            .AllowAnonymous();

        // Appelé par le navigateur juste après une réservation (événement calendly.event_scheduled).
        group.MapPost("/confirm", async (
                          ConfirmBooking request,
                          ClaimsPrincipal principal,
                          CalendlyClient calendly,
                          AppointmentSync sync,
                          CancellationToken ct) =>
                      {
                          if (!CalendlyClient.IsInviteeUri(request.InviteeUri))
                              return Results.ValidationProblem(new Dictionary<string, string[]>
                              {
                                  ["inviteeUri"] = ["Réservation Calendly invalide."],
                              });
                          if (!await calendly.IsConfiguredAsync(ct))
                              return Results.Accepted(); // pas de jeton : le webhook (ou la gérante) prendra le relais

                          var invitee = await calendly.GetInviteeAsync(request.InviteeUri!, ct);
                          var scheduledEvent = await calendly.GetEventAsync(invitee.Event, ct);
                          Guid? userId = principal.Identity?.IsAuthenticated == true ? principal.GetUserId() : null;
                          var appointment =
                              await sync.UpsertAsync(invitee, scheduledEvent, userId, ct, request.Locale);
                          return Results.Ok(AppointmentDto.From(appointment));
                      })
            .AllowAnonymous()
            .RequireRateLimiting(RateLimits.Public);

        group.MapGet("/mine", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
                         await db.Appointments
                             .Where(a => a.UserId == principal.GetUserId())
                             .OrderByDescending(a => a.StartsAt)
                             .Select(a => AppointmentDto.From(a))
                             .ToListAsync(ct))
            .RequireAuthorization();

        // Ouvre l'espace « Rendez-vous » : relit les annulations faites ailleurs, puis renvoie la liste.
        group.MapPost("/mine/refresh", async (
                          ClaimsPrincipal principal, AppDbContext db, AppointmentSync sync, CancellationToken ct) =>
                      {
                          var userId = principal.GetUserId();
                          var appointments =
                              await db.Appointments.Where(a => a.UserId == userId).ToListAsync(ct);
                          await sync.RefreshAsync(appointments, ct);
                          return appointments.OrderByDescending(a => a.StartsAt).Select(AppointmentDto.From);
                      })
            .RequireAuthorization();

        // Annulation depuis l'espace client : jusqu'à 24 h avant, comme annoncé dans les rappels.
        group.MapPost("/{id:guid}/cancel", async (
                          Guid id, CancelBooking request, ClaimsPrincipal principal, AppDbContext db,
                          AppointmentSync sync,
                          TimeProvider clock, CancellationToken ct) =>
                      {
                          var appointment = await db.Appointments
                              .FirstOrDefaultAsync(a => a.Id == id && a.UserId == principal.GetUserId(), ct);
                          if (appointment is null) return Results.NotFound();
                          if (appointment.Status != AppointmentStatus.Scheduled)
                              return Results.Problem(statusCode: 409, title: "Ce rendez-vous n'est plus prévu.");
                          if (appointment.StartsAt - clock.GetUtcNow() <= TimeSpan.FromHours(24))
                              return Results.Problem(statusCode: 409,
                                                     title:
                                                     "Moins de 24 h avant le rendez-vous : il ne peut plus être annulé.");

                          string reason = TicketEndpoints.Clip(request.Reason ?? "Annulé depuis l'espace client", 500);
                          return await sync.CancelAsync(appointment, reason, ct)
                              ? Results.NoContent()
                              : Results.Problem(statusCode: 409, title: "Annulation en ligne indisponible.",
                                                detail: appointment.CancelUrl);
                      })
            .RequireAuthorization();

        // Webhook Calendly (offre Standard ou plus) : création et annulation, signature vérifiée.
        app.MapPost("/api/webhooks/calendly", async (
                        HttpRequest http,
                        CalendlySettings settings,
                        AppointmentSync sync,
                        TimeProvider clock,
                        ILogger<CalendlyWebhook> logger,
                        CancellationToken ct) =>
                    {
                        string? signingKey = await settings.GetSigningKeyAsync(ct);
                        if (string.IsNullOrEmpty(signingKey)) return Results.NotFound();

                        using var reader = new StreamReader(http.Body, Encoding.UTF8);
                        string body = await reader.ReadToEndAsync(ct);
                        if (!CalendlyWebhook.IsSignatureValid(http.Headers["Calendly-Webhook-Signature"], body,
                                                              signingKey,
                                                              clock.GetUtcNow()))
                        {
                            logger.LogWarning("Webhook Calendly rejeté : signature invalide.");
                            return Results.Unauthorized();
                        }

                        var webhook = JsonSerializer.Deserialize<CalendlyWebhook>(body);
                        if (webhook?.Payload is not { ScheduledEvent: { } scheduledEvent } payload) return Results.Ok();

                        var invitee = new CalendlyInvitee(payload.Uri, payload.Email, payload.Name, payload.Status,
                                                          scheduledEvent.Uri, payload.CancelUrl, payload.RescheduleUrl);
                        await sync.UpsertAsync(invitee, scheduledEvent, null, ct);
                        return Results.Ok();
                    })
            .WithTags("Rendez-vous")
            .AllowAnonymous()
            .ExcludeFromDescription();
    }

    public sealed record ConfirmBooking(string? InviteeUri, string? Locale);

    public sealed record CancelBooking(string? Reason);

    public sealed record BookingTypeDto(
        string Key,
        string Title,
        string Summary,
        int DurationMinutes,
        BookingAudience Audience,
        string? CalendlyUrl,
        bool Locked);
}

public sealed record AppointmentDto(
    Guid Id,
    string TypeKey,
    string Title,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    AppointmentStatus Status,
    string? CancelUrl,
    string? RescheduleUrl,
    string? MeetingUrl,
    string? Location)
{
    public static AppointmentDto From(Appointment a) =>
        new AppointmentDto(a.Id, a.TypeKey, a.Title, a.StartsAt, a.EndsAt, a.Status, a.CancelUrl, a.RescheduleUrl,
                           a.MeetingUrl, a.Location);
}

public sealed record CalendlyWebhook(
    [property: JsonPropertyName("event")] string? Event,
    [property: JsonPropertyName("payload")]
    CalendlyWebhook.InviteePayload? Payload)
{
    /// <summary>En-tête <c>t=horodatage,v1=signature</c> : HMAC-SHA256 de « t.corps », valable 3 minutes.</summary>
    public static bool IsSignatureValid(string? header, string body, string signingKey, DateTimeOffset now)
    {
        if (string.IsNullOrEmpty(header)) return false;
        var parts = header.Split(',').Select(p => p.Split('=', 2)).Where(p => p.Length == 2)
            .ToDictionary(p => p[0].Trim(), p => p[1].Trim());
        if (!parts.TryGetValue("t", out string? t) || !parts.TryGetValue("v1", out string? v1)) return false;
        if (!long.TryParse(t, out long timestamp)
         || Math.Abs(now.ToUnixTimeSeconds() - timestamp) > 180) return false;

        byte[] expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(signingKey), Encoding.UTF8.GetBytes($"{t}.{body}"));
        try
        {
            return CryptographicOperations.FixedTimeEquals(expected, Convert.FromHexString(v1));
        }
        catch (FormatException)
        {
            return false;
        }
    }

    public sealed record InviteePayload(
        [property: JsonPropertyName("uri")] string Uri,
        [property: JsonPropertyName("email")] string? Email,
        [property: JsonPropertyName("name")] string? Name,
        [property: JsonPropertyName("status")] string? Status,
        [property: JsonPropertyName("cancel_url")]
        string? CancelUrl,
        [property: JsonPropertyName("reschedule_url")]
        string? RescheduleUrl,
        [property: JsonPropertyName("scheduled_event")]
        CalendlyEvent? ScheduledEvent);
}
