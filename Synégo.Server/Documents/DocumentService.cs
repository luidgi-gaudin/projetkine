using System.Net.Mime;
using Microsoft.EntityFrameworkCore;
using Synego.Server.Data;

namespace Synego.Server.Documents;

public sealed record DocumentDto(
    Guid Id,
    string FileName,
    string ContentType,
    long SizeBytes,
    string Category,
    bool SharedByStaff,
    DateTimeOffset CreatedAt)
{
    public static DocumentDto From(ClientDocument d) =>
        new DocumentDto(d.Id, d.FileName, d.ContentType, d.SizeBytes, d.Category, d.SharedByStaff, d.CreatedAt);
}

/// <summary>Logique commune aux endpoints client et admin.</summary>
public sealed class DocumentService(AppDbContext db, IDocumentStore store, StorageOptions options, TimeProvider clock)
{
    public IQueryable<ClientDocument> Visible(Guid ownerId) =>
        db.Documents.Where(d => d.OwnerId == ownerId && d.DeletedAt == null);

    public async Task<IResult> UploadAsync(
        Guid ownerId, Guid uploadedById, bool byStaff, IFormFile? file, string? category, CancellationToken ct)
    {
        if (file is null)
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["file"] = ["Aucun fichier reçu."] });

        (string? error, string contentType) = await DocumentRules.ValidateAsync(file, options.MaxUploadBytes, ct);
        if (error is not null)
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["file"] = [error] });

        string key = $"{ownerId:N}/{Guid.NewGuid():N}";
        await using (var content = file.OpenReadStream())
        {
            await store.SaveAsync(key, content, contentType, ct);
        }

        var document = new ClientDocument
        {
            OwnerId = ownerId,
            FileName = DocumentRules.SafeFileName(file.FileName),
            ContentType = contentType,
            SizeBytes = file.Length,
            StorageKey = key,
            Category = byStaff ? DocumentRules.NormalizeCategory(category) : "Déposé par vous",
            SharedByStaff = byStaff,
            UploadedById = uploadedById,
            CreatedAt = clock.GetUtcNow(),
        };
        db.Documents.Add(document);
        await db.SaveChangesAsync(ct);
        return Results.Ok(DocumentDto.From(document));
    }

    public async Task<IResult> DownloadAsync(ClientDocument document, HttpContext http, CancellationToken ct)
    {
        http.Response.ContentType = document.ContentType;
        http.Response.Headers.ContentDisposition =
            new ContentDisposition { FileName = document.FileName, Inline = false }.ToString();
        http.Response.Headers.CacheControl = "private, no-store";
        await store.CopyToAsync(document.StorageKey, http.Response.Body, ct);
        return Results.Empty;
    }

    /// <summary>
    ///     Suppression « douce » : le document disparaît tout de suite de l'espace client,
    ///     mais le fichier reste dans le bucket <see cref="StorageOptions.PurgeAfterDays" /> jours.
    ///     Une restauration de la base PostgreSQL le fait donc réapparaître intact.
    /// </summary>
    public async Task SoftDeleteAsync(ClientDocument document, CancellationToken ct)
    {
        document.DeletedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Suppression définitive (fermeture de compte, purge).</summary>
    public async Task HardDeleteAllAsync(Guid ownerId, CancellationToken ct)
    {
        var documents = await db.Documents.Where(d => d.OwnerId == ownerId).ToListAsync(ct);
        foreach (var document in documents)
            await store.DeleteAsync(document.StorageKey, ct);
        db.Documents.RemoveRange(documents);
        await db.SaveChangesAsync(ct);
    }
}

/// <summary>Chaque nuit, supprime définitivement les documents supprimés depuis plus de N jours.</summary>
public sealed class DocumentPurgeService(
    IServiceScopeFactory scopes,
    StorageOptions options,
    TimeProvider clock,
    ILogger<DocumentPurgeService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(24), clock);
        do
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var store = scope.ServiceProvider.GetRequiredService<IDocumentStore>();
                var limit = clock.GetUtcNow().AddDays(-options.PurgeAfterDays);

                var expired = await db.Documents
                    .Where(d => d.DeletedAt != null && d.DeletedAt < limit)
                    .ToListAsync(stoppingToken);
                foreach (var document in expired)
                    await store.DeleteAsync(document.StorageKey, stoppingToken);
                db.Documents.RemoveRange(expired);
                await db.SaveChangesAsync(stoppingToken);
                if (expired.Count > 0) logger.LogInformation("{Count} document(s) purgé(s).", expired.Count);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                logger.LogWarning(e, "Purge des documents impossible, nouvel essai demain.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
