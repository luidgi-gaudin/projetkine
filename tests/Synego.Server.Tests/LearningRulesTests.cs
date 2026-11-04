using Synego.Server.Data;
using Synego.Server.Learning;
using Synego.Server.Payments;

namespace Synego.Server.Tests;

public class LearningRulesTests
{
    [Theory]
    [InlineData("Gestion du stress au travail", "gestion-du-stress-au-travail")]
    [InlineData("  Posture & Respiration : les bases ! ", "posture-respiration-les-bases")]
    [InlineData("Été — cohérence cardiaque", "ete-coherence-cardiaque")]
    [InlineData("???", "formation")]
    public void Slugify_produit_une_adresse_lisible(string title, string expected) =>
        Assert.Equal(expected, LearningRules.Slugify(title));

    [Fact]
    public void Slugify_coupe_a_80_caracteres_sans_tiret_final()
    {
        string slug = LearningRules.Slugify(string.Join(' ', Enumerable.Repeat("respiration", 20)));
        Assert.True(slug.Length <= 80);
        Assert.False(slug.EndsWith('-'));
        Assert.True(LearningRules.IsValidSlug(slug));
    }

    [Theory]
    [InlineData("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")]
    [InlineData("https://youtu.be/dQw4w9WgXcQ?t=42", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/shorts/dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")]
    [InlineData("https://vimeo.com/76979871", "https://player.vimeo.com/video/76979871")]
    [InlineData("https://vimeo.com/76979871/abc123def0", "https://player.vimeo.com/video/76979871?h=abc123def0")]
    [InlineData("https://player.vimeo.com/video/76979871?h=abc123def0",
                "https://player.vimeo.com/video/76979871?h=abc123def0")]
    [InlineData("https://www.loom.com/share/0123456789abcdef0123456789abcdef",
                "https://www.loom.com/embed/0123456789abcdef0123456789abcdef")]
    public void Les_liens_video_connus_deviennent_des_lecteurs_integres(string url, string expected) =>
        Assert.Equal(expected, LearningRules.VideoEmbedUrl(url));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("http://www.youtube.com/watch?v=dQw4w9WgXcQ")] // pas de https
    [InlineData("https://evil.example/watch?v=dQw4w9WgXcQ")]
    [InlineData("https://www.youtube.com/watch?v=trop-court")]
    [InlineData("https://www.youtube.com.evil.example/embed/dQw4w9WgXcQ")]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://vimeo.com/abc")]
    public void Les_autres_liens_video_sont_refuses(string? url) => Assert.Null(LearningRules.VideoEmbedUrl(url));

    [Theory]
    [InlineData(99, false)]
    [InlineData(100, true)]
    [InlineData(29_000, true)]
    [InlineData(5_000_000, true)]
    [InlineData(5_000_001, false)]
    [InlineData(-100, false)]
    public void Montant_entre_1_et_50000_euros(long cents, bool valid) =>
        Assert.Equal(valid, LearningRules.IsValidAmount(cents));

    [Fact]
    public void Les_jetons_de_lien_de_paiement_sont_uniques_et_bien_formes()
    {
        var tokens = Enumerable.Range(0, 200).Select(_ => LearningRules.NewPaymentToken()).ToList();
        Assert.All(tokens, t => Assert.True(LearningRules.IsValidPaymentToken(t), t));
        Assert.Equal(tokens.Count, tokens.Distinct().Count());
        Assert.False(LearningRules.IsValidPaymentToken("../../etc/passwd"));
        Assert.False(LearningRules.IsValidPaymentToken(null));
    }

    [Theory]
    [InlineData("Camille Laurent", "Camille")]
    [InlineData("  Céline ", "Céline")]
    [InlineData("", null)]
    [InlineData(null, null)]
    public void Seul_le_prenom_est_affiche_sur_la_page_publique(string? name, string? expected) =>
        Assert.Equal(expected, LearningRules.FirstName(name));

    [Fact]
    public void Montant_formate_en_euros()
    {
        Assert.Equal("290,00 €", PaymentEmails.FormatAmount(29_000, "eur", "fr").Replace(' ', ' ').Replace(' ', ' '));
        Assert.Contains("290.00", PaymentEmails.FormatAmount(29_000, "eur", "en"));
    }

    [Fact]
    public void Email_de_lien_de_paiement_echappe_le_libelle_et_contient_le_lien()
    {
        var payment = new Payment
        {
            Token = LearningRules.NewPaymentToken(), Label = "Séminaire <b>équipe</b>", AmountCents = 120_000,
            Email = "client@exemple.fr", CustomerName = "Nayir Test", ExpiresAt = DateTimeOffset.UtcNow.AddDays(30),
        };
        var email = PaymentEmails.Build(payment, "https://synego.example/paiement/abc");
        Assert.Contains("&lt;b&gt;", email.Html);
        Assert.DoesNotContain("<b>équipe</b>", email.Html);
        Assert.Contains("https://synego.example/paiement/abc", email.Html);
        Assert.Contains("Bonjour Nayir", email.Html);
        Assert.Contains("Klarna", email.Text);
    }
}
