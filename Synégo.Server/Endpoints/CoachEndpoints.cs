using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Synego.Server.Authentication;
using Synego.Server.Data;
using Synego.Server.Security;

namespace Synego.Server.Endpoints;

/// <summary>
///     Un coach nomme d'autres coachs : promotion d'un compte existant, ou invitation d'une adresse e-mail
///     qui deviendra coach à sa première connexion (e-mail vérifié obligatoire).
/// </summary>
public static class CoachEndpoints
{
    const string InvitationsKey = "coach.invitations";

    public static async Task<List<string>> GetInvitationsAsync(AppDbContext db, CancellationToken ct = default) =>
        await db.Settings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == InvitationsKey, ct) is { } setting
            ? JsonSerializer.Deserialize<List<string>>(setting.Value) ?? []
            : [];

    public static async Task SaveInvitationsAsync(AppDbContext db, List<string> emails, DateTimeOffset now,
                                                  CancellationToken ct = default)
    {
        var setting = await db.Settings.FirstOrDefaultAsync(s => s.Key == InvitationsKey, ct);
        if (setting is null) db.Settings.Add(setting = new AppSetting { Key = InvitationsKey, Value = "[]" });
        setting.Value = JsonSerializer.Serialize(emails.Distinct(StringComparer.OrdinalIgnoreCase).ToList());
        setting.UpdatedAt = now;
        await db.SaveChangesAsync(ct);
    }

    public static void MapCoachEndpoints(this IEndpointRouteBuilder app, IConfiguration configuration)
    {
        var group = app.MapGroup("/api/admin/coaches")
            .WithTags("Back-office")
            .RequireAuthorization(Policies.Admin)
            .RequireAdminZone(configuration);

        group.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var me = principal.GetUserId();
            var coaches = await db.Users
                .Where(u => u.Role == UserRole.Coach)
                .OrderBy(u => u.DisplayName ?? u.Email)
                .Select(u => new CoachDto(u.Id, u.Email, u.DisplayName, u.Id == me))
                .ToListAsync(ct);
            return new CoachesDto(coaches, await GetInvitationsAsync(db, ct));
        });

        // Compte existant : promu tout de suite. Sinon : invitation, appliquée à sa première connexion.
        group.MapPost("/", async (AddCoach request, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            string email = request.Email?.Trim().ToLowerInvariant() ?? "";
            if (email.Length > 254 || !new EmailAddressAttribute().IsValid(email))
                return Results.ValidationProblem(new Dictionary<string, string[]>
                                                     { ["email"] = ["Adresse e-mail invalide."] });

            var user =
                await db.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == email, ct);
            if (user is not null)
            {
                user.Role = UserRole.Coach;
                await db.SaveChangesAsync(ct);
                return Results.Ok(new { result = "promoted" });
            }

            var invitations = await GetInvitationsAsync(db, ct);
            invitations.Add(email);
            await SaveInvitationsAsync(db, invitations, clock.GetUtcNow(), ct);
            return Results.Ok(new { result = "invited" });
        });

        group.MapDelete("/invitations", async (string email, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var invitations = await GetInvitationsAsync(db, ct);
            invitations.RemoveAll(e => string.Equals(e, email, StringComparison.OrdinalIgnoreCase));
            await SaveInvitationsAsync(db, invitations, clock.GetUtcNow(), ct);
            return Results.NoContent();
        });

        // Retirer un coach : il redevient client. On ne peut pas se retirer soi-même (il reste toujours un coach).
        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            if (id == principal.GetUserId())
                return Results.Problem(statusCode: 409, title: "Vous ne pouvez pas retirer vos propres droits de coach.");
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Coach, ct);
            if (user is null) return Results.NotFound();
            user.Role = UserRole.Client;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }

    public sealed record AddCoach(string? Email);

    public sealed record CoachDto(Guid Id, string? Email, string? DisplayName, bool IsYou);

    public sealed record CoachesDto(List<CoachDto> Coaches, List<string> Invitations);
}
