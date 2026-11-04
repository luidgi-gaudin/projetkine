using Stripe;
using Stripe.Checkout;
using Synego.Server.Data;

namespace Synego.Server.Payments;

/// <summary>Paiements désactivés : aucune clé Stripe reliée (ni dans le back-office, ni dans le .env).</summary>
public sealed class PaymentsDisabledException() : Exception("Le paiement en ligne n'est pas encore activé.");

public sealed record CheckoutResult(string SessionId, string Url);

/// <summary>État d'une session Stripe Checkout, relu chez Stripe (jamais transmis par le navigateur).</summary>
public sealed record SessionDetails(
    string Id,
    string? ClientReferenceId,
    string? PaymentStatus,
    string? PaymentIntentId,
    string? PaymentMethod,
    string? ReceiptUrl);

/// <summary>
///     Accès à Stripe : sessions de paiement hébergées (carte, Klarna en plusieurs fois, Apple Pay…),
///     webhooks signés. Les moyens de paiement proposés sont ceux activés dans le tableau de bord Stripe
///     (« moyens de paiement dynamiques ») : activer Klarna là-bas suffit à le proposer aux clients.
/// </summary>
public sealed class StripeGateway(StripeSettings settings)
{
    public static readonly string[] WebhookEvents =
    [
        EventTypes.CheckoutSessionCompleted,
        EventTypes.CheckoutSessionAsyncPaymentSucceeded,
        EventTypes.CheckoutSessionAsyncPaymentFailed,
        EventTypes.ChargeRefunded,
    ];

    public async Task<bool> IsConfiguredAsync(CancellationToken ct) => await settings.GetSecretKeyAsync(ct) is not null;

    async Task<StripeClient> ClientAsync(CancellationToken ct) =>
        new StripeClient(await settings.GetSecretKeyAsync(ct) ?? throw new PaymentsDisabledException());

    public async Task<CheckoutResult> CreateCheckoutAsync(Payment payment, string successUrl, string cancelUrl,
                                                          CancellationToken ct)
    {
        var metadata = new Dictionary<string, string>
        {
            ["payment_id"] = payment.Id.ToString(),
            ["kind"] = payment.Kind.ToString(),
        };
        var options = new SessionCreateOptions
        {
            Mode = "payment",
            ClientReferenceId = payment.Id.ToString(),
            CustomerEmail = string.IsNullOrWhiteSpace(payment.Email) ? null : payment.Email,
            Locale = payment.Locale == "en" ? "en" : "fr",
            SuccessUrl = successUrl,
            CancelUrl = cancelUrl,
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            Metadata = metadata,
            PaymentIntentData = new SessionPaymentIntentDataOptions { Description = payment.Label, Metadata = metadata },
            LineItems =
            [
                new SessionLineItemOptions
                {
                    Quantity = 1,
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency = payment.Currency,
                        UnitAmount = payment.AmountCents,
                        ProductData = new SessionLineItemPriceDataProductDataOptions { Name = payment.Label },
                    },
                },
            ],
        };
        var session = await new SessionService(await ClientAsync(ct)).CreateAsync(options, cancellationToken: ct);
        return new CheckoutResult(session.Id, session.Url);
    }

    public async Task<SessionDetails> GetSessionAsync(string sessionId, CancellationToken ct)
    {
        var session = await new SessionService(await ClientAsync(ct)).GetAsync(
            sessionId,
            new SessionGetOptions { Expand = ["payment_intent.latest_charge"] },
            cancellationToken: ct);
        var charge = session.PaymentIntent?.LatestCharge;
        return new SessionDetails(session.Id, session.ClientReferenceId, session.PaymentStatus,
                                  session.PaymentIntentId ?? session.PaymentIntent?.Id,
                                  charge?.PaymentMethodDetails?.Type, charge?.ReceiptUrl);
    }

    /// <summary>Vérifie la signature Stripe (tolérance 5 min). Lève StripeException si elle est invalide.</summary>
    public async Task<Event> ParseWebhookAsync(string json, string? signature, CancellationToken ct)
    {
        string secret = await settings.GetWebhookSecretAsync(ct)
                     ?? throw new StripeException("Webhook Stripe non configuré.");
        return EventUtility.ConstructEvent(json, signature ?? "", secret, 300, false);
    }

    /// <summary>Valide une clé secrète auprès de Stripe (lecture du solde, sans effet).</summary>
    public static async Task ValidateKeyAsync(string secretKey, CancellationToken ct) =>
        await new BalanceService(new StripeClient(secretKey)).GetAsync(cancellationToken: ct);

    /// <summary>Crée le webhook vers /api/webhooks/stripe et renvoie (identifiant, secret de signature).</summary>
    public static async Task<(string Id, string Secret)> CreateWebhookAsync(
        string secretKey, string publicUrl, CancellationToken ct)
    {
        var endpoint = await new WebhookEndpointService(new StripeClient(secretKey)).CreateAsync(
            new WebhookEndpointCreateOptions
            {
                Url = $"{publicUrl.TrimEnd('/')}/api/webhooks/stripe",
                EnabledEvents = [.. WebhookEvents],
                ApiVersion = StripeConfiguration.ApiVersion,
                Description = "Synégo : formations, séminaires et liens de paiement",
            },
            cancellationToken: ct);
        return (endpoint.Id, endpoint.Secret);
    }

    public static async Task DeleteWebhookAsync(string secretKey, string webhookId, CancellationToken ct)
    {
        try
        {
            await new WebhookEndpointService(new StripeClient(secretKey)).DeleteAsync(webhookId, cancellationToken: ct);
        }
        catch (StripeException)
        {
            // déjà supprimé côté Stripe : rien à faire
        }
    }

    public static bool LooksLikeSecretKey(string? key) =>
        key is not null
     && (key.StartsWith("sk_test_", StringComparison.Ordinal)
      || key.StartsWith("sk_live_", StringComparison.Ordinal)
      || key.StartsWith("rk_test_", StringComparison.Ordinal)
      || key.StartsWith("rk_live_", StringComparison.Ordinal));
}
