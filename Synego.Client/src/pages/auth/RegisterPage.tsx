import {type FormEvent, useEffect, useState} from 'react'
import {Link, useNavigate} from 'react-router'
import {authErrorMessage, homeFor, useAuth} from '../../auth/AuthContext'
import {GoogleIcon} from '../../components/ui/Icons'
import {useI18n} from '../../i18n/context'
import {AuthLayout} from './AuthLayout'

export function RegisterPage() {
    const {user, profile, register, loginWithGoogle} = useAuth()
    const {t} = useI18n()
    const navigate = useNavigate()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (user) navigate(homeFor(profile), {replace: true})
    }, [navigate, profile, user])

    const run = async (action: () => Promise<void>) => {
        setError(null)
        setBusy(true)
        try {
            await action()
        } catch (err) {
            setError(authErrorMessage(err, t.auth.errors))
        } finally {
            setBusy(false)
        }
    }

    const onSubmit = (e: FormEvent) => {
        e.preventDefault()
        if (password.length < 10) return setError(t.auth.tooShort)
        if (password !== confirm) return setError(t.auth.mismatch)
        void run(() => register(email, password, name.trim() || undefined))
    }

    return (
        <AuthLayout title={t.auth.registerTitle} text={t.auth.registerText}
                    footer={<>{t.auth.hasAccount} <Link to="/connexion">{t.auth.login}</Link></>}>
            <button type="button" className="btn btn-google" disabled={busy} onClick={() => void run(loginWithGoogle)}>
                <GoogleIcon/> {t.auth.google}
            </button>
            <div className="divider"><span>{t.auth.or}</span></div>

            <form className="form" onSubmit={onSubmit}>
                <label className="field">
                    <span>{t.auth.name}</span>
                    <input autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)}/>
                </label>
                <label className="field">
                    <span>{t.auth.email}</span>
                    <input type="email" required autoComplete="username" value={email}
                           onChange={(e) => setEmail(e.target.value)}/>
                </label>
                <label className="field">
                    <span>{t.auth.password} <small>· {t.auth.passwordHint}</small></span>
                    <input type="password" required minLength={10} autoComplete="new-password" value={password}
                           onChange={(e) => setPassword(e.target.value)}/>
                </label>
                <label className="field">
                    <span>{t.auth.confirm}</span>
                    <input type="password" required autoComplete="new-password" value={confirm}
                           onChange={(e) => setConfirm(e.target.value)}/>
                </label>
                {error && <p className="notice notice-error" role="alert">{error}</p>}
                <button type="submit" className="btn btn-ink btn-block" disabled={busy}>
                    {busy ? t.auth.pleaseWait : t.auth.register}
                </button>
            </form>
        </AuthLayout>
    )
}
