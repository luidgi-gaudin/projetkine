using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Synego.Server.Data;

namespace Synego.Server.Booking;

/// <summary>Compte Calendly connecté par la gérante (informations publiques uniquement).</summary>
public sealed record CalendlyAccount(
    string UserUri,
    string OrganizationUri,
    string Name,
    string Email,
    string? SchedulingUrl);

/// <summary>Choix faits dans le back-office pour un type de rendez-vous.</summary>
public sealed record BookingOverride(string? EventTypeUri, string? CalendlyUrl, int? DurationMinutes, bool Enabled);

/// <summary>
///     Réglages Calendly stockés en base (table app_settings). Le jeton et la clé du webhook
///     sont chiffrés avec ASP.NET Data Protection : illisibles dans la base et dans les sauvegardes.
/// </summary>
public sealed class CalendlySettings(
    AppDbContext db,
    IDataProtectionProvider dataProtection,
    IOptions<BookingOptions> options,
    TimeProvider clock)
{
    const string TokenKey = "calendly.token";
    const string AccountKey = "calendly.account";
    const string WebhookKey = "calendly.webhook";
    const string SigningKeyKey = "calendly.signing-key";
    const string OverridesKey = "booking.overrides";

    readonly IDataProtector _protector = dataProtection.CreateProtector("Synego.Calendly");

    public async Task<string?> GetTokenAsync(CancellationToken ct) =>
        Unprotect(await GetAsync(TokenKey, ct)) ?? NullIfEmpty(options.Value.Calendly.PersonalAccessToken);

    public async Task<string?> GetSigningKeyAsync(CancellationToken ct) =>
        Unprotect(await GetAsync(SigningKeyKey, ct)) ?? NullIfEmpty(options.Value.Calendly.WebhookSigningKey);

    public async Task<CalendlyAccount?> GetAccountAsync(CancellationToken ct) =>
        await GetAsync(AccountKey, ct) is { } json ? JsonSerializer.Deserialize<CalendlyAccount>(json) : null;

    public Task<string?> GetWebhookUriAsync(CancellationToken ct) => GetAsync(WebhookKey, ct);

    public async Task ConnectAsync(string token, CalendlyAccount account, CancellationToken ct)
    {
        await SetAsync(TokenKey, _protector.Protect(token), ct);
        await SetAsync(AccountKey, JsonSerializer.Serialize(account), ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task SetWebhookAsync(string? webhookUri, string? signingKey, CancellationToken ct)
    {
        await SetAsync(WebhookKey, webhookUri, ct);
        await SetAsync(SigningKeyKey, signingKey is null ? null : _protector.Protect(signingKey), ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task DisconnectAsync(CancellationToken ct)
    {
        foreach (string key in new[] { TokenKey, AccountKey, WebhookKey, SigningKeyKey })
            await SetAsync(key, null, ct);
        await db.SaveChangesAsync(ct);
    }

    public static string NewSigningKey() => Convert.ToHexString(RandomNumberGenerator.GetBytes(32));

    /// <summary>Types de rendez-vous : configuration par défaut + choix de la gérante.</summary>
    public async Task<List<BookingType>> GetTypesAsync(CancellationToken ct)
    {
        var overrides = await GetOverridesAsync(ct);
        return options.Value.Types.Select(defaults =>
        {
            var type = defaults.Clone();
            if (!overrides.TryGetValue(type.Key, out var o)) return type;
            type.EventTypeUri = o.EventTypeUri ?? type.EventTypeUri;
            type.CalendlyUrl = o.CalendlyUrl ?? type.CalendlyUrl;
            type.DurationMinutes = o.DurationMinutes ?? type.DurationMinutes;
            type.Enabled = o.Enabled;
            return type;
        }).ToList();
    }

    public async Task SaveOverridesAsync(Dictionary<string, BookingOverride> overrides, CancellationToken ct)
    {
        await SetAsync(OverridesKey, JsonSerializer.Serialize(overrides), ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task<Dictionary<string, BookingOverride>> GetOverridesAsync(CancellationToken ct) =>
        await GetAsync(OverridesKey, ct) is { } json
            ? JsonSerializer.Deserialize<Dictionary<string, BookingOverride>>(json) ?? []
            : [];

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

    /// <summary>Null si absent, ou si les clés de chiffrement ont été perdues (il suffit de reconnecter).</summary>
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
