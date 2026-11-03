import {type FormEvent, useCallback, useEffect, useRef, useState} from 'react'
import {Link, useNavigate, useParams, useSearchParams} from 'react-router'
import {AnimatePresence, motion} from 'motion/react'
import {api, ApiError, download, json, upload} from '../../api/client'
import type {Appointment, BookingType, DocumentItem, Profile, TicketDetail, TicketSummary} from '../../api/types'
import {authErrorMessage, displayNameOf, useAuth} from '../../auth/AuthContext'
import {useResource} from '../../api/useResource'
import {DialLoader} from '../../components/brand/Dial'
import {formatSize} from '../../components/espace/format'
import {SpaceHeader, StaggerList} from '../../components/espace/SpaceLayout'
import {easeOut} from '../../components/motion/ease'
import {ArrowRight, Calendar, Download, FileIcon, Message, Trash, Upload} from '../../components/ui/Icons'
import {AddToCalendar} from '../../components/booking/AddToCalendar'
import {BookingChooser} from '../../components/booking/BookingChooser'
import {useFeedback} from '../../components/ui/feedback'
import {useI18n} from '../../i18n/context'

const dateTime: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
}

function ErrorNotice({error}: { error: Error | null }) {
    const {t} = useI18n()
    return error ? <p className="notice notice-error">{t.espace.apiDown}</p> : null
}

// ---------- Accueil ----------
/** Encart « confirmez votre e-mail » : obligatoire pour les comptes e-mail, et pour devenir coach. */
function VerifyEmailNotice() {
    const {user, resendVerification, checkVerification} = useAuth()
    const {t, format} = useI18n()
    const navigate = useNavigate()
    const [message, setMessage] = useState<string | null>(null)
    if (!user || user.emailVerified || !user.providerId?.includes('password')) return null

    return (
        <section className="card verify-card">
            <h2 className="h3">{t.espace.verifyTitle}</h2>
            <p>{format(t.espace.verifyText, {email: user.email})}</p>
            <div className="form-actions">
                <button type="button" className="btn btn-ink btn-small" onClick={async () => {
                    const {verified, role} = await checkVerification()
                    if (!verified) setMessage(t.espace.verifyPending)
                    else if (role === 'Coach') navigate('/admin')
                }}>{t.espace.verifyDone}</button>
                <button type="button" className="link-quiet" onClick={async () => {
                    await resendVerification().catch(() => undefined)
                    setMessage(t.espace.verifySent)
                }}>{t.espace.verifyResend}</button>
                {message && <span className="row-meta">{message}</span>}
            </div>
        </section>
    )
}

export function EspaceHomePage() {
    const {user, profile} = useAuth()
    const {t, format, date} = useI18n()
    const appointments = useResource<Appointment[]>('/booking/mine')
    const documents = useResource<DocumentItem[]>('/documents')
    const tickets = useResource<TicketSummary[]>('/tickets')

    const next = appointments.data
        ?.filter((a) => a.status === 'Scheduled' && new Date(a.startsAt) > new Date())
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0]
    const openTickets = tickets.data?.filter((ticket) => ticket.status !== 'Closed') ?? []

    const roleLine = profile?.role === 'Coach' ? t.espace.roleAdmin
        : profile?.role === 'Client' && profile.signedAt ? format(t.espace.roleClient, {date: date(profile.signedAt)})
            : t.espace.roleProspect

    return (
        <>
            <SpaceHeader title={format(t.espace.hello, {name: displayNameOf(user, profile)})} text={roleLine}>
                {profile?.role === 'Coach' &&
                    <Link to="/admin" className="btn btn-ink btn-small">{t.espace.nav.admin}</Link>}
            </SpaceHeader>
            <VerifyEmailNotice/>
            <ErrorNotice error={appointments.error}/>
            <div className="space-grid">
                <section className="tile tile-accent">
                    <p className="tile-label"><Calendar/> {t.espace.nextAppointment}</p>
                    {next ? (
                        <>
                            <p className="tile-big">{date(next.startsAt, dateTime)}</p>
                            <p>{t.booking.types[next.typeKey]?.title ?? next.title}</p>
                        </>
                    ) : <p className="tile-empty">{t.espace.noUpcoming}</p>}
                    <Link to="/espace/rendez-vous?reserver=1" className="link-arrow">{t.espace.bookNow}
                        <ArrowRight/></Link>
                </section>

                <section className="tile">
                    <p className="tile-label"><FileIcon/> {t.espace.latestDocuments}</p>
                    {documents.data?.length ? (
                        <ul className="tile-list">
                            {documents.data.slice(0, 3).map((d) => <li key={d.id}>{d.fileName}</li>)}
                        </ul>
                    ) : <p className="tile-empty">{t.espace.noDocuments}</p>}
                    <Link to="/espace/documents" className="link-arrow">{t.espace.seeAll} <ArrowRight/></Link>
                </section>

                <section className="tile">
                    <p className="tile-label"><Message/> {t.espace.openRequests}</p>
                    {openTickets.length ? (
                        <ul className="tile-list">
                            {openTickets.slice(0, 3).map((ticket) => <li key={ticket.id}>{ticket.subject}</li>)}
                        </ul>
                    ) : <p className="tile-empty">{t.espace.noRequests}</p>}
                    <Link to="/espace/demandes" className="link-arrow">{t.espace.seeAll} <ArrowRight/></Link>
                </section>
            </div>
        </>
    )
}

