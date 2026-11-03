/** Courbes partagées : départ franc, arrivée très douce (rien ne « rebondit »). */
export const easeOut = [0.22, 1, 0.36, 1] as const
export const easeInOut = [0.65, 0, 0.35, 1] as const

/** Cohérence cardiaque : 5 s d'inspiration, 5 s d'expiration (6 respirations par minute). */
export const BREATH_SECONDS = 5
