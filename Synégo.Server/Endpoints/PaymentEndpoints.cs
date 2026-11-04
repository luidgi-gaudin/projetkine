using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Stripe;
using Stripe.Checkout;
using Synego.Server.Authentication;
using Synego.Server.Data;
using Synego.Server.Learning;
using Synego.Server.Payments;

namespace Synego.Server.Endpoints;

/// <summary>Liens de paiement (séminaires, formations, accompagnements), retour de Stripe et webhook.</summary>
public static class PaymentEndpoints
{
    public static void MapPaymentEndpoints(this IEndpointRouteBuilder app)
    {
        // ---------- Lien de paiement envoyé par la coach : /paiement/{token} ----------
        app.MapGet("/api/payments/link/{token}", async (
                       string token, AppDbContext db, StripeGateway stripe, TimeProvider clock, CancellationToken ct) =>
                   {
                       if (!LearningRules.IsValidPaymentToken(token)) return Results.NotFound();
                       var payment = await db.Payments.AsNoTracking().Include(p => p.Course)
                           .FirstOrDefaultAsync(p => p.Token == token, ct);
                       if (payment is null) return Results.NotFound();
                       return Results.Ok(new PaymentLinkDto(
                                             payment.Label, payment.Kind, payment.AmountCents, payment.Currency,
                                             payment.Status, payment.ExpiresAt < clock.GetUtcNow(),
                                             LearningRules.FirstName(payment.CustomerName),
                                             payment.Course?.Slug, payment.Course?.Title, payment.ReceiptUrl,
                                             await stripe.IsConfiguredAsync(ct)));
                   })
            .WithTags("Paiements").AllowAnonymous();

        app.MapPost("/api/payments/link/{token}/checkout", async (
                        string token, CheckoutRequest request, HttpRequest http, AppDbContext db, PaymentService payments,
                        IConfiguration config, TimeProvider clock, CancellationToken ct) =>
                    {
                        if (!LearningRules.IsValidPaymentToken(token)) return Results.NotFound();
                        if (!request.AcceptTerms) return CourseEndpoints.TermsRequired();
                        var payment = await db.Payments.FirstOrDefaultAsync(p => p.Token == token, ct);
                        if (payment is null) return Results.NotFound();
                        if (payment.Status == PaymentStatus.Paid)
                            return Results.Problem(statusCode: 409, title: "Ce paiement a déjà été réglé. Merci !");
                        if (payment.Status is PaymentStatus.Canceled or PaymentStatus.Refunded
                         || payment.ExpiresAt < clock.GetUtcNow())
                            return Results.Problem(statusCode: 410,
                                                   title:
                                                   "Ce lien de paiement n'est plus valable. Demandez-en un nouveau à Synégo.");

                        payment.Status = PaymentStatus.Pending; // un essai précédent a pu échouer
                        payment.TermsAcceptedAt = clock.GetUtcNow();
                        if (request.Locale is "fr" or "en") payment.Locale = request.Locale;
                        return await CourseEndpoints.CheckoutAsync(payments, payment,
                                                                   LearningRules.PublicBaseUrl(http, config),
                                                                   $"/paiement/{token}", ct);
                    })
            .WithTags("Paiements").AllowAnonymous().RequireRateLimiting(RateLimits.Public);

        // ---------- Retour du client après Stripe (/paiement/merci?session_id=…) ----------
        // Le webhook valide déjà le paiement ; ce second chemin rend la page de retour immédiate et fiable,
        // même sans webhook (développement local).
        app.MapPost("/api/payments/confirm",
                    async (ConfirmRequest request, PaymentService payments, AppDbContext db, CancellationToken ct) =>
                    {
                        if (string.IsNullOrWhiteSpace(request.SessionId)
                         || !request.SessionId.StartsWith("cs_", StringComparison.Ordinal))
                            return Results.NotFound();
                        try
                        {
                            var payment = await payments.SyncSessionAsync(request.SessionId, ct);
                            if (payment is null) return Results.NotFound();
                            string? slug = payment.CourseId is { } courseId
                                ? await db.Courses.Where(c => c.Id == courseId).Select(c => c.Slug)
                                    .FirstOrDefaultAsync(ct)
                                : null;
                            return Results.Ok(new ConfirmResponse(payment.Status, payment.Kind, payment.Label,
                                                                  payment.AmountCents,
                                                                  payment.Currency, slug, payment.UserId is not null,
                                                                  payment.ReceiptUrl));
                        }
                        catch (PaymentsDisabledException e)
                        {
                            return Results.Problem(statusCode: 503, title: e.Message);
                        }
                        catch (StripeException)
                        {
                            return Results.NotFound();
                        }
                    })
            .WithTags("Paiements").AllowAnonymous().RequireRateLimiting(RateLimits.Public);

        // ---------- Webhook Stripe (signature vérifiée) ----------
        app.MapPost("/api/webhooks/stripe", async (
                        HttpRequest http, StripeGateway stripe, PaymentService payments, ILoggerFactory loggers,
                        CancellationToken ct) =>
                    {
                        string json = await new StreamReader(http.Body).ReadToEndAsync(ct);
                        Event stripeEvent;
                        try
                        {
                            stripeEvent = await stripe.ParseWebhookAsync(json, http.Headers["Stripe-Signature"], ct);
                        }
                        catch (StripeException)
                        {
                            return Results.BadRequest();
                        }

                        var logger = loggers.CreateLogger("Synego.Stripe");
                        try
                        {
                            switch (stripeEvent.Type)
                            {
                                case EventTypes.CheckoutSessionCompleted:
                                case EventTypes.CheckoutSessionAsyncPaymentSucceeded:
                                    if (stripeEvent.Data.Object is Session completed)
                                        await payments.SyncSessionAsync(completed.Id, ct);
                                    break;
                                case EventTypes.CheckoutSessionAsyncPaymentFailed:
                                    if (stripeEvent.Data.Object is Session failed)
                                        await payments.MarkFailedAsync(failed.Id, ct);
                                    break;
                                case EventTypes.ChargeRefunded:
                                    if (stripeEvent.Data.Object is Charge { Refunded: true, PaymentIntentId: { } intent })
                                        await payments.MarkRefundedAsync(intent, ct);
                                    break;
                            }
                        }
                        catch (StripeException e)
                        {
                            // Stripe renverra l'événement plus tard.
                            logger.LogWarning(e, "Webhook Stripe {Type} non traité.", stripeEvent.Type);
                            return Results.StatusCode(503);
                        }
                        return Results.Ok();
                    })
            .WithTags("Paiements").AllowAnonymous();

        // ---------- Paiements du client connecté ----------
        app.MapGet("/api/payments/mine", async (
                       ClaimsPrincipal principal, HttpRequest http, AppDbContext db, PaymentService payments,
                       IConfiguration config, CancellationToken ct) =>
                   {
                       var user = await db.Users.FirstAsync(u => u.Id == principal.GetUserId(), ct);
                       if (CourseEndpoints.IsEmailVerified(principal)) await payments.ClaimPendingAsync(user, ct);
                       string? email = CourseEndpoints.IsEmailVerified(principal) ? user.Email?.ToLower() : null;
                       string baseUrl = LearningRules.PublicBaseUrl(http, config);
                       return await db.Payments
                           .Where(p => p.UserId == user.Id
                                    || email != null && p.Email != null && p.Email.ToLower() == email)
                           .Where(p => p.Status != PaymentStatus.Canceled
                                    && (p.Status != PaymentStatus.Pending || p.CreatedById != null))
                           .OrderByDescending(p => p.CreatedAt)
                           .Select(p => new MyPaymentDto(p.Id, p.Label, p.Kind, p.AmountCents, p.Currency, p.Status,
                                                         p.CreatedAt, p.PaidAt, p.ExpiresAt, p.ReceiptUrl,
                                                         p.Status == PaymentStatus.Pending
                                                             ? $"{baseUrl}/paiement/{p.Token}"
                                                             : null))
                           .ToListAsync(ct);
                   })
            .WithTags("Paiements").RequireAuthorization();
    }
}

public sealed record ConfirmRequest(string? SessionId);

public sealed record PaymentLinkDto(
    string Label,
    PaymentKind Kind,
    long AmountCents,
    string Currency,
    PaymentStatus Status,
    bool Expired,
    string? FirstName,
    string? CourseSlug,
    string? CourseTitle,
    string? ReceiptUrl,
    bool PaymentsEnabled);

public sealed record ConfirmResponse(
    PaymentStatus Status,
    PaymentKind Kind,
    string Label,
    long AmountCents,
    string Currency,
    string? CourseSlug,
    bool LinkedToAccount,
    string? ReceiptUrl);

public sealed record MyPaymentDto(
    Guid Id,
    string Label,
    PaymentKind Kind,
    long AmountCents,
    string Currency,
    PaymentStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? PaidAt,
    DateTimeOffset ExpiresAt,
    string? ReceiptUrl,
    string? PayUrl);
