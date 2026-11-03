namespace Synego.Server.Security;

/// <summary>
///     En-têtes de sécurité des réponses de l'API (JSON / fichiers).
///     Ceux du site (CSP de la page, HSTS…) sont posés par nginx : voir deploy/nginx.
/// </summary>
public static class SecurityHeadersMiddleware
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app) =>
        app.Use(async (context, next) =>
        {
            var headers = context.Response.Headers;
            headers["X-Content-Type-Options"] = "nosniff";
            headers["X-Frame-Options"] = "DENY";
            headers["Referrer-Policy"] = "no-referrer";
            headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
            headers["Cache-Control"] = "no-store";
            await next();
        });
}
