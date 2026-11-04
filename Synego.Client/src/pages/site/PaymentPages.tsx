import {useEffect, useState} from 'react'
import {Link, useParams, useSearchParams} from 'react-router'
import {api, ApiError, json} from '../../api/client'
import type {PaymentConfirmation, PaymentLink} from '../../api/types'
import {useResource} from '../../api/useResource'
import {useAuth} from '../../auth/AuthContext'
import {DialLoader, LogoMark} from '../../components/brand/Dial'
import {money} from '../../components/learning/format'
import {TermsCheckbox} from '../../components/learning/LearningBits'
import {ArrowRight, Check} from '../../components/ui/Icons'
import {useI18n} from '../../i18n/context'

function PaymentShell({children}: { children: React.ReactNode }) {
    return (
        <section className="pay-page" data-ambient="mist">
            <div className="pay-card">
                <Link to="/" className="pay-brand"><LogoMark size={34}/> Synégo</Link>
                {children}
            </div>
        </section>
    )
}

/** Lien de paiement envoyé par la coach : séminaire, accompagnement ou formation. */
export function PaymentLinkPage() {
    const {token} = useParams()
    const {t, locale, format} = useI18n()
    const {data, error} = useResource<PaymentLink>(`/payments/link/${token}`)
    const [accepted, setAccepted] = useState(false)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    if (error) return <PaymentShell><p className="notice">{t.payment.notFound}</p></PaymentShell>
    if (!data) return <PaymentShell><DialLoader/></PaymentShell>

    const amount = money(data.amountCents, data.currency, locale)

    async function pay() {
        if (!accepted) {
            setMessage(t.formations.termsRequired)
            return
        }
        setBusy(true)
        setMessage(null)
        try {
            const {url} = await api<{ url: string }>(`/payments/link/${token}/checkout`, {
                method: 'POST', body: json({acceptTerms: true, locale}),
            })
            setMessage(t.formations.redirecting)
            window.location.assign(url)
        } catch (err) {
            setMessage(err instanceof ApiError ? err.messages.join(' ') : String(err))
            setBusy(false)
        }
    }

    return (
        <PaymentShell>
            <p className="eyebrow">{t.payment.eyebrow} · {t.payment.kind[data.kind]}</p>
            <p className="pay-hello">{data.firstName ? format(t.payment.hello, {name: data.firstName}) : t.payment.helloAnon}</p>
            <p className="pay-intro">{t.payment.intro}</p>
            <div className="pay-summary">
                <span className="pay-label">{data.label}</span>
                <strong className="pay-amount">{amount}</strong>
                <span className="pay-installments">{t.formations.installments}</span>
            </div>
            {data.status === 'Paid' ? (
                <>
                    <p className="notice notice-success"><Check size={16}/> {t.payment.paid}</p>
                    {data.receiptUrl && <a className="link-arrow" href={data.receiptUrl} target="_blank"
                                           rel="noreferrer">{t.payment.receipt} <ArrowRight/></a>}
                </>
            ) : data.status === 'Canceled' || data.status === 'Refunded' ? (
                <p className="notice">{t.payment.canceled}</p>
            ) : data.expired ? (
                <p className="notice">{t.payment.expired} <Link to="/contact">Contact</Link></p>
            ) : !data.paymentsEnabled ? (
                <p className="notice">{t.payment.paymentsOff} <Link to="/contact">Contact</Link></p>
            ) : (
                <>
                    <TermsCheckbox checked={accepted} onChange={setAccepted}/>
                    <button type="button" className="btn btn-ink pay-button" onClick={pay} disabled={busy}>
                        {format(t.payment.pay, {amount})} <ArrowRight/>
                    </button>
                    <p className="fine-print">{t.payment.methods}</p>
                </>
            )}
            {message && <p className="notice" role="status">{message}</p>}
        </PaymentShell>
    )
}

/** Retour de Stripe : confirmation immédiate (le webhook fait de même côté serveur). */
export function PaymentReturnPage() {
    const [params] = useSearchParams()
    const sessionId = params.get('session_id')
    const {t, locale} = useI18n()
    const {user} = useAuth()
    const [result, setResult] = useState<PaymentConfirmation | null>(null)
    const [failed, setFailed] = useState(false)
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        if (!sessionId) return
        let cancelled = false
        api<PaymentConfirmation>('/payments/confirm', {method: 'POST', body: json({sessionId})})
            .then((r) => {
                if (cancelled) return
                setResult(r)
                // Certains moyens de paiement se confirment après quelques secondes : on réessaie un peu.
                if (r.status === 'Pending' && attempt < 8) setTimeout(() => setAttempt((a) => a + 1), 3000)
            })
            .catch(() => !cancelled && setFailed(true))
        return () => {
            cancelled = true
        }
    }, [sessionId, attempt])

    if (failed || !sessionId) {
        return (
            <PaymentShell>
                <p className="notice">{t.payment.returnUnknown}</p>
                <Link to="/contact" className="btn btn-ink">Contact</Link>
            </PaymentShell>
        )
    }
    if (!result) return <PaymentShell><DialLoader/></PaymentShell>

    if (result.status === 'Pending') {
        return (
            <PaymentShell>
                <h1 className="pay-title">{t.payment.returnPending}</h1>
                <p className="pay-intro">{t.payment.returnPendingText}</p>
                <DialLoader/>
            </PaymentShell>
        )
    }
    if (result.status !== 'Paid') {
        return (
            <PaymentShell>
                <p className="notice">{t.payment.returnFailed}</p>
                <Link to="/" className="btn btn-ink">{t.payment.home}</Link>
            </PaymentShell>
        )
    }

    return (
        <PaymentShell>
            <div className="pay-done"><Check size={28}/></div>
            <h1 className="pay-title">{t.payment.returnTitle}</h1>
            <div className="pay-summary">
                <span className="pay-label">{result.label}</span>
                <strong className="pay-amount">{money(result.amountCents, result.currency, locale)}</strong>
            </div>
            {result.courseSlug ? (
                result.linkedToAccount ? (
                    <>
                        <p className="pay-intro">{t.payment.returnCourse}</p>
                        <Link to={user ? `/espace/formations/${result.courseSlug}` : '/connexion'}
                              className="btn btn-ink">
                            {t.payment.openCourse} <ArrowRight/>
                        </Link>
                    </>
                ) : (
                    <>
                        <p className="pay-intro">{t.payment.returnCourseClaim}</p>
                        <Link to={user ? '/espace/formations' : '/connexion'}
                              className="btn btn-ink">{t.payment.goSpace} <ArrowRight/></Link>
                    </>
                )
            ) : (
                <>
                    <p className="pay-intro">{t.payment.returnOther}</p>
                    <Link to={user ? '/espace/paiements' : '/'} className="btn btn-ink">
                        {user ? t.payment.goSpace : t.payment.home} <ArrowRight/>
                    </Link>
                </>
            )}
            {result.receiptUrl &&
                <a className="link-arrow" href={result.receiptUrl} target="_blank" rel="noreferrer">{t.payment.receipt}
                    <ArrowRight/></a>}
        </PaymentShell>
    )
}
