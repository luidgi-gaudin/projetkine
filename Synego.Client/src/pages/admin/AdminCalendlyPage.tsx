import {type FormEvent, useState} from 'react'
import {AnimatePresence, motion} from 'motion/react'
import {api, ApiError, json} from '../../api/client'
import type {CalendlyStatus} from '../../api/types'
import {useResource} from '../../api/useResource'
import {DialLoader} from '../../components/brand/Dial'
import {SpaceHeader} from '../../components/espace/SpaceLayout'
import {useFeedback} from '../../components/ui/feedback'
import {easeOut} from '../../components/motion/ease'
import {ArrowUpRight, Check, LinkIcon, Refresh} from '../../components/ui/Icons'

const audienceLabels = {
    Prospect: 'Section « Vous découvrez Synégo »',
    Client: 'Section « Déjà client » · clients signés'
}

/** Le coach relie son Calendly en collant un jeton, puis associe ses événements aux types de rendez-vous. */
export function AdminCalendlyPage() {
    const {data, error, reload} = useResource<CalendlyStatus>('/admin/calendly')
    const [status, setStatus] = useState<CalendlyStatus | null>(null)
    const current = status ?? data

    if (error) return <p className="notice notice-error">{error.message}</p>
    if (!current) return <DialLoader/>

    return (
        <>
            <SpaceHeader title="Calendly"
                         text="Vos rendez-vous en ligne : reliez votre compte une fois, le site s'occupe du reste."/>
            <AnimatePresence mode="wait">
                {current.connected
                    ? <Connected key="on" status={current} onChange={setStatus} onDisconnect={() => {
                        setStatus(null)
                        reload()
                    }}/>
                    : <Connect key="off" onConnected={setStatus}/>}
            </AnimatePresence>
        </>
    )
}

function Connect({onConnected}: { onConnected: (s: CalendlyStatus) => void }) {
    const [token, setToken] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function onSubmit(e: FormEvent) {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
            onConnected(await api<CalendlyStatus>('/admin/calendly/connect', {method: 'POST', body: json({token})}))
        } catch (err) {
            setError(err instanceof ApiError ? err.messages.join(' ') : String(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <motion.section className="card calendly-connect" initial={{opacity: 0, y: 12}} animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: -12}} transition={{duration: 0.5, ease: easeOut}}>
            <h2 className="h3">Relier mon Calendly</h2>
            <ol className="steps">
                <li>
                    <span className="steps-index">1</span>
                    <div>
                        Ouvrez la page des intégrations Calendly (connectez-vous si besoin).
                        <a className="link-arrow" href="https://calendly.com/integrations/api_webhooks" target="_blank"
                           rel="noreferrer">Ouvrir Calendly <ArrowUpRight/></a>
                    </div>
                </li>
                <li>
                    <span className="steps-index">2</span>
                    <div>Cliquez sur <strong>« Générer un nouveau jeton »</strong>, nommez-le « Synégo », puis
                        copiez-le.
                    </div>
                </li>
                <li>
                    <span className="steps-index">3</span>
                    <div>Collez-le ci-dessous. Il est vérifié auprès de Calendly puis stocké chiffré.</div>
                </li>
            </ol>
            <form className="form" onSubmit={onSubmit}>
                <label className="field">
                    <span>Jeton Calendly</span>
                    <input required autoComplete="off" spellCheck={false} value={token} placeholder="eyJraWQiOi…"
                           onChange={(e) => setToken(e.target.value)}/>
                </label>
                {error && <p className="notice notice-error" role="alert">{error}</p>}
                <button type="submit" className="btn btn-ink" disabled={busy}>
                    <LinkIcon/> {busy ? 'Vérification…' : 'Relier mon compte'}
                </button>
            </form>
        </motion.section>
    )
}

