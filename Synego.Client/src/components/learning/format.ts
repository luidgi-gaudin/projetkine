/** Montant en centimes → « 290,00 € » (fr) ou « €290.00 » (en). */
export function money(cents: number, currency: string, locale: string): string {
    return new Intl.NumberFormat(locale === 'en' ? 'en-IE' : 'fr-FR', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100)
}

/** Texte brut (paragraphes séparés par une ligne vide) → paragraphes. */
export function paragraphs(text: string): string[] {
    return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
}
