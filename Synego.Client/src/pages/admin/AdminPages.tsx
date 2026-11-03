import {type FormEvent, useRef, useState} from 'react'
import {Link, useParams, useSearchParams} from 'react-router'
import {AnimatePresence, motion} from 'motion/react'
import {api, ApiError, download, json, upload} from '../../api/client'
import {
    type AdminAppointment,
    type AdminClient,
    type AdminTicketRow,
    type AppointmentStatus,
    appointmentStatusLabels,
    categoryLabels,
    type ClientNote,
    type DocumentItem,
    statusLabels,
    type TicketDetail,
    type TicketStatus,
    type UserRole,
} from '../../api/types'
import {useResource} from '../../api/useResource'
import {useAuth} from '../../auth/AuthContext'
import {DialLoader} from '../../components/brand/Dial'
import {formatSize} from '../../components/espace/format'
import {SpaceHeader, StaggerList} from '../../components/espace/SpaceLayout'
import {easeOut} from '../../components/motion/ease'
import {ArrowRight, Close, Download, Trash, Upload} from '../../components/ui/Icons'
import {useFeedback} from '../../components/ui/feedback'
import {TicketThread} from '../espace/EspacePages'

/*
 * Back-office de la gérante (français uniquement : une seule utilisatrice).
 * En production, /api/admin n'est joignable que via le VPN WireGuard.
 */

