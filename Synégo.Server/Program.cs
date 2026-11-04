using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Synego.Server.Authentication;
using Synego.Server.Booking;
using Synego.Server.Configuration;
using Synego.Server.Data;
using Synego.Server.Documents;
using Synego.Server.Endpoints;
using Synego.Server.Notifications;
using Synego.Server.Payments;
using Synego.Server.Security;

// Charge le .env (racine de la solution) avant de lire la configuration.
DotEnv.Load();

var builder = WebApplication.CreateBuilder(args);
bool migrateOnly = args.Contains("--migrate");

// ---------- PostgreSQL ----------
// L'API tourne avec un compte aux droits limités (lecture/écriture des lignes, pas de DDL).
// Les migrations utilisent le compte propriétaire du schéma, dans un conteneur à part.
builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(
                                                builder.Configuration.GetConnectionString("Default"),
                                                AppDbContext.ConfigureNpgsql));

// ---------- Firebase : connexion (Auth) + documents (Storage) ----------
builder.Services.AddFirebaseAuthentication(builder.Configuration);

var storage = builder.Configuration.GetSection(StorageOptions.Section).Get<StorageOptions>() ?? new StorageOptions();
builder.Services.AddSingleton(storage);
builder.Services.AddSingleton<IDocumentStore>(_ => storage.Provider.Equals("Firebase", StringComparison.OrdinalIgnoreCase)
                                                  ? FirebaseDocumentStore.Create(storage)
                                                  : new LocalDocumentStore(storage));
builder.Services.AddScoped<DocumentService>();
builder.Services.AddHostedService<DocumentPurgeService>();

// ---------- Rendez-vous (Calendly) ----------
builder.Services.Configure<BookingOptions>(builder.Configuration.GetSection(BookingOptions.Section));
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<CalendlyClient>(http => http.Timeout = TimeSpan.FromSeconds(10));
builder.Services.AddScoped<CalendlySettings>();
builder.Services.AddScoped<AppointmentSync>();

// Chiffre le jeton Calendly en base. Les clés doivent survivre aux redémarrages (volume Docker).
builder.Services.AddDataProtection()
    .SetApplicationName("Synego")
    .PersistKeysToFileSystem(
        new DirectoryInfo(DotEnv.ResolvePath(builder.Configuration["DataProtection:KeysPath"] ?? "./data/keys")));

// ---------- Rappels de rendez-vous par e-mail (48 h et 24 h avant) ----------
builder.Services.AddSingleton(builder.Configuration.GetSection(EmailOptions.Section).Get<EmailOptions>()
                           ?? new EmailOptions());
builder.Services.AddSingleton(builder.Configuration.GetSection(ReminderOptions.Section).Get<ReminderOptions>()
                           ?? new ReminderOptions());
builder.Services.AddSingleton<EmailSender>();
builder.Services.AddHostedService<ReminderService>();

// ---------- Formations et paiements (Stripe : carte, Klarna en plusieurs fois) ----------
builder.Services.AddSingleton(builder.Configuration.GetSection(StripeOptions.Section).Get<StripeOptions>()
                           ?? new StripeOptions());
builder.Services.AddScoped<StripeSettings>();
builder.Services.AddScoped<StripeGateway>();
builder.Services.AddScoped<PaymentService>();

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(json => json.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.Configure<FormOptions>(form =>
                                            form.MultipartBodyLengthLimit = storage.MaxUploadBytes + 64 * 1024);

// L'API n'est joignable que par nginx (réseau Docker interne) : on fait confiance à ses en-têtes X-Forwarded-*.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddRateLimiter(limiter =>
{
    limiter.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    limiter.AddPolicy(RateLimits.Public, http => RateLimitPartition.GetFixedWindowLimiter(
                          http.Connection.RemoteIpAddress?.ToString() ?? "inconnu",
                          _ => new FixedWindowRateLimiterOptions
                              { PermitLimit = 10, Window = TimeSpan.FromMinutes(10) }));
});

var app = builder.Build();

// ---------- Migrations ----------
// Prod : `dotnet Synégo.Server.dll --migrate` (service « migrate » de compose.yaml), puis arrêt.
// Dev : appliquées au démarrage si Database:MigrateOnStartup = true.
if (migrateOnly || app.Configuration.GetValue("Database:MigrateOnStartup", false))
{
    string connectionString = app.Configuration.GetConnectionString("Migrations")
                           ?? app.Configuration.GetConnectionString("Default")!;
    await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
                                              .UseNpgsql(connectionString, AppDbContext.ConfigureNpgsql).Options);
    await db.Database.MigrateAsync();
    app.Logger.LogInformation("Base de données à jour.");
    if (migrateOnly) return;
}

// ---------- Pipeline HTTP ----------
app.UseForwardedHeaders();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi(); // /openapi/v1.json
}
else
{
    app.UseExceptionHandler();
}

app.UseStatusCodePages();
app.UseSecurityHeaders();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapHealthEndpoints();
app.MapUserEndpoints();
app.MapBookingEndpoints();
app.MapDocumentEndpoints();
app.MapTicketEndpoints();
app.MapAdminEndpoints(app.Configuration);
app.MapCalendlyAdminEndpoints(app.Configuration);
app.MapCoachEndpoints(app.Configuration);
app.MapCourseEndpoints();
app.MapPaymentEndpoints();
app.MapAdminLearningEndpoints(app.Configuration);

// Le site React est servi par nginx : ici, toute route inconnue est une 404 JSON.
app.MapFallback(() => Results.NotFound());

app.Run();

public static class RateLimits
{
    /// <summary>Formulaires publics (contact, devis, confirmation de RDV) : 10 envois / 10 min / IP.</summary>
    public const string Public = "public";
}