// ---------- Rendez-vous ----------
/** Tout se gère ici : réserver, déplacer, annuler, rejoindre la visio, ajouter à l'agenda. */
export function EspaceAppointmentsPage() {
    const feedback = useFeedback()
    const {t, date, format} = useI18n()
    const [params] = useSearchParams()
    const types = useResource<BookingType[]>('/booking/types')
    const [list, setList] = useState<Appointment[] | null>(null)
    const [error, setError] = useState<Error | null>(null)
    const [booking, setBooking] = useState(params.get('reserver') === '1')
    const [rescheduling, setRescheduling] = useState<Appointment | null>(null)
    const panel = useRef<HTMLDivElement>(null)

    // Relit aussi chez Calendly les annulations faites depuis ses e-mails.
    const load = useCallback(() => {
        api<Appointment[]>('/booking/mine/refresh', {method: 'POST'}).then(setList).catch(setError)
    }, [])

    useEffect(() => {
        load()
        window.addEventListener('focus', load)
        return () => window.removeEventListener('focus', load)
    }, [load])

    const openPanel = (appointment: Appointment | null) => {
        setRescheduling(appointment)
        setBooking(true)
        setTimeout(() => panel.current?.scrollIntoView({behavior: 'smooth', block: 'start'}), 50)
    }

    async function cancel(appointment: Appointment, silent = false) {
        if (!silent && !(await feedback.confirm({
            title: t.espace.cancel,
            message: format(t.espace.cancelConfirm, {date: date(appointment.startsAt, dateTime)}),
            confirmLabel: t.espace.cancel,
            danger: true,
        }))) return
        try {
            await api(`/booking/${appointment.id}/cancel`, {
                method: 'POST',
                body: json({reason: silent ? 'Déplacé depuis l\'espace client' : null}),
            })
            if (!silent) feedback.toast(t.espace.canceled)
        } catch (err) {
            // Calendly non relié : l'API renvoie le lien d'annulation Calendly en secours.
            if (err instanceof ApiError && err.status === 409 && err.message.startsWith('https://')) {
                window.open(err.message, '_blank', 'noopener')
            } else {
                feedback.toast(format(t.espace.actionFailed, {reason: err instanceof Error ? err.message : String(err)}), 'error')
            }
        } finally {
            load()
        }
    }

    const onConfirmed = async () => {
        if (rescheduling) {
            await cancel(rescheduling, true)
            feedback.toast(t.espace.rescheduled)
            setRescheduling(null)
        }
        load()
    }

    const now = new Date()
    const upcoming = list?.filter((a) => new Date(a.startsAt) >= now).reverse() ?? []
    const past = list?.filter((a) => new Date(a.startsAt) < now) ?? []

    const row = (a: Appointment) => {
        const isUpcoming = a.status === 'Scheduled' && new Date(a.startsAt) > now
        // Annulation et déplacement : jusqu'à 24 h avant, comme annoncé dans les rappels.
        const changeable = isUpcoming && new Date(a.startsAt).getTime() - now.getTime() > 24 * 3600 * 1000
        const title = t.booking.types[a.typeKey]?.title ?? a.title
        return (
            <div className={`row row-appointment status-${a.status}`}>
                <div className="row-main">
                    <span className="row-title">{title}</span>
                    <span className="row-meta">{date(a.startsAt, dateTime)}</span>
                    {isUpcoming && (
                        <span
                            className="row-meta row-policy">{changeable ? t.espace.cancelPolicy : t.espace.cancelClosed}</span>
                    )}
                </div>
                <span className="chip">{t.espace.status[a.status]}</span>
                {isUpcoming && (
                    <span className="row-actions">
                        {a.meetingUrl && <a className="btn btn-ink btn-small" href={a.meetingUrl} target="_blank"
                                            rel="noreferrer">{t.espace.join}</a>}
                        {changeable && <button type="button" className="link-quiet"
                                               onClick={() => openPanel(a)}>{t.espace.reschedule}</button>}
                        {changeable && <button type="button" className="link-quiet"
                                               onClick={() => void cancel(a)}>{t.espace.cancel}</button>}
                    </span>
                )}
                {isUpcoming && (
                    <AddToCalendar compact event={{
                        id: a.id, title: `${title} · Synégo`, start: a.startsAt, end: a.endsAt,
                        url: a.meetingUrl, location: a.location,
                    }}/>
                )}
            </div>
        )
    }

    return (
        <>
            <SpaceHeader title={t.espace.appointmentsTitle}>
                {!booking && (
                    <button type="button" className="btn btn-ink btn-small" onClick={() => openPanel(null)}>
                        <Calendar size={16}/> {t.espace.bookTitle}
                    </button>
                )}
            </SpaceHeader>

            <AnimatePresence initial={false}>
                {booking && (
                    <motion.section ref={panel} className="card booking-panel"
                                    initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}}
                                    exit={{opacity: 0, height: 0}} transition={{duration: 0.6, ease: easeOut}}>
                        <header className="booking-panel-head">
                            <h2 className="h3">{rescheduling ? t.espace.reschedule : t.espace.bookTitle}</h2>
                            <button type="button" className="link-quiet" onClick={() => {
                                setBooking(false)
                                setRescheduling(null)
                            }}>{t.espace.bookClose}</button>
                        </header>
                        {rescheduling && <p className="notice">{t.espace.rescheduleTitle}</p>}
                        {!types.data && <DialLoader/>}
                        {types.data && (
                            <BookingChooser key={rescheduling?.id ?? 'new'} types={types.data}
                                            preselect={rescheduling?.typeKey ?? null}
                                            onConfirmed={() => void onConfirmed()}/>
                        )}
                    </motion.section>
                )}
            </AnimatePresence>


            <ErrorNotice error={error}/>
            {!list && !error && <DialLoader/>}
            {list && (
                <>
                    <h2 className="space-subtitle">{t.espace.upcoming}</h2>
                    {upcoming.length ? <StaggerList className="rows">{upcoming.map(row)}</StaggerList>
                        : <p className="tile-empty">{t.espace.noUpcoming}</p>}
                    {past.length > 0 && (
                        <>
                            <h2 className="space-subtitle">{t.espace.past}</h2>
                            <StaggerList className="rows">{past.map(row)}</StaggerList>
                        </>
                    )}
                </>
            )}
        </>
    )
}

