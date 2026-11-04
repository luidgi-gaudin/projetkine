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
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<CourseModule> CourseModules => Set<CourseModule>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<LessonProgress> LessonProgress => Set<LessonProgress>();
    public DbSet<CommunityPost> CommunityPosts => Set<CommunityPost>();
    public DbSet<CommunityComment> CommunityComments => Set<CommunityComment>();
    public DbSet<PostReaction> PostReactions => Set<PostReaction>();
    public DbSet<Payment> Payments => Set<Payment>();

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

        // ---------- Formations (cours, communauté) ----------
        model.Entity<Course>(course =>
        {
            course.ToTable("courses");
            course.HasIndex(c => c.Slug).IsUnique();
            course.Property(c => c.Slug).HasMaxLength(80);
            course.Property(c => c.Title).HasMaxLength(120);
            course.Property(c => c.Summary).HasMaxLength(300);
            course.Property(c => c.Description).HasMaxLength(8000);
            course.Property(c => c.DurationLabel).HasMaxLength(60);
            course.Property(c => c.Currency).HasMaxLength(3);
        });

        model.Entity<CourseModule>(module =>
        {
            module.ToTable("course_modules");
            module.Property(m => m.Title).HasMaxLength(120);
            module.HasOne(m => m.Course).WithMany(c => c.Modules)
                .HasForeignKey(m => m.CourseId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<Lesson>(lesson =>
        {
            lesson.ToTable("lessons");
            lesson.Property(l => l.Title).HasMaxLength(160);
            lesson.Property(l => l.Body).HasMaxLength(20000);
            lesson.Property(l => l.VideoUrl).HasMaxLength(300);
            lesson.HasOne(l => l.Module).WithMany(m => m.Lessons)
                .HasForeignKey(l => l.ModuleId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<Enrollment>(enrollment =>
        {
            enrollment.ToTable("enrollments");
            enrollment.HasIndex(e => new { e.CourseId, e.UserId }).IsUnique();
            enrollment.HasIndex(e => e.UserId);
            enrollment.Property(e => e.Source).HasConversion<string>().HasMaxLength(16);
            enrollment.HasOne(e => e.Course).WithMany(c => c.Enrollments)
                .HasForeignKey(e => e.CourseId).OnDelete(DeleteBehavior.Cascade);
            enrollment.HasOne(e => e.User).WithMany()
                .HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<LessonProgress>(progress =>
        {
            progress.ToTable("lesson_progress");
            progress.HasKey(p => new { p.UserId, p.LessonId });
            progress.HasOne(p => p.Lesson).WithMany()
                .HasForeignKey(p => p.LessonId).OnDelete(DeleteBehavior.Cascade);
            progress.HasOne<UserAccount>().WithMany()
                .HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<CommunityPost>(post =>
        {
            post.ToTable("community_posts");
            post.HasIndex(p => new { p.CourseId, p.Pinned, p.CreatedAt });
            post.Property(p => p.AuthorName).HasMaxLength(120);
            post.Property(p => p.Body).HasMaxLength(5000);
            post.HasOne(p => p.Course).WithMany()
                .HasForeignKey(p => p.CourseId).OnDelete(DeleteBehavior.Cascade);
            post.HasOne<UserAccount>().WithMany()
                .HasForeignKey(p => p.AuthorId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<CommunityComment>(comment =>
        {
            comment.ToTable("community_comments");
            comment.HasIndex(c => c.PostId);
            comment.HasIndex(c => c.LessonId);
            comment.Property(c => c.AuthorName).HasMaxLength(120);
            comment.Property(c => c.Body).HasMaxLength(3000);
            comment.HasOne(c => c.Post).WithMany(p => p.Comments)
                .HasForeignKey(c => c.PostId).OnDelete(DeleteBehavior.Cascade);
            comment.HasOne(c => c.Lesson).WithMany()
                .HasForeignKey(c => c.LessonId).OnDelete(DeleteBehavior.Cascade);
            comment.HasOne<UserAccount>().WithMany()
                .HasForeignKey(c => c.AuthorId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<PostReaction>(reaction =>
        {
            reaction.ToTable("post_reactions");
            reaction.HasKey(r => new { r.PostId, r.UserId });
            reaction.HasOne(r => r.Post).WithMany(p => p.Reactions)
                .HasForeignKey(r => r.PostId).OnDelete(DeleteBehavior.Cascade);
            reaction.HasOne<UserAccount>().WithMany()
                .HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // ---------- Paiements Stripe ----------
        model.Entity<Payment>(payment =>
        {
            payment.ToTable("payments");
            payment.HasIndex(p => p.Token).IsUnique();
            payment.HasIndex(p => p.StripeSessionId);
            payment.HasIndex(p => p.StripePaymentIntentId);
            payment.HasIndex(p => new { p.Status, p.CreatedAt });
            payment.HasIndex(p => p.Email);
            payment.Property(p => p.Token).HasMaxLength(64);
            payment.Property(p => p.Kind).HasConversion<string>().HasMaxLength(16);
            payment.Property(p => p.Status).HasConversion<string>().HasMaxLength(16);
            payment.Property(p => p.Email).HasMaxLength(254);
            payment.Property(p => p.CustomerName).HasMaxLength(120);
            payment.Property(p => p.Label).HasMaxLength(160);
            payment.Property(p => p.Currency).HasMaxLength(3);
            payment.Property(p => p.Locale).HasMaxLength(5);
            payment.Property(p => p.StripeSessionId).HasMaxLength(200);
            payment.Property(p => p.StripePaymentIntentId).HasMaxLength(200);
            payment.Property(p => p.PaymentMethod).HasMaxLength(40);
            payment.Property(p => p.ReceiptUrl).HasMaxLength(500);
            payment.HasOne(p => p.Course).WithMany()
                .HasForeignKey(p => p.CourseId).OnDelete(DeleteBehavior.SetNull);
            payment.HasOne(p => p.User).WithMany()
                .HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.SetNull);
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
