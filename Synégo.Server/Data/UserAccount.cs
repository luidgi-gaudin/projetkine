namespace Synego.Server.Data;

/// <summary>
///     Prospect : a un compte mais n'a pas encore signé.
///     Client   : client signé, accède aux séances de suivi.
///     Coach    : la gérante et les coachs qu'elle nomme (back-office, accessible uniquement via le VPN).
/// </summary>
public enum UserRole
{
    Prospect,
    Client,
    Coach,
}

/// <summary>Compte applicatif, relié à l'identité Firebase par <see cref="FirebaseUid" />.</summary>
public sealed class UserAccount
{
    public Guid Id { get; set; }
    public required string FirebaseUid { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Company { get; set; }
    public UserRole Role { get; set; } = UserRole.Prospect;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? SignedAt { get; set; }

    public List<ClientDocument> Documents { get; set; } = [];
    public List<Appointment> Appointments { get; set; } = [];
}