// ---------- Documents ----------
export function EspaceDocumentsPage() {
    const feedback = useFeedback()
    const {t, format, date} = useI18n()
    const {data, error, reload} = useResource<DocumentItem[]>('/documents')
    const input = useRef<HTMLInputElement>(null)
    const [busy, setBusy] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [dragging, setDragging] = useState(false)

    async function send(file: File | undefined) {
        if (!file) return
        setBusy(true)
        setUploadError(null)
        try {
            await upload('/documents', file)
            reload()
        } catch (err) {
            setUploadError(err instanceof ApiError ? err.messages.join(' ') : String(err))
        } finally {
            setBusy(false)
            if (input.current) input.current.value = ''
        }
    }

    async function remove(doc: DocumentItem) {
        if (!(await feedback.confirm({
            title: t.espace.delete, message: format(t.espace.confirmDelete, {name: doc.fileName}),
            confirmLabel: t.espace.delete, danger: true,
        }))) return
        await api(`/documents/${doc.id}`, {method: 'DELETE'})
        feedback.toast(t.espace.deleted)
        reload()
    }

    return (
        <>
            <SpaceHeader title={t.espace.documentsTitle} text={t.espace.documentsText}/>
            <label className={`dropzone${dragging ? ' is-dragging' : ''}${busy ? ' is-busy' : ''}`}
                   onDragOver={(e) => {
                       e.preventDefault()
                       setDragging(true)
                   }}
                   onDragLeave={() => setDragging(false)}
                   onDrop={(e) => {
                       e.preventDefault()
                       setDragging(false)
                       void send(e.dataTransfer.files[0])
                   }}>
                <input ref={input} type="file" className="sr-only" disabled={busy}
                       accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.pptx"
                       onChange={(e) => void send(e.target.files?.[0])}/>
                <Upload size={24}/>
                <span className="dropzone-title">{busy ? t.espace.uploading : t.espace.drop}</span>
                <span className="dropzone-hint">{t.espace.dropHint}</span>
            </label>
            <p className="fine-print">{t.espace.documentsWarning}</p>
            {uploadError && <p className="notice notice-error" role="alert">{uploadError}</p>}
            <ErrorNotice error={error}/>
            {!data && !error && <DialLoader/>}
            {data?.length === 0 && <p className="tile-empty">{t.espace.noDocuments}</p>}
            {data && data.length > 0 && (
                <StaggerList className="rows">
                    {data.map((doc) => (
                        <div className="row" key={doc.id}>
                            <FileIcon/>
                            <div className="row-main">
                                <span className="row-title">{doc.fileName}</span>
                                <span className="row-meta">
                                    {doc.sharedByStaff ? `${t.espace.sharedWithYou} · ${doc.category}` : t.espace.yours}
                                    {' · '}{date(doc.createdAt)} · {formatSize(doc.sizeBytes)}
                                </span>
                            </div>
                            <span className="row-actions">
                                <button type="button" className="icon-button" title={t.espace.download}
                                        onClick={() => void download(`/documents/${doc.id}/file`, doc.fileName)}>
                                    <Download/>
                                </button>
                                {!doc.sharedByStaff && (
                                    <button type="button" className="icon-button" title={t.espace.delete}
                                            onClick={() => void remove(doc)}>
                                        <Trash/>
                                    </button>
                                )}
                            </span>
                        </div>
                    ))}
                </StaggerList>
            )}
        </>
    )
}

