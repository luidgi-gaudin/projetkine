namespace Synego.Server.Security;

/// <summary>
///     Le back-office n'est servi que par le bloc nginx « admin », publié uniquement sur l'IP du VPN
///     WireGuard. Ce bloc ajoute <c>X-Synego-Zone: admin</c> ; le bloc public écrase cet en-tête.
///     Défense en profondeur : même avec un compte admin volé, /api/admin est introuvable hors VPN.
/// </summary>
public static class AdminZone
{
    public const string HeaderName = "X-Synego-Zone";

    public static RouteGroupBuilder RequireAdminZone(this RouteGroupBuilder group, IConfiguration configuration)
    {
        if (!configuration.GetValue("Security:RequireAdminZone", false)) return group;

        return group.AddEndpointFilter(async (context, next) =>
                                           context.HttpContext.Request.Headers[HeaderName] == "admin"
                                               ? await next(context)
                                               : Results.NotFound());
    }
}
