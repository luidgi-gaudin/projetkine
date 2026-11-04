using System.Net.Sockets;
using System.Security.Claims;
using MailKit;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Synego.Server.Authentication;
using Synego.Server.Data;
using Synego.Server.Learning;
using Synego.Server.Notifications;
using Synego.Server.Payments;
using Synego.Server.Security;

namespace Synego.Server.Endpoints;

/// <summary>Back-office : formations (contenu, accès) et paiements (liens, suivi, compte Stripe).</summary>
public static class AdminLearningEndpoints
{
    public static void MapAdminLearningEndpoints(this IEndpointRouteBuilder app, IConfiguration configuration)
    {
        var courses = app.MapGroup("/api/admin/courses")
            .WithTags("Back-office · Formations")
            .RequireAuthorization(Policies.Admin)
            .RequireAdminZone(configuration);

        courses.MapGet("/", async (AppDbContext db, CancellationToken ct) =>
                           await db.Courses.OrderBy(c => c.SortOrder).ThenBy(c => c.CreatedAt)
                               .Select(c => new AdminCourseRowDto(
                                           c.Id, c.Slug, c.Title, c.Summary, c.PriceCents, c.Currency, c.Published,
                                           c.Modules.Count, c.Modules.SelectMany(m => m.Lessons).Count(),
                                           c.Enrollments.Count,
                                           db.Payments.Where(p => p.CourseId == c.Id && p.Status == PaymentStatus.Paid)
                                               .Sum(p => (long?)p.AmountCents)
                                        ?? 0))
                               .ToListAsync(ct));

        courses.MapPost("/", async (CourseInput input, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            if (Validate(input) is { } problem) return problem;
            string slug = await UniqueSlugAsync(db, LearningRules.Slugify(input.Slug ?? input.Title!), null, ct);
            var now = clock.GetUtcNow();
            var course = new Course
            {
                Slug = slug, Title = input.Title!.Trim(), Summary = input.Summary!.Trim(),
                Description = input.Description?.Trim() ?? "", DurationLabel = Trim(input.DurationLabel),
                PriceCents = input.PriceCents, Published = input.Published,
                SortOrder = await db.Courses.CountAsync(ct), CreatedAt = now, UpdatedAt = now,
            };
            db.Courses.Add(course);
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { course.Id, course.Slug });
        });

        courses.MapGet("/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
        {
            var course = await db.Courses.AsNoTracking()
                .Include(c => c.Modules.OrderBy(m => m.SortOrder)).ThenInclude(m => m.Lessons.OrderBy(l => l.SortOrder))
                .FirstOrDefaultAsync(c => c.Id == id, ct);
            return course is null
                ? Results.NotFound()
                : Results.Ok(new AdminCourseDto(
                                 course.Id, course.Slug, course.Title, course.Summary, course.Description,
                                 course.DurationLabel, course.PriceCents, course.Currency, course.Published,
                                 course.Modules.Select(m => new AdminModuleDto(
                                                           m.Id, m.Title,
                                                           m.Lessons.Select(l => new AdminLessonDto(
                                                                                l.Id, l.Title, l.Body, l.VideoUrl,
                                                                                LearningRules.VideoEmbedUrl(l.VideoUrl) is
                                                                                    not null,
                                                                                l.DurationMinutes, l.FreePreview))
                                                               .ToList()))
                                     .ToList()));
        });

