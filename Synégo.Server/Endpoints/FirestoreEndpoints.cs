using Google.Cloud.Firestore;

namespace Synego.Server.Endpoints;

public static class FirestoreEndpoints
{
    public static void MapFirestoreEndpoints(this IEndpointRouteBuilder app)
    {
        // Vérifie que la connexion Firestore fonctionne (réservé aux utilisateurs connectés).
        app.MapGet("/api/firestore/ping", async (IServiceProvider services, CancellationToken ct) =>
            {
                var db = services.GetService<FirestoreDb>();
                if (db is null)
                    return Results.Problem(statusCode: 503,
                                           title: "Firestore non configuré (Firestore__ProjectId manquant).");

                await db.Collection("_health").Limit(1).GetSnapshotAsync(ct);
                return Results.Ok(new { status = "ok", projectId = db.ProjectId });
            })
            .WithTags("Firestore")
            .RequireAuthorization();
    }
}
