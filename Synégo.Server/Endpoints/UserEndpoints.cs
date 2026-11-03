using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Synego.Server.Authentication;
using Synego.Server.Data;
using Synego.Server.Documents;

namespace Synego.Server.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/me")
            .WithTags("Mon compte")
            .RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
                         await db.Users.FindAsync([principal.GetUserId()], ct) is { } user
                             ? Results.Ok(ProfileDto.From(user))
                             : Results.NotFound());

        group.MapPut(
            "/", async (ClaimsPrincipal principal, ProfileUpdate update, AppDbContext db, CancellationToken ct) =>
            {
                var errors = new Dictionary<string, string[]>();
                if (update.DisplayName?.Trim().Length > 80) errors["displayName"] = ["80 caractères maximum."];
                if (update.Company?.Trim().Length > 120) errors["company"] = ["120 caractères maximum."];
                if (update.PhoneNumber?.Trim().Length > 32) errors["phoneNumber"] = ["Numéro trop long."];
                if (errors.Count > 0) return Results.ValidationProblem(errors);

                var user = await db.Users.FindAsync([principal.GetUserId()], ct);
                if (user is null) return Results.NotFound();

                user.DisplayName = NullIfBlank(update.DisplayName);
                user.Company = NullIfBlank(update.Company);
                user.PhoneNumber = NullIfBlank(update.PhoneNumber) ?? user.PhoneNumber;
                await db.SaveChangesAsync(ct);
                return Results.Ok(ProfileDto.From(user));
            });

        // Droit à l'effacement (RGPD) : supprime documents, compte et rattachements.
        // Le compte Firebase est ensuite supprimé par le navigateur (user.delete()).
        group.MapDelete("/", async (
                            ClaimsPrincipal principal, AppDbContext db, DocumentService documents,
                            CancellationToken ct) =>
                        {
                            var userId = principal.GetUserId();
                            await documents.HardDeleteAllAsync(userId, ct);
                            await db.Users.Where(u => u.Id == userId).ExecuteDeleteAsync(ct);
                            return Results.NoContent();
                        });
    }

    static string? NullIfBlank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public sealed record ProfileUpdate(string? DisplayName, string? PhoneNumber, string? Company);

    public sealed record ProfileDto(
        Guid Id,
        string? Email,
        string? DisplayName,
        string? PhoneNumber,
        string? Company,
        UserRole Role,
        DateTimeOffset? SignedAt)
    {
        public static ProfileDto From(UserAccount u) =>
            new ProfileDto(u.Id, u.Email, u.DisplayName, u.PhoneNumber, u.Company, u.Role, u.SignedAt);
    }
}
