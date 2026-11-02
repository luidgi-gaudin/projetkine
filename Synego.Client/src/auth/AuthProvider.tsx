import {type ReactNode, useCallback, useEffect, useMemo, useState} from 'react'
import {api, ApiError, json} from '../api/client'
import {AuthContext, type User} from './AuthContext'

async function fetchMe(): Promise<User | null> {
    try {
        return await api<User>('/auth/me')
    } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null
        throw e
    }
}

export function AuthProvider({children}: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchMe()
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setLoading(false))
    }, [])

    const login = useCallback(async (email: string, password: string) => {
        await api('/auth/login?useCookies=true', {
            method: 'POST',
            body: json({email, password}),
        })
        setUser(await fetchMe())
    }, [])

    const register = useCallback(
        async (email: string, password: string) => {
            await api('/auth/register', {method: 'POST', body: json({email, password})})
            await login(email, password)
        },
        [login],
    )

    const logout = useCallback(async () => {
        await api('/auth/logout', {method: 'POST'})
        setUser(null)
    }, [])

    const value = useMemo(
        () => ({user, loading, login, register, logout}),
        [user, loading, login, register, logout],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