// ---------- Demandes ----------
export function EspaceRequestsPage() {
    const {t, date} = useI18n()
    const {data, error, reload} = useResource<TicketSummary[]>('/tickets')
    const [creating, setCreating] = useState(false)
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [busy, setBusy] = useState(false)

    async function onSubmit(e: FormEvent) {
        e.preventDefault()
        setBusy(true)
        try {
            await api('/tickets', {method: 'POST', body: json({subject, message})})
            setSubject('')
            setMessage('')
            setCreating(false)
            reload()
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            <SpaceHeader title={t.espace.requestsTitle} text={t.espace.requestsText}>
                <button type="button" className="btn btn-ink btn-small" onClick={() => setCreating((c) => !c)}>
                    {t.espace.newRequest}
                </button>
            </SpaceHeader>
            <AnimatePresence initial={false}>
                {creating && (
                    <motion.form className="form card" onSubmit={onSubmit}
                                 initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}}
                                 exit={{opacity: 0, height: 0}} transition={{duration: 0.5, ease: easeOut}}>
                        <label className="field">
                            <span>{t.espace.subject}</span>
                            <input required maxLength={160} value={subject}
                                   onChange={(e) => setSubject(e.target.value)}/>
                        </label>
                        <label className="field">
                            <span>{t.espace.message}</span>
                            <textarea required rows={5} maxLength={5000} value={message}
                                      onChange={(e) => setMessage(e.target.value)}/>
                        </label>
                        <button type="submit" className="btn btn-ink" disabled={busy}>{t.espace.send}</button>
                    </motion.form>
                )}
            </AnimatePresence>
            <ErrorNotice error={error}/>
            {!data && !error && <DialLoader/>}
            {data?.length === 0 && <p className="tile-empty">{t.espace.noRequests}</p>}
            {data && data.length > 0 && (
                <StaggerList className="rows">
                    {data.map((ticket) => (
                        <Link to={`/espace/demandes/${ticket.id}`} className="row row-link" key={ticket.id}>
                            <div className="row-main">
                                <span className="row-title">{ticket.subject}</span>
                                <span className="row-meta">
                                    #{ticket.id} · {t.espace.ticketCategory[ticket.category]} · {date(ticket.updatedAt)}
                                </span>
                            </div>
                            <span className={`chip chip-${ticket.status}`}>{t.espace.ticketStatus[ticket.status]}</span>
                            <ArrowRight/>
                        </Link>
                    ))}
                </StaggerList>
            )}
        </>
    )
}

