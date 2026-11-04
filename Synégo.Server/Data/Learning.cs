namespace Synego.Server.Data;

/// <summary>Formation en ligne vendue sur le site (modules → leçons), façon « classroom » de Skool.</summary>
public sealed class Course
{
    public Guid Id { get; set; }

    /// <summary>Adresse lisible : /formations/{slug}.</summary>
    public required string Slug { get; set; }

    public required string Title { get; set; }
    public required string Summary { get; set; }
    public string Description { get; set; } = "";

    /// <summary>Repère libre affiché sur la fiche (« 6 semaines », « 3 h de vidéo »…).</summary>
    public string? DurationLabel { get; set; }

    /// <summary>Prix TTC en centimes (les formations affichent leur prix ; les séminaires restent sur devis).</summary>
    public long PriceCents { get; set; }

    public string Currency { get; set; } = "eur";
    public bool Published { get; set; }
    public int SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public List<CourseModule> Modules { get; set; } = [];
    public List<Enrollment> Enrollments { get; set; } = [];
}

public sealed class CourseModule
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public Course? Course { get; set; }
    public required string Title { get; set; }
    public int SortOrder { get; set; }
    public List<Lesson> Lessons { get; set; } = [];
}

public sealed class Lesson
{
    public Guid Id { get; set; }
    public Guid ModuleId { get; set; }
    public CourseModule? Module { get; set; }
    public required string Title { get; set; }

    /// <summary>Texte de la leçon (texte brut, paragraphes séparés par une ligne vide).</summary>
    public string Body { get; set; } = "";

    /// <summary>Lien YouTube, Vimeo ou Loom : converti en lecteur intégré (voir VideoEmbed).</summary>
    public string? VideoUrl { get; set; }

    public int? DurationMinutes { get; set; }

    /// <summary>Visible gratuitement sur la fiche publique, pour donner envie.</summary>
    public bool FreePreview { get; set; }

    public int SortOrder { get; set; }
}

public enum EnrollmentSource
{
    Purchase, PaymentLink, Manual,
}

/// <summary>Accès d'un compte à une formation (après paiement, ou offert par la coach).</summary>
public sealed class Enrollment
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public Course? Course { get; set; }
    public Guid UserId { get; set; }
    public UserAccount? User { get; set; }
    public EnrollmentSource Source { get; set; }
    public Guid? PaymentId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class LessonProgress
{
    public Guid UserId { get; set; }
    public Guid LessonId { get; set; }
    public Lesson? Lesson { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
}

/// <summary>Communauté d'une formation : publications des membres et de la coach.</summary>
public sealed class CommunityPost
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public Course? Course { get; set; }
    public Guid AuthorId { get; set; }
    public required string AuthorName { get; set; }
    public bool AuthorIsCoach { get; set; }
    public required string Body { get; set; }
    public bool Pinned { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public List<CommunityComment> Comments { get; set; } = [];
    public List<PostReaction> Reactions { get; set; } = [];
}

/// <summary>Commentaire sous une publication de la communauté ou sous une leçon.</summary>
public sealed class CommunityComment
{
    public Guid Id { get; set; }
    public Guid? PostId { get; set; }
    public CommunityPost? Post { get; set; }
    public Guid? LessonId { get; set; }
    public Lesson? Lesson { get; set; }
    public Guid AuthorId { get; set; }
    public required string AuthorName { get; set; }
    public bool AuthorIsCoach { get; set; }
    public required string Body { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>« J'aime » sur une publication (un par membre).</summary>
public sealed class PostReaction
{
    public Guid PostId { get; set; }
    public CommunityPost? Post { get; set; }
    public Guid UserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
