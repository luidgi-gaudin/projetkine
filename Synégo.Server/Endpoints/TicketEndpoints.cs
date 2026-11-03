using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Synego.Server.Authentication;
using Synego.Server.Data;

namespace Synego.Server.Endpoints;

/// <summary>Espace de tickets : demandes de devis et de contact (site public) et support (espace client).</summary>
public static class TicketEndpoints
{
    public static void MapTicketEndpoints(this IEndpointRouteBuilder app)
    {
        // Formulaire public devis / contact : anonyme, limité en débit, avec champ piège anti-robots.
        app.MapPost("/api/contact", async (
                        ContactRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock,
                        CancellationToken ct) =>
                    {
                        if (!string.IsNullOrEmpty(request.Website)) return Results.Ok(); // robot : on ne dit rien
                        var errors = Validate(request);
                        if (errors.Count > 0) return Results.ValidationProblem(errors);

                        string email = request.Email!.Trim();
                        var authorId = principal.Identity?.IsAuthenticated == true
                            ? principal.GetUserId()
                            : await db.Users.Where(u => u.Email != null && u.Email.ToLower() == email.ToLower())
                                .Select(u => (Guid?)u.Id).FirstOrDefaultAsync(ct);

                        var now = clock.GetUtcNow();
                        var ticket = new Ticket
                        {
                            AuthorId = authorId,
                            ContactName = request.Name!.Trim(),
                            ContactEmail = email,
                            ContactPhone = request.Phone?.Trim(),
                            Company = request.Company?.Trim(),
                            Subject = request.Subject?.Trim() is { Length: > 0 } subject
                                ? subject
                                : request.Kind == TicketCategory.Devis
                                    ? "Demande de devis"
                                    : "Prise de contact",
                            Category = request.Kind == TicketCategory.Devis
                                ? TicketCategory.Devis
                                : TicketCategory.Contact,
                            CreatedAt = now,
                            UpdatedAt = now,
                        };
                        ticket.Messages.Add(new TicketMessage
                        {
                            AuthorId = authorId, AuthorName = ticket.ContactName, Body = request.Message!.Trim(),
                            CreatedAt = now,
                        });
                        db.Tickets.Add(ticket);
                        await db.SaveChangesAsync(ct);
                        return Results.Ok(new { reference = ticket.Id });
                    })
            .WithTags("Demandes")
            .AllowAnonymous()
            .RequireRateLimiting(RateLimits.Public);

        var group = app.MapGroup("/api/tickets")
            .WithTags("Demandes")
            .RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
                         await db.Tickets
                             .Where(t => t.AuthorId == principal.GetUserId())
                             .OrderByDescending(t => t.UpdatedAt)
                             .Select(t => new TicketSummaryDto(t.Id, t.Subject, t.Category, t.Status, t.CreatedAt,
                                                               t.UpdatedAt,
                                                               t.Messages.Count))
                             .ToListAsync(ct));

        group.MapPost("/", async (
                          NewTicket request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock,
                          CancellationToken ct) =>
                      {
                          if (string.IsNullOrWhiteSpace(request.Subject) || string.IsNullOrWhiteSpace(request.Message))
                              return Results.ValidationProblem(new Dictionary<string, string[]>
                              {
                                  ["message"] = ["Indiquez un objet et un message."],
                              });

                          var user = await db.Users.FirstAsync(u => u.Id == principal.GetUserId(), ct);
                          var now = clock.GetUtcNow();
                          var ticket = new Ticket
                          {
                              AuthorId = user.Id,
                              ContactName = user.DisplayName ?? user.Email ?? user.PhoneNumber ?? "Client",
                              ContactEmail = user.Email ?? "",
                              ContactPhone = user.PhoneNumber,
                              Company = user.Company,
                              Subject = Clip(request.Subject, 160),
                              Category = TicketCategory.Support,
                              CreatedAt = now,
                              UpdatedAt = now,
                          };
                          ticket.Messages.Add(new TicketMessage
                          {
                              AuthorId = user.Id, AuthorName = ticket.ContactName, Body = Clip(request.Message, 5000),
                              CreatedAt = now,
                          });
                          db.Tickets.Add(ticket);
                          await db.SaveChangesAsync(ct);
                          return Results.Ok(new { reference = ticket.Id });
                      });

