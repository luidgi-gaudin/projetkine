import {createContext, useContext} from 'react'

export type User = {
    id: string
    email: string
}

export type AuthContextValue = {
    user: User | null
    loading: boolean
    login: (email: string, password: string) => Promise<void>
    register: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>.')
    return ctx
}
