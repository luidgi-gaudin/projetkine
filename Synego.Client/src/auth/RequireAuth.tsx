import type {ReactNode} from 'react'
import {Navigate, useLocation} from 'react-router'
import type {UserRole} from '../api/types'
import {DialLoader} from '../components/brand/Dial'
import {useAuth} from './AuthContext'

/** Protège une route : redirige vers /connexion si non connecté, vers /espace si le rôle ne suffit pas. */
export function RequireAuth({children, role}: { children: ReactNode, role?: UserRole }) {
    const {user, profile, loading} = useAuth()
    const location = useLocation()

    if (loading) return <DialLoader/>
    if (!user) return <Navigate to="/connexion" replace state={{from: location.pathname}}/>
    if (role && profile?.role !== role) return <Navigate to="/espace" replace/>
    return children
}
