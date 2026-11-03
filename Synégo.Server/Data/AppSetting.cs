namespace Synego.Server.Data;

/// <summary>
///     Réglages modifiables depuis le back-office (connexion Calendly, choix des événements…).
///     Clé/valeur : ajouter un réglage ne demande pas de migration.
/// </summary>
public sealed class AppSetting
{
    public required string Key { get; set; }
    public required string Value { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
