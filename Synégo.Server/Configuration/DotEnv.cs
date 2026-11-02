namespace Synego.Server.Configuration;

/// <summary>
///     Charge le fichier <c>.env</c> le plus proche (en remontant depuis le dossier courant)
///     dans les variables d'environnement, AVANT la création du builder ASP.NET.
///     Les variables déjà définies (Docker, CI, shell) ne sont jamais écrasées.
///     Convention ASP.NET : <c>Firestore__ProjectId</c> => <c>Firestore:ProjectId</c>.
/// </summary>
public static class DotEnv
{
    /// <summary>Dossier contenant le .env chargé (sert à résoudre les chemins relatifs), ou null.</summary>
    public static string? Directory { get; private set; }

    public static void Load(string fileName = ".env")
    {
        for (var dir = new DirectoryInfo(System.IO.Directory.GetCurrentDirectory()); dir is not null; dir = dir.Parent)
        {
            string path = Path.Combine(dir.FullName, fileName);
            if (!File.Exists(path)) continue;

            Directory = dir.FullName;
            foreach (string rawLine in File.ReadAllLines(path))
            {
                string line = rawLine.Trim();
                if (line.Length == 0 || line.StartsWith('#')) continue;
                if (line.StartsWith("export ")) line = line[7..];

                int separator = line.IndexOf('=');
                if (separator <= 0) continue;

                string key = line[..separator].Trim();
                string value = line[(separator + 1)..].Trim();
                if (value.Length >= 2 && (value[0] == '"' || value[0] == '\'') && value[^1] == value[0])
                    value = value[1..^1];

                if (Environment.GetEnvironmentVariable(key) is null)
                    Environment.SetEnvironmentVariable(key, value);
            }
            return;
        }
    }

    /// <summary>Résout un chemin relatif par rapport au dossier du .env (sinon au dossier courant).</summary>
    public static string ResolvePath(string path) =>
        Path.IsPathRooted(path) ? path : Path.GetFullPath(path, Directory ?? System.IO.Directory.GetCurrentDirectory());
}
