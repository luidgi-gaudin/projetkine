using Microsoft.EntityFrameworkCore;
using Synego.Server.Data;
using Synego.Server.Learning;

namespace Synego.Server.Payments;

/// <summary>
///     Cycle de vie d'un paiement : création, passage par Stripe Checkout, validation (webhook ou retour du
///     client), ouverture de l'accès à la formation, remboursement. Toutes les opérations sont idempotentes :
///     le webhook et la page de retour peuvent arriver dans n'importe quel ordre, plusieurs fois.
/// </summary>
public sealed class PaymentService(
    AppDbContext db,
    StripeGateway stripe,
    TimeProvider clock,
    ILogger<PaymentService> logger)
{
    /// <summary>Démarre une session Stripe pour ce paiement et renvoie l'adresse où rediriger le client.</summary>
    public async Task<string> StartCheckoutAsync(Payment payment, string baseUrl, string cancelPath, CancellationToken ct)
    {
        var checkout = await stripe.CreateCheckoutAsync(
            payment,
            $"{baseUrl}/paiement/merci?session_id={{CHECKOUT_SESSION_ID}}",
            $"{baseUrl}{cancelPath}",
            ct);
        payment.StripeSessionId = checkout.SessionId;
        payment.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return checkout.Url;
    }

    /// <summary>Relit la session chez Stripe et valide le paiement s'il est payé. Null si la session est inconnue.</summary>
    public async Task<Payment?> SyncSessionAsync(string sessionId, CancellationToken ct)
    {
        var session = await stripe.GetSessionAsync(sessionId, ct);
        var payment = await db.Payments.FirstOrDefaultAsync(p => p.StripeSessionId == session.Id, ct);
        if (payment is null && Guid.TryParse(session.ClientReferenceId, out var id))
            payment = await db.Payments.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (payment is null) return null;

        if (session.PaymentStatus is "paid" or "no_payment_required")
            await FulfillAsync(payment, session, ct);
        return payment;
    }

    public async Task FulfillAsync(Payment payment, SessionDetails session, CancellationToken ct)
    {
        if (payment.Status == PaymentStatus.Paid) return;
        var now = clock.GetUtcNow();
        payment.Status = PaymentStatus.Paid;
        payment.PaidAt = now;
        payment.UpdatedAt = now;
        payment.StripeSessionId = session.Id;
        payment.StripePaymentIntentId = session.PaymentIntentId;
        payment.PaymentMethod = session.PaymentMethod;
        payment.ReceiptUrl = session.ReceiptUrl;

        // Formation : accès immédiat pour le compte concerné. Un lien envoyé à une simple adresse e-mail
        // attend que la personne se connecte avec cette adresse, vérifiée (voir ClaimPendingAsync).
        if (payment.CourseId is { } courseId && payment.UserId is { } userId)
            await EnrollAsync(courseId, userId, payment, now, ct);

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Paiement {Id} validé ({Kind}, {Amount} cts, {Method}).", payment.Id, payment.Kind,
                              payment.AmountCents, payment.PaymentMethod);
    }

    public async Task MarkFailedAsync(string sessionId, CancellationToken ct)
    {
        var payment = await db.Payments.FirstOrDefaultAsync(p => p.StripeSessionId == sessionId, ct);
        if (payment is null || payment.Status == PaymentStatus.Paid) return;
        payment.Status = PaymentStatus.Failed;
        payment.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Remboursement total fait depuis Stripe : le paiement passe en « remboursé » et l'accès est retiré.</summary>
    public async Task MarkRefundedAsync(string paymentIntentId, CancellationToken ct)
    {
        var payment = await db.Payments.FirstOrDefaultAsync(p => p.StripePaymentIntentId == paymentIntentId, ct);
        if (payment is null || payment.Status == PaymentStatus.Refunded) return;
        payment.Status = PaymentStatus.Refunded;
        payment.UpdatedAt = clock.GetUtcNow();
        await db.Enrollments.Where(e => e.PaymentId == payment.Id).ExecuteDeleteAsync(ct);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    ///     Rattache à ce compte les formations payées via un lien envoyé à son adresse e-mail.
    ///     Appelé uniquement quand l'adresse est vérifiée par Firebase : personne ne peut réclamer l'achat d'un autre.
    /// </summary>
    public async Task ClaimPendingAsync(UserAccount user, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(user.Email)) return;
        string email = user.Email.ToLowerInvariant();
        var pending = await db.Payments
            .Where(p => p.UserId == null
                     && p.Email != null
                     && p.Email.ToLower() == email
                     && p.Status == PaymentStatus.Paid)
            .ToListAsync(ct);
        if (pending.Count == 0) return;

        var now = clock.GetUtcNow();
        foreach (var payment in pending)
        {
            payment.UserId = user.Id;
            payment.UpdatedAt = now;
            if (payment.CourseId is { } courseId) await EnrollAsync(courseId, user.Id, payment, now, ct);
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task EnrollAsync(Guid courseId, Guid userId, Payment? payment, DateTimeOffset now, CancellationToken ct)
    {
        bool exists = await db.Enrollments.AnyAsync(e => e.CourseId == courseId && e.UserId == userId, ct)
                   || db.Enrollments.Local.Any(e => e.CourseId == courseId && e.UserId == userId);
        if (exists) return;
        db.Enrollments.Add(new Enrollment
        {
            CourseId = courseId,
            UserId = userId,
            PaymentId = payment?.Id,
            Source = payment is null ? EnrollmentSource.Manual
                : payment.CreatedById is null ? EnrollmentSource.Purchase
                : EnrollmentSource.PaymentLink,
            CreatedAt = now,
        });
    }

    public Payment NewPayment(PaymentKind kind, string label, long amountCents, DateTimeOffset expiresAt) =>
        new Payment
        {
            Token = LearningRules.NewPaymentToken(),
            Kind = kind,
            Label = label,
            AmountCents = amountCents,
            ExpiresAt = expiresAt,
            CreatedAt = clock.GetUtcNow(),
            UpdatedAt = clock.GetUtcNow(),
        };
}
