import {type FormEvent, useState} from 'react'
import {useSearchParams} from 'react-router'
import {AnimatePresence, motion} from 'motion/react'
import {api, ApiError, json} from '../../api/client'
import {useAuth} from '../../auth/AuthContext'
import {LogoMark} from '../../components/brand/Dial'
import {easeOut} from '../../components/motion/ease'
import {Reveal} from '../../components/motion/Reveal'
import {PageHero} from '../../components/site/Blocks'
import {ArrowRight} from '../../components/ui/Icons'
import {brand} from '../../i18n/brand'
import {useI18n} from '../../i18n/context'

type Kind = 'Devis' | 'Contact'

/** Formulaire devis / contact : chaque envoi devient une demande dans l'espace de tickets. */
export function ContactPage() {
    const {t, format} = useI18n()
    const {user, profile} = useAuth()
    const [params] = useSearchParams()
    const [kind, setKind] = useState<Kind>(params.get('type') === 'devis' ? 'Devis' : 'Contact')
    const [form, setForm] = useState({
        name: profile?.displayName ?? user?.name ?? '',
        email: profile?.email ?? user?.email ?? '',
        phone: '',
        company: profile?.company ?? '',
        subject: params.get('sujet') ?? '',
        message: '',
        website: '', // champ piège : invisible pour les humains
    })
    const [errors, setErrors] = useState<string[]>([])
    const [sending, setSending] = useState(false)
    const [reference, setReference] = useState<number | null>(null)

    const field = (key: keyof typeof form) => ({
        value: form[key],
        onChange: (e: { target: { value: string } }) => setForm((f) => ({...f, [key]: e.target.value})),
    })

    async function onSubmit(e: FormEvent) {
        e.preventDefault()
        setErrors([])
        setSending(true)
        try {
            const result = await api<{ reference: number }>('/contact', {method: 'POST', body: json({kind, ...form})})
            setReference(result?.reference ?? 0)
        } catch (err) {
            setErrors(err instanceof ApiError ? err.messages : [String(err)])
        } finally {
            setSending(false)
        }
    }

    return (
        <>
            <PageHero eyebrow={t.contact.eyebrow} lines={t.contact.title} intro={t.contact.intro}/>
            <section className="contact" data-ambient="paper">
                <AnimatePresence mode="wait">
                    {reference === null ? (
                        <motion.form key="form" className="contact-form" onSubmit={onSubmit}
                                     exit={{opacity: 0, y: -16}} transition={{duration: 0.4, ease: easeOut}}>
                            <div className="segmented" role="radiogroup">
                                {(['Devis', 'Contact'] as Kind[]).map((k) => (
                                    <button key={k} type="button" role="radio" aria-checked={kind === k}
                                            onClick={() => setKind(k)}>
                                        {kind === k &&
                                            <motion.span layoutId="contact-kind" className="segmented-pill"/>}
                                        <span>{k === 'Devis' ? t.contactForm.kindQuote : t.contactForm.kindContact}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="field-row">
                                <label className="field">
                                    <span>{t.contactForm.name}</span>
                                    <input required maxLength={120} autoComplete="name" {...field('name')}/>
                                </label>
                                <label className="field">
                                    <span>{t.contactForm.email}</span>
                                    <input required type="email" maxLength={254}
                                           autoComplete="email" {...field('email')}/>
                                </label>
                            </div>
                            <div className="field-row">
                                <label className="field">
                                    <span>{t.contactForm.phone}</span>
                                    <input type="tel" maxLength={32} autoComplete="tel" {...field('phone')}/>
                                </label>
                                <label className="field">
                                    <span>{t.contactForm.company}</span>
                                    <input maxLength={120} autoComplete="organization" {...field('company')}/>
                                </label>
                            </div>
                            <label className="field">
                                <span>{t.contactForm.subject}</span>
                                <input maxLength={160} {...field('subject')}/>
                            </label>
                            <label className="field">
                                <span>{t.contactForm.message}</span>
                                <textarea required rows={6} maxLength={5000} placeholder={t.contact.placeholder}
                                          {...field('message')}/>
                            </label>
                            <label className="honeypot" aria-hidden="true">
                                Website <input tabIndex={-1} autoComplete="off" {...field('website')}/>
                            </label>

                            {errors.length > 0 && (
                                <ul className="notice notice-error" role="alert">
                                    {errors.map((m) => <li key={m}>{m}</li>)}
                                </ul>
                            )}

                            <p className="fine-print">{t.contactForm.consent}</p>
                            <button type="submit" className="btn btn-ink" disabled={sending}>
                                {sending ? t.contactForm.sending : t.contactForm.submit} <ArrowRight/>
                            </button>
                        </motion.form>
                    ) : (
                        <motion.div key="done" className="contact-done"
                                    initial={{opacity: 0, y: 24}} animate={{opacity: 1, y: 0}}
                                    transition={{duration: 0.8, ease: easeOut}}>
                            <LogoMark size={88} animated/>
                            <h2 className="h2">{t.contactForm.sentTitle}</h2>
                            <p>{format(t.contactForm.sentText, {ref: reference})}</p>
                            <button type="button" className="btn btn-line" onClick={() => {
                                setReference(null)
                                setForm((f) => ({...f, subject: '', message: ''}))
                            }}>
                                {t.contactForm.another}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <Reveal className="contact-aside">
                    <p className="eyebrow">{t.contactForm.direct}</p>
                    <p className="contact-aside-line">{brand.email}</p>
                    <p className="contact-aside-line">{brand.phone}</p>
                    <p>{t.brandText.area}</p>
                </Reveal>
            </section>
        </>
    )
}