        courses.MapPut("/{id:guid}",
                       async (Guid id, CourseInput input, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
                       {
                           var course = await db.Courses.FirstOrDefaultAsync(c => c.Id == id, ct);
                           if (course is null) return Results.NotFound();
                           if (Validate(input) is { } problem) return problem;
                           if (input.Slug is { Length: > 0 } wanted)
                           {
                               string slug = LearningRules.Slugify(wanted);
                               if (await db.Courses.AnyAsync(c => c.Slug == slug && c.Id != id, ct))
                                   return Field("slug", "Cette adresse est déjà utilisée par une autre formation.");
                               course.Slug = slug;
                           }
                           course.Title = input.Title!.Trim();
                           course.Summary = input.Summary!.Trim();
                           course.Description = input.Description?.Trim() ?? "";
                           course.DurationLabel = Trim(input.DurationLabel);
                           course.PriceCents = input.PriceCents;
                           course.Published = input.Published;
                           course.UpdatedAt = clock.GetUtcNow();
                           await db.SaveChangesAsync(ct);
                           return Results.Ok(new { course.Id, course.Slug });
                       });

        courses.MapDelete("/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
        {
            var course = await db.Courses.FirstOrDefaultAsync(c => c.Id == id, ct);
            if (course is null) return Results.NotFound();
            if (await db.Enrollments.AnyAsync(e => e.CourseId == id, ct))
                return Results.Problem(statusCode: 409,
                                       title:
                                       "Des membres ont accès à cette formation : dépubliez-la plutôt que de la supprimer.");
            db.Courses.Remove(course);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // ---------- Modules et leçons ----------
        courses.MapPost("/{id:guid}/modules", async (Guid id, TitleInput input, AppDbContext db, CancellationToken ct) =>
        {
            if (!await db.Courses.AnyAsync(c => c.Id == id, ct)) return Results.NotFound();
            if (Trim(input.Title) is not { } title) return Field("title", "Donnez un titre au module.");
            int order = await db.CourseModules.CountAsync(m => m.CourseId == id, ct);
            db.CourseModules.Add(new CourseModule { CourseId = id, Title = Clip(title, 120), SortOrder = order });
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        courses.MapPut("/modules/{id:guid}", async (Guid id, TitleInput input, AppDbContext db, CancellationToken ct) =>
        {
            var module = await db.CourseModules.FirstOrDefaultAsync(m => m.Id == id, ct);
            if (module is null) return Results.NotFound();
            if (Trim(input.Title) is not { } title) return Field("title", "Donnez un titre au module.");
            module.Title = Clip(title, 120);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        courses.MapDelete("/modules/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
        {
            var module = await db.CourseModules.FirstOrDefaultAsync(m => m.Id == id, ct);
            if (module is null) return Results.NotFound();
            db.CourseModules.Remove(module);
            await db.SaveChangesAsync(ct);
            await Renumber(db.CourseModules.Where(m => m.CourseId == module.CourseId), ct, db);
            return Results.NoContent();
        });

        courses.MapPost("/modules/{id:guid}/move",
                        async (Guid id, MoveInput input, AppDbContext db, CancellationToken ct) =>
                        {
                            var module = await db.CourseModules.FirstOrDefaultAsync(m => m.Id == id, ct);
                            if (module is null) return Results.NotFound();
                            var siblings = await db.CourseModules.Where(m => m.CourseId == module.CourseId)
                                .OrderBy(m => m.SortOrder).ToListAsync(ct);
                            Move(siblings, module, input.Up, (m, i) => m.SortOrder = i);
                            await db.SaveChangesAsync(ct);
                            return Results.NoContent();
                        });

        courses.MapPost("/modules/{id:guid}/lessons",
                        async (Guid id, LessonInput input, AppDbContext db, CancellationToken ct) =>
                        {
                            if (!await db.CourseModules.AnyAsync(m => m.Id == id, ct)) return Results.NotFound();
                            if (ValidateLesson(input) is { } problem) return problem;
                            var lesson = new Lesson
                            {
                                ModuleId = id, Title = "",
                                SortOrder = await db.Lessons.CountAsync(l => l.ModuleId == id, ct),
                            };
                            Apply(lesson, input);
                            db.Lessons.Add(lesson);
                            await db.SaveChangesAsync(ct);
                            return Results.Ok(new { lesson.Id });
                        });

        courses.MapPut("/lessons/{id:guid}", async (Guid id, LessonInput input, AppDbContext db, CancellationToken ct) =>
        {
            var lesson = await db.Lessons.FirstOrDefaultAsync(l => l.Id == id, ct);
            if (lesson is null) return Results.NotFound();
            if (ValidateLesson(input) is { } problem) return problem;
            Apply(lesson, input);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        courses.MapDelete("/lessons/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
        {
            var lesson = await db.Lessons.FirstOrDefaultAsync(l => l.Id == id, ct);
            if (lesson is null) return Results.NotFound();
            db.Lessons.Remove(lesson);
            await db.SaveChangesAsync(ct);
            await Renumber(db.Lessons.Where(l => l.ModuleId == lesson.ModuleId), ct, db);
            return Results.NoContent();
        });

        courses.MapPost("/lessons/{id:guid}/move",
                        async (Guid id, MoveInput input, AppDbContext db, CancellationToken ct) =>
                        {
                            var lesson = await db.Lessons.FirstOrDefaultAsync(l => l.Id == id, ct);
                            if (lesson is null) return Results.NotFound();
                            var siblings = await db.Lessons.Where(l => l.ModuleId == lesson.ModuleId)
                                .OrderBy(l => l.SortOrder).ToListAsync(ct);
                            Move(siblings, lesson, input.Up, (l, i) => l.SortOrder = i);
                            await db.SaveChangesAsync(ct);
                            return Results.NoContent();
                        });

        // ---------- Membres d'une formation ----------
        courses.MapGet("/{id:guid}/enrollments", async (Guid id, AppDbContext db, CancellationToken ct) =>
        {
            int total = await db.Lessons.CountAsync(l => l.Module!.CourseId == id, ct);
            return await db.Enrollments.Where(e => e.CourseId == id).OrderByDescending(e => e.CreatedAt)
                .Select(e => new AdminEnrollmentDto(
                            e.UserId, e.User!.DisplayName, e.User.Email, e.Source, e.CreatedAt, total,
                            db.LessonProgress.Count(p => p.UserId == e.UserId && p.Lesson!.Module!.CourseId == id)))
                .ToListAsync(ct);
        });

        courses.MapPost("/{id:guid}/enrollments", async (
                            Guid id, EnrollInput input, AppDbContext db, PaymentService payments, TimeProvider clock,
                            CancellationToken ct) =>
                        {
                            if (!await db.Courses.AnyAsync(c => c.Id == id, ct)
                             || !await db.Users.AnyAsync(u => u.Id == input.UserId, ct))
                                return Results.NotFound();
                            await payments.EnrollAsync(id, input.UserId, null, clock.GetUtcNow(), ct);
                            await db.SaveChangesAsync(ct);
                            return Results.NoContent();
                        });

        courses.MapDelete("/{id:guid}/enrollments/{userId:guid}",
                          async (Guid id, Guid userId, AppDbContext db, CancellationToken ct) =>
                          {
                              await db.Enrollments.Where(e => e.CourseId == id && e.UserId == userId)
                                  .ExecuteDeleteAsync(ct);
                              return Results.NoContent();
                          });

        // ---------- Paiements ----------
        var payments = app.MapGroup("/api/admin/payments")
            .WithTags("Back-office · Paiements")
            .RequireAuthorization(Policies.Admin)
            .RequireAdminZone(configuration);

        payments.MapGet("/", async (HttpRequest http, AppDbContext db, IConfiguration config, CancellationToken ct) =>
        {
            string baseUrl = LearningRules.PublicBaseUrl(http, config);
            return await db.Payments.OrderByDescending(p => p.CreatedAt).Take(300)
                .Select(p => new AdminPaymentDto(
                            p.Id, p.Kind, p.Status, p.Label, p.AmountCents, p.Currency, p.CustomerName, p.Email,
                            p.User != null ? p.User.DisplayName ?? p.User.Email : null,
                            p.Course != null ? p.Course.Title : null,
                            p.PaymentMethod, p.ReceiptUrl, p.CreatedById != null, p.TicketId, p.CreatedAt, p.PaidAt,
                            p.ExpiresAt,
                            $"{baseUrl}/paiement/{p.Token}"))
                .ToListAsync(ct);
        });

        payments.MapPost("/", async (
                             PaymentRequestInput input, ClaimsPrincipal principal, HttpRequest http, AppDbContext db,
                             PaymentService service, EmailSender email, StripeOptions stripeOptions,
                             IConfiguration config,
                             TimeProvider clock, CancellationToken ct) =>
                         {
                             var course = input.CourseId is { } courseId
                                 ? await db.Courses.FirstOrDefaultAsync(c => c.Id == courseId, ct)
                                 : null;
                             if (input.Kind == PaymentKind.Course && course is null)
                                 return Field("courseId", "Choisissez la formation concernée.");
                             var client = input.UserId is { } userId
                                 ? await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
                                 : null;

                             long amount = input.AmountCents ?? course?.PriceCents ?? 0;
                             if (!LearningRules.IsValidAmount(amount))
                                 return Field("amountCents", "Montant entre 1 € et 50 000 €.");
                             string? to = Trim(input.Email) ?? client?.Email;
                             if (input.SendEmail && to is null)
                                 return Field("email", "Indiquez l'adresse e-mail du client pour lui envoyer le lien.");
                             string label = Trim(input.Label)
                                         ?? course?.Title
                                         ?? (input.Kind == PaymentKind.Seminar
                                                ? "Séminaire Synégo"
                                                : "Accompagnement Synégo");

                             var now = clock.GetUtcNow();
                             var payment = service.NewPayment(input.Kind, Clip(label, 160), amount,
                                                              now.AddDays(
                                                                  Math.Clamp(
                                                                      input.ExpiresInDays
                                                                   ?? stripeOptions.PaymentLinkDays, 1, 90)));
                             payment.CourseId = course?.Id;
                             payment.UserId = client?.Id;
                             payment.Email = to;
                             payment.CustomerName = Trim(input.Name) ?? client?.DisplayName;
                             payment.TicketId = input.TicketId;
                             payment.Locale = input.Locale == "en" ? "en" : "fr";
                             payment.CreatedById = principal.GetUserId();
                             db.Payments.Add(payment);
                             await db.SaveChangesAsync(ct);

                             string url = $"{LearningRules.PublicBaseUrl(http, config)}/paiement/{payment.Token}";
                             bool sent = input.SendEmail && await TrySendAsync(email, payment, url, ct);
                             return Results.Ok(new { payment.Id, url, emailed = sent, smtp = email.IsConfigured });
                         });

        payments.MapPost("/{id:guid}/send", async (
                             Guid id, HttpRequest http, AppDbContext db, EmailSender email, IConfiguration config,
                             CancellationToken ct) =>
                         {
                             var payment = await db.Payments.FirstOrDefaultAsync(p => p.Id == id, ct);
                             if (payment is null) return Results.NotFound();
                             if (payment.Email is null) return Field("email", "Aucune adresse e-mail pour ce paiement.");
                             string url = $"{LearningRules.PublicBaseUrl(http, config)}/paiement/{payment.Token}";
                             return Results.Ok(new
                             {
                                 emailed = await TrySendAsync(email, payment, url, ct), smtp = email.IsConfigured,
                             });
                         });

        payments.MapPost("/{id:guid}/cancel",
                         async (Guid id, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
                         {
                             var payment = await db.Payments.FirstOrDefaultAsync(p => p.Id == id, ct);
                             if (payment is null) return Results.NotFound();
                             if (payment.Status == PaymentStatus.Paid)
                                 return Results.Problem(statusCode: 409,
                                                        title:
                                                        "Paiement déjà réglé : remboursez-le depuis Stripe si besoin.");
                             payment.Status = PaymentStatus.Canceled;
                             payment.UpdatedAt = clock.GetUtcNow();
                             await db.SaveChangesAsync(ct);
                             return Results.NoContent();
                         });

        // ---------- Compte Stripe ----------
        payments.MapGet("/stripe", async (StripeSettings settings, IConfiguration config, CancellationToken ct) =>
        {
            string? key = await settings.GetSecretKeyAsync(ct);
            return new StripeStatusDto(
                key is not null,
                key is not null && !await settings.IsConnectedFromAdminAsync(ct),
                key?.Contains("_live_", StringComparison.Ordinal) == true ? "live" : key is null ? null : "test",
                await settings.GetWebhookSecretAsync(ct) is not null,
                !IsPublicHttps(config["App:PublicUrl"]));
        });

        payments.MapPost("/stripe/connect", async (
                             StripeConnectInput input, StripeSettings settings, IConfiguration config,
                             CancellationToken ct) =>
                         {
                             string? key = input.SecretKey?.Trim();
                             if (!StripeGateway.LooksLikeSecretKey(key))
                                 return Field(
                                     "secretKey",
                                     "Collez une clé secrète Stripe (elle commence par sk_test_ ou sk_live_).");
                             try
                             {
                                 await StripeGateway.ValidateKeyAsync(key!, ct);
                             }
                             catch (StripeException)
                             {
                                 return Field(
                                     "secretKey", "Stripe refuse cette clé : vérifiez-la dans Développeurs › Clés API.");
                             }

                             if (await settings.GetWebhookIdAsync(ct) is { } oldWebhook
                              && await settings.GetSecretKeyAsync(ct) is { } oldKey)
                                 await StripeGateway.DeleteWebhookAsync(oldKey, oldWebhook, ct);

                             (string Id, string Secret)? webhook = null;
                             if (IsPublicHttps(config["App:PublicUrl"]))
                             {
                                 try
                                 {
                                     webhook = await StripeGateway.CreateWebhookAsync(key!, config["App:PublicUrl"]!, ct);
                                 }
                                 catch (StripeException)
                                 {
                                     // sans webhook, la page de retour valide quand même les paiements
                                 }
                             }
                             await settings.ConnectAsync(key!, webhook?.Id, webhook?.Secret, ct);
                             return Results.NoContent();
                         });

        payments.MapDelete("/stripe", async (StripeSettings settings, CancellationToken ct) =>
        {
            if (await settings.GetWebhookIdAsync(ct) is { } webhook && await settings.GetSecretKeyAsync(ct) is { } key)
                await StripeGateway.DeleteWebhookAsync(key, webhook, ct);
            await settings.DisconnectAsync(ct);
            return Results.NoContent();
        });
    }

    static async Task<bool> TrySendAsync(EmailSender email, Payment payment, string url, CancellationToken ct)
    {
        if (!email.IsConfigured || payment.Email is null) return false;
        try
        {
            await email.SendAsync(PaymentEmails.Build(payment, url), ct);
            return true;
        }
        catch (Exception e) when (e is CommandException or ProtocolException or SocketException
                                      or IOException)
        {
            return false;
        }
    }

    static IResult? Validate(CourseInput input)
    {
        if (Trim(input.Title) is null) return Field("title", "Donnez un titre à la formation.");
        if (Trim(input.Summary) is null) return Field("summary", "Ajoutez une phrase de présentation.");
        if (input.Title!.Trim().Length > 120) return Field("title", "Titre trop long (120 caractères maximum).");
        if (input.Summary!.Trim().Length > 300)
            return Field("summary", "Présentation trop longue (300 caractères maximum).");
        if ((input.Description?.Length ?? 0) > 8000)
            return Field("description", "Description trop longue (8 000 caractères maximum).");
        if (input.Published && !LearningRules.IsValidAmount(input.PriceCents))
            return Field("priceCents", "Indiquez un prix entre 1 € et 50 000 € avant de publier.");
        if (input.PriceCents is < 0 or > LearningRules.MaxAmountCents) return Field("priceCents", "Prix invalide.");
        return null;
    }

    static IResult? ValidateLesson(LessonInput input)
    {
        if (Trim(input.Title) is null) return Field("title", "Donnez un titre à la leçon.");
        if (Trim(input.VideoUrl) is { } video && LearningRules.VideoEmbedUrl(video) is null)
            return Field("videoUrl", "Lien vidéo non reconnu : utilisez un lien YouTube, Vimeo ou Loom (https).");
        if ((input.Body?.Length ?? 0) > 20000) return Field("body", "Texte trop long (20 000 caractères maximum).");
        if (input.DurationMinutes is < 0 or > 1000) return Field("durationMinutes", "Durée invalide.");
        return null;
    }

    static void Apply(Lesson lesson, LessonInput input)
    {
        lesson.Title = Clip(input.Title!.Trim(), 160);
        lesson.Body = input.Body?.Trim() ?? "";
        lesson.VideoUrl = Trim(input.VideoUrl);
        lesson.DurationMinutes = input.DurationMinutes;
        lesson.FreePreview = input.FreePreview;
    }

    static void Move<T>(List<T> siblings, T item, bool up, Action<T, int> setOrder)
    {
        int index = siblings.IndexOf(item);
        int target = up ? index - 1 : index + 1;
        if (index < 0 || target < 0 || target >= siblings.Count) return;
        (siblings[index], siblings[target]) = (siblings[target], siblings[index]);
        for (int i = 0; i < siblings.Count; i++) setOrder(siblings[i], i);
    }

    static async Task Renumber<T>(IQueryable<T> query, CancellationToken ct, AppDbContext db) where T : class
    {
        var items = await query.ToListAsync(ct);
        var ordered = items switch
        {
            List<CourseModule> modules => modules.OrderBy(m => m.SortOrder).Cast<T>().ToList(),
            List<Lesson> lessons => lessons.OrderBy(l => l.SortOrder).Cast<T>().ToList(),
            _ => items,
        };
        for (int i = 0; i < ordered.Count; i++)
        {
            if (ordered[i] is CourseModule m) m.SortOrder = i;
            else if (ordered[i] is Lesson l) l.SortOrder = i;
        }
        await db.SaveChangesAsync(ct);
    }

    static async Task<string> UniqueSlugAsync(AppDbContext db, string slug, Guid? except, CancellationToken ct)
    {
        string candidate = slug;
        for (int i = 2; await db.Courses.AnyAsync(c => c.Slug == candidate && c.Id != except, ct); i++)
            candidate = $"{slug}-{i}";
        return candidate;
    }

    static bool IsPublicHttps(string? url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri)
     && uri.Scheme == Uri.UriSchemeHttps
     && !uri.IsLoopback
     && uri.Host != "localhost";

    static string? Trim(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    static string Clip(string value, int max) => value.Length > max ? value[..max] : value;

    static IResult Field(string name, string message) =>
        Results.ValidationProblem(new Dictionary<string, string[]> { [name] = [message] });
}

public sealed record CourseInput(
    string? Title,
    string? Slug,
    string? Summary,
    string? Description,
    string? DurationLabel,
    long PriceCents,
    bool Published);

public sealed record TitleInput(string? Title);
public sealed record MoveInput(bool Up);
public sealed record LessonInput(string? Title, string? Body, string? VideoUrl, int? DurationMinutes, bool FreePreview);
public sealed record EnrollInput(Guid UserId);

public sealed record PaymentRequestInput(
    PaymentKind Kind,
    Guid? CourseId,
    Guid? UserId,
    string? Email,
    string? Name,
    string? Label,
    long? AmountCents,
    int? TicketId,
    int? ExpiresInDays,
    bool SendEmail,
    string? Locale);

public sealed record StripeConnectInput(string? SecretKey);

public sealed record AdminCourseRowDto(
    Guid Id,
    string Slug,
    string Title,
    string Summary,
    long PriceCents,
    string Currency,
    bool Published,
    int Modules,
    int Lessons,
    int Members,
    long RevenueCents);

public sealed record AdminLessonDto(
    Guid Id,
    string Title,
    string Body,
    string? VideoUrl,
    bool VideoOk,
    int? DurationMinutes,
    bool FreePreview);

public sealed record AdminModuleDto(Guid Id, string Title, List<AdminLessonDto> Lessons);

public sealed record AdminCourseDto(
    Guid Id,
    string Slug,
    string Title,
    string Summary,
    string Description,
    string? DurationLabel,
    long PriceCents,
    string Currency,
    bool Published,
    List<AdminModuleDto> Modules);

public sealed record AdminEnrollmentDto(
    Guid UserId,
    string? DisplayName,
    string? Email,
    EnrollmentSource Source,
    DateTimeOffset CreatedAt,
    int Lessons,
    int Done);

public sealed record AdminPaymentDto(
    Guid Id,
    PaymentKind Kind,
    PaymentStatus Status,
    string Label,
    long AmountCents,
    string Currency,
    string? CustomerName,
    string? Email,
    string? AccountName,
    string? CourseTitle,
    string? PaymentMethod,
    string? ReceiptUrl,
    bool FromLink,
    int? TicketId,
    DateTimeOffset CreatedAt,
    DateTimeOffset? PaidAt,
    DateTimeOffset ExpiresAt,
    string Url);

public sealed record StripeStatusDto(
    bool Configured,
    bool FromEnvironment,
    string? Mode,
    bool WebhookActive,
    bool PublicUrlIsLocal);