function Connected({status, onChange, onDisconnect}: {
    status: CalendlyStatus
    onChange: (s: CalendlyStatus) => void
    onDisconnect: () => void
}) {
    const feedback = useFeedback()
    const [choices, setChoices] = useState(() =>
        Object.fromEntries(status.types.map((t) => [t.key, {eventTypeUri: t.eventTypeUri ?? '', enabled: t.enabled}])))
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [syncResult, setSyncResult] = useState<string | null>(null)

    async function save() {
        setSaving(true)
        try {
            const items = Object.entries(choices).map(([key, c]) => ({
                key,
                eventTypeUri: c.eventTypeUri || null,
                enabled: c.enabled
            }))
            onChange(await api<CalendlyStatus>('/admin/calendly/types', {method: 'PUT', body: json({items})}))
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        } finally {
            setSaving(false)
        }
    }

    async function sync() {
        setSyncing(true)
        setSyncResult(null)
        try {
            const result = await api<{ synced: number }>('/admin/calendly/sync', {method: 'POST'})
            setSyncResult(`${result.synced} rendez-vous à jour.`)
        } catch (err) {
            setSyncResult(err instanceof Error ? err.message : String(err))
        } finally {
            setSyncing(false)
        }
    }

    async function disconnect() {
        if (!(await feedback.confirm({
            title: 'Délier votre compte Calendly ?',
            message: 'Le site affichera les liens par défaut, et la synchronisation s\'arrêtera.',
            confirmLabel: 'Délier', danger: true,
        }))) return
        await api('/admin/calendly', {method: 'DELETE'})
        onDisconnect()
    }

    return (
        <motion.div initial={{opacity: 0, y: 12}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -12}}
                    transition={{duration: 0.5, ease: easeOut}}>
            <section className="card calendly-account">
                <div className="calendly-account-head">
                    <span className="status-dot" aria-hidden="true"/>
                    <div>
                        <h2 className="h3">{status.account?.name}</h2>
                        <p className="row-meta">{status.account?.email}</p>
                    </div>
                    <button type="button" className="btn btn-line btn-small" onClick={() => void disconnect()}>Délier
                    </button>
                </div>
                <p className="fine-print">
                    {status.webhookActive
                        ? 'Synchronisation instantanée active : chaque réservation ou annulation arrive aussitôt.'
                        : status.publicUrlIsLocal
                            ? 'Mode local : les réservations faites sur le site sont enregistrées ; utilisez « Synchroniser » pour les autres.'
                            : 'Offre Calendly gratuite : les réservations faites sur le site sont enregistrées ; « Synchroniser » récupère aussi celles prises ailleurs.'}
                </p>
                <div className="form-actions">
                    <button type="button" className="btn btn-ink btn-small" disabled={syncing}
                            onClick={() => void sync()}>
                        <Refresh/> {syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
                    </button>
                    {syncResult && <span className="saved">{syncResult}</span>}
                </div>
            </section>

            {status.error && <p className="notice notice-error">{status.error}</p>}

            <section className="card">
                <h2 className="h3">Quel événement pour quel rendez-vous ?</h2>
                <p className="fine-print">Les événements viennent de votre compte Calendly. Décochez un type pour le
                    retirer du site.</p>
                <div className="mapping">
                    {status.types.map((type) => {
                        const choice = choices[type.key]
                        const event = status.eventTypes.find((e) => e.uri === choice.eventTypeUri)
                        return (
                            <div className="mapping-row" key={type.key}>
                                <div className="mapping-label">
                                    <strong>{type.title}</strong>
                                    <span className="row-meta">{audienceLabels[type.audience]}</span>
                                </div>
                                <select value={choice.eventTypeUri} aria-label={`Événement Calendly pour ${type.title}`}
                                        onChange={(e) => setChoices({
                                            ...choices,
                                            [type.key]: {...choice, eventTypeUri: e.target.value}
                                        })}>
                                    <option value="">Choisir un événement…</option>
                                    {status.eventTypes.map((e) => (
                                        <option key={e.uri}
                                                value={e.uri}>{e.name} · {e.duration} min{e.usesGoogleMeet ? ' · Meet' : ''}{e.secret ? ' · secret' : ''}</option>
                                    ))}
                                </select>
                                <label className="toggle">
                                    <input type="checkbox" checked={choice.enabled}
                                           onChange={(e) => setChoices({
                                               ...choices,
                                               [type.key]: {...choice, enabled: e.target.checked}
                                           })}/>
                                    <span>Sur le site</span>
                                </label>
                                {event && !event.usesGoogleMeet && (
                                    <p className="row-warning mapping-warning">
                                        Cet événement n'est pas en visio Google Meet : dans Calendly, choisissez «
                                        Google Meet »
                                        comme lieu, pour que le lien soit envoyé à la réservation et dans le rappel de
                                        la veille.
                                    </p>
                                )}
                                {type.audience === 'Client' && event && !event.secret && (
                                    <p className="row-warning mapping-warning">
                                        Cet événement est visible sur votre page Calendly publique : passez-le en «
                                        secret »
                                        dans Calendly pour le réserver vraiment aux clients signés.
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </div>
                <div className="form-actions">
                    <button type="button" className="btn btn-ink" disabled={saving} onClick={() => void save()}>
                        {saving ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                    <AnimatePresence>
                        {saved &&
                            <motion.span className="saved" initial={{opacity: 0, x: -8}} animate={{opacity: 1, x: 0}}
                                         exit={{opacity: 0}}><Check size={16}/> Enregistré</motion.span>}
                    </AnimatePresence>
                </div>
            </section>
        </motion.div>
    )
}
