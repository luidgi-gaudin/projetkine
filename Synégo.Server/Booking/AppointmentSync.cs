using Microsoft.EntityFrameworkCore;
using Synego.Server.Data;

namespace Synego.Server.Booking;

/// <summary>
///     Recopie une réservation Calendly en base. Idempotent : la même réservation reçue
///     par le webhook ET par la confirmation du navigateur ne crée qu'un seul rendez-vous.
/// </summary>
public sealed class AppointmentSync(
    AppDbContext db,
    CalendlyClient calendly,
    CalendlySettings settings,
    TimeProvider clock)
{
    public async Task<Appointment> UpsertAsync(
        CalendlyInvitee invitee,
        CalendlyEvent scheduledEvent,
        Guid? userId,
        CancellationToken ct,
        string? locale = null)
    {
        var catalog = new BookingOptions { Types = await settings.GetTypesAsync(ct) };
        var type = catalog.FindByEventType(scheduledEvent.EventType)
                ?? catalog.FindBySchedulingUrl(
                       await calendly.GetSchedulingUrlAsync(scheduledEvent.EventType, ct))
                ?? catalog.FindByTitle(scheduledEvent.Name);

        var appointment = await db.Appointments
            .FirstOrDefaultAsync(a => a.CalendlyInviteeUri == invitee.Uri, ct);
        var now = clock.GetUtcNow();

        if (appointment is null)
        {
            appointment = new Appointment
            {
                CalendlyInviteeUri = invitee.Uri,
                TypeKey = type?.Key ?? "autre",
                Title = type?.Title ?? scheduledEvent.Name ?? "Rendez-vous",
                CreatedAt = now,
            };
            db.Appointments.Add(appointment);
        }

        appointment.StartsAt = scheduledEvent.StartTime;
        appointment.EndsAt = scheduledEvent.EndTime;
        appointment.CalendlyEventUri = scheduledEvent.Uri;
        appointment.InviteeName = invitee.Name;
        appointment.InviteeEmail = invitee.Email;
        appointment.CancelUrl = invitee.CancelUrl;
        appointment.RescheduleUrl = invitee.RescheduleUrl;
        appointment.MeetingUrl = scheduledEvent.Location?.JoinUrl ?? appointment.MeetingUrl;
        appointment.Location = scheduledEvent.Location?.Location ?? appointment.Location;
        if (locale is "fr" or "en") appointment.Locale = locale;
        appointment.UpdatedAt = now;

        bool canceled = invitee.Status == "canceled" || scheduledEvent.Status == "canceled";
        bool lateCancellation = canceled
                             && appointment.Status == AppointmentStatus.Scheduled
                             && appointment.StartsAt - now < TimeSpan.FromHours(24);
        if (canceled) appointment.Status = AppointmentStatus.Canceled;

        var user = userId is { } id
            ? await db.Users.FindAsync([id], ct)
            : await FindByEmailAsync(invitee.Email, ct);
        appointment.UserId ??= user?.Id;

        appointment.ReviewReason =
            lateCancellation
                ? "Annulation tardive : moins de 24 h avant le rendez-vous."
                : type?.Audience == BookingAudience.Client && user?.Role is not (UserRole.Client or UserRole.Coach)
                    ? "Séance de suivi réservée par une personne qui n'est pas cliente signée."
                    : canceled
                        ? appointment.ReviewReason
                        : null;

        await db.SaveChangesAsync(ct);
        return appointment;
    }

    /// <summary>Annule via l'API Calendly. Faux si Calendly n'est pas relié (il reste alors le lien d'annulation).</summary>
    public async Task<bool> CancelAsync(Appointment appointment, string reason, CancellationToken ct)
    {
        if (appointment.CalendlyEventUri is null || !await calendly.IsConfiguredAsync(ct)) return false;
        await calendly.CancelEventAsync(appointment.CalendlyEventUri, reason, ct);
        appointment.Status = AppointmentStatus.Canceled;
        appointment.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>Relit chez Calendly l'état des rendez-vous à venir (annulations faites depuis l'e-mail Calendly).</summary>
    public async Task RefreshAsync(IEnumerable<Appointment> appointments, CancellationToken ct)
    {
        if (!await calendly.IsConfiguredAsync(ct)) return;
        var now = clock.GetUtcNow();
        foreach (var appointment in appointments.Where(a => a.Status == AppointmentStatus.Scheduled
                                                         && a.StartsAt > now))
        {
            if (!CalendlyClient.IsInviteeUri(appointment.CalendlyInviteeUri)) continue;
            try
            {
                if ((await calendly.GetInviteeAsync(appointment.CalendlyInviteeUri, ct)).Status == "canceled")
                {
                    appointment.Status = AppointmentStatus.Canceled;
                    appointment.UpdatedAt = now;
                }
            }
            catch (HttpRequestException)
            {
                // Calendly injoignable : on garde l'état connu.
            }
        }
        await db.SaveChangesAsync(ct);
    }

    async Task<UserAccount?> FindByEmailAsync(string? email, CancellationToken ct) =>
        string.IsNullOrEmpty(email)
            ? null
            : await db.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email.ToLower(), ct);
}
