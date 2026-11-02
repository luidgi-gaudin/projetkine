import {type FormEvent, useState} from 'react'
import {Link, useLocation, useNavigate} from 'react-router'
import {ApiError} from '../api/client'
import {useAuth} from '../auth/AuthContext'

export function LoginPage() {
    const {login} = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const from = (location.state as { from?: string } | null)?.from ?? '/'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    async function onSubmit(e: FormEvent) {
        e.preventDefault()
        setError(null)
        setSubmitting(true)
        try {
            await login(email, password)
            navigate(from, {replace: true})
        } catch (err) {
            if (err instanceof ApiError && err.status === 429) {
                setError('Trop de tentatives. Réessaie dans une minute.')
            } else {
                // Message volontairement générique (ne révèle pas si le compte existe).
                setError('Identifiants invalides ou compte verrouillé.')
            }
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form className="card" onSubmit={onSubmit}>
            <h1>Connexion</h1>
            <label>
                E-mail
                <input type="email" autoComplete="username" required value={email}
                       onChange={(e) => setEmail(e.target.value)}/>
            </label>
            <label>
                Mot de passe
                <input type="password" autoComplete="current-password" required value={password}
                       onChange={(e) => setPassword(e.target.value)}/>
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button type="submit" disabled={submitting}>
                {submitting ? 'Connexion…' : 'Se connecter'}
            </button>
            <p>
                Pas de compte ? <Link to="/register">Créer un compte</Link>
            </p>
        </form>
    )
}
