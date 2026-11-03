import {type ReactNode, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
    type ConfirmationResult,
    createUserWithEmailAndPassword,
    deleteUser,
    GoogleAuthProvider,
    onAuthStateChanged,
    RecaptchaVerifier,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPhoneNumber,
    signInWithPopup,
    signOut,
    updateProfile,
    type User as FirebaseUser,
} from '@firebase/auth'
import {api, json, setAuthTokenProvider} from '../api/client'
import type {Profile} from '../api/types'
import {firebaseAuth} from './firebase'
import {AuthContext, type User} from './AuthContext'

const mapUser = (user: FirebaseUser): User => ({
    id: user.uid,
    email: user.email ?? '',
    name: user.displayName ?? undefined,
    phoneNumber: user.phoneNumber ?? undefined,
    photoURL: user.photoURL ?? undefined,
    providerId: user.providerData?.[0]?.providerId ?? (user.phoneNumber ? 'phone' : 'password'),
    emailVerified: user.emailVerified,
})

export function AuthProvider({children}: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const phoneConfirmation = useRef<ConfirmationResult | null>(null)
    const recaptcha = useRef<RecaptchaVerifier | null>(null)

    const refreshProfile = useCallback(async () => {
        if (!firebaseAuth.currentUser) {
            setProfile(null)
            return
        }
        try {
            setProfile(await api<Profile>('/me'))
        } catch {
            setProfile(null) // API injoignable : l'espace client affichera un message
        }
    }, [])

    useEffect(() => {
        setAuthTokenProvider(() => firebaseAuth.currentUser?.getIdToken() ?? Promise.resolve(null))
        return onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
            // Profil (rôle) chargé avant l'utilisateur : les redirections peuvent s'appuyer dessus.
            if (firebaseUser) await refreshProfile()
            else setProfile(null)
            setUser(firebaseUser ? mapUser(firebaseUser) : null)
            setLoading(false)
        })
    }, [refreshProfile])

    const clearRecaptcha = () => {
        try {
            recaptcha.current?.clear()
        } catch {
            // déjà nettoyé
        }
        recaptcha.current = null
    }

    const value = useMemo(() => ({
        user,
        profile,
        loading,
        refreshProfile,
        login: async (email: string, password: string) => {
            await signInWithEmailAndPassword(firebaseAuth, email, password)
        },
        register: async (email: string, password: string, displayName?: string) => {
            const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password)
            await sendEmailVerification(cred.user).catch(() => undefined)
            if (displayName) {
                await updateProfile(cred.user, {displayName})
                await api('/me', {method: 'PUT', body: json({displayName})}).catch(() => undefined)
                await refreshProfile()
            }
        },
        loginWithGoogle: async () => {
            await signInWithPopup(firebaseAuth, new GoogleAuthProvider())
        },
        sendPhoneCode: async (phoneNumber: string, recaptchaContainerId: string) => {
            clearRecaptcha()
            recaptcha.current = new RecaptchaVerifier(firebaseAuth, recaptchaContainerId, {size: 'invisible'})
            phoneConfirmation.current = await signInWithPhoneNumber(firebaseAuth, phoneNumber, recaptcha.current)
        },
        confirmPhoneCode: async (code: string) => {
            if (!phoneConfirmation.current) throw new Error('Demandez d\'abord un code.')
            await phoneConfirmation.current.confirm(code)
            phoneConfirmation.current = null
            clearRecaptcha()
        },
        resendVerification: async () => {
            if (firebaseAuth.currentUser) await sendEmailVerification(firebaseAuth.currentUser)
        },
        checkVerification: async () => {
            const current = firebaseAuth.currentUser
            if (!current) return {verified: false}
            await current.reload()
            await current.getIdToken(true) // nouveau jeton : email_verified = true côté API
            const updated = await api<Profile>('/me').catch(() => null)
            setProfile(updated)
            setUser(mapUser(current))
            return {verified: current.emailVerified, role: updated?.role}
        },
        sendPasswordReset: async (email: string) => {
            await sendPasswordResetEmail(firebaseAuth, email)
        },
        deleteAccount: async () => {
            const current = firebaseAuth.currentUser
            if (!current) return
            await api('/me', {method: 'DELETE'})
            await deleteUser(current)
        },
        logout: async () => {
            await signOut(firebaseAuth)
        },
    }), [loading, profile, refreshProfile, user])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
