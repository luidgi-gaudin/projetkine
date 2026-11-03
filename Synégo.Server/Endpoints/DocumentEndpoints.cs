using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Synego.Server.Authentication;
using Synego.Server.Documents;

namespace Synego.Server.Endpoints;

public static class DocumentEndpoints
{
    public static void MapDocumentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/documents")
            .WithTags("Documents")
            .RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal principal, DocumentService documents, CancellationToken ct) =>
                         await documents.Visible(principal.GetUserId())
                             .OrderByDescending(d => d.CreatedAt)
                             .Select(d => DocumentDto.From(d))
                             .ToListAsync(ct));

        // Pas de cookie de session (jeton Bearer) : la protection antiforgery n'apporte rien ici.
        group.MapPost("/", async (
                          ClaimsPrincipal principal, IFormFile? file, DocumentService documents, CancellationToken ct) =>
                      {
                          var userId = principal.GetUserId();
                          return await documents.UploadAsync(userId, userId, false, file, null, ct);
                      })
            .DisableAntiforgery();

        group.MapGet("/{id:guid}/file", async (
                         Guid id, ClaimsPrincipal principal, DocumentService documents, HttpContext http,
                         CancellationToken ct) =>
                     {
                         var document = await documents.Visible(principal.GetUserId())
                             .FirstOrDefaultAsync(d => d.Id == id, ct);
                         return document is null ? Results.NotFound() : await documents.DownloadAsync(document, http, ct);
                     });

        // Un client ne peut supprimer que ce qu'il a lui-même déposé.
        group.MapDelete("/{id:guid}", async (
                            Guid id, ClaimsPrincipal principal, DocumentService documents, CancellationToken ct) =>
                        {
                            var document = await documents.Visible(principal.GetUserId())
                                .FirstOrDefaultAsync(d => d.Id == id && !d.SharedByStaff, ct);
                            if (document is null) return Results.NotFound();
                            await documents.SoftDeleteAsync(document, ct);
                            return Results.NoContent();
                        });
    }
}
