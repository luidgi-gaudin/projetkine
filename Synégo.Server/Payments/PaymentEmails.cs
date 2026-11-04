using System.Globalization;
using System.Net;
using Synego.Server.Data;
using Synego.Server.Learning;
using Synego.Server.Notifications;

namespace Synego.Server.Payments;

/// <summary>E-mail « votre lien de paiement », aux couleurs de Synégo, en français ou en anglais.</summary>
public static class PaymentEmails
{
    public static string FormatAmount(long cents, string currency, string locale) =>
        (cents / 100m).ToString("C", CultureInfo.GetCultureInfo(locale == "en" ? "en-IE" : "fr-FR"))
        .Replace("EUR", currency.ToUpperInvariant() == "EUR" ? "€" : currency.ToUpperInvariant());

    public static EmailMessage Build(Payment payment, string url)
    {
        bool en = payment.Locale == "en";
        string amount = FormatAmount(payment.AmountCents, payment.Currency, payment.Locale);
        string? first = LearningRules.FirstName(payment.CustomerName);
        string hello = first is null ? en ? "Hello," : "Bonjour," : en ? $"Hello {first}," : $"Bonjour {first},";
        string label = WebUtility.HtmlEncode(payment.Label);
        string expires = payment.ExpiresAt.ToString(en ? "d MMMM yyyy" : "d MMMM yyyy",
                                                    CultureInfo.GetCultureInfo(en ? "en-GB" : "fr-FR"));
        string subject = en ? $"Your payment link: {payment.Label}" : $"Votre lien de paiement : {payment.Label}";
        string intro = en
            ? "Here is the secure link to pay for your booking with Synégo. You can pay in full by card, or in instalments with Klarna."
            : "Voici le lien sécurisé pour régler votre prestation Synégo. Vous pouvez payer comptant par carte, ou en plusieurs fois avec Klarna.";
        string button = en ? "Pay securely" : "Payer en toute sécurité";
        string validity = en
            ? $"This link is valid until {expires}. Payment is handled by Stripe: Synégo never sees your card details."
            : $"Ce lien est valable jusqu'au {expires}. Le paiement est assuré par Stripe : Synégo ne voit jamais vos coordonnées bancaires.";
        string footer = en
            ? "You are receiving this email because Synégo prepared this payment for you. If you were not expecting it, simply ignore it."
            : "Vous recevez cet e-mail parce que Synégo a préparé ce paiement pour vous. Si vous ne l'attendiez pas, ignorez-le simplement.";

        string html = $$"""
                        <!doctype html>
                        <html lang="{{(en ? "en" : "fr")}}"><body style="margin:0;padding:0;background:#F2E8DC;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2E8DC;padding:32px 12px;">
                          <tr><td align="center">
                            <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#F8F3EC;border-radius:24px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;color:#0A1D35;">
                              <tr><td style="background:#0A1D35;padding:28px 36px;">
                                <span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#F2E8DC;">Synégo</span>
                                <span style="display:block;margin-top:4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#D9C9B4;">{{(en ? "Payment" : "Paiement")}}</span>
                              </td></tr>
                              <tr><td style="padding:36px;">
                                <p style="margin:0 0 8px;font-size:16px;">{{WebUtility.HtmlEncode(hello)}}</p>
                                <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#4B5664;">{{intro}}</p>
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E2D6C6;border-bottom:1px solid #E2D6C6;margin-bottom:28px;">
                                  <tr><td style="padding:18px 0;">
                                    <span style="display:block;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;">{{label}}</span>
                                    <span style="display:block;margin-top:10px;font-size:20px;font-weight:bold;">{{amount}}</span>
                                  </td></tr>
                                </table>
                                <a href="{{WebUtility.HtmlEncode(url)}}" style="display:inline-block;padding:14px 26px;border-radius:999px;background:#0A1D35;color:#F2E8DC;font-size:15px;font-weight:bold;text-decoration:none;">{{button}}</a>
                                <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#6B7685;">{{validity}}</p>
                                <p style="margin:32px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.5;">{{(en ? "Warm regards,<br>The Synégo team" : "À très bientôt,<br>L'équipe Synégo")}}</p>
                              </td></tr>
                              <tr><td style="padding:20px 36px 28px;font-size:12px;line-height:1.5;color:#7A8594;border-top:1px solid #E2D6C6;">{{footer}}</td></tr>
                            </table>
                          </td></tr>
                        </table>
                        </body></html>
                        """;
        string text = $"{hello}\n\n{intro}\n\n{payment.Label}\n{amount}\n\n{button} : {url}\n\n{validity}";
        return new EmailMessage(payment.Email!, payment.CustomerName, subject, html, text);
    }
}