        group.MapGet("/{id:int}", async (int id, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
                         await LoadAsync(db, id, ct) is { } ticket && ticket.AuthorId == principal.GetUserId()
                             ? Results.Ok(TicketDetailDto.From(ticket))
                             : Results.NotFound());

        // Une réponse du client sur une demande close la rouvre.
        group.MapPost("/{id:int}/messages", async (
                          int id, NewMessage request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock,
                          CancellationToken ct) =>
                      {
                          var ticket =
                              await db.Tickets.FirstOrDefaultAsync(t => t.Id == id && t.AuthorId == principal.GetUserId(),
                                                                   ct);
                          if (ticket is null) return Results.NotFound();
                          if (string.IsNullOrWhiteSpace(request.Body))
                              return Results.ValidationProblem(new Dictionary<string, string[]>
                                                                   { ["body"] = ["Message vide."] });

                          var now = clock.GetUtcNow();
                          db.TicketMessages.Add(new TicketMessage
                          {
                              TicketId = ticket.Id, AuthorId = ticket.AuthorId, AuthorName = ticket.ContactName,
                              Body = Clip(request.Body, 5000), CreatedAt = now,
                          });
                          ticket.Status = TicketStatus.Open;
                          ticket.ClosedAt = null;
                          ticket.UpdatedAt = now;
                          await db.SaveChangesAsync(ct);
                          return Results.NoContent();
                      });
    }

    internal static Task<Ticket?> LoadAsync(AppDbContext db, int id, CancellationToken ct) =>
        db.Tickets.Include(t => t.Messages.OrderBy(m => m.CreatedAt)).FirstOrDefaultAsync(t => t.Id == id, ct);

    internal static string Clip(string value, int max) =>
        value.Trim() is var v && v.Length > max ? v[..max] : value.Trim();

    static Dictionary<string, string[]> Validate(ContactRequest r)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(r.Name) || r.Name.Length > 120) errors["name"] = ["Indiquez votre nom."];
        if (string.IsNullOrWhiteSpace(r.Email) || r.Email.Length > 254 || !new EmailAddressAttribute().IsValid(r.Email))
            errors["email"] = ["Adresse e-mail invalide."];
        if (string.IsNullOrWhiteSpace(r.Message) || r.Message.Length > 5000)
            errors["message"] = ["Votre message est vide ou trop long (5000 caractères maximum)."];
        if (r.Phone?.Length > 32) errors["phone"] = ["Numéro trop long."];
        if (r.Company?.Length > 120) errors["company"] = ["120 caractères maximum."];
        if (r.Subject?.Length > 160) errors["subject"] = ["160 caractères maximum."];
        return errors;
    }

    public sealed record ContactRequest(
        TicketCategory Kind,
        string? Name,
        string? Email,
        string? Phone,
        string? Company,
        string? Subject,
        string? Message,
        string? Website);

    public sealed record NewTicket(string Subject, string Message);

    public sealed record NewMessage(string Body);
}

public sealed record TicketSummaryDto(
    int Id,
    string Subject,
    TicketCategory Category,
    TicketStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    int MessageCount);

public sealed record TicketMessageDto(Guid Id, string AuthorName, bool FromStaff, string Body, DateTimeOffset CreatedAt);

public sealed record TicketDetailDto(
    int Id,
    string Subject,
    TicketCategory Category,
    TicketStatus Status,
    string ContactName,
    string ContactEmail,
    string? ContactPhone,
    string? Company,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ClosedAt,
    List<TicketMessageDto> Messages)
{
    public static TicketDetailDto From(Ticket t) =>
        new TicketDetailDto(t.Id, t.Subject, t.Category, t.Status, t.ContactName, t.ContactEmail, t.ContactPhone,
                            t.Company, t.CreatedAt, t.ClosedAt,
                            t.Messages.Select(m => new TicketMessageDto(m.Id, m.AuthorName, m.FromStaff, m.Body,
                                                                        m.CreatedAt))
                                .ToList());
}
