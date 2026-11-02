import type {ReactNode} from 'react'
import {Navigate, useLocation} from 'react-router'
import {useAuth} from './AuthContext'

/** Protège une route : redirige vers /login si non connecté. */
export function RequireAuth({children}: { children: ReactNode }) {
    const {user, loading} = useAuth()
    const location = useLocation()

    if (loading) return <p className="center">Chargement…</p>
    if (!user) return <Navigate to="/login" replace state={{from: location.pathname}}/>
    return children
}
