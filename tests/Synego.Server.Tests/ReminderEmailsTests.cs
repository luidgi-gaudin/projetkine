using Synego.Server.Data;
using Synego.Server.Notifications;

namespace Synego.Server.Tests;

public class ReminderEmailsTests
{
    private static readonly TimeZoneInfo Paris =
        TimeZoneInfo.TryFindSystemTimeZoneById("Europe/Paris", out TimeZoneInfo? tz) ? tz : TimeZoneInfo.Utc;

    private static Appointment Appointment(string locale = "fr") => new()
    {
        TypeKey = "seance-suivi",
        Title = "Séance de suivi",
        StartsAt = new DateTimeOffset(2026, 11, 20, 9, 0, 0, TimeSpan.Zero),
        EndsAt = new DateTimeOffset(2026, 11, 20, 10, 0, 0, TimeSpan.Zero),
        InviteeName = "Camille Martin",
        InviteeEmail = "camille@example.com",
        CalendlyInviteeUri = "test",
        CancelUrl = "https://calendly.com/cancellations/abc",
        RescheduleUrl = "https://calendly.com/reschedulings/abc",
        MeetingUrl = "https://meet.google.com/abc-defg-hij",
        Locale = locale,
    };

    [Fact]
    public void Rappel_48h_propose_d_annuler_ou_deplacer()
    {
        EmailMessage email = ReminderEmails.Build(Appointment(), ReminderKind.TwoDays, Paris);

        Assert.Contains("Annuler le rendez-vous", email.Html);
        Assert.Contains("https://calendly.com/cancellations/abc", email.Html);
        Assert.Contains("https://calendly.com/reschedulings/abc", email.Html);
        Assert.Contains("24 heures avant", email.Html);
        Assert.DoesNotContain("Rejoindre la visio", email.Html);
        Assert.Equal("camille@example.com", email.To);
    }

    [Fact]
    public void Rappel_24h_donne_le_lien_Meet_et_ferme_l_annulation()
    {
        EmailMessage email = ReminderEmails.Build(Appointment(), ReminderKind.OneDay, Paris);

        Assert.Contains("Rejoindre la visio Google Meet", email.Html);
        Assert.Contains("https://meet.google.com/abc-defg-hij", email.Html);
        Assert.Contains("plus possible d'annuler", email.Html);
        Assert.DoesNotContain("https://calendly.com/cancellations/abc", email.Html);
        Assert.Contains("Google Meet", email.Text);
    }

    [Fact]
    public void Rappel_en_anglais_traduit_aussi_le_type_de_rendez_vous()
    {
        EmailMessage email = ReminderEmails.Build(Appointment("en"), ReminderKind.TwoDays, Paris);

        Assert.Contains("Follow-up session", email.Subject);
        Assert.Contains("Cancel the appointment", email.Html);
    }

    [Fact]
    public void Le_nom_du_client_est_echappe_dans_le_html()
    {
        Appointment appointment = Appointment();
        appointment.InviteeName = "<script>alert(1)</script>";

        Assert.DoesNotContain("<script>", ReminderEmails.Build(appointment, ReminderKind.OneDay, Paris).Html);
    }
}
