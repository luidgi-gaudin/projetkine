using System.Globalization;
using System.Net;
using Synego.Server.Data;

namespace Synego.Server.Notifications;

public enum ReminderKind
{
    /// <summary>48 h avant : récapitulatif + bouton pour annuler ou déplacer.</summary>
    TwoDays,

    /// <summary>24 h avant : plus d'annulation possible + lien de visio.</summary>
    OneDay,
}

/// <summary>Contenu des e-mails de rappel, aux couleurs de Synégo (ivoire, bleu profond), en FR ou EN.</summary>
public static class ReminderEmails
{
    static readonly Texts Fr = new Texts("Rappel : {0}, dans deux jours", "Demain : votre rendez-vous Synégo",
                                         "Bonjour {0},", "Petit rappel : votre rendez-vous approche, dans deux jours.",
                                         "Votre rendez-vous a lieu demain. Prenez quelques minutes avant pour vous installer au calme.",
                                         "Quand", "Durée", "min", "Annuler le rendez-vous", "Choisir un autre créneau",
                                         "Un empêchement ? Vous pouvez annuler ou déplacer ce rendez-vous jusqu'à 24 heures avant son début.",
                                         "Il n'est plus possible d'annuler ce rendez-vous : les annulations se font au plus tard 24 heures à l'avance.",
                                         "Rejoindre la visio Google Meet",
                                         "Le lien s'ouvre directement dans votre navigateur, sans rien installer.", "Où",
                                         "En visio sur Google Meet",
                                         "Le lien Google Meet vous sera rappelé dans l'e-mail de la veille.",
                                         "Le lien Google Meet vous sera envoyé avant le rendez-vous.",
                                         "À très bientôt,<br>L'équipe Synégo",
                                         "Cet e-mail vous est envoyé parce que vous avez réservé un rendez-vous avec Synégo. Les prestations relèvent du bien-être et ne remplacent pas un avis médical.");

    static readonly Texts En = new Texts("Reminder: {0}, in two days", "Tomorrow: your Synégo appointment", "Hello {0},",
                                         "A quick reminder: your appointment is coming up in two days.",
                                         "Your appointment is tomorrow. Take a few minutes beforehand to settle somewhere quiet.",
                                         "When", "Length", "min", "Cancel the appointment", "Choose another time",
                                         "Something came up? You can cancel or reschedule this appointment up to 24 hours before it starts.",
                                         "This appointment can no longer be cancelled: cancellations must be made at least 24 hours in advance.",
                                         "Join the Google Meet call",
                                         "The link opens straight in your browser, nothing to install.", "Where",
                                         "Online, on Google Meet",
                                         "The Google Meet link will be included in the reminder the day before.",
                                         "The Google Meet link will be sent to you before the appointment.",
                                         "See you very soon,<br>The Synégo team",
                                         "You are receiving this email because you booked an appointment with Synégo. Our services relate to wellbeing and do not replace medical advice.");

    static readonly Dictionary<string, string> EnglishTitles = new Dictionary<string, string>
    {
        ["audit-seminaire"] = "Seminar audit",
        ["appel-decouverte"] = "Discovery call",
        ["seance-suivi"] = "Follow-up session",
    };

