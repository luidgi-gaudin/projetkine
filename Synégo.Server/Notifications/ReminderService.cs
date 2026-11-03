using Microsoft.EntityFrameworkCore;
using Synego.Server.Booking;
using Synego.Server.Data;

namespace Synego.Server.Notifications;

public sealed class ReminderOptions
{
    public const string Section = "Reminders";

    public bool Enabled { get; set; } = true;
    public int IntervalMinutes { get; set; } = 5;

    /// <summary>Fuseau horaire des heures affichées dans les e-mails.</summary>
    public string TimeZone { get; set; } = "Europe/Paris";
}

/// <summary>
///     Toutes les N minutes, envoie les rappels dus :
///     48 h avant (avec bouton d'annulation) et 24 h avant (sans annulation, avec le lien de visio).
///     Un rendez-vous pris moins de 48 h à l'avance ne reçoit que les rappels encore pertinents.
/// </summary>
public sealed class ReminderService(
    IServiceScopeFactory scopes,
    ReminderOptions options,
    TimeProvider clock,
    ILogger<ReminderService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Enabled) return;
        var timeZone = TimeZoneInfo.TryFindSystemTimeZoneById(options.TimeZone, out var tz)
            ? tz
            : TimeZoneInfo.Utc;

        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(Math.Max(1, options.IntervalMinutes)), clock);
        do
        {
            try
            {
                await SendDueAsync(timeZone, stoppingToken);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                logger.LogWarning(e, "Envoi des rappels impossible, nouvel essai au prochain passage.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    public async Task SendDueAsync(TimeZoneInfo timeZone, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var email = scope.ServiceProvider.GetRequiredService<EmailSender>();
        var calendly = scope.ServiceProvider.GetRequiredService<CalendlyClient>();
        var now = clock.GetUtcNow();

        var due = await db.Appointments
            .Where(a => a.Status == AppointmentStatus.Scheduled
                     && a.InviteeEmail != null
                     && a.StartsAt > now
                     && (a.Reminder48SentAt == null && a.StartsAt > now.AddHours(24) && a.StartsAt <= now.AddHours(48)
                      || a.Reminder24SentAt == null && a.StartsAt <= now.AddHours(24)))
            .ToListAsync(ct);

        foreach (var appointment in due)
        {
            // Sans webhook (offre Calendly gratuite), on vérifie qu'il n'a pas été annulé entre-temps.
            if (!await StillActiveAsync(calendly, appointment, ct))
            {
                appointment.Status = AppointmentStatus.Canceled;
                await db.SaveChangesAsync(ct);
                continue;
            }

            var kind = appointment.StartsAt <= now.AddHours(24) ? ReminderKind.OneDay : ReminderKind.TwoDays;
            await email.SendAsync(ReminderEmails.Build(appointment, kind, timeZone), ct);
            if (kind == ReminderKind.TwoDays) appointment.Reminder48SentAt = now;
            else appointment.Reminder24SentAt = now;
            await db.SaveChangesAsync(ct); // un par un : jamais deux fois le même rappel
            logger.LogInformation("Rappel {Kind} envoyé pour le rendez-vous {Id}.", kind, appointment.Id);
        }
    }

    static async Task<bool> StillActiveAsync(CalendlyClient calendly, Appointment appointment,
                                             CancellationToken ct)
    {
        if (!CalendlyClient.IsInviteeUri(appointment.CalendlyInviteeUri) || !await calendly.IsConfiguredAsync(ct))
            return true;
        try
        {
            return (await calendly.GetInviteeAsync(appointment.CalendlyInviteeUri, ct)).Status != "canceled";
        }
        catch (HttpRequestException)
        {
            return true; // Calendly injoignable : mieux vaut un rappel qu'aucun
        }
    }
}