/** Fil d'une demande : partagé par l'espace client et le back-office. */
export function TicketThread({ticket, onReply, youAreStaff}: {
    ticket: TicketDetail
    onReply: (body: string) => Promise<void>
    youAreStaff: boolean
}) {
    const {t, date} = useI18n()
    const [body, setBody] = useState('')
    const [busy, setBusy] = useState(false)

    async function onSubmit(e: FormEvent) {
        e.preventDefault()
        setBusy(true)
        try {
            await onReply(body)
            setBody('')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="thread">
            <StaggerList className="thread-list">
                {ticket.messages.map((m) => (
                    <div key={m.id} className={`bubble${m.fromStaff === youAreStaff ? ' is-mine' : ''}`}>
                        <span className="bubble-meta">
                            {m.fromStaff === youAreStaff ? t.espace.you : m.authorName} · {date(m.createdAt, dateTime)}
                        </span>
                        <p>{m.body}</p>
                    </div>
                ))}
            </StaggerList>
            <form className="thread-reply" onSubmit={onSubmit}>
                <textarea required rows={3} maxLength={5000} placeholder={t.espace.replyPlaceholder} value={body}
                          onChange={(e) => setBody(e.target.value)}/>
                <button type="submit" className="btn btn-ink" disabled={busy}>{t.espace.reply}</button>
            </form>
        </div>
    )
}

export function EspaceRequestDetailPage() {
    const {id} = useParams()
    const {t, format} = useI18n()
    const {data, error, reload} = useResource<TicketDetail>(`/tickets/${id}`)

    return (
        <>
            <Link to="/espace/demandes" className="link-quiet back-link">← {t.espace.requestsTitle}</Link>
            {error && <p className="notice notice-error">{t.espace.apiDown}</p>}
            {!data && !error && <DialLoader/>}
            {data && (
                <>
                    <SpaceHeader title={data.subject} text={format(t.espace.reference, {id: data.id})}>
                        <span className={`chip chip-${data.status}`}>{t.espace.ticketStatus[data.status]}</span>
                    </SpaceHeader>
                    <TicketThread ticket={data} youAreStaff={false} onReply={async (body) => {
                        await api(`/tickets/${data.id}/messages`, {method: 'POST', body: json({body})})
                        reload()
                    }}/>
                </>
            )}
        </>
    )
}

// ---------- Profil ----------
export function EspaceProfilePage() {
    const {user, profile, refreshProfile, deleteAccount} = useAuth()
    const {t} = useI18n()
    const navigate = useNavigate()
    const [form, setForm] = useState({
        displayName: profile?.displayName ?? '',
        company: profile?.company ?? '',
        phoneNumber: profile?.phoneNumber ?? '',
    })
    const [saved, setSaved] = useState(false)
    const [confirmWord, setConfirmWord] = useState('')
    const [error, setError] = useState<string | null>(null)

    async function onSave(e: FormEvent) {
        e.preventDefault()
        setError(null)
        try {
            await api<Profile>('/me', {method: 'PUT', body: json(form)})
            await refreshProfile()
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        } catch (err) {
            setError(err instanceof ApiError ? err.messages.join(' ') : String(err))
        }
    }

    async function onDelete() {
        setError(null)
        try {
            await deleteAccount()
            navigate('/', {replace: true})
        } catch (err) {
            setError(authErrorMessage(err, t.auth.errors))
        }
    }

    const provider = user?.providerId?.includes('google') ? 'Google'
        : user?.providerId?.includes('phone') ? t.auth.tabPhone : t.auth.tabEmail

    return (
        <>
            <SpaceHeader title={t.espace.profileTitle} text={`${t.espace.signInMethod} : ${provider}`}/>
            <form className="form card" onSubmit={onSave}>
                <label className="field">
                    <span>{t.espace.displayName}</span>
                    <input maxLength={80} value={form.displayName}
                           onChange={(e) => setForm({...form, displayName: e.target.value})}/>
                </label>
                <label className="field">
                    <span>{t.espace.company}</span>
                    <input maxLength={120} value={form.company}
                           onChange={(e) => setForm({...form, company: e.target.value})}/>
                </label>
                <label className="field">
                    <span>{t.espace.phone}</span>
                    <input type="tel" maxLength={32} value={form.phoneNumber}
                           onChange={(e) => setForm({...form, phoneNumber: e.target.value})}/>
                </label>
                <div className="form-actions">
                    <button type="submit" className="btn btn-ink">{t.espace.save}</button>
                    <AnimatePresence>
                        {saved &&
                            <motion.span className="saved" initial={{opacity: 0, x: -8}} animate={{opacity: 1, x: 0}}
                                         exit={{opacity: 0}}>{t.espace.saved}</motion.span>}
                    </AnimatePresence>
                </div>
            </form>
            {error && <p className="notice notice-error" role="alert">{error}</p>}

            <section className="card card-danger">
                <h2 className="h3">{t.espace.dangerTitle}</h2>
                <p>{t.espace.dangerText}</p>
                <label className="field">
                    <span>{t.espace.dangerConfirm}</span>
                    <input value={confirmWord} onChange={(e) => setConfirmWord(e.target.value)}/>
                </label>
                <button type="button" className="btn btn-danger" disabled={confirmWord !== t.espace.dangerWord}
                        onClick={() => void onDelete()}>
                    {t.espace.dangerButton}
                </button>
            </section>
        </>
    )
}
