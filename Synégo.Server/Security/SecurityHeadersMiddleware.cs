namespace Synego.Server.Security;

/// <summary>Ajoute les en-têtes HTTP de sécurité à chaque réponse.</summary>
public static class SecurityHeadersMiddleware
{
    const string ContentSecurityPolicy =
        "default-src 'self'; "
      + "script-src 'self'; "
      + "style-src 'self'; "
      + "img-src 'self' data:; "
      + "font-src 'self'; "
      + "connect-src 'self'; "
      + "object-src 'none'; "
      + "base-uri 'self'; "
      + "form-action 'self'; "
      + "frame-ancestors 'none'";

    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app) =>
        app.Use(async (context, next) =>
        {
            var headers = context.Response.Headers;
            headers["X-Content-Type-Options"] = "nosniff";
            headers["X-Frame-Options"] = "DENY";
            headers["Referrer-Policy"] = "no-referrer";
            headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
            headers["Cross-Origin-Opener-Policy"] = "same-origin";
            headers["Content-Security-Policy"] = ContentSecurityPolicy;
            await next();
        });
}
