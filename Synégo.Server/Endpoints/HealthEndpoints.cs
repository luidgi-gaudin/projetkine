namespace Synego.Server.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/ping", () => Results.Ok(new { status = "ok" }))
            .WithTags("Health")
            .AllowAnonymous();
    }
}
