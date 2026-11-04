using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Synego.Server.Authentication;
using Synego.Server.Data;
using Synego.Server.Learning;
using Synego.Server.Payments;

namespace Synego.Server.Endpoints;

/// <summary>Formations : catalogue public, achat, espace d'apprentissage et communauté des membres.</summary>
public static class CourseEndpoints
{
    public static void MapCourseEndpoints(this IEndpointRouteBuilder app)
    {
        // ---------- Catalogue public ----------
        app.MapGet("/api/courses", async (AppDbContext db, CancellationToken ct) =>
                       await db.Courses.Where(c => c.Published)
                           .OrderBy(c => c.SortOrder).ThenBy(c => c.CreatedAt)
                           .Select(c => new CourseCardDto(c.Id, c.Slug, c.Title, c.Summary, c.DurationLabel, c.PriceCents,
                                                          c.Currency, c.Modules.Count,
                                                          c.Modules.SelectMany(m => m.Lessons).Count()))
                           .ToListAsync(ct))
            .WithTags("Formations").AllowAnonymous();

        app.MapGet("/api/courses/{slug}", async (
                       string slug, ClaimsPrincipal principal, AppDbContext db, StripeGateway stripe,
                       CancellationToken ct) =>
                   {
                       var course = await db.Courses.AsNoTracking()
                           .Include(c => c.Modules.OrderBy(m => m.SortOrder))
                           .ThenInclude(m => m.Lessons.OrderBy(l => l.SortOrder))
                           .FirstOrDefaultAsync(c => c.Slug == slug, ct);
                       bool isCoach = principal.Identity?.IsAuthenticated == true && principal.IsCoach();
                       if (course is null || !course.Published && !isCoach) return Results.NotFound();

                       bool enrolled = principal.Identity?.IsAuthenticated == true
                                    && await db.Enrollments.AnyAsync(e => e.CourseId == course.Id
                                                                       && e.UserId == principal.GetUserId(), ct);
                       return Results.Ok(new CourseDetailDto(
                                             course.Id, course.Slug, course.Title, course.Summary, course.Description,
                                             course.DurationLabel, course.PriceCents, course.Currency,
                                             course.Modules.Select(m => new PublicModuleDto(
                                                                       m.Title,
                                                                       m.Lessons.Select(l => new PublicLessonDto(
                                                                                   l.Id, l.Title, l.DurationMinutes,
                                                                                   l.FreePreview,
                                                                                   l.FreePreview ? l.Body : null,
                                                                                   l.FreePreview
                                                                                       ? LearningRules.VideoEmbedUrl(
                                                                                           l.VideoUrl)
                                                                                       : null))
                                                                           .ToList()))
                                                 .ToList(),
                                             enrolled || isCoach,
                                             await stripe.IsConfiguredAsync(ct)));
                   })
            .WithTags("Formations").AllowAnonymous();

        // Achat direct : compte obligatoire (l'accès est rattaché au compte), CGV acceptées.
        app.MapPost("/api/courses/{id:guid}/checkout", async (
                        Guid id, CheckoutRequest request, ClaimsPrincipal principal, HttpRequest http, AppDbContext db,
                        PaymentService payments, IConfiguration config, TimeProvider clock, CancellationToken ct) =>
                    {
                        if (!request.AcceptTerms) return TermsRequired();
                        var course = await db.Courses.FirstOrDefaultAsync(c => c.Id == id && c.Published, ct);
                        if (course is null) return Results.NotFound();
                        var userId = principal.GetUserId();
                        if (await db.Enrollments.AnyAsync(e => e.CourseId == id && e.UserId == userId, ct))
                            return Results.Problem(statusCode: 409, title: "Vous avez déjà accès à cette formation.");
                        if (!LearningRules.IsValidAmount(course.PriceCents))
                            return Results.Problem(statusCode: 409, title: "Cette formation n'est pas encore en vente.");

                        var user = await db.Users.FirstAsync(u => u.Id == userId, ct);
                        var now = clock.GetUtcNow();
                        var payment =
                            payments.NewPayment(PaymentKind.Course, course.Title, course.PriceCents, now.AddDays(1));
                        payment.CourseId = course.Id;
                        payment.UserId = user.Id;
                        payment.Email = user.Email;
                        payment.CustomerName = user.DisplayName;
                        payment.Currency = course.Currency;
                        payment.Locale = request.Locale == "en" ? "en" : "fr";
                        payment.TermsAcceptedAt = now;
                        db.Payments.Add(payment);
                        await db.SaveChangesAsync(ct);
                        return await CheckoutAsync(payments, payment, LearningRules.PublicBaseUrl(http, config),
                                                   $"/formations/{course.Slug}", ct);
                    })
            .WithTags("Formations").RequireAuthorization();

        // ---------- Espace d'apprentissage ----------
        var learning = app.MapGroup("/api/learning").WithTags("Formations").RequireAuthorization();

        learning.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, PaymentService payments,
                                    CancellationToken ct) =>
        {
            var userId = principal.GetUserId();
            if (IsEmailVerified(principal))
                await payments.ClaimPendingAsync(await db.Users.FirstAsync(u => u.Id == userId, ct), ct);

            var courses = principal.IsCoach()
                ? db.Courses
                : db.Courses.Where(c => c.Enrollments.Any(e => e.UserId == userId));
            return await courses.OrderBy(c => c.SortOrder)
                .Select(c => new MyCourseDto(
                            c.Id, c.Slug, c.Title, c.Summary, c.Published,
                            c.Modules.SelectMany(m => m.Lessons).Count(),
                            db.LessonProgress.Count(p => p.UserId == userId && p.Lesson!.Module!.CourseId == c.Id)))
                .ToListAsync(ct);
        });

        learning.MapGet(
            "/{slug}", async (string slug, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
            {
                var course = await db.Courses.AsNoTracking()
                    .Include(c => c.Modules.OrderBy(m => m.SortOrder))
                    .ThenInclude(m => m.Lessons.OrderBy(l => l.SortOrder))
                    .FirstOrDefaultAsync(c => c.Slug == slug, ct);
                if (course is null || !await CanAccessAsync(db, principal, course.Id, ct)) return Results.NotFound();

                var userId = principal.GetUserId();
                var done = await db.LessonProgress.Where(p => p.UserId == userId).Select(p => p.LessonId).ToListAsync(ct);
                var counts = await db.CommunityComments
                    .Where(c => c.LessonId != null && c.Lesson!.Module!.CourseId == course.Id)
                    .GroupBy(c => c.LessonId!.Value)
                    .Select(g => new { g.Key, Count = g.Count() })
                    .ToDictionaryAsync(g => g.Key, g => g.Count, ct);
                return Results.Ok(new ClassroomDto(
                                      course.Id, course.Slug, course.Title, course.Summary, principal.IsCoach(),
                                      course.Modules.Select(m => new ClassroomModuleDto(
                                                                m.Id, m.Title,
                                                                m.Lessons.Select(l => new ClassroomLessonDto(
                                                                            l.Id, l.Title, l.Body,
                                                                            LearningRules.VideoEmbedUrl(l.VideoUrl),
                                                                            l.DurationMinutes, done.Contains(l.Id),
                                                                            counts.GetValueOrDefault(l.Id)))
                                                                    .ToList()))
                                          .ToList()));
            });

        learning.MapPost("/lessons/{id:guid}/progress", async (
                             Guid id, ProgressRequest request, ClaimsPrincipal principal, AppDbContext db,
                             TimeProvider clock,
                             CancellationToken ct) =>
                         {
                             var lesson = await db.Lessons.Include(l => l.Module)
                                 .FirstOrDefaultAsync(l => l.Id == id, ct);
                             if (lesson is null || !await CanAccessAsync(db, principal, lesson.Module!.CourseId, ct))
                                 return Results.NotFound();
                             var userId = principal.GetUserId();
                             var existing = await db.LessonProgress.FindAsync([userId, id], ct);
                             if (request.Done && existing is null)
                                 db.LessonProgress.Add(new LessonProgress
                                 {
                                     UserId = userId, LessonId = id, CompletedAt = clock.GetUtcNow(),
                                 });
                             else if (!request.Done && existing is not null)
                                 db.LessonProgress.Remove(existing);
                             await db.SaveChangesAsync(ct);
                             return Results.NoContent();
                         });

        // ---------- Commentaires sous une leçon ----------
        learning.MapGet("/lessons/{id:guid}/comments",
                        async (Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
                        {
                            var lesson = await db.Lessons.Include(l => l.Module).FirstOrDefaultAsync(l => l.Id == id, ct);
                            if (lesson is null || !await CanAccessAsync(db, principal, lesson.Module!.CourseId, ct))
                                return Results.NotFound();
                            var userId = principal.GetUserId();
                            bool coach = principal.IsCoach();
                            return Results.Ok(await db.CommunityComments.Where(c => c.LessonId == id)
                                                  .OrderBy(c => c.CreatedAt)
                                                  .Select(c => new CommentDto(c.Id, c.AuthorName, c.AuthorIsCoach, c.Body,
                                                                              c.CreatedAt,
                                                                              coach || c.AuthorId == userId))
                                                  .ToListAsync(ct));
                        });

        learning.MapPost("/lessons/{id:guid}/comments", async (
                             Guid id, BodyRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock,
                             CancellationToken ct) =>
                         {
                             var lesson = await db.Lessons.Include(l => l.Module)
                                 .FirstOrDefaultAsync(l => l.Id == id, ct);
                             if (lesson is null || !await CanAccessAsync(db, principal, lesson.Module!.CourseId, ct))
                                 return Results.NotFound();
                             if (Clean(request.Body, 3000) is not { } body) return EmptyBody();
                             var author = await AuthorAsync(db, principal, ct);
                             db.CommunityComments.Add(new CommunityComment
                             {
                                 LessonId = id, AuthorId = author.Id, AuthorName = author.Name,
                                 AuthorIsCoach = author.Coach,
                                 Body = body, CreatedAt = clock.GetUtcNow(),
                             });
                             await db.SaveChangesAsync(ct);
                             return Results.NoContent();
                         });

        // ---------- Communauté de la formation ----------
        learning.MapGet("/{slug}/posts",
                        async (string slug, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
                        {
                            var course = await db.Courses.FirstOrDefaultAsync(c => c.Slug == slug, ct);
                            if (course is null || !await CanAccessAsync(db, principal, course.Id, ct))
                                return Results.NotFound();
                            var userId = principal.GetUserId();
                            bool coach = principal.IsCoach();
                            return Results.Ok(await db.CommunityPosts.Where(p => p.CourseId == course.Id)
                                                  .OrderByDescending(p => p.Pinned).ThenByDescending(p => p.CreatedAt)
                                                  .Take(100)
                                                  .Select(p => new PostDto(
                                                              p.Id, p.AuthorName, p.AuthorIsCoach, p.Body, p.Pinned,
                                                              p.CreatedAt,
                                                              p.Reactions.Count, p.Reactions.Any(r => r.UserId == userId),
                                                              coach || p.AuthorId == userId,
                                                              p.Comments.OrderBy(c => c.CreatedAt)
                                                                  .Select(c => new CommentDto(c.Id, c.AuthorName,
                                                                              c.AuthorIsCoach, c.Body,
                                                                              c.CreatedAt, coach || c.AuthorId == userId))
                                                                  .ToList()))
                                                  .ToListAsync(ct));
                        });

        learning.MapPost("/{slug}/posts", async (
                             string slug, BodyRequest request, ClaimsPrincipal principal, AppDbContext db,
                             TimeProvider clock,
                             CancellationToken ct) =>
                         {
                             var course = await db.Courses.FirstOrDefaultAsync(c => c.Slug == slug, ct);
                             if (course is null || !await CanAccessAsync(db, principal, course.Id, ct))
                                 return Results.NotFound();
                             if (Clean(request.Body, 5000) is not { } body) return EmptyBody();
                             var author = await AuthorAsync(db, principal, ct);
                             db.CommunityPosts.Add(new CommunityPost
                             {
                                 CourseId = course.Id, AuthorId = author.Id, AuthorName = author.Name,
                                 AuthorIsCoach = author.Coach, Body = body, CreatedAt = clock.GetUtcNow(),
                             });
                             await db.SaveChangesAsync(ct);
                             return Results.NoContent();
                         });

        learning.MapPost("/posts/{id:guid}/comments", async (
                             Guid id, BodyRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock,
                             CancellationToken ct) =>
                         {
                             var post = await db.CommunityPosts.FirstOrDefaultAsync(p => p.Id == id, ct);
                             if (post is null || !await CanAccessAsync(db, principal, post.CourseId, ct))
                                 return Results.NotFound();
                             if (Clean(request.Body, 3000) is not { } body) return EmptyBody();
                             var author = await AuthorAsync(db, principal, ct);
                             db.CommunityComments.Add(new CommunityComment
                             {
                                 PostId = id, AuthorId = author.Id, AuthorName = author.Name,
                                 AuthorIsCoach = author.Coach,
                                 Body = body, CreatedAt = clock.GetUtcNow(),
                             });
                             await db.SaveChangesAsync(ct);
                             return Results.NoContent();
                         });

        learning.MapPost("/posts/{id:guid}/like", async (
                             Guid id, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock,
                             CancellationToken ct) =>
                         {
                             var post = await db.CommunityPosts.FirstOrDefaultAsync(p => p.Id == id, ct);
                             if (post is null || !await CanAccessAsync(db, principal, post.CourseId, ct))
                                 return Results.NotFound();
                             var userId = principal.GetUserId();
                             var reaction = await db.PostReactions.FindAsync([id, userId], ct);
                             if (reaction is null)
                                 db.PostReactions.Add(new PostReaction
                                 {
                                     PostId = id, UserId = userId, CreatedAt = clock.GetUtcNow(),
                                 });
                             else db.PostReactions.Remove(reaction);
                             await db.SaveChangesAsync(ct);
                             return Results.NoContent();
                         });

        learning.MapPatch("/posts/{id:guid}",
                          async (Guid id, PinRequest request, ClaimsPrincipal principal, AppDbContext db,
                                 CancellationToken ct) =>
                          {
                              if (!principal.IsCoach()) return Results.Forbid();
                              var post = await db.CommunityPosts.FirstOrDefaultAsync(p => p.Id == id, ct);
                              if (post is null) return Results.NotFound();
                              post.Pinned = request.Pinned;
                              await db.SaveChangesAsync(ct);
                              return Results.NoContent();
                          });

        learning.MapDelete("/posts/{id:guid}",
                           async (Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
                           {
                               var post = await db.CommunityPosts.FirstOrDefaultAsync(p => p.Id == id, ct);
                               if (post is null || post.AuthorId != principal.GetUserId() && !principal.IsCoach())
                                   return Results.NotFound();
                               db.CommunityPosts.Remove(post);
                               await db.SaveChangesAsync(ct);
                               return Results.NoContent();
                           });

        learning.MapDelete("/comments/{id:guid}",
                           async (Guid id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
                           {
                               var comment = await db.CommunityComments.FirstOrDefaultAsync(c => c.Id == id, ct);
                               if (comment is null || comment.AuthorId != principal.GetUserId() && !principal.IsCoach())
                                   return Results.NotFound();
                               db.CommunityComments.Remove(comment);
                               await db.SaveChangesAsync(ct);
                               return Results.NoContent();
                           });
    }

    internal static async Task<IResult> CheckoutAsync(
        PaymentService payments, Payment payment, string baseUrl, string cancelPath, CancellationToken ct)
    {
        try
        {
            return Results.Ok(new CheckoutResponse(await payments.StartCheckoutAsync(payment, baseUrl, cancelPath, ct)));
        }
        catch (PaymentsDisabledException e)
        {
            return Results.Problem(statusCode: 503, title: e.Message);
        }
        catch (StripeException)
        {
            return Results.Problem(statusCode: 502,
                                   title: "Le service de paiement ne répond pas. Réessayez dans quelques minutes.");
        }
    }

    internal static IResult TermsRequired() => Results.ValidationProblem(new Dictionary<string, string[]>
    {
        ["acceptTerms"] = ["Merci d'accepter les conditions générales de vente pour continuer."],
    });

    internal static bool IsEmailVerified(ClaimsPrincipal principal) =>
        principal.FindFirstValue("email_verified") == "true";

    static async Task<bool> CanAccessAsync(AppDbContext db, ClaimsPrincipal principal, Guid courseId,
                                           CancellationToken ct) =>
        principal.IsCoach()
     || await db.Enrollments.AnyAsync(e => e.CourseId == courseId && e.UserId == principal.GetUserId(), ct);

    static async Task<(Guid Id, string Name, bool Coach)> AuthorAsync(AppDbContext db, ClaimsPrincipal principal,
                                                                      CancellationToken ct)
    {
        var user = await db.Users.FirstAsync(u => u.Id == principal.GetUserId(), ct);
        string name = user.DisplayName ?? user.Email?.Split('@')[0] ?? "Membre";
        return (user.Id, name.Length > 120 ? name[..120] : name, user.Role == UserRole.Coach);
    }

    static string? Clean(string? body, int max) =>
        string.IsNullOrWhiteSpace(body) ? null : body.Trim() is var text && text.Length > max ? text[..max] : body.Trim();

    static IResult EmptyBody() => Results.ValidationProblem(new Dictionary<string, string[]>
    {
        ["body"] = ["Écrivez quelques mots avant d'envoyer."],
    });
}

public sealed record CheckoutRequest(bool AcceptTerms, string? Locale);
public sealed record CheckoutResponse(string Url);
public sealed record ProgressRequest(bool Done);
public sealed record BodyRequest(string? Body);
public sealed record PinRequest(bool Pinned);

public sealed record CourseCardDto(
    Guid Id,
    string Slug,
    string Title,
    string Summary,
    string? DurationLabel,
    long PriceCents,
    string Currency,
    int Modules,
    int Lessons);

public sealed record PublicLessonDto(
    Guid Id,
    string Title,
    int? DurationMinutes,
    bool FreePreview,
    string? Body,
    string? VideoEmbedUrl);

public sealed record PublicModuleDto(string Title, List<PublicLessonDto> Lessons);

public sealed record CourseDetailDto(
    Guid Id,
    string Slug,
    string Title,
    string Summary,
    string Description,
    string? DurationLabel,
    long PriceCents,
    string Currency,
    List<PublicModuleDto> Modules,
    bool HasAccess,
    bool PaymentsEnabled);

public sealed record MyCourseDto(
    Guid Id,
    string Slug,
    string Title,
    string Summary,
    bool Published,
    int Lessons,
    int Done);

public sealed record ClassroomLessonDto(
    Guid Id,
    string Title,
    string Body,
    string? VideoEmbedUrl,
    int? DurationMinutes,
    bool Done,
    int Comments);

public sealed record ClassroomModuleDto(Guid Id, string Title, List<ClassroomLessonDto> Lessons);

public sealed record ClassroomDto(
    Guid Id,
    string Slug,
    string Title,
    string Summary,
    bool IsCoach,
    List<ClassroomModuleDto> Modules);

public sealed record CommentDto(
    Guid Id,
    string AuthorName,
    bool AuthorIsCoach,
    string Body,
    DateTimeOffset CreatedAt,
    bool CanDelete);

public sealed record PostDto(
    Guid Id,
    string AuthorName,
    bool AuthorIsCoach,
    string Body,
    bool Pinned,
    DateTimeOffset CreatedAt,
    int Likes,
    bool LikedByMe,
    bool CanDelete,
    List<CommentDto> Comments);