const fr = (iso: string, withTime = false) => new Intl.DateTimeFormat('fr-FR', withTime
    ? {weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'}
    : {day: 'numeric', month: 'short', year: 'numeric'}).format(new Date(iso))

const roleLabels: Record<UserRole, string> = {Prospect: 'Prospect', Client: 'Client signé', Coach: 'Coach'}

function AdminError({error}: { error: Error | null }) {
    if (!error) return null
    const vpn = error instanceof ApiError && error.status === 404
    return (
        <p className="notice notice-error">
            {vpn ? 'Back-office introuvable depuis ce réseau : il est réservé au VPN (ADMIN_VPN_ONLY=true). Activez WireGuard, puis ouvrez http://10.8.0.1:8443.' : error.message}
        </p>
    )
}

// ---------- Clients ----------
function DocumentsPanel({client}: { client: AdminClient }) {
    const feedback = useFeedback()
    const {data, reload} = useResource<DocumentItem[]>(`/admin/clients/${client.id}/documents`)
    const categories = useResource<string[]>('/admin/document-categories')
    const [category, setCategory] = useState('Programme')
    const [error, setError] = useState<string | null>(null)
    const input = useRef<HTMLInputElement>(null)

    async function send(file: File | undefined) {
        if (!file) return
        setError(null)
        try {
            await upload(`/admin/clients/${client.id}/documents`, file, {category})
            reload()
        } catch (err) {
            setError(err instanceof ApiError ? err.messages.join(' ') : String(err))
        } finally {
            if (input.current) input.current.value = ''
        }
    }

    return (
        <>
            <div className="drawer-upload">
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {(categories.data ?? ['Programme']).map((c) => <option key={c}>{c}</option>)}
                </select>
                <label className="btn btn-ink btn-small">
                    <Upload/> Partager un document
                    <input ref={input} type="file" className="sr-only"
                           onChange={(e) => void send(e.target.files?.[0])}/>
                </label>
            </div>
            {error && <p className="notice notice-error">{error}</p>}
            {!data && <DialLoader/>}
            {data?.length === 0 && <p className="tile-empty">Aucun document.</p>}
            {data && data.length > 0 && (
                <StaggerList className="rows">
                    {data.map((doc) => (
                        <div className="row" key={doc.id}>
                            <div className="row-main">
                                <span className="row-title">{doc.fileName}</span>
                                <span className="row-meta">
                                    {doc.sharedByStaff ? doc.category : 'Déposé par le client'} · {fr(doc.createdAt)} · {formatSize(doc.sizeBytes)}
                                </span>
                            </div>
                            <span className="row-actions">
                                <button type="button" className="icon-button" title="Télécharger"
                                        onClick={() => void download(`/admin/documents/${doc.id}/file`, doc.fileName)}>
                                    <Download/>
                                </button>
                                <button type="button" className="icon-button" title="Supprimer" onClick={async () => {
                                    if (!(await feedback.confirm({
                                        title: `Supprimer « ${doc.fileName} » ?`,
                                        message: 'Le client ne le verra plus. Il reste récupérable 30 jours par restauration de sauvegarde.',
                                        confirmLabel: 'Supprimer', danger: true,
                                    }))) return
                                    await api(`/admin/documents/${doc.id}`, {method: 'DELETE'})
                                    feedback.toast('Document supprimé.')
                                    reload()
                                }}>
                                    <Trash/>
                                </button>
                            </span>
                        </div>
                    ))}
                </StaggerList>
            )}
        </>
    )
}

/** Notes privées du coach : observations, objectifs, points à revoir. Jamais visibles par le client. */
function NotesPanel({client}: { client: AdminClient }) {
    const feedback = useFeedback()
    const {data, reload} = useResource<ClientNote[]>(`/admin/clients/${client.id}/notes`)
    const [body, setBody] = useState('')
    const [pinned, setPinned] = useState(false)
    const [editing, setEditing] = useState<{ id: string, body: string } | null>(null)
    const [busy, setBusy] = useState(false)

    async function add(e: FormEvent) {
        e.preventDefault()
        setBusy(true)
        try {
            await api(`/admin/clients/${client.id}/notes`, {method: 'POST', body: json({body, pinned})})
            setBody('')
            setPinned(false)
            reload()
        } finally {
            setBusy(false)
        }
    }

    async function patch(id: string, change: { body?: string, pinned?: boolean }) {
        await api(`/admin/notes/${id}`, {method: 'PATCH', body: json(change)})
        setEditing(null)
        reload()
    }

    return (
        <>
            <form className="form note-form" onSubmit={add}>
                <textarea required rows={4} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)}
                          placeholder="Observation, objectif du moment, point à revoir à la prochaine séance…"/>
                <div className="form-actions">
                    <button type="submit" className="btn btn-ink btn-small" disabled={busy}>Ajouter la note</button>
                    <label className="toggle">
                        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)}/>
                        <span>Épingler en haut</span>
                    </label>
                </div>
                <p className="fine-print">Privé : le client ne voit jamais ces notes. Pas de données de santé (bien-être
                    uniquement).</p>
            </form>
            {!data && <DialLoader/>}
            {data?.length === 0 && <p className="tile-empty">Aucune note pour l'instant.</p>}
            {data && data.length > 0 && (
                <StaggerList className="notes">
                    {data.map((note) => (
                        <article key={note.id} className={`note${note.pinned ? ' is-pinned' : ''}`}>
                            <header className="note-head">
                                <span className="row-meta">
                                    {note.pinned && <strong className="note-pin">Épinglée · </strong>}
                                    {fr(note.createdAt, true)}{note.updatedAt !== note.createdAt && ' · modifiée'}
                                </span>
                                <span className="row-actions">
                                    <button type="button" className="link-quiet"
                                            onClick={() => void patch(note.id, {pinned: !note.pinned})}>
                                        {note.pinned ? 'Désépingler' : 'Épingler'}
                                    </button>
                                    <button type="button" className="link-quiet"
                                            onClick={() => setEditing({id: note.id, body: note.body})}>
                                        Modifier
                                    </button>
                                    <button type="button" className="icon-button" title="Supprimer la note"
                                            onClick={async () => {
                                                if (!(await feedback.confirm({
                                                    title: 'Supprimer cette note ?', message: 'Cette action est définitive.',
                                                    confirmLabel: 'Supprimer', danger: true,
                                                }))) return
                                                await api(`/admin/notes/${note.id}`, {method: 'DELETE'})
                                                feedback.toast('Note supprimée.')
                                                reload()
                                            }}>
                                        <Trash size={16}/>
                                    </button>
                                </span>
                            </header>
                            {editing?.id === note.id ? (
                                <div className="form">
                                    <textarea rows={4} value={editing.body}
                                              onChange={(e) => setEditing({...editing, body: e.target.value})}/>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-ink btn-small"
                                                onClick={() => void patch(note.id, {body: editing.body})}>Enregistrer
                                        </button>
                                        <button type="button" className="link-quiet"
                                                onClick={() => setEditing(null)}>Annuler
                                        </button>
                                    </div>
                                </div>
                            ) : <p className="note-body">{note.body}</p>}
                        </article>
                    ))}
                </StaggerList>
            )}
        </>
    )
}