    public static EmailMessage Build(Appointment a, ReminderKind kind, TimeZoneInfo timeZone)
    {
        bool en = a.Locale == "en";
        var t = en ? En : Fr;
        var culture = CultureInfo.GetCultureInfo(en ? "en-GB" : "fr-FR");
        var local = TimeZoneInfo.ConvertTime(a.StartsAt, timeZone).DateTime;
        string when = local.ToString(en ? "dddd d MMMM yyyy, h:mm tt" : "dddd d MMMM yyyy 'à' HH'h'mm", culture);
        when = char.ToUpper(when[0], culture) + when[1..];
        int minutes = (int)Math.Round((a.EndsAt - a.StartsAt).TotalMinutes);
        string name = WebUtility.HtmlEncode(a.InviteeName?.Split(' ')[0] ?? "");
        string plainTitle = en && EnglishTitles.TryGetValue(a.TypeKey, out string? english) ? english : a.Title;
        string title = WebUtility.HtmlEncode(plainTitle);

        // Tout se passe en visio ; une adresse n'apparaît que pour un éventuel atelier en présentiel.
        string where = a.MeetingUrl is null && a.Location is not null ? WebUtility.HtmlEncode(a.Location) : t.Online;

        string subject = kind == ReminderKind.TwoDays ? string.Format(t.Subject48, plainTitle) : t.Subject24;
        string intro = kind == ReminderKind.TwoDays ? t.Intro48 : t.Intro24;

        string actions;
        string textActions;
        if (kind == ReminderKind.TwoDays)
        {
            actions = (a.CancelUrl is null ? "" : Button(t.Cancel, a.CancelUrl, true))
                    + (a.RescheduleUrl is null ? "" : Button(t.Reschedule, a.RescheduleUrl, false))
                    + Paragraph(t.CancelPolicy48, true)
                    + (a.MeetingUrl is not null ? Paragraph(t.LinkTomorrow, true) : "");
            textActions = $"{t.CancelPolicy48}\n{t.Cancel} : {a.CancelUrl}\n{t.Reschedule} : {a.RescheduleUrl}";
        }
        else
        {
            string access = a.MeetingUrl is not null
                ? Button(t.Join, a.MeetingUrl, true) + Paragraph(t.JoinHint, true)
                : Paragraph(t.NoLink, true);
            actions = access + Notice(t.NoCancel24);
            textActions = $"{(a.MeetingUrl is not null ? $"{t.Join} : {a.MeetingUrl}" : t.NoLink)}\n\n{t.NoCancel24}";
        }

        string html = $$"""
                        <!doctype html>
                        <html lang="{{(en ? "en" : "fr")}}"><body style="margin:0;padding:0;background:#F2E8DC;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2E8DC;padding:32px 12px;">
                          <tr><td align="center">
                            <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#F8F3EC;border-radius:24px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:#0A1D35;">
                              <tr><td style="background:#0A1D35;padding:28px 36px;">
                                <span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#F2E8DC;letter-spacing:-0.5px;">Synégo</span>
                                <span style="display:block;margin-top:4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#D9C9B4;">{{(kind == ReminderKind.TwoDays ? en ? "In two days" : "Dans deux jours" : en ? "Tomorrow" : "Demain")}}</span>
                              </td></tr>
                              <tr><td style="padding:36px;">
                                <p style="margin:0 0 8px;font-size:16px;">{{string.Format(t.Hello, name).Replace(" ,", ",")}}</p>
                                <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#4B5664;">{{intro}}</p>
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E2D6C6;border-bottom:1px solid #E2D6C6;margin-bottom:28px;">
                                  <tr><td style="padding:18px 0;">
                                    <span style="display:block;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;">{{title}}</span>
                                    <span style="display:block;margin-top:10px;font-size:15px;color:#4B5664;"><strong style="color:#0A1D35;">{{t.When}}</strong> · {{when}}</span>
                                    <span style="display:block;margin-top:4px;font-size:15px;color:#4B5664;"><strong style="color:#0A1D35;">{{t.Duration}}</strong> · {{minutes}} {{t.Minutes}}</span>
                                    <span style="display:block;margin-top:4px;font-size:15px;color:#4B5664;"><strong style="color:#0A1D35;">{{t.Where}}</strong> · {{where}}</span>
                                  </td></tr>
                                </table>
                                {{actions}}
                                <p style="margin:32px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.5;">{{t.Signature}}</p>
                              </td></tr>
                              <tr><td style="padding:20px 36px 28px;font-size:12px;line-height:1.5;color:#7A8594;border-top:1px solid #E2D6C6;">{{t.Footer}}</td></tr>
                            </table>
                          </td></tr>
                        </table>
                        </body></html>
                        """;

        string text =
            $"{string.Format(t.Hello, a.InviteeName?.Split(' ')[0] ?? "")}\n\n{intro}\n\n{plainTitle}\n{t.When} : {when}\n"
          + $"{t.Duration} : {minutes} {t.Minutes}\n{t.Where} : {(a.MeetingUrl is null && a.Location is not null ? a.Location : t.Online)}\n\n{textActions}\n\n{t.Signature.Replace("<br>", "\n")}";
        return new EmailMessage(a.InviteeEmail!, a.InviteeName, subject, html, text);
    }

    static string Button(string label, string url, bool primary) =>
        $"""<a href="{WebUtility.HtmlEncode(url)}" style="display:inline-block;margin:0 10px 12px 0;padding:14px 24px;border-radius:999px;font-size:15px;font-weight:bold;text-decoration:none;{(primary ? "background:#0A1D35;color:#F2E8DC;" : "border:1px solid #0A1D35;color:#0A1D35;")}">{label}</a>""";

    static string Paragraph(string html, bool muted) =>
        $"""<p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:{(muted ? "#6B7685" : "#0A1D35")};">{html}</p>""";

    static string Notice(string text) =>
        $"""<p style="margin:20px 0 0;padding:14px 16px;border-left:3px solid #D9C9B4;background:#F2E8DC;border-radius:4px 12px 12px 4px;font-size:14px;line-height:1.6;">{text}</p>""";

    sealed record Texts(
        string Subject48,
        string Subject24,
        string Hello,
        string Intro48,
        string Intro24,
        string When,
        string Duration,
        string Minutes,
        string Cancel,
        string Reschedule,
        string CancelPolicy48,
        string NoCancel24,
        string Join,
        string JoinHint,
        string Where,
        string Online,
        string LinkTomorrow,
        string NoLink,
        string Signature,
        string Footer);
}
