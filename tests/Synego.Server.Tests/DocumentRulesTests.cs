using System.Text;
using Microsoft.AspNetCore.Http;
using Synego.Server.Documents;

namespace Synego.Server.Tests;

public class DocumentRulesTests
{
    private static IFormFile File(string name, byte[] content) =>
        new FormFile(new MemoryStream(content), 0, content.Length, "file", name);

    [Fact]
    public async Task Accepte_un_vrai_pdf()
    {
        (string? error, string contentType) =
            await DocumentRules.ValidateAsync(File("programme.pdf", Encoding.ASCII.GetBytes("%PDF-1.7 ...")), 1024, default);

        Assert.Null(error);
        Assert.Equal("application/pdf", contentType);
    }

    [Fact]
    public async Task Refuse_un_fichier_deguise_en_pdf()
    {
        (string? error, _) = await DocumentRules.ValidateAsync(File("faux.pdf", "MZ executable"u8.ToArray()), 1024, default);

        Assert.Contains("ne correspond pas", error);
    }

    [Theory]
    [InlineData("script.exe")]
    [InlineData("page.html")]
    [InlineData("archive.zip")]
    public async Task Refuse_les_formats_non_autorises(string name)
    {
        (string? error, _) = await DocumentRules.ValidateAsync(File(name, "%PDF"u8.ToArray()), 1024, default);

        Assert.Contains("Format non accepté", error);
    }

    [Fact]
    public async Task Refuse_les_fichiers_trop_lourds_et_vides()
    {
        Assert.Contains("dépasse", (await DocumentRules.ValidateAsync(File("gros.pdf", new byte[2048]), 1024, default)).Error);
        Assert.Contains("vide", (await DocumentRules.ValidateAsync(File("vide.pdf", []), 1024, default)).Error);
    }

    [Theory]
    [InlineData("../../etc/passwd.pdf", "passwd.pdf")]
    [InlineData("C:\\Users\\a\\b.pdf", "b.pdf")]
    [InlineData("guill\"emets.pdf", "guillemets.pdf")]
    [InlineData("   ", "document")]
    public void Nettoie_le_nom_affiche(string input, string expected) =>
        Assert.Equal(expected, DocumentRules.SafeFileName(input.Replace('\\', Path.DirectorySeparatorChar)));

    [Fact]
    public void Categorie_inconnue_devient_Autre() =>
        Assert.Equal("Autre", DocumentRules.NormalizeCategory("n'importe quoi"));
}