/** Fiche client : notes du coach et documents partagés, dans un volet latéral. */
function ClientDrawer({client, onClose}: { client: AdminClient, onClose: () => void }) {
    const [tab, setTab] = useState<'notes' | 'documents'>('notes')
    return (
        <motion.aside className="drawer" initial={{x: '100%'}} animate={{x: 0}} exit={{x: '100%'}}
                      transition={{duration: 0.55, ease: easeOut}}>
            <header className="drawer-head">
                <div>
                    <h2 className="h3">{client.displayName ?? client.email ?? 'Client'}</h2>
                    <p className="row-meta">
                        {client.email ?? client.phoneNumber} {client.company && `· ${client.company}`} · {roleLabels[client.role]}
                    </p>
                </div>
                <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer"><Close/></button>
            </header>
            <div className="segmented segmented-small">
                {([['notes', 'Notes'], ['documents', 'Documents']] as const).map(([value, label]) => (
                    <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)}>
                        {tab === value && <motion.span layoutId="drawer-tab" className="segmented-pill"/>}
                        <span>{label}</span>
                    </button>
                ))}
            </div>
            {tab === 'notes' ? <NotesPanel client={client}/> : <DocumentsPanel client={client}/>}
        </motion.aside>
    )
}

export function AdminClientsPage() {
    const feedback = useFeedback()
    const {data, error, reload} = useResource<AdminClient[]>('/admin/clients')
    const [selected, setSelected] = useState<AdminClient | null>(null)
    const [filter, setFilter] = useState<UserRole | 'all'>('all')
    const rows = data?.filter((c) => filter === 'all' || c.role === filter) ?? []

    async function setRole(client: AdminClient, role: UserRole) {
        if (role === 'Coach' && !(await feedback.confirm({
            title: `Nommer ${client.displayName ?? client.email} coach ?`,
            message: 'Ce compte aura accès à tout le back-office : clients, notes, rendez-vous, demandes et Calendly.',
            confirmLabel: 'Nommer coach',
        }))) return
        await api(`/admin/clients/${client.id}`, {method: 'PATCH', body: json({role})})
        feedback.toast(role === 'Client' ? 'Client signé : les séances de suivi lui sont ouvertes.' : 'Statut mis à jour.')
        reload()
    }

    return (
        <>
            <SpaceHeader title="Clients" text="Passer un compte en « client signé » lui ouvre les séances de suivi.">
                <div className="segmented segmented-small">
                    {(['all', 'Prospect', 'Client', 'Coach'] as const).map((f) => (
                        <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                            {filter === f && <motion.span layoutId="client-filter" className="segmented-pill"/>}
                            <span>{f === 'all' ? 'Tous' : roleLabels[f]}</span>
                        </button>
                    ))}
                </div>
            </SpaceHeader>
            <AdminError error={error}/>
            {!data && !error && <DialLoader/>}
            {data && (
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Contact</th>
                            <th>Statut</th>
                            <th>Notes</th>
                            <th>Docs</th>
                            <th>RDV à venir</th>
                            <th/>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((c) => (
                            <tr key={c.id}>
                                <td data-label="Nom">
                                    <strong>{c.displayName ?? '—'}</strong>
                                    {c.company && <span className="row-meta">{c.company}</span>}
                                </td>
                                <td data-label="Contact"><span>{c.email ?? c.phoneNumber}</span><span
                                    className="row-meta">depuis le {fr(c.createdAt)}</span></td>
                                <td data-label="Statut">
                                    {c.role === 'Coach' ? <Link to="/admin/coachs" className="chip">Coach</Link> : (
                                        <select value={c.role}
                                                onChange={(e) => void setRole(c, e.target.value as UserRole)}>
                                            <option value="Prospect">Prospect</option>
                                            <option value="Client">Client signé</option>
                                            <option value="Coach">Coach</option>
                                        </select>
                                    )}
                                </td>
                                <td data-label="Notes">{c.noteCount}</td>
                                <td data-label="Documents">{c.documentCount}</td>
                                <td data-label="RDV à venir">{c.upcomingAppointments}</td>
                                <td data-label="">
                                    <button type="button" className="link-arrow"
                                            onClick={() => setSelected(c)}>Fiche <ArrowRight/></button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
            <AnimatePresence>
                {selected && (
                    <>
                        <motion.div className="drawer-backdrop" initial={{opacity: 0}} animate={{opacity: 1}}
                                    exit={{opacity: 0}}
                                    onClick={() => setSelected(null)}/>
                        <ClientDrawer key={selected.id} client={selected} onClose={() => {
                            setSelected(null)
                            reload()
                        }}/>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}

// ---------- Rendez-vous ----------
export function AdminAppointmentsPage() {
    const feedback = useFeedback()
    const [params] = useSearchParams()
    const [scope, setScope] = useState<'upcoming' | 'past' | 'all'>(params.get('scope') === 'all' ? 'all' : 'upcoming')
    const {data, error, reload} = useResource<AdminAppointment[]>(`/admin/appointments?scope=${scope}`)

    async function update(a: AdminAppointment, body: Partial<{ status: AppointmentStatus, clearReview: boolean }>) {
        await api(`/admin/appointments/${a.id}`, {method: 'PATCH', body: json(body)})
        reload()
    }

    // Annulation chez Calendly : la personne reçoit l'e-mail d'annulation, sans limite de délai pour le coach.
    async function cancel(a: AdminAppointment) {
        const reason = await feedback.ask({
            title: `Annuler « ${a.title} » avec ${a.name ?? a.email} ?`,
            message: 'Calendly prévient la personne par e-mail, avec votre motif.',
            label: 'Motif transmis à la personne',
            defaultValue: 'Empêchement de dernière minute, nous vous proposons un autre créneau.',
            confirmLabel: 'Annuler le rendez-vous', danger: true,
        })
        if (reason === null) return
        try {
            await api(`/admin/appointments/${a.id}/cancel`, {method: 'POST', body: json({reason})})
            feedback.toast('Rendez-vous annulé, la personne est prévenue.')
        } catch (err) {
            feedback.toast(err instanceof ApiError ? err.message : String(err), 'error')
        } finally {
            reload()
        }
    }

    return (
        <>
            <SpaceHeader title="Rendez-vous" text="Synchronisés automatiquement depuis Calendly.">
                <div className="segmented segmented-small">
                    {([['upcoming', 'À venir'], ['past', 'Passés'], ['all', 'Tous']] as const).map(([value, label]) => (
                        <button key={value} type="button" aria-pressed={scope === value}
                                onClick={() => setScope(value)}>
                            {scope === value && <motion.span layoutId="appt-scope" className="segmented-pill"/>}
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </SpaceHeader>
            <AdminError error={error}/>
            {!data && !error && <DialLoader/>}
            {data?.length === 0 && <p className="tile-empty">Aucun rendez-vous.</p>}
            {data && data.length > 0 && (
                <StaggerList className="rows">
                    {data.map((a) => (
                        <div className={`row status-${a.status}`} key={a.id}>
                            <div className="row-main">
                                <span className="row-title">{a.title} · {a.name ?? a.email}</span>
                                <span className="row-meta">{fr(a.startsAt, true)} · {a.email}</span>
                                <span className="row-meta reminders">
                                    <span
                                        className={a.reminder48SentAt ? 'sent' : ''}>Rappel 48 h {a.reminder48SentAt ? '✓' : '·'}</span>
                                    <span
                                        className={a.reminder24SentAt ? 'sent' : ''}>Rappel 24 h {a.reminder24SentAt ? '✓' : '·'}</span>
                                    {a.meetingUrl &&
                                        <a href={a.meetingUrl} target="_blank" rel="noreferrer">Lien Meet</a>}
                                </span>
                                {a.reviewReason && (
                                    <span className="row-warning">
                                        {a.reviewReason}{' '}
                                        <button type="button" className="link-quiet"
                                                onClick={() => void update(a, {clearReview: true})}>
                                            Marquer comme vu
                                        </button>
                                    </span>
                                )}
                            </div>
                            {a.status === 'Scheduled' && new Date(a.startsAt) > new Date() && (
                                <button type="button" className="link-quiet" onClick={() => void cancel(a)}>Annuler</button>
                            )}
                            <select value={a.status}
                                    onChange={(e) => void update(a, {status: e.target.value as AppointmentStatus})}>
                                {Object.entries(appointmentStatusLabels).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </StaggerList>
            )}
        </>
    )
}

// ---------- Demandes ----------
export function AdminRequestsPage() {
    const [status, setStatus] = useState<TicketStatus | ''>('')
    const {data, error} = useResource<AdminTicketRow[]>(`/admin/tickets${status ? `?status=${status}` : ''}`)

    return (
        <>
            <SpaceHeader title="Demandes" text="Devis, contacts et questions des clients, au même endroit.">
                <div className="segmented segmented-small">
                    {([['', 'Toutes'], ['Open', 'Nouvelles'], ['InProgress', 'En cours'], ['Closed', 'Closes']] as const).map(([value, label]) => (
                        <button key={value} type="button" aria-pressed={status === value}
                                onClick={() => setStatus(value)}>
                            {status === value && <motion.span layoutId="ticket-status" className="segmented-pill"/>}
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </SpaceHeader>
            <AdminError error={error}/>
            {!data && !error && <DialLoader/>}
            {data?.length === 0 && <p className="tile-empty">Aucune demande.</p>}
            {data && data.length > 0 && (
                <StaggerList className="rows">
                    {data.map((ticket) => (
                        <Link to={`/admin/demandes/${ticket.id}`} className="row row-link" key={ticket.id}>
                            <div className="row-main">
                                <span className="row-title">{ticket.subject}</span>
                                <span className="row-meta">
                                    #{ticket.id} · {categoryLabels[ticket.category]} · {ticket.contactName}
                                    {ticket.company && ` (${ticket.company})`} · {fr(ticket.updatedAt)}
                                </span>
                            </div>
                            <span className={`chip chip-${ticket.status}`}>{statusLabels[ticket.status]}</span>
                            <ArrowRight/>
                        </Link>
                    ))}
                </StaggerList>
            )}
        </>
    )
}

export function AdminRequestDetailPage() {
    const {id} = useParams()
    const {data, error, reload} = useResource<TicketDetail>(`/admin/tickets/${id}`)

    async function setStatus(status: TicketStatus) {
        await api(`/admin/tickets/${id}`, {method: 'PATCH', body: json({status})})
        reload()
    }

    return (
        <>
            <Link to="/admin/demandes" className="link-quiet back-link">← Demandes</Link>
            <AdminError error={error}/>
            {!data && !error && <DialLoader/>}
            {data && (
                <>
                    <SpaceHeader title={data.subject}
                                 text={`#${data.id} · ${categoryLabels[data.category]} · ${data.contactName} · ${data.contactEmail}${data.contactPhone ? ` · ${data.contactPhone}` : ''}`}>
                        <select value={data.status} onChange={(e) => void setStatus(e.target.value as TicketStatus)}>
                            {Object.entries(statusLabels).map(([value, label]) => <option key={value}
                                                                                          value={value}>{label}</option>)}
                        </select>
                    </SpaceHeader>
                    <TicketThread ticket={data} youAreStaff onReply={async (body) => {
                        await api(`/admin/tickets/${data.id}/messages`, {method: 'POST', body: json({body})})
                        reload()
                    }}/>
                </>
            )}
        </>
    )
}

// ---------- Coachs ----------
type CoachesData = {
    coaches: { id: string, email: string | null, displayName: string | null, isYou: boolean }[]
    invitations: string[]
}

/** Les coachs nomment d'autres coachs : compte existant promu, ou invitation par e-mail. */
export function AdminCoachesPage() {
    const feedback = useFeedback()
    const {data, error, reload} = useResource<CoachesData>('/admin/coaches')
    const [email, setEmail] = useState('')
    const [result, setResult] = useState<string | null>(null)
    const [formError, setFormError] = useState<string | null>(null)

    async function add(e: FormEvent) {
        e.preventDefault()
        setFormError(null)
        setResult(null)
        try {
            const response = await api<{ result: 'promoted' | 'invited' }>('/admin/coaches', {
                method: 'POST',
                body: json({email})
            })
            setResult(response.result === 'promoted'
                ? `${email} est maintenant coach.`
                : `Invitation enregistrée : ${email} deviendra coach à sa première connexion (e-mail vérifié).`)
            setEmail('')
            reload()
        } catch (err) {
            setFormError(err instanceof ApiError ? err.messages.join(' ') : String(err))
        }
    }

    return (
        <>
            <SpaceHeader title="Coachs"
                         text="Les coachs ont accès à tout le back-office : clients, notes, rendez-vous, demandes et Calendly."/>
            <AdminError error={error}/>
            <form className="card form" onSubmit={add}>
                <h2 className="h3">Ajouter un coach</h2>
                <label className="field">
                    <span>Adresse e-mail</span>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                           placeholder="prenom.nom@exemple.fr"/>
                </label>
                <p className="fine-print">
                    Si un compte existe déjà avec cette adresse, il devient coach tout de suite. Sinon, la personne
                    deviendra coach en créant son compte, une fois son adresse e-mail confirmée.
                </p>
                {formError && <p className="notice notice-error">{formError}</p>}
                {result && <p className="notice">{result}</p>}
                <button type="submit" className="btn btn-ink btn-small">Nommer coach</button>
            </form>

            {!data && !error && <DialLoader/>}
            {data && (
                <>
                    <h2 className="space-subtitle">Coachs actuels</h2>
                    <StaggerList className="rows">
                        {data.coaches.map((coach) => (
                            <div className="row" key={coach.id}>
                                <div className="row-main">
                                    <span
                                        className="row-title">{coach.displayName ?? coach.email}{coach.isYou && ' (vous)'}</span>
                                    <span className="row-meta">{coach.email}</span>
                                </div>
                                {!coach.isYou && (
                                    <button type="button" className="link-quiet" onClick={async () => {
                                        if (!(await feedback.confirm({
                                            title: `Retirer les droits de coach à ${coach.displayName ?? coach.email} ?`,
                                            message: 'Le compte redeviendra client.', confirmLabel: 'Retirer', danger: true,
                                        }))) return
                                        await api(`/admin/coaches/${coach.id}`, {method: 'DELETE'})
                                        feedback.toast('Droits de coach retirés.')
                                        reload()
                                    }}>Retirer</button>
                                )}
                            </div>
                        ))}
                    </StaggerList>
                    {data.invitations.length > 0 && (
                        <>
                            <h2 className="space-subtitle">Invitations en attente</h2>
                            <StaggerList className="rows">
                                {data.invitations.map((invited) => (
                                    <div className="row" key={invited}>
                                        <div className="row-main">
                                            <span className="row-title">{invited}</span>
                                            <span className="row-meta">Deviendra coach à sa première connexion</span>
                                        </div>
                                        <button type="button" className="link-quiet" onClick={async () => {
                                            await api(`/admin/coaches/invitations?email=${encodeURIComponent(invited)}`, {method: 'DELETE'})
                                            reload()
                                        }}>Annuler
                                        </button>
                                    </div>
                                ))}
                            </StaggerList>
                        </>
                    )}
                </>
            )}
        </>
    )
}

// ---------- Aujourd'hui ----------
export type Overview = {
    upcoming: {
        id: string, typeKey: string, title: string, startsAt: string, endsAt: string,
        name: string | null, meetingUrl: string | null, reviewReason: string | null
    }[]
    next24h: number
    tickets: AdminTicketRow[]
    newTickets: number
    openTickets: number
    alerts: number
    newAccounts: number
    signedClients: number
}

const time = (iso: string) => new Intl.DateTimeFormat('fr-FR', {hour: '2-digit', minute: '2-digit'}).format(new Date(iso))
const dayLabel = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const tomorrow = new Date(Date.now() + 86_400_000)
    if (d.toDateString() === today.toDateString()) return 'Aujourd\'hui'
    if (d.toDateString() === tomorrow.toDateString()) return 'Demain'
    return new Intl.DateTimeFormat('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'}).format(d)
}

/** Page d'accueil du coach : la journée en un coup d'œil, et ce qui attend une action. */
export function AdminTodayPage() {
    const {user, profile} = useAuth()
    const {data, error} = useResource<Overview>('/admin/overview')
    const firstName = (profile?.displayName ?? user?.name ?? '').split(' ')[0]
    const today = new Intl.DateTimeFormat('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'}).format(new Date())

    const kpis = data ? [
        {label: 'RDV dans les 24 h', value: data.next24h, to: '/admin/rendez-vous'},
        {label: 'Demandes nouvelles', value: data.newTickets, to: '/admin/demandes', hot: data.newTickets > 0},
        {label: 'Alertes rendez-vous', value: data.alerts, to: '/admin/rendez-vous?scope=all', hot: data.alerts > 0},
        {label: 'Nouveaux comptes (7 j)', value: data.newAccounts, to: '/admin/clients'},
    ] : []

    return (
        <>
            <SpaceHeader title={firstName ? `Bonjour ${firstName}.` : 'Bonjour.'}
                         text={`${today.charAt(0).toUpperCase()}${today.slice(1)} · ${data ? `${data.signedClients} client${data.signedClients > 1 ? 's' : ''} accompagné${data.signedClients > 1 ? 's' : ''}` : ''}`}/>
            <AdminError error={error}/>
            {!data && !error && <DialLoader/>}
            {data && (
                <>
                    <div className="kpis">
                        {kpis.map((k, i) => (
                            <motion.div key={k.label} initial={{opacity: 0, y: 14}} animate={{opacity: 1, y: 0}}
                                        transition={{delay: i * 0.06, duration: 0.5, ease: easeOut}}>
                                <Link to={k.to} className={`kpi${k.hot ? ' is-hot' : ''}`}>
                                    <span className="kpi-value">{k.value}</span>
                                    <span className="kpi-label">{k.label}</span>
                                </Link>
                            </motion.div>
                        ))}
                    </div>

                    <div className="today-grid">
                        <section className="card">
                            <header className="card-head">
                                <h2 className="h3">Prochains rendez-vous</h2>
                                <Link to="/admin/rendez-vous" className="link-arrow">Tout voir <ArrowRight/></Link>
                            </header>
                            {data.upcoming.length === 0 && <p className="tile-empty">Rien de prévu cette semaine.</p>}
                            <ol className="agenda">
                                {data.upcoming.map((a, i) => (
                                    <li key={a.id}>
                                        {(i === 0 || dayLabel(a.startsAt) !== dayLabel(data.upcoming[i - 1].startsAt)) && (
                                            <p className="agenda-day">{dayLabel(a.startsAt)}</p>
                                        )}
                                        <div className="agenda-row">
                                            <span className="agenda-time">{time(a.startsAt)}</span>
                                            <div className="row-main">
                                                <span className="row-title">{a.title}</span>
                                                <span className="row-meta">{a.name}</span>
                                                {a.reviewReason && <span className="row-warning">{a.reviewReason}</span>}
                                            </div>
                                            {a.meetingUrl && (
                                                <a className="btn btn-ink btn-small" href={a.meetingUrl} target="_blank"
                                                   rel="noreferrer">Meet</a>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </section>

                        <section className="card">
                            <header className="card-head">
                                <h2 className="h3">Demandes à traiter</h2>
                                <Link to="/admin/demandes" className="link-arrow">Tout voir <ArrowRight/></Link>
                            </header>
                            {data.tickets.length === 0 && <p className="tile-empty">Tout est à jour.</p>}
                            <StaggerList className="rows">
                                {data.tickets.map((ticket) => (
                                    <Link to={`/admin/demandes/${ticket.id}`} className="row row-link" key={ticket.id}>
                                        <div className="row-main">
                                            <span className="row-title">{ticket.subject}</span>
                                            <span className="row-meta">{categoryLabels[ticket.category]} · {ticket.contactName}</span>
                                        </div>
                                        <span className={`chip chip-${ticket.status}`}>{statusLabels[ticket.status]}</span>
                                    </Link>
                                ))}
                            </StaggerList>
                        </section>
                    </div>
                </>
            )}
        </>
    )
}
