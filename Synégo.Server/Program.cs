using System.Threading.RateLimiting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Synego.Server.Configuration;
using Synego.Server.Data;
using Synego.Server.Endpoints;
using Synego.Server.Firestore;
using Synego.Server.Security;

// Charge le .env (racine de la solution) avant de lire la configuration.
DotEnv.Load();

var builder = WebApplication.CreateBuilder(args);

// ---------- Base de données ----------
builder.Services.AddDbContext<AppDbContext>(options =>
                                                options.UseSqlite(builder.Configuration.GetConnectionString("Default")
                                                               ?? throw new InvalidOperationException(
                                                                      "ConnectionStrings:Default manquante.")));

// ---------- Firestore ----------
builder.Services.AddFirestore(builder.Configuration);

// ---------- Authentification (ASP.NET Core Identity + cookie HttpOnly) ----------
builder.Services.AddAuthorization();
builder.Services
    .AddIdentityApiEndpoints<AppUser>(options =>
    {
        options.User.RequireUniqueEmail = true;

        options.Password.RequiredLength = 12;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;

        options.Lockout.AllowedForNewUsers = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);

        // Passe à true quand un envoi d'e-mail (IEmailSender) sera configuré.
        options.SignIn.RequireConfirmedEmail = false;
    })
    .AddEntityFrameworkStores<AppDbContext>();

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "__Host-synego";
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.ExpireTimeSpan = TimeSpan.FromHours(8);
    options.SlidingExpiration = true;

    // API : on renvoie 401/403 au lieu de rediriger vers une page de login.
    options.Events.OnRedirectToLogin = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

// ---------- Data Protection (chiffrement des cookies) ----------
// Les clés doivent survivre aux redémarrages, sinon tout le monde est déconnecté.
string? keysPath = builder.Configuration["DataProtection:KeysPath"];
if (!string.IsNullOrWhiteSpace(keysPath))
{
    builder.Services.AddDataProtection()
        .SetApplicationName("Synego")
        .PersistKeysToFileSystem(new DirectoryInfo(keysPath));
}

// ---------- Rate limiting ----------
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Global : 100 requêtes / minute / IP
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
                                                                                   RateLimitPartition
                                                                                       .GetFixedWindowLimiter(
                                                                                           ctx.Connection.RemoteIpAddress
                                                                                               ?.ToString()
                                                                                        ?? "unknown",
                                                                                           _ =>
                                                                                               new
                                                                                                   FixedWindowRateLimiterOptions
                                                                                                   {
                                                                                                       PermitLimit = 100,
                                                                                                       Window = TimeSpan
                                                                                                           .FromMinutes(
                                                                                                               1),
                                                                                                   }));

    // Auth (login, register, reset…) : 10 requêtes / minute / IP — anti brute-force
    options.AddPolicy(AuthEndpoints.RateLimitPolicy, ctx =>
                          RateLimitPartition.GetFixedWindowLimiter(
                              ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                              _ => new FixedWindowRateLimiterOptions
                                  { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
});

builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
});

var app = builder.Build();

// ---------- Pipeline HTTP ----------
// Applique les migrations EF Core au démarrage (adapté à SQLite / une seule instance).
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // /openapi/v1.json
}
else
{
    app.UseExceptionHandler();
    app.UseHsts();
}

app.UseStatusCodePages();
app.UseHttpsRedirection();
app.UseSecurityHeaders();

// En production, le build React (wwwroot) est servi par ce serveur : même origine, pas de CORS.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRateLimiter();
app.UseCsrfHeaderCheck();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthEndpoints();
app.MapAuthEndpoints();
app.MapFirestoreEndpoints();

// Tes futurs endpoints métier : app.MapGroup("/api/xxx").RequireAuthorization()...

// Routes /api inconnues -> 404 JSON ; le reste -> SPA React (routing côté client).
app.MapFallback("/api/{**path}", () => Results.NotFound());
app.MapFallbackToFile("index.html");

app.Run();
