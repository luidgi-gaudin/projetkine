import {type FormEvent, useEffect, useState} from 'react'
import {Link, useLocation, useNavigate} from 'react-router'
import {AnimatePresence, motion} from 'motion/react'
import {authErrorMessage, homeFor, useAuth} from '../../auth/AuthContext'
import {easeOut} from '../../components/motion/ease'
import {GoogleIcon} from '../../components/ui/Icons'
import {useI18n} from '../../i18n/context'
import {AuthLayout} from './AuthLayout'

type Mode = 'email' | 'phone' | 'forgot'

/** Numéro saisi à la française (06…) converti au format international attendu par Firebase. */
function toE164(raw: string) {
    const phone = raw.replace(/[\s.-]/g, '')
    if (phone.startsWith('+')) return phone
    if (phone.startsWith('00')) return `+${phone.slice(2)}`
    if (phone.startsWith('0')) return `+33${phone.slice(1)}`
    return `+33${phone}`
}

export function LoginPage() {
    const {user, profile, login, loginWithGoogle, sendPhoneCode, confirmPhoneCode, sendPasswordReset} = useAuth()
    const {t, format} = useI18n()
    const navigate = useNavigate()
    const location = useLocation()
    const from = (location.state as { from?: string } | null)?.from

    const [mode, setMode] = useState<Mode>('email')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [phone, setPhone] = useState('')
    const [code, setCode] = useState('')
    const [codeSent, setCodeSent] = useState(false)
    const [cooldown, setCooldown] = useState(0)
    const [resetSent, setResetSent] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Compte à rebours avant de pouvoir redemander un SMS
    useEffect(() => {
        if (cooldown <= 0) return
        const timer = setTimeout(() => setCooldown((s) => s - 1), 1000)
        return () => clearTimeout(timer)
    }, [cooldown])

    const requestCode = async () => {
        await sendPhoneCode(toE164(phone), 'recaptcha-container')
        setCodeSent(true)
        setCooldown(60)
    }

    // Redirige dès que Firebase a ouvert la session (quel que soit le mode de connexion).
    useEffect(() => {
        if (user) navigate(from ?? homeFor(profile), {replace: true})
    }, [from, navigate, profile, user])

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

    const switchMode = (next: Mode) => {
        setMode(next)
        setError(null)
    }

    const onSubmit = (e: FormEvent) => {
        e.preventDefault()
        if (mode === 'email') void run(() => login(email, password))
        if (mode === 'forgot') void run(async () => {
            await sendPasswordReset(email)
            setResetSent(true)
        })
        if (mode === 'phone') void run(async () => {
            if (!codeSent) {
                await requestCode()
            } else {
                await confirmPhoneCode(code.trim())
            }
        })
    }

    return (
        <AuthLayout title={t.auth.loginTitle} text={t.auth.loginText}
                    footer={<>{t.auth.noAccount} <Link to="/inscription">{t.auth.createAccount}</Link></>}>
            <button type="button" className="btn btn-google" disabled={busy} onClick={() => void run(loginWithGoogle)}>
                <GoogleIcon/> {t.auth.google}
            </button>
            <div className="divider"><span>{t.auth.or}</span></div>

            {mode !== 'forgot' && (
                <div className="segmented" role="tablist">
                    {(['email', 'phone'] as const).map((m) => (
                        <button key={m} type="button" role="tab" aria-selected={mode === m}
                                onClick={() => switchMode(m)}>
                            {mode === m && <motion.span layoutId="auth-tab" className="segmented-pill"/>}
                            <span>{m === 'email' ? t.auth.tabEmail : t.auth.tabPhone}</span>
                        </button>
                    ))}
                </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
                <motion.form key={mode + String(codeSent)} className="form" onSubmit={onSubmit}
                             initial={{opacity: 0, x: 16}} animate={{opacity: 1, x: 0}} exit={{opacity: 0, x: -16}}
                             transition={{duration: 0.35, ease: easeOut}}>
                    {mode === 'email' && (
                        <>
                            <label className="field">
                                <span>{t.auth.email}</span>
                                <input type="email" required autoComplete="username" value={email}
                                       onChange={(e) => setEmail(e.target.value)}/>
                            </label>
                            <label className="field">
                                <span className="field-label-row">
                                    {t.auth.password}
                                    <button type="button" className="link-quiet" onClick={() => switchMode('forgot')}>
                                        {t.auth.forgot}
                                    </button>
                                </span>
                                <input type="password" required autoComplete="current-password" value={password}
                                       onChange={(e) => setPassword(e.target.value)}/>
                            </label>
                        </>
                    )}

                    {mode === 'forgot' && (
                        <>
                            <p className="form-text">{resetSent ? t.auth.forgotSent : t.auth.forgotText}</p>
                            {!resetSent && (
                                <label className="field">
                                    <span>{t.auth.email}</span>
                                    <input type="email" required autoComplete="email" value={email}
                                           onChange={(e) => setEmail(e.target.value)}/>
                                </label>
                            )}
                        </>
                    )}

                    {mode === 'phone' && !codeSent && (
                        <label className="field">
                            <span>{t.auth.phone}</span>
                            <input type="tel" inputMode="tel" required autoComplete="tel" value={phone}
                                   placeholder={t.auth.phoneHint} onChange={(e) => setPhone(e.target.value)}/>
                        </label>
                    )}
                    {mode === 'phone' && codeSent && (
                        <>
                            <p className="form-text">
                                {format(t.auth.codeSentTo, {phone})}{' '}
                                <button type="button" className="link-quiet" onClick={() => setCodeSent(false)}>
                                    {t.auth.changeNumber}
                                </button>
                            </p>
                            <label className="field">
                                <span>{t.auth.code}</span>
                                <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} required
                                       className="input-code" value={code} onChange={(e) => setCode(e.target.value)}/>
                            </label>
                            <button type="button" className="link-quiet resend" disabled={cooldown > 0 || busy}
                                    onClick={() => void run(requestCode)}>
                                {cooldown > 0 ? format(t.auth.resendIn, {s: cooldown}) : t.auth.resendCode}
                            </button>
                        </>
                    )}

                    {error && <p className="notice notice-error" role="alert">{error}</p>}

                    {!(mode === 'forgot' && resetSent) && (
                        <button type="submit" className="btn btn-ink btn-block" disabled={busy}>
                            {busy ? t.auth.pleaseWait
                                : mode === 'email' ? t.auth.login
                                    : mode === 'forgot' ? t.auth.forgotSend
                                        : codeSent ? t.auth.confirmCode : t.auth.sendCode}
                        </button>
                    )}
                    {mode === 'forgot' && (
                        <button type="button" className="btn btn-line btn-block" onClick={() => {
                            setResetSent(false)
                            switchMode('email')
                        }}>
                            {t.auth.back}
                        </button>
                    )}
                </motion.form>
            </AnimatePresence>
            <div id="recaptcha-container"/>
        </AuthLayout>
    )
}
