using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Synego.Server.Data;

namespace Synego.Server.Endpoints;

public static class AuthEndpoints
{
    public const string RateLimitPolicy = "auth";

    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth")
            .WithTags("Auth")
            .RequireRateLimiting(RateLimitPolicy);

        // /register, /login, /refresh, /confirmEmail, /forgotPassword, /resetPassword, /manage/*
        // Le client appelle /login?useCookies=true : la session est stockée dans un cookie HttpOnly.
        group.MapIdentityApi<AppUser>();

        group.MapPost("/logout", async (SignInManager<AppUser> signInManager) =>
            {
                await signInManager.SignOutAsync();
                return Results.NoContent();
            })
            .RequireAuthorization();

        group.MapGet("/me", (ClaimsPrincipal user) => Results.Ok(new MeResponse(
                                                                     user.FindFirstValue(ClaimTypes.NameIdentifier)!,
                                                                     user.FindFirstValue(ClaimTypes.Email)
                                                                  ?? user.Identity!.Name!)))
            .RequireAuthorization();
    }

    public record MeResponse(string Id, string Email);
}
