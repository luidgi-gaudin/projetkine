using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Synego.Server.Data;
using Synego.Server.Endpoints;

namespace Synego.Server.Authentication;

public static class UserClaims
{
    public const string UserId = "synego:user_id";
    public const string Role = "synego:role";

    public static Guid GetUserId(this ClaimsPrincipal principal) =>
        Guid.TryParse(principal.FindFirstValue(UserId), out var id)
            ? id
            : throw new InvalidOperationException("Utilisateur non provisionné.");

    public static bool IsCoach(this ClaimsPrincipal principal) => principal.IsInRole(nameof(UserRole.Coach));
}

/// <summary>
///     À chaque requête authentifiée : crée le compte applicatif au premier passage,
///     puis ajoute l'identifiant interne et le rôle (lus en base) aux claims.
///     Le rôle n'est jamais lu depuis le token : seule la base fait foi.
/// </summary>
public sealed class UserProvisioning(AppDbContext db, IConfiguration configuration, TimeProvider clock)
    : IClaimsTransformation
{
    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity is not ClaimsIdentity { IsAuthenticated: true } identity
         || identity.HasClaim(c => c.Type == UserClaims.UserId))
            return principal;

        string? uid = principal.FindFirstValue("sub");
        if (string.IsNullOrEmpty(uid)) return principal;

        var account = await db.Users.FirstOrDefaultAsync(u => u.FirebaseUid == uid)
                   ?? await CreateAsync(principal, uid);

        if (account.Role != UserRole.Coach && await IsDesignatedCoachAsync(principal))
        {
            account.Role = UserRole.Coach;
            await db.SaveChangesAsync();
        }

        identity.AddClaim(new Claim(UserClaims.UserId, account.Id.ToString()));
        identity.AddClaim(new Claim(UserClaims.Role, account.Role.ToString()));
        return principal;
    }

    async Task<UserAccount> CreateAsync(ClaimsPrincipal principal, string uid)
    {
        var account = new UserAccount
        {
            FirebaseUid = uid,
            Email = principal.FindFirstValue("email"),
            DisplayName = Truncate(principal.FindFirstValue("name"), 80),
            PhoneNumber = principal.FindFirstValue("phone_number"),
            CreatedAt = clock.GetUtcNow(),
        };
        db.Users.Add(account);
        try
        {
            await db.SaveChangesAsync();
            return account;
        }
        catch (DbUpdateException)
        {
            // Deux premières requêtes simultanées : l'autre a créé le compte.
            db.Entry(account).State = EntityState.Detached;
            return await db.Users.FirstAsync(u => u.FirebaseUid == uid);
        }
    }

    /// <summary>
    ///     Devient coach un compte dont l'e-mail VÉRIFIÉ figure dans <c>Admin:Emails</c> (.env)
    ///     ou dans les invitations faites depuis le back-office (consommées une fois utilisées).
    /// </summary>
    async Task<bool> IsDesignatedCoachAsync(ClaimsPrincipal principal)
    {
        string? email = principal.FindFirstValue("email");
        if (string.IsNullOrEmpty(email) || principal.FindFirstValue("email_verified") != "true") return false;

        bool configured = (configuration["Admin:Emails"] ?? "")
            .Split([',', ';'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Contains(email, StringComparer.OrdinalIgnoreCase);
        if (configured) return true;

        var invitations = await CoachEndpoints.GetInvitationsAsync(db);
        if (!invitations.Contains(email, StringComparer.OrdinalIgnoreCase)) return false;
        invitations.RemoveAll(e => string.Equals(e, email, StringComparison.OrdinalIgnoreCase));
        await CoachEndpoints.SaveInvitationsAsync(db, invitations, clock.GetUtcNow());
        return true;
    }

    static string? Truncate(string? value, int max) =>
        value is { Length: > 0 } ? value[..Math.Min(value.Length, max)] : null;
}
