using System.Security.Cryptography;
using System.Text;
using Synego.Server.Booking;
using Synego.Server.Endpoints;

namespace Synego.Server.Tests;

public class CalendlyTests
{
    private const string Key = "cle-de-signature-de-test";
    private const string Body = """{"event":"invitee.created"}""";

    private static string Sign(long timestamp, string key = Key) =>
        $"t={timestamp},v1={Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(key),
                                                                     Encoding.UTF8.GetBytes($"{timestamp}.{Body}"))).ToLowerInvariant()}";

    [Fact]
    public void Webhook_signe_correctement_est_accepte()
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        Assert.True(CalendlyWebhook.IsSignatureValid(Sign(now.ToUnixTimeSeconds()), Body, Key, now));
    }

    [Fact]
    public void Webhook_avec_une_autre_cle_est_refuse()
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        Assert.False(CalendlyWebhook.IsSignatureValid(Sign(now.ToUnixTimeSeconds(), "autre"), Body, Key, now));
    }

    [Fact]
    public void Webhook_trop_ancien_est_refuse()
    {
        DateTimeOffset now = DateTimeOffset.UtcNow;
        Assert.False(CalendlyWebhook.IsSignatureValid(Sign(now.AddMinutes(-10).ToUnixTimeSeconds()), Body, Key, now));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("v1=abc")]
    [InlineData("t=123,v1=pas-de-l-hexa")]
    public void En_tete_invalide_est_refuse(string? header) =>
        Assert.False(CalendlyWebhook.IsSignatureValid(header, Body, Key, DateTimeOffset.UtcNow));

    [Theory]
    [InlineData("https://api.calendly.com/scheduled_events/ABC/invitees/DEF", true)]
    [InlineData("http://api.calendly.com/scheduled_events/ABC/invitees/DEF", false)]
    [InlineData("https://evil.example/scheduled_events/ABC/invitees/DEF", false)]
    [InlineData("https://api.calendly.com/users/me", false)]
    [InlineData("http://169.254.169.254/latest/meta-data", false)]
    public void Seules_les_reservations_Calendly_sont_lues(string uri, bool expected) =>
        Assert.Equal(expected, CalendlyClient.IsInviteeUri(uri));

    [Fact]
    public void Le_lien_de_reservation_est_reconnu_quelle_que_soit_sa_forme()
    {
        var options = new BookingOptions
        {
            Types = [new BookingType { Key = "audit", Title = "Audit", CalendlyUrl = "https://calendly.com/coach/audit" }],
        };

        Assert.Equal("audit", options.FindBySchedulingUrl("https://Calendly.com/coach/audit/?month=2026-11")?.Key);
        Assert.Null(options.FindBySchedulingUrl("https://calendly.com/coach/autre"));
    }
}
