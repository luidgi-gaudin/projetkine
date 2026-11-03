using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Synego.Server.Authentication;
using Synego.Server.Booking;
using Synego.Server.Data;
using Synego.Server.Documents;
using Synego.Server.Security;

namespace Synego.Server.Endpoints;

/// <summary>Back-office de la gérante. Accessible uniquement via le VPN (voir <see cref="AdminZone" />).</summary>
public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this IEndpointRouteBuilder app, IConfiguration configuration)
    {
        var group = app.MapGroup("/api/admin")
            .WithTags("Back-office")
            .RequireAuthorization(Policies.Admin)
            .RequireAdminZone(configuration);

        // ---------- Aujourd'hui : la journée du coach en un coup d'œil ----------
        group.MapGet("/overview", async (AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            DateTimeOffset now = clock.GetUtcNow();
            DateTimeOffset week = now.AddDays(7);
            DateTimeOffset lastWeek = now.AddDays(-7);

            List<OverviewAppointmentDto> upcoming = await db.Appointments
                .Where(a => a.Status == AppointmentStatus.Scheduled && a.StartsAt >= now.AddMinutes(-60) && a.StartsAt < week)
                .OrderBy(a => a.StartsAt)
                .Take(8)
                .Select(a => new OverviewAppointmentDto(
                            a.Id, a.TypeKey, a.Title, a.StartsAt, a.EndsAt,
                            a.InviteeName ?? (a.User != null ? a.User.DisplayName : null) ?? a.InviteeEmail,
                            a.MeetingUrl, a.ReviewReason))
                .ToListAsync(ct);

            List<AdminTicketRowDto> tickets = await db.Tickets
                .Where(t => t.Status != TicketStatus.Closed)
                .OrderBy(t => t.Status).ThenByDescending(t => t.UpdatedAt)
                .Take(5)
                .Select(t => new AdminTicketRowDto(t.Id, t.Subject, t.Category, t.Status, t.ContactName, t.ContactEmail,
                                                   t.Company, t.CreatedAt, t.UpdatedAt, t.Messages.Count))
                .ToListAsync(ct);

            return new OverviewDto(
                upcoming,
                await db.Appointments.CountAsync(a => a.Status == AppointmentStatus.Scheduled && a.StartsAt >= now && a.StartsAt < now.AddHours(24), ct),
                tickets,
                await db.Tickets.CountAsync(t => t.Status == TicketStatus.Open, ct),
                await db.Tickets.CountAsync(t => t.Status != TicketStatus.Closed, ct),
                await db.Appointments.CountAsync(a => a.ReviewReason != null && a.StartsAt >= lastWeek, ct),
                await db.Users.CountAsync(u => u.CreatedAt >= lastWeek, ct),
                await db.Users.CountAsync(u => u.Role == UserRole.Client, ct));
        });

        // ---------- Clients ----------
        group.MapGet("/clients", async (AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var now = clock.GetUtcNow();
            return await db.Users
                .OrderBy(u => u.Role).ThenBy(u => u.DisplayName ?? u.Email)
                .Select(u => new ClientRowDto(
                            u.Id, u.Email, u.DisplayName, u.PhoneNumber, u.Company, u.Role, u.CreatedAt, u.SignedAt,
                            u.Documents.Count(d => d.DeletedAt == null),
                            db.ClientNotes.Count(n => n.ClientId == u.Id),
                            u.Appointments.Count(a => a.StartsAt > now && a.Status == AppointmentStatus.Scheduled)))
                .ToListAsync(ct);
        });

        // « Signer » un client lui ouvre les séances de suivi.
        group.MapPatch("/clients/{id:guid}", async (
                           Guid id, ClientUpdate update, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock,
                           CancellationToken ct) =>
                       {
                           var user = await db.Users.FindAsync([id], ct);
                           if (user is null) return Results.NotFound();
                           if (update.Role is { } role)
                           {
                               if (user.Id == principal.GetUserId() && role != UserRole.Coach)
                                   return Results.Problem(statusCode: 409,
                                                          title: "Vous ne pouvez pas retirer vos propres droits.");
                               if (role == UserRole.Client && user.Role != UserRole.Client)
                                   user.SignedAt = clock.GetUtcNow();
                               if (role == UserRole.Prospect) user.SignedAt = null;
                               user.Role = role;
                           }
                           if (update.Company is not null)
                               user.Company = update.Company.Trim() is { Length: > 0 } c ? c : null;
                           await db.SaveChangesAsync(ct);
                           return Results.NoContent();
                       });

        // ---------- Documents d'un client ----------
        group.MapGet("/clients/{id:guid}/documents", async (Guid id, DocumentService documents, CancellationToken ct) =>
                         await documents.Visible(id).OrderByDescending(d => d.CreatedAt).Select(d => DocumentDto.From(d))
                             .ToListAsync(ct));

        group.MapPost("/clients/{id:guid}/documents", async (
                              Guid id, IFormFile? file, [FromForm] string? category,
                              ClaimsPrincipal principal, AppDbContext db, DocumentService documents,
                              CancellationToken ct) =>
                          await db.Users.AnyAsync(u => u.Id == id, ct)
                              ? await documents.UploadAsync(id, principal.GetUserId(), true, file, category, ct)
                              : Results.NotFound())
            .DisableAntiforgery();

        group.MapGet("/documents/{id:guid}/file", async (
                             Guid id, AppDbContext db, DocumentService documents, HttpContext http,
                             CancellationToken ct) =>
                         await db.Documents.FirstOrDefaultAsync(d => d.Id == id && d.DeletedAt == null, ct) is
                             { } document
                             ? await documents.DownloadAsync(document, http, ct)
                             : Results.NotFound());

        group.MapDelete("/documents/{id:guid}", async (
                            Guid id, AppDbContext db, DocumentService documents, CancellationToken ct) =>
                        {
                            var document =
                                await db.Documents.FirstOrDefaultAsync(d => d.Id == id && d.DeletedAt == null, ct);
                            if (document is null) return Results.NotFound();
                            await documents.SoftDeleteAsync(document, ct);
                            return Results.NoContent();
                        });

        group.MapGet("/document-categories", () => DocumentRules.Categories);

        // ---------- Notes privées du coach sur un client ----------
        group.MapGet("/clients/{id:guid}/notes", async (Guid id, AppDbContext db, CancellationToken ct) =>
                         await db.ClientNotes
                             .Where(n => n.ClientId == id)
                             .OrderByDescending(n => n.Pinned).ThenByDescending(n => n.CreatedAt)
                             .Select(n => new ClientNoteDto(n.Id, n.Body, n.Pinned, n.AuthorName, n.CreatedAt,
                                                            n.UpdatedAt))
                             .ToListAsync(ct));

        group.MapPost("/clients/{id:guid}/notes", async (
                          Guid id, NoteRequest request, ClaimsPrincipal principal, AppDbContext db, TimeProvider clock,
                          CancellationToken ct) =>
                      {
                          if (string.IsNullOrWhiteSpace(request.Body))
                              return Results.ValidationProblem(new Dictionary<string, string[]>
                                                                   { ["body"] = ["Note vide."] });
                          if (!await db.Users.AnyAsync(u => u.Id == id, ct)) return Results.NotFound();

                          var author = await db.Users.FirstAsync(u => u.Id == principal.GetUserId(), ct);
                          var now = clock.GetUtcNow();
                          var note = new ClientNote
                          {
                              ClientId = id, AuthorId = author.Id,
                              AuthorName = author.DisplayName ?? author.Email ?? "Coach",
                              Body = TicketEndpoints.Clip(request.Body, 5000), Pinned = request.Pinned ?? false,
                              CreatedAt = now, UpdatedAt = now,
                          };
                          db.ClientNotes.Add(note);
                          await db.SaveChangesAsync(ct);
                          return Results.Ok(new ClientNoteDto(note.Id, note.Body, note.Pinned, note.AuthorName,
                                                              note.CreatedAt, note.UpdatedAt));
                      });

        group.MapPatch("/notes/{id:guid}", async (
                           Guid id, NoteRequest request, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
                       {
                           var note = await db.ClientNotes.FindAsync([id], ct);
                           if (note is null) return Results.NotFound();
                           if (request.Body is not null)
                           {
                               if (string.IsNullOrWhiteSpace(request.Body))
                                   return Results.ValidationProblem(new Dictionary<string, string[]>
                                                                        { ["body"] = ["Note vide."] });
                               note.Body = TicketEndpoints.Clip(request.Body, 5000);
                           }
                           if (request.Pinned is { } pinned) note.Pinned = pinned;
                           note.UpdatedAt = clock.GetUtcNow();
                           await db.SaveChangesAsync(ct);
                           return Results.NoContent();
                       });

        group.MapDelete("/notes/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
                            await db.ClientNotes.Where(n => n.Id == id).ExecuteDeleteAsync(ct) > 0
                                ? Results.NoContent()
                                : Results.NotFound());

        // ---------- Rendez-vous ----------
        group.MapGet("/appointments", async (string? scope, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
        {
            var now = clock.GetUtcNow();
            IQueryable<Appointment> query = db.Appointments.Include(a => a.User);
            query = scope switch
            {
                "past" => query.Where(a => a.StartsAt < now).OrderByDescending(a => a.StartsAt),
                "all" => query.OrderByDescending(a => a.StartsAt),
                _ => query.Where(a => a.StartsAt >= now).OrderBy(a => a.StartsAt),
            };
            return await query.Take(200)
                .Select(a => new AdminAppointmentDto(
                            a.Id, a.TypeKey, a.Title, a.StartsAt, a.EndsAt, a.Status,
                            a.InviteeName ?? (a.User != null ? a.User.DisplayName : null),
                            a.InviteeEmail ?? (a.User != null ? a.User.Email : null),
                            a.UserId, a.User != null ? a.User.Role : null, a.ReviewReason, a.AdminNotes,
                            a.CancelUrl, a.RescheduleUrl, a.MeetingUrl, a.Reminder48SentAt, a.Reminder24SentAt))
                .ToListAsync(ct);
        });

        group.MapPatch("/appointments/{id:guid}", async (
                           Guid id, AppointmentUpdate update, AppDbContext db, TimeProvider clock,
                           CancellationToken ct) =>
                       {
                           var appointment = await db.Appointments.FindAsync([id], ct);
                           if (appointment is null) return Results.NotFound();
                           if (update.Status is { } status) appointment.Status = status;
                           if (update.AdminNotes is not null)
                               appointment.AdminNotes = TicketEndpoints.Clip(update.AdminNotes, 2000);
                           if (update.ClearReview == true) appointment.ReviewReason = null;
                           appointment.UpdatedAt = clock.GetUtcNow();
                           await db.SaveChangesAsync(ct);
                           return Results.NoContent();
                       });

        // Le coach annule un rendez-vous (sans limite de délai) : Calendly prévient la personne.
        group.MapPost("/appointments/{id:guid}/cancel", async (
                          Guid id, BookingEndpoints.CancelBooking request, AppDbContext db, AppointmentSync sync,
                          CancellationToken ct) =>
                      {
                          var appointment = await db.Appointments.FindAsync([id], ct);
                          if (appointment is null) return Results.NotFound();
                          string reason = TicketEndpoints.Clip(request.Reason ?? "Annulé par Synégo", 500);
                          return await sync.CancelAsync(appointment, reason, ct)
                              ? Results.NoContent()
                              : Results.Problem(statusCode: 409,
                                                title: "Calendly n'est pas relié : annulation en ligne impossible.");
                      });

        // ---------- Demandes (tickets) ----------
        group.MapGet("/tickets", async (TicketStatus? status, AppDbContext db, CancellationToken ct) =>
                         await db.Tickets
                             .Where(t => status == null || t.Status == status)
                             .OrderBy(t => t.Status == TicketStatus.Closed).ThenByDescending(t => t.UpdatedAt)
                             .Take(200)
                             .Select(t => new AdminTicketRowDto(t.Id, t.Subject, t.Category, t.Status, t.ContactName,
                                                                t.ContactEmail,
                                                                t.Company, t.CreatedAt, t.UpdatedAt, t.Messages.Count))
                             .ToListAsync(ct));

        group.MapGet("/tickets/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
                         await TicketEndpoints.LoadAsync(db, id, ct) is { } ticket
                             ? Results.Ok(TicketDetailDto.From(ticket))
                             : Results.NotFound());

        group.MapPost("/tickets/{id:int}/messages", async (
                          int id, TicketEndpoints.NewMessage request, ClaimsPrincipal principal, AppDbContext db,
                          TimeProvider clock,
                          CancellationToken ct) =>
                      {
                          var ticket = await db.Tickets.FindAsync([id], ct);
                          if (ticket is null) return Results.NotFound();
                          if (string.IsNullOrWhiteSpace(request.Body))
                              return Results.ValidationProblem(new Dictionary<string, string[]>
                                                                   { ["body"] = ["Message vide."] });

                          var admin = await db.Users.FirstAsync(u => u.Id == principal.GetUserId(), ct);
                          var now = clock.GetUtcNow();
                          db.TicketMessages.Add(new TicketMessage
                          {
                              TicketId = id, AuthorId = admin.Id, AuthorName = admin.DisplayName ?? "Synégo",
                              FromStaff = true,
                              Body = TicketEndpoints.Clip(request.Body, 5000), CreatedAt = now,
                          });
                          if (ticket.Status == TicketStatus.Open) ticket.Status = TicketStatus.InProgress;
                          ticket.UpdatedAt = now;
                          await db.SaveChangesAsync(ct);
                          return Results.NoContent();
                      });

        group.MapPatch("/tickets/{id:int}", async (
                           int id, TicketUpdate update, AppDbContext db, TimeProvider clock, CancellationToken ct) =>
                       {
                           var ticket = await db.Tickets.FindAsync([id], ct);
                           if (ticket is null) return Results.NotFound();
                           ticket.Status = update.Status;
                           ticket.ClosedAt = update.Status == TicketStatus.Closed ? clock.GetUtcNow() : null;
                           ticket.UpdatedAt = clock.GetUtcNow();
                           await db.SaveChangesAsync(ct);
                           return Results.NoContent();
                       });
    }

    public sealed record ClientUpdate(UserRole? Role, string? Company);

    public sealed record OverviewAppointmentDto(
        Guid Id,
        string TypeKey,
        string Title,
        DateTimeOffset StartsAt,
        DateTimeOffset EndsAt,
        string? Name,
        string? MeetingUrl,
        string? ReviewReason);

    public sealed record OverviewDto(
        List<OverviewAppointmentDto> Upcoming,
        int Next24h,
        List<AdminTicketRowDto> Tickets,
        int NewTickets,
        int OpenTickets,
        int Alerts,
        int NewAccounts,
        int SignedClients);

    public sealed record NoteRequest(string? Body, bool? Pinned);

    public sealed record ClientNoteDto(
        Guid Id,
        string Body,
        bool Pinned,
        string AuthorName,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt);

    public sealed record AppointmentUpdate(AppointmentStatus? Status, string? AdminNotes, bool? ClearReview);

    public sealed record TicketUpdate(TicketStatus Status);

    public sealed record ClientRowDto(
        Guid Id,
        string? Email,
        string? DisplayName,
        string? PhoneNumber,
        string? Company,
        UserRole Role,
        DateTimeOffset CreatedAt,
        DateTimeOffset? SignedAt,
        int DocumentCount,
        int NoteCount,
        int UpcomingAppointments);

    public sealed record AdminAppointmentDto(
        Guid Id,
        string TypeKey,
        string Title,
        DateTimeOffset StartsAt,
        DateTimeOffset EndsAt,
        AppointmentStatus Status,
        string? Name,
        string? Email,
        Guid? UserId,
        UserRole? UserRole,
        string? ReviewReason,
        string? AdminNotes,
        string? CancelUrl,
        string? RescheduleUrl,
        string? MeetingUrl,
        DateTimeOffset? Reminder48SentAt,
        DateTimeOffset? Reminder24SentAt);

    public sealed record AdminTicketRowDto(
        int Id,
        string Subject,
        TicketCategory Category,
        TicketStatus Status,
        string ContactName,
        string ContactEmail,
        string? Company,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt,
        int MessageCount);
}
