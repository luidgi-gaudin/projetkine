using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Synego.Server.Data;

namespace Synego.Server.Payments;

/// <summary>Valeurs par défaut lues dans la configuration (.env). Le back-office peut les remplacer.</summary>
public sealed class StripeOptions
{
    public const string Section = "Stripe";

    /// <summary>Clé secrète (sk_test_… ou sk_live_…). Vide = paiements désactivés tant que la coach n'a rien relié.</summary>
    public string? SecretKey { get; set; }

    /// <summary>Secret de signature du webhook (whsec_…), si le webhook est créé à la main.</summary>
    public string? WebhookSecret { get; set; }

    /// <summary>Durée de validité d'un lien de paiement envoyé par la coach.</summary>
    public int PaymentLinkDays { get; set; } = 30;
}

/// <summary>
///     Compte Stripe relié depuis le back-office (table app_settings). La clé secrète et le secret du webhook
///     sont chiffrés avec ASP.NET Data Protection, comme le jeton Calendly.
/// </summary>
public sealed class StripeSettings(
    AppDbContext db,
    IDataProtectionProvider dataProtection,
    StripeOptions options,
    TimeProvider clock)
{
    const string SecretKeyKey = "stripe.secret-key";
    const string WebhookIdKey = "stripe.webhook-id";
    const string WebhookSecretKey = "stripe.webhook-secret";

    readonly IDataProtector _protector = dataProtection.CreateProtector("Synego.Stripe");

    public async Task<string?> GetSecretKeyAsync(CancellationToken ct) =>
        Unprotect(await GetAsync(SecretKeyKey, ct)) ?? NullIfEmpty(options.SecretKey);

    public async Task<string?> GetWebhookSecretAsync(CancellationToken ct) =>
        Unprotect(await GetAsync(WebhookSecretKey, ct)) ?? NullIfEmpty(options.WebhookSecret);

    public Task<string?> GetWebhookIdAsync(CancellationToken ct) => GetAsync(WebhookIdKey, ct);

    /// <summary>true si la clé vient du back-office (et non du .env).</summary>
    public async Task<bool> IsConnectedFromAdminAsync(CancellationToken ct) =>
        await GetAsync(SecretKeyKey, ct) is not null;

    public async Task ConnectAsync(string secretKey, string? webhookId, string? webhookSecret, CancellationToken ct)
    {
        await SetAsync(SecretKeyKey, _protector.Protect(secretKey), ct);
        await SetAsync(WebhookIdKey, webhookId, ct);
        await SetAsync(WebhookSecretKey, webhookSecret is null ? null : _protector.Protect(webhookSecret), ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task DisconnectAsync(CancellationToken ct)
    {
        foreach (string key in new[] { SecretKeyKey, WebhookIdKey, WebhookSecretKey })
            await SetAsync(key, null, ct);
        await db.SaveChangesAsync(ct);
    }

    async Task<string?> GetAsync(string key, CancellationToken ct) =>
        (await db.Settings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == key, ct))?.Value;

    async Task SetAsync(string key, string? value, CancellationToken ct)
    {
        var setting = await db.Settings.FirstOrDefaultAsync(s => s.Key == key, ct);
        if (value is null)
        {
            if (setting is not null) db.Settings.Remove(setting);
            return;
        }
        if (setting is null) db.Settings.Add(setting = new AppSetting { Key = key, Value = value });
        setting.Value = value;
        setting.UpdatedAt = clock.GetUtcNow();
    }

    string? Unprotect(string? value)
    {
        if (value is null) return null;
        try
        {
            return _protector.Unprotect(value);
        }
        catch (CryptographicException)
        {
            return null;
        }
    }

    static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;
}
