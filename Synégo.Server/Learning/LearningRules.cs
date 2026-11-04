using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace Synego.Server.Learning;

/// <summary>Règles pures (sans base ni réseau) des formations et des paiements : testées unitairement.</summary>
public static partial class LearningRules
{
    /// <summary>Montant accepté pour un paiement : de 1 € à 50 000 €.</summary>
    public const long MinAmountCents = 100;

    public const long MaxAmountCents = 5_000_000;

    public static bool IsValidAmount(long cents) => cents is >= MinAmountCents and <= MaxAmountCents;

    /// <summary>« Gestion du stress au travail » → « gestion-du-stress-au-travail ».</summary>
    public static string Slugify(string text)
    {
        string normalized = text.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);
        foreach (char c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
            builder.Append(char.IsLetterOrDigit(c) ? char.ToLowerInvariant(c) : '-');
        }
        string slug = MultipleDashes().Replace(builder.ToString(), "-").Trim('-');
        if (slug.Length > 80) slug = slug[..80].TrimEnd('-');
        return slug.Length == 0 ? "formation" : slug;
    }

    public static bool IsValidSlug(string? slug) => slug is { Length: > 0 and <= 80 } && SlugPattern().IsMatch(slug);

    /// <summary>
    ///     Convertit un lien YouTube, Vimeo ou Loom en adresse de lecteur intégré. Tout autre site est refusé
    ///     (null) : la politique de sécurité du site n'autorise que ces lecteurs.
    /// </summary>
    public static string? VideoEmbedUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)
         || !Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri)
         || uri.Scheme != Uri.UriSchemeHttps)
            return null;

        string host = uri.Host.ToLowerInvariant();
        string[] segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);

        if (host is "youtu.be" && segments.Length >= 1 && YouTubeId().IsMatch(segments[0]))
            return $"https://www.youtube-nocookie.com/embed/{segments[0]}";
        if (host is "youtube.com" or "www.youtube.com" or "m.youtube.com" or "www.youtube-nocookie.com")
        {
            string? id = segments is ["watch"] ? Query(uri, "v")
                : segments is ["embed" or "shorts" or "live", var value, ..] ? value
                : null;
            return id is not null && YouTubeId().IsMatch(id) ? $"https://www.youtube-nocookie.com/embed/{id}" : null;
        }

        if (host is "vimeo.com" or "www.vimeo.com" && segments.Length >= 1 && Digits().IsMatch(segments[0]))
            return segments.Length >= 2 && VimeoHash().IsMatch(segments[1])
                ? $"https://player.vimeo.com/video/{segments[0]}?h={segments[1]}"
                : $"https://player.vimeo.com/video/{segments[0]}";
        if (host is "player.vimeo.com" && segments is ["video", var vimeoId, ..] && Digits().IsMatch(vimeoId))
            return Query(uri, "h") is { } h && VimeoHash().IsMatch(h)
                ? $"https://player.vimeo.com/video/{vimeoId}?h={h}"
                : $"https://player.vimeo.com/video/{vimeoId}";

        if (host is "loom.com" or "www.loom.com"
         && segments is ["share" or "embed", var loomId, ..]
         && LoomId().IsMatch(loomId))
            return $"https://www.loom.com/embed/{loomId}";

        return null;
    }

    /// <summary>Jeton de lien de paiement : 32 octets aléatoires, encodés pour une URL (43 caractères).</summary>
    public static string NewPaymentToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    public static bool IsValidPaymentToken(string? token) => token is { Length: 43 } && TokenPattern().IsMatch(token);

    /// <summary>Prénom seulement, pour saluer sans exposer l'identité complète sur une page publique.</summary>
    public static string? FirstName(string? fullName) =>
        string.IsNullOrWhiteSpace(fullName) ? null : fullName.Trim().Split(' ', 2)[0];

    /// <summary>Adresse publique du site : configuration, sinon l'origine du navigateur (développement).</summary>
    public static string PublicBaseUrl(HttpRequest request, IConfiguration config)
    {
        if (config["App:PublicUrl"] is { Length: > 0 } configured) return configured.TrimEnd('/');
        if (request.Headers.Origin.ToString() is { Length: > 0 } origin
         && Uri.TryCreate(origin, UriKind.Absolute, out var uri)
         && uri.IsLoopback)
            return origin.TrimEnd('/');
        return $"{request.Scheme}://{request.Host}";
    }

    static string? Query(Uri uri, string name)
    {
        foreach (string pair in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            string[] parts = pair.Split('=', 2);
            if (parts.Length == 2 && parts[0] == name) return Uri.UnescapeDataString(parts[1]);
        }
        return null;
    }

    [GeneratedRegex("-{2,}")]
    private static partial Regex MultipleDashes();

    [GeneratedRegex("^[a-z0-9]+(-[a-z0-9]+)*$")]
    private static partial Regex SlugPattern();

    [GeneratedRegex("^[A-Za-z0-9_-]{11}$")]
    private static partial Regex YouTubeId();

    [GeneratedRegex("^[0-9]{1,12}$")]
    private static partial Regex Digits();

    [GeneratedRegex("^[0-9a-f]{6,20}$")]
    private static partial Regex VimeoHash();

    [GeneratedRegex("^[0-9a-f]{20,40}$")]
    private static partial Regex LoomId();

    [GeneratedRegex("^[A-Za-z0-9_-]{43}$")]
    private static partial Regex TokenPattern();
}
