import {createContext, useContext} from 'react'
import type {Profile} from '../api/types'

export type User = {
    id: string
    email: string
    name?: string
    phoneNumber?: string
    photoURL?: string
    providerId?: string
    emailVerified: boolean
}

export type AuthContextValue = {
    user: User | null
    /** Profil applicatif (rôle compris), lu depuis l'API après connexion. */
    profile: Profile | null
    loading: boolean
    login: (email: string, password: string) => Promise<void>
    register: (email: string, password: string, displayName?: string) => Promise<void>
    loginWithGoogle: () => Promise<void>
    sendPhoneCode: (phoneNumber: string, recaptchaContainerId: string) => Promise<void>
    confirmPhoneCode: (code: string) => Promise<void>
    sendPasswordReset: (email: string) => Promise<void>
    refreshProfile: () => Promise<void>
    /** Renvoie l'e-mail de vérification (comptes e-mail + mot de passe). */
    resendVerification: () => Promise<void>
    /** Relit l'état « e-mail vérifié » après clic sur le lien, puis met le rôle à jour. */
    checkVerification: () => Promise<{ verified: boolean, role?: Profile['role'] }>
    deleteAccount: () => Promise<void>
    logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>.')
    return ctx
}

/** Page d'arrivée après connexion : le back-office pour les coachs, l'espace client pour les autres. */
export function homeFor(profile: Profile | null): string {
    return profile?.role === 'Coach' ? '/admin' : '/espace'
}

/** Nom à afficher, quel que soit le mode de connexion. */
export function displayNameOf(user: User | null, profile: Profile | null): string {
    return profile?.displayName
        ?? user?.name
        ?? user?.email?.split('@')[0]
        ?? user?.phoneNumber
        ?? 'Bienvenue'
}

/** Traduit un code d'erreur Firebase en phrase compréhensible (et indique quoi faire). */
export function authErrorMessage(err: unknown, errors: Record<string, string>): string {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : ''
    if (code) console.warn('[auth]', code, err)
    const alias: Record<string, string> = {
        'auth/user-not-found': 'auth/invalid-credential',
        'auth/wrong-password': 'auth/invalid-credential',
        'auth/cancelled-popup-request': 'auth/popup-closed-by-user',
        'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'auth/invalid-api-key',
        'auth/api-key-expired.-please-renew-the-api-key.': 'auth/invalid-api-key'
    }
    const message = errors[alias[code] ?? code]
    if (message) return message
    if (!code && err instanceof Error) return err.message
    return errors.generic.replace('{code}', code || 'inconnue')
}
