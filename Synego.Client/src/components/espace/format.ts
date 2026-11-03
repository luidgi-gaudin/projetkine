/** Taille de fichier lisible (o, Ko, Mo). */
export function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}
