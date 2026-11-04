/**
 * Informations de l'entreprise, identiques dans toutes les langues.
 * Projet pédagogique (atelier ISITECH) : l'entreprise, les personnes et les coordonnées sont FICTIVES.
 */
export const brand = {
    name: 'Synégo',
    founder: 'Camille Laurent',
    founderFirstName: 'Camille',
    // Adresse en .example : domaine réservé (RFC 2606), aucun e-mail ne part chez un tiers.
    email: 'contact@synego.example',
    // Plage 06 39 98 xx xx réservée par l'ARCEP aux œuvres de fiction : n'appartient à personne.
    phone: '06 39 98 12 34',
    phoneE164: '+33639981234',
    company: {
        legalName: 'Synégo SAS',
        capital: '1 000',
        // SIREN volontairement invalide (clé de Luhn fausse) : ne peut correspondre à aucune entreprise réelle.
        siren: '123 456 789',
        siret: '123 456 789 00010',
        rcsCity: 'Lyon',
        address: '12 rue des Exemples, 69003 Lyon, France',
    },
}
