using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Npgsql.EntityFrameworkCore.PostgreSQL.Infrastructure;

namespace Synego.Server.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    /// <summary>Toutes les tables vivent dans ce schéma (droits gérés dans deploy/postgres/init).</summary>
    public const string Schema = "synego";

    public DbSet<UserAccount> Users => Set<UserAccount>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<ClientDocument> Documents => Set<ClientDocument>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<TicketMessage> TicketMessages => Set<TicketMessage>();
    public DbSet<AppSetting> Settings => Set<AppSetting>();
    public DbSet<ClientNote> ClientNotes => Set<ClientNote>();

    public static void ConfigureNpgsql(NpgsqlDbContextOptionsBuilder npgsql) =>
        npgsql.MigrationsHistoryTable("__ef_migrations", Schema);

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasDefaultSchema(Schema);

        model.Entity<UserAccount>(user =>
        {
            user.ToTable("user_accounts");
            user.HasIndex(u => u.FirebaseUid).IsUnique();
            user.HasIndex(u => u.Email);
            user.Property(u => u.FirebaseUid).HasMaxLength(128);
            user.Property(u => u.Email).HasMaxLength(254);
            user.Property(u => u.DisplayName).HasMaxLength(80);
            user.Property(u => u.PhoneNumber).HasMaxLength(32);
            user.Property(u => u.Company).HasMaxLength(120);
            user.Property(u => u.Role).HasConversion<string>().HasMaxLength(16);
        });

        model.Entity<Appointment>(appointment =>
        {
            appointment.ToTable("appointments");
            appointment.HasIndex(a => a.CalendlyInviteeUri).IsUnique();
            appointment.HasIndex(a => a.StartsAt);
            appointment.Property(a => a.TypeKey).HasMaxLength(64);
            appointment.Property(a => a.Title).HasMaxLength(120);
            appointment.Property(a => a.Status).HasConversion<string>().HasMaxLength(16);
            appointment.Property(a => a.InviteeName).HasMaxLength(120);
            appointment.Property(a => a.InviteeEmail).HasMaxLength(254);
            appointment.Property(a => a.CalendlyInviteeUri).HasMaxLength(300);
            appointment.Property(a => a.CalendlyEventUri).HasMaxLength(300);
            appointment.Property(a => a.CancelUrl).HasMaxLength(300);
            appointment.Property(a => a.RescheduleUrl).HasMaxLength(300);
            appointment.Property(a => a.ReviewReason).HasMaxLength(300);
            appointment.Property(a => a.MeetingUrl).HasMaxLength(300);
            appointment.Property(a => a.Location).HasMaxLength(300);
            appointment.Property(a => a.Locale).HasMaxLength(5);
            appointment.Property(a => a.AdminNotes).HasMaxLength(2000);
            appointment.HasOne(a => a.User).WithMany(u => u.Appointments)
                .HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.SetNull);
        });

        model.Entity<ClientDocument>(document =>
        {
            document.ToTable("client_documents");
            document.HasIndex(d => new { d.OwnerId, d.DeletedAt });
            document.Property(d => d.FileName).HasMaxLength(200);
            document.Property(d => d.ContentType).HasMaxLength(100);
            document.Property(d => d.StorageKey).HasMaxLength(200);
            document.Property(d => d.Category).HasMaxLength(60);
            document.HasOne(d => d.Owner).WithMany(u => u.Documents)
                .HasForeignKey(d => d.OwnerId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<Ticket>(ticket =>
        {
            ticket.ToTable("tickets");
            ticket.HasIndex(t => t.Status);
            ticket.Property(t => t.ContactName).HasMaxLength(120);
            ticket.Property(t => t.ContactEmail).HasMaxLength(254);
            ticket.Property(t => t.ContactPhone).HasMaxLength(32);
            ticket.Property(t => t.Company).HasMaxLength(120);
            ticket.Property(t => t.Subject).HasMaxLength(160);
            ticket.Property(t => t.Category).HasConversion<string>().HasMaxLength(16);
            ticket.Property(t => t.Status).HasConversion<string>().HasMaxLength(16);
            ticket.HasOne(t => t.Author).WithMany()
                .HasForeignKey(t => t.AuthorId).OnDelete(DeleteBehavior.SetNull);
        });

        model.Entity<ClientNote>(note =>
        {
            note.ToTable("client_notes");
            note.HasIndex(n => new { n.ClientId, n.Pinned, n.CreatedAt });
            note.Property(n => n.AuthorName).HasMaxLength(120);
            note.Property(n => n.Body).HasMaxLength(5000);
            note.HasOne(n => n.Client).WithMany()
                .HasForeignKey(n => n.ClientId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<AppSetting>(setting =>
        {
            setting.ToTable("app_settings");
            setting.HasKey(s => s.Key);
            setting.Property(s => s.Key).HasMaxLength(100);
        });

        model.Entity<TicketMessage>(message =>
        {
            message.ToTable("ticket_messages");
            message.Property(m => m.AuthorName).HasMaxLength(120);
            message.Property(m => m.Body).HasMaxLength(5000);
            message.HasOne(m => m.Ticket).WithMany(t => t.Messages)
                .HasForeignKey(m => m.TicketId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}

/// <summary>Utilisé uniquement par <c>dotnet ef migrations add</c> (aucune connexion n'est ouverte).</summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args) =>
        new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
                             .UseNpgsql("Host=localhost;Database=synego", AppDbContext.ConfigureNpgsql)
                             .Options);
}
