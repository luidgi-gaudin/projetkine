import {type FormEvent, useState} from 'react'
import {Link, useNavigate} from 'react-router'
import {ApiError} from '../api/client'
import {useAuth} from '../auth/AuthContext'

export function RegisterPage() {
    const {register} = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [errors, setErrors] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)

    async function onSubmit(e: FormEvent) {
        e.preventDefault()
        if (password !== confirm) {
            setErrors(['Les mots de passe ne correspondent pas.'])
            return
        }
        setErrors([])
        setSubmitting(true)
        try {
            await register(email, password)
            navigate('/', {replace: true})
        } catch (err) {
            if (err instanceof ApiError && Object.keys(err.errors).length > 0) {
                setErrors(Object.values(err.errors).flat())
            } else {
                setErrors([err instanceof Error ? err.message : 'Erreur inconnue.'])
            }
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <form className="card" onSubmit={onSubmit}>
            <h1>Créer un compte</h1>
            <label>
                E-mail
                <input type="email" autoComplete="username" required value={email}
                       onChange={(e) => setEmail(e.target.value)}/>
            </label>
            <label>
                Mot de passe
                <input type="password" autoComplete="new-password" required minLength={12} value={password}
                       onChange={(e) => setPassword(e.target.value)}/>
            </label>
            <label>
                Confirmer le mot de passe
                <input type="password" autoComplete="new-password" required value={confirm}
                       onChange={(e) => setConfirm(e.target.value)}/>
            </label>
            <p className="hint">12 caractères min., avec majuscule, minuscule, chiffre et symbole.</p>
            {errors.length > 0 && (
                <ul className="error" role="alert">
                    {errors.map((m) => <li key={m}>{m}</li>)}
                </ul>
            )}
            <button type="submit" disabled={submitting}>
                {submitting ? 'Création…' : 'Créer le compte'}
            </button>
            <p>
                Déjà inscrit ? <Link to="/login">Se connecter</Link>
            </p>
        </form>
    )
}
