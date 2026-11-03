using Synego.Server.Data;
using Synego.Server.Documents;

namespace Synego.Server.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/ping", () => Results.Ok(new { status = "ok" }))
            .WithTags("Health")
            .AllowAnonymous();

        // Surveillé par Uptime Kuma : 503 dès que la base ou le stockage des documents ne répond plus.
        app.MapGet("/api/health", async (AppDbContext db, IDocumentStore store, CancellationToken ct) =>
            {
                bool database = await db.Database.CanConnectAsync(ct);
                bool documents = await store.IsHealthyAsync(ct);
                var body = new
                    { status = database && documents ? "ok" : "degraded", database, documents, storage = store.Name };
                return database && documents ? Results.Ok(body) : Results.Json(body, statusCode: 503);
            })
            .WithTags("Health")
            .AllowAnonymous();
    }
}
