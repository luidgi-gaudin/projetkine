using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Synego.Server.Notifications;

public sealed class EmailOptions
{
    public const string Section = "Email";

    public SmtpOptions Smtp { get; set; } = new SmtpOptions();
    public string From { get; set; } = "rendez-vous@synego.fr";
    public string FromName { get; set; } = "Synégo";

    /// <summary>Adresse à laquelle les clients répondent (la gérante).</summary>
    public string? ReplyTo { get; set; }
}

public sealed class SmtpOptions
{
    /// <summary>Vide = aucun envoi (les rappels sont seulement journalisés).</summary>
    public string? Host { get; set; }

    public int Port { get; set; } = 587;
    public string? Username { get; set; }
    public string? Password { get; set; }

    /// <summary>StartTls (587), SslOnConnect (465) ou None (Mailpit en dev).</summary>
    public SecureSocketOptions Security { get; set; } = SecureSocketOptions.StartTlsWhenAvailable;
}

public sealed record EmailMessage(string To, string? ToName, string Subject, string Html, string Text);

/// <summary>Envoi SMTP (Brevo, Mailjet, Gmail, OVH… en production ; Mailpit en développement).</summary>
public sealed class EmailSender(EmailOptions options, ILogger<EmailSender> logger)
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(options.Smtp.Host);

    public async Task SendAsync(EmailMessage email, CancellationToken ct)
    {
        if (options.Smtp.Host is not { Length: > 0 } host)
        {
            logger.LogWarning("SMTP non configuré : e-mail « {Subject} » pour {To} non envoyé.", email.Subject, email.To);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(options.FromName, options.From));
        message.To.Add(new MailboxAddress(email.ToName ?? email.To, email.To));
        if (!string.IsNullOrWhiteSpace(options.ReplyTo)) message.ReplyTo.Add(MailboxAddress.Parse(options.ReplyTo));
        message.Subject = email.Subject;
        message.Body = new BodyBuilder { HtmlBody = email.Html, TextBody = email.Text }.ToMessageBody();

        using var client = new SmtpClient();
        await client.ConnectAsync(host, options.Smtp.Port, options.Smtp.Security, ct);
        if (!string.IsNullOrEmpty(options.Smtp.Username))
            await client.AuthenticateAsync(options.Smtp.Username, options.Smtp.Password ?? "", ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }
}
