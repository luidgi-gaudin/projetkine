namespace Synego.Server.Security;

/// <summary>
///     Protection CSRF (défense en profondeur, en plus du cookie SameSite=Strict) :
///     toute requête /api qui modifie l'état doit porter l'en-tête <c>X-Requested-With</c>.
///     Un formulaire ou un lien d'un site tiers ne peut pas ajouter cet en-tête,
///     et un fetch cross-origin avec en-tête custom est bloqué par le preflight CORS.
/// </summary>
public static class CsrfHeaderMiddleware
{
    public const string HeaderName = "X-Requested-With";

    public static IApplicationBuilder UseCsrfHeaderCheck(this IApplicationBuilder app) =>
        app.Use(async (context, next) =>
        {
            var request = context.Request;
            bool isSafeMethod = HttpMethods.IsGet(request.Method)
                             || HttpMethods.IsHead(request.Method)
                             || HttpMethods.IsOptions(request.Method);

            if (!isSafeMethod
             && request.Path.StartsWithSegments("/api")
             && !request.Headers.ContainsKey(HeaderName))
            {
                await Results.Problem(
                        statusCode: StatusCodes.Status400BadRequest,
                        title: $"En-tête {HeaderName} manquant.")
                    .ExecuteAsync(context);
                return;
            }

            await next();
        });
}
