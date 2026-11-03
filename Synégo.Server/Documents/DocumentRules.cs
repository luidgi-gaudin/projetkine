namespace Synego.Server.Documents;

/// <summary>Contrôles appliqués à chaque fichier déposé, quel que soit le stockage.</summary>
public static class DocumentRules
{
    static readonly Dictionary<string, (string ContentType, byte[] Signature)> Allowed =
        new Dictionary<string, (string ContentType, byte[] Signature)>(StringComparer.OrdinalIgnoreCase)
        {
            [".pdf"] = ("application/pdf", [0x25, 0x50, 0x44, 0x46]),
            [".png"] = ("image/png", [0x89, 0x50, 0x4E, 0x47]),
            [".jpg"] = ("image/jpeg", [0xFF, 0xD8, 0xFF]),
            [".jpeg"] = ("image/jpeg", [0xFF, 0xD8, 0xFF]),
            [".docx"] = ("application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                [0x50, 0x4B, 0x03, 0x04]),
            [".xlsx"] = ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", [0x50, 0x4B, 0x03, 0x04]),
            [".pptx"] = ("application/vnd.openxmlformats-officedocument.presentationml.presentation",
                [0x50, 0x4B, 0x03, 0x04]),
        };

    public static readonly string[] Categories =
        ["Programme", "Compte rendu", "Devis", "Facture", "Contrat", "Support de séminaire", "Autre"];

    public static string AllowedExtensions => string.Join(", ", Allowed.Keys);

    /// <summary>Vérifie taille, extension et signature réelle du fichier (pas seulement son nom).</summary>
    public static async Task<(string? Error, string ContentType)> ValidateAsync(
        IFormFile file, long maxBytes, CancellationToken ct)
    {
        if (file.Length == 0) return ("Le fichier est vide.", "");
        if (file.Length > maxBytes) return ($"Le fichier dépasse {maxBytes / 1024 / 1024} Mo.", "");
        if (!Allowed.TryGetValue(Path.GetExtension(file.FileName), out var allowed))
            return ($"Format non accepté. Formats possibles : {AllowedExtensions}.", "");

        byte[] header = new byte[allowed.Signature.Length];
        await using var stream = file.OpenReadStream();
        int read = await stream.ReadAtLeastAsync(header, header.Length, false, ct);
        return read == header.Length && header.AsSpan().SequenceEqual(allowed.Signature)
            ? (null, allowed.ContentType)
            : ("Le contenu du fichier ne correspond pas à son extension.", "");
    }

    /// <summary>Nom affichable : sans chemin ni caractères de contrôle.</summary>
    public static string SafeFileName(string fileName)
    {
        string name = new string(Path.GetFileName(fileName)
                                     .Where(c => !char.IsControl(c) && c is not ('"' or '\\' or '/'))
                                     .ToArray())
            .Trim();
        if (name.Length == 0) name = "document";
        return name.Length <= 200 ? name : name[^200..];
    }

    public static string NormalizeCategory(string? category) =>
        Categories.FirstOrDefault(c => string.Equals(c, category?.Trim(), StringComparison.OrdinalIgnoreCase)) ?? "Autre";
}
