import {type FormEvent, useState} from 'react'
import {Link, useNavigate, useParams, useSearchParams} from 'react-router'
import {api, ApiError, json} from '../../api/client'
import type {AdminClient, PaymentKind, PaymentStatus} from '../../api/types'
import {useResource} from '../../api/useResource'
import {DialLoader} from '../../components/brand/Dial'
import {SpaceHeader, StaggerList} from '../../components/espace/SpaceLayout'
import {money} from '../../components/learning/format'
import {ArrowRight, Check, LinkIcon, Plus, Trash} from '../../components/ui/Icons'
import {useFeedback} from '../../components/ui/feedback'

const eur = (cents: number) => money(cents, 'eur', 'fr')
const errorText = (err: unknown) => err instanceof ApiError ? err.messages.join(' ') : String(err)
const toCents = (value: string) => Math.round(parseFloat(value.replace(',', '.').replace(/\s/g, '') || '0') * 100)
const fromCents = (cents: number) => cents ? (cents / 100).toString().replace('.', ',') : ''

// ======================================================================
// Formations
// ======================================================================
type AdminCourseRow = {
    id: string, slug: string, title: string, summary: string, priceCents: number, currency: string,
    published: boolean, modules: number, lessons: number, members: number, revenueCents: number
}

export function AdminCoursesPage() {
    const navigate = useNavigate()
    const {data, error} = useResource<AdminCourseRow[]>('/admin/courses')
    const [title, setTitle] = useState('')
    const [summary, setSummary] = useState('')
    const [formError, setFormError] = useState<string | null>(null)

    async function create(e: FormEvent) {
        e.preventDefault()
        setFormError(null)
        try {
            const created = await api<{ id: string }>('/admin/courses', {
                method: 'POST', body: json({title, summary, priceCents: 0, published: false}),
            })
            navigate(`/admin/formations/${created.id}`)
        } catch (err) {
            setFormError(errorText(err))
        }
    }

    return (
        <>
            <SpaceHeader title="Formations"
                         text="Vos programmes en ligne : modules, leçons vidéo, prix et membres. Une formation n'apparaît sur le site qu'une fois publiée."/>
            {error && <p className="notice notice-error">{error.message}</p>}
            <form className="card form" onSubmit={create}>
                <h2 className="h3">Nouvelle formation</h2>
                <div className="field-row">
                    <label className="field"><span>Titre</span>
                        <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)}
                               placeholder="Gérer son stress au travail"/>
                    </label>
                    <label className="field"><span>Présentation en une phrase</span>
                        <input required maxLength={300} value={summary} onChange={(e) => setSummary(e.target.value)}
                               placeholder="Six semaines pour retrouver du calme, en 10 minutes par jour."/>
                    </label>
                </div>
                {formError && <p className="notice notice-error">{formError}</p>}
                <button type="submit" className="btn btn-ink btn-small"><Plus size={16}/> Créer et ajouter le contenu
                </button>
            </form>
            {!data && !error && <DialLoader/>}
            {data && data.length > 0 && (
                <StaggerList className="rows">
                    {data.map((c) => (
                        <Link to={`/admin/formations/${c.id}`} className="row row-link" key={c.id}>
                            <div className="row-main">
                                <span className="row-title">{c.title}</span>
                                <span className="row-meta">
                                    {c.priceCents ? eur(c.priceCents) : 'Prix à définir'} · {c.modules} modules · {c.lessons} leçons
                                    · {c.members} membre{c.members > 1 ? 's' : ''} · {eur(c.revenueCents)} encaissés
                                </span>
                            </div>
                            <span
                                className={`chip ${c.published ? 'chip-pay-Paid' : ''}`}>{c.published ? 'Publiée' : 'Brouillon'}</span>
                            <ArrowRight/>
                        </Link>
                    ))}
                </StaggerList>
            )}
        </>
    )
}

type AdminLesson = {
    id: string, title: string, body: string, videoUrl: string | null, videoOk: boolean,
    durationMinutes: number | null, freePreview: boolean
}
type AdminCourse = {
    id: string, slug: string, title: string, summary: string, description: string, durationLabel: string | null,
    priceCents: number, currency: string, published: boolean,
    modules: { id: string, title: string, lessons: AdminLesson[] }[]
}

export function AdminCourseEditPage() {
    const {id} = useParams()
    const feedback = useFeedback()
    const navigate = useNavigate()
    const {data, error, reload} = useResource<AdminCourse>(`/admin/courses/${id}`)
    if (error) return <p className="notice notice-error">{error.message}</p>
    if (!data) return <DialLoader/>
    return <CourseEditor key={data.id} data={data} reload={reload} feedback={feedback} navigate={navigate}/>
}

function CourseEditor({data, reload, feedback, navigate}: {
    data: AdminCourse,
    reload: () => void,
    feedback: ReturnType<typeof useFeedback>,
    navigate: ReturnType<typeof useNavigate>
}) {
    const id = data.id
    const [form, setForm] = useState({
        title: data.title, slug: data.slug, summary: data.summary, description: data.description,
        durationLabel: data.durationLabel ?? '', price: fromCents(data.priceCents), published: data.published,
    })
    const [formError, setFormError] = useState<string | null>(null)
    const [newModule, setNewModule] = useState('')
    const [editing, setEditing] = useState<string | null>(null)

    async function save(e: FormEvent) {
        e.preventDefault()
        setFormError(null)
        try {
            await api(`/admin/courses/${id}`, {
                method: 'PUT', body: json({
                    title: form.title, slug: form.slug, summary: form.summary, description: form.description,
                    durationLabel: form.durationLabel, priceCents: toCents(form.price), published: form.published,
                }),
            })
            feedback.toast(form.published ? 'Formation enregistrée et publiée.' : 'Formation enregistrée (brouillon).')
            reload()
        } catch (err) {
            setFormError(errorText(err))
        }
    }

    const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({
        ...f,
        [key]: e.target.value
    }))

    return (
        <>
            <Link to="/admin/formations" className="link-quiet back-link">← Formations</Link>
            <SpaceHeader title={data.title}
                         text={data.published ? `En ligne : /formations/${data.slug}` : 'Brouillon : invisible sur le site.'}>
                <Link to={`/formations/${data.slug}`} target="_blank" className="btn btn-line btn-small">Voir la
                    fiche</Link>
                <Link to={`/espace/formations/${data.slug}`} className="btn btn-line btn-small">Voir comme un
                    membre</Link>
            </SpaceHeader>

            <form className="card form" onSubmit={save}>
                <h2 className="h3">Présentation et prix</h2>
                <div className="field-row">
                    <label className="field"><span>Titre</span><input required maxLength={120} value={form.title}
                                                                      onChange={set('title')}/></label>
                    <label className="field"><span>Adresse (/formations/…)</span><input maxLength={80} value={form.slug}
                                                                                        onChange={set('slug')}/></label>
                </div>
                <label className="field"><span>Présentation en une phrase</span><input required maxLength={300}
                                                                                       value={form.summary}
                                                                                       onChange={set('summary')}/></label>
                <label className="field"><span>Description (paragraphes séparés par une ligne vide)</span>
                    <textarea rows={6} maxLength={8000} value={form.description} onChange={set('description')}/>
                </label>
                <div className="field-row">
                    <label className="field"><span>Prix TTC (€)</span>
                        <input inputMode="decimal" value={form.price} onChange={set('price')} placeholder="290"/>
                        <small>Klarna propose automatiquement le paiement en 3 fois.</small>
                    </label>
                    <label className="field"><span>Repère de durée</span>
                        <input maxLength={60} value={form.durationLabel} onChange={set('durationLabel')}
                               placeholder="6 semaines · 3 h de vidéo"/>
                    </label>
                </div>
                <label className="terms-check">
                    <input type="checkbox" checked={form.published}
                           onChange={(e) => setForm((f) => ({...f, published: e.target.checked}))}/>
                    <span>Publiée : visible et achetable sur le site</span>
                </label>
                {formError && <p className="notice notice-error">{formError}</p>}
                <div className="form-actions">
                    <button type="submit" className="btn btn-ink btn-small">Enregistrer</button>
                    <button type="button" className="link-quiet" onClick={async () => {
                        if (!(await feedback.confirm({
                            title: `Supprimer « ${data.title} » ?`,
                            message: 'Modules, leçons et communauté seront effacés.',
                            danger: true,
                            confirmLabel: 'Supprimer'
                        }))) return
                        try {
                            await api(`/admin/courses/${id}`, {method: 'DELETE'})
                            navigate('/admin/formations')
                        } catch (err) {
                            feedback.toast(errorText(err), 'error')
                        }
                    }}>Supprimer la formation
                    </button>
                </div>
            </form>

            <h2 className="space-subtitle">Programme</h2>
            {data.modules.map((module, mi) => (
                <section className="card course-editor-module" key={module.id}>
                    <div className="course-editor-head">
                        <span className="course-editor-index">{String(mi + 1).padStart(2, '0')}</span>
                        <input className="course-editor-title" defaultValue={module.title} aria-label="Titre du module"
                               onBlur={async (e) => {
                                   if (e.target.value.trim() && e.target.value !== module.title) {
                                       await api(`/admin/courses/modules/${module.id}`, {
                                           method: 'PUT',
                                           body: json({title: e.target.value})
                                       })
                                       reload()
                                   }
                               }}/>
                        <button type="button" className="icon-button" aria-label="Monter" disabled={mi === 0}
                                onClick={async () => {
                                    await api(`/admin/courses/modules/${module.id}/move`, {
                                        method: 'POST',
                                        body: json({up: true})
                                    });
                                    reload()
                                }}>↑
                        </button>
                        <button type="button" className="icon-button" aria-label="Descendre"
                                disabled={mi === data.modules.length - 1}
                                onClick={async () => {
                                    await api(`/admin/courses/modules/${module.id}/move`, {
                                        method: 'POST',
                                        body: json({up: false})
                                    });
                                    reload()
                                }}>↓
                        </button>
                        <button type="button" className="icon-button" aria-label="Supprimer le module"
                                onClick={async () => {
                                    if (!(await feedback.confirm({
                                        title: `Supprimer le module « ${module.title} » et ses leçons ?`,
                                        danger: true,
                                        confirmLabel: 'Supprimer'
                                    }))) return
                                    await api(`/admin/courses/modules/${module.id}`, {method: 'DELETE'})
                                    reload()
                                }}><Trash size={16}/></button>
                    </div>
                    <ul className="course-editor-lessons">
                        {module.lessons.map((lesson, li) => (
                            <li key={lesson.id}>
                                {editing === lesson.id ? (
                                    <LessonForm lesson={lesson} onCancel={() => setEditing(null)} onSaved={() => {
                                        setEditing(null);
                                        reload()
                                    }}
                                                path={`/admin/courses/lessons/${lesson.id}`} method="PUT"/>
                                ) : (
                                    <div className="course-editor-lesson">
                                        <button type="button" className="link-quiet"
                                                onClick={() => setEditing(lesson.id)}>{lesson.title}</button>
                                        <span className="row-meta">
                                            {lesson.videoUrl ? (lesson.videoOk ? 'vidéo' : 'lien vidéo à corriger') : 'texte'}
                                            {lesson.durationMinutes != null && ` · ${lesson.durationMinutes} min`}
                                            {lesson.freePreview && ' · aperçu gratuit'}
                                        </span>
                                        <button type="button" className="icon-button" aria-label="Monter"
                                                disabled={li === 0}
                                                onClick={async () => {
                                                    await api(`/admin/courses/lessons/${lesson.id}/move`, {
                                                        method: 'POST',
                                                        body: json({up: true})
                                                    });
                                                    reload()
                                                }}>↑
                                        </button>
                                        <button type="button" className="icon-button" aria-label="Descendre"
                                                disabled={li === module.lessons.length - 1}
                                                onClick={async () => {
                                                    await api(`/admin/courses/lessons/${lesson.id}/move`, {
                                                        method: 'POST',
                                                        body: json({up: false})
                                                    });
                                                    reload()
                                                }}>↓
                                        </button>
                                        <button type="button" className="icon-button" aria-label="Supprimer la leçon"
                                                onClick={async () => {
                                                    if (!(await feedback.confirm({
                                                        title: `Supprimer la leçon « ${lesson.title} » ?`,
                                                        danger: true,
                                                        confirmLabel: 'Supprimer'
                                                    }))) return
                                                    await api(`/admin/courses/lessons/${lesson.id}`, {method: 'DELETE'})
                                                    reload()
                                                }}><Trash size={14}/></button>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                    {editing === `new-${module.id}` ? (
                        <LessonForm onCancel={() => setEditing(null)} onSaved={() => {
                            setEditing(null);
                            reload()
                        }}
                                    path={`/admin/courses/modules/${module.id}/lessons`} method="POST"/>
                    ) : (
                        <button type="button" className="link-quiet" onClick={() => setEditing(`new-${module.id}`)}>
                            <Plus size={14}/> Ajouter une leçon</button>
                    )}
                </section>
            ))}
            <form className="card form course-editor-new" onSubmit={async (e) => {
                e.preventDefault()
                if (!newModule.trim()) return
                await api(`/admin/courses/${id}/modules`, {method: 'POST', body: json({title: newModule})})
                setNewModule('')
                reload()
            }}>
                <label className="field"><span>Nouveau module</span>
                    <input maxLength={120} value={newModule} onChange={(e) => setNewModule(e.target.value)}
                           placeholder="Comprendre son stress"/>
                </label>
                <button type="submit" className="btn btn-line btn-small"><Plus size={16}/> Ajouter le module</button>
            </form>

            <Members courseId={data.id}/>
        </>
    )
}

function LessonForm({lesson, path, method, onSaved, onCancel}: {
    lesson?: AdminLesson, path: string, method: 'POST' | 'PUT', onSaved: () => void, onCancel: () => void
}) {
    const [title, setTitle] = useState(lesson?.title ?? '')
    const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl ?? '')
    const [body, setBody] = useState(lesson?.body ?? '')
    const [duration, setDuration] = useState(lesson?.durationMinutes?.toString() ?? '')
    const [freePreview, setFreePreview] = useState(lesson?.freePreview ?? false)
    const [error, setError] = useState<string | null>(null)

    async function submit(e: FormEvent) {
        e.preventDefault()
        setError(null)
        try {
            await api(path, {
                method,
                body: json({
                    title,
                    videoUrl,
                    body,
                    freePreview,
                    durationMinutes: duration ? parseInt(duration, 10) : null
                }),
            })
            onSaved()
        } catch (err) {
            setError(errorText(err))
        }
    }

    return (
        <form className="form lesson-form" onSubmit={submit}>
            <div className="field-row">
                <label className="field"><span>Titre de la leçon</span><input required maxLength={160} value={title}
                                                                              onChange={(e) => setTitle(e.target.value)}/></label>
                <label className="field"><span>Durée (min)</span><input inputMode="numeric" value={duration}
                                                                        onChange={(e) => setDuration(e.target.value)}/></label>
            </div>
            <label className="field"><span>Lien vidéo (YouTube non répertorié, Vimeo ou Loom)</span>
                <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                       placeholder="https://vimeo.com/…"/>
            </label>
            <label className="field"><span>Texte de la leçon</span><textarea rows={6} maxLength={20000} value={body}
                                                                             onChange={(e) => setBody(e.target.value)}/></label>
            <label className="terms-check">
                <input type="checkbox" checked={freePreview} onChange={(e) => setFreePreview(e.target.checked)}/>
                <span>Aperçu gratuit, visible sur la fiche publique</span>
            </label>
            {error && <p className="notice notice-error">{error}</p>}
            <div className="form-actions">
                <button type="submit" className="btn btn-ink btn-small"><Check size={16}/> Enregistrer la leçon</button>
                <button type="button" className="link-quiet" onClick={onCancel}>Annuler</button>
            </div>
        </form>
    )
}

type Enrollment = {
    userId: string,
    displayName: string | null,
    email: string | null,
    source: string,
    createdAt: string,
    lessons: number,
    done: number
}
const sourceLabels: Record<string, string> = {
    Purchase: 'achat en ligne',
    PaymentLink: 'lien de paiement',
    Manual: 'offerte'
}

function Members({courseId}: { courseId: string }) {
    const feedback = useFeedback()
    const {data, reload} = useResource<Enrollment[]>(`/admin/courses/${courseId}/enrollments`)
    const {data: clients} = useResource<AdminClient[]>('/admin/clients')
    const [userId, setUserId] = useState('')
    const available = clients?.filter((c) => !data?.some((e) => e.userId === c.id)) ?? []

    return (
        <>
            <h2 className="space-subtitle">Membres</h2>
            <form className="card form" onSubmit={async (e) => {
                e.preventDefault()
                if (!userId) return
                await api(`/admin/courses/${courseId}/enrollments`, {method: 'POST', body: json({userId})})
                feedback.toast('Accès offert.')
                setUserId('')
                reload()
            }}>
                <label className="field"><span>Offrir l'accès à un client (inclus dans un séminaire, par exemple)</span>
                    <select value={userId} onChange={(e) => setUserId(e.target.value)}>
                        <option value="">Choisir un compte…</option>
                        {available.map((c) => <option key={c.id}
                                                      value={c.id}>{c.displayName ?? c.email ?? c.phoneNumber}</option>)}
                    </select>
                </label>
                <button type="submit" className="btn btn-line btn-small" disabled={!userId}>Offrir l'accès</button>
            </form>
            {data?.length === 0 && <p className="tile-empty">Aucun membre pour l'instant.</p>}
            {data && data.length > 0 && (
                <StaggerList className="rows">
                    {data.map((e) => (
                        <div className="row" key={e.userId}>
                            <div className="row-main">
                                <span className="row-title">{e.displayName ?? e.email}</span>
                                <span className="row-meta">{sourceLabels[e.source]} · {e.done} / {e.lessons} leçons · depuis le {new Date(e.createdAt).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <button type="button" className="link-quiet" onClick={async () => {
                                if (!(await feedback.confirm({
                                    title: `Retirer l'accès de ${e.displayName ?? e.email} ?`,
                                    danger: true,
                                    confirmLabel: 'Retirer'
                                }))) return
                                await api(`/admin/courses/${courseId}/enrollments/${e.userId}`, {method: 'DELETE'})
                                reload()
                            }}>Retirer
                            </button>
                        </div>
                    ))}
                </StaggerList>
            )}
        </>
    )
}

// ======================================================================
// Paiements
// ======================================================================
type AdminPayment = {
    id: string, kind: PaymentKind, status: PaymentStatus, label: string, amountCents: number, currency: string,
    customerName: string | null, email: string | null, accountName: string | null, courseTitle: string | null,
    paymentMethod: string | null, receiptUrl: string | null, fromLink: boolean, ticketId: number | null,
    createdAt: string, paidAt: string | null, expiresAt: string, url: string
}
type StripeStatus = {
    configured: boolean,
    fromEnvironment: boolean,
    mode: 'test' | 'live' | null,
    webhookActive: boolean,
    publicUrlIsLocal: boolean
}

const kindLabels: Record<PaymentKind, string> = {Course: 'Formation', Seminar: 'Séminaire', Other: 'Accompagnement'}
const payStatusLabels: Record<PaymentStatus, string> = {
    Pending: 'En attente',
    Paid: 'Payé',
    Failed: 'Échoué',
    Canceled: 'Annulé',
    Refunded: 'Remboursé'
}
const methodLabels: Record<string, string> = {card: 'carte', klarna: 'Klarna', link: 'Link', paypal: 'PayPal'}

export function AdminPaymentsPage() {
    const feedback = useFeedback()
    const [params] = useSearchParams()
    const {data, error, reload} = useResource<AdminPayment[]>('/admin/payments')
    const {data: courses} = useResource<AdminCourseRow[]>('/admin/courses')
    const {data: clients} = useResource<AdminClient[]>('/admin/clients')
    const [filter, setFilter] = useState<PaymentStatus | 'all'>('all')
    const [form, setForm] = useState({
        kind: (params.get('type') as PaymentKind | null) ?? 'Seminar', courseId: '', userId: '',
        email: params.get('email') ?? '', name: params.get('nom') ?? '', label: params.get('objet') ?? '', amount: '',
        ticketId: params.get('demande') ?? '', sendEmail: true,
    })
    const [result, setResult] = useState<{ url: string, emailed: boolean, smtp: boolean } | null>(null)
    const [formError, setFormError] = useState<string | null>(null)
    const [now] = useState(() => Date.now())

    const course = courses?.find((c) => c.id === form.courseId)
    const paid = data?.filter((p) => p.status === 'Paid') ?? []
    const last30 = paid.filter((p) => p.paidAt && now - new Date(p.paidAt).getTime() < 30 * 86_400_000)
    const list = data?.filter((p) => filter === 'all' || p.status === filter) ?? []

    async function create(e: FormEvent) {
        e.preventDefault()
        setFormError(null)
        setResult(null)
        try {
            const r = await api<{ url: string, emailed: boolean, smtp: boolean }>('/admin/payments', {
                method: 'POST', body: json({
                    kind: form.kind,
                    courseId: form.kind === 'Course' ? form.courseId || null : null,
                    userId: form.userId || null,
                    email: form.email,
                    name: form.name,
                    label: form.label,
                    amountCents: form.amount ? toCents(form.amount) : null,
                    ticketId: form.ticketId ? parseInt(form.ticketId, 10) : null,
                    sendEmail: form.sendEmail,
                    locale: 'fr',
                }),
            })
            setResult(r)
            await navigator.clipboard?.writeText(r.url).catch(() => undefined)
            reload()
        } catch (err) {
            setFormError(errorText(err))
        }
    }

    return (
        <>
            <SpaceHeader title="Paiements"
                         text="Formations achetées sur le site, liens de paiement pour vos séminaires et accompagnements sur devis. Carte bancaire ou 3 fois avec Klarna, via Stripe."/>
            <StripeCard/>
            {error && <p className="notice notice-error">{error.message}</p>}

            <div className="kpis">
                <div className="kpi"><span
                    className="kpi-value">{eur(last30.reduce((n, p) => n + p.amountCents, 0))}</span><span
                    className="kpi-label">Encaissé sur 30 jours</span></div>
                <div className="kpi"><span className="kpi-value">{last30.length}</span><span className="kpi-label">Paiements sur 30 jours</span>
                </div>
                <div className="kpi"><span
                    className="kpi-value">{data?.filter((p) => p.status === 'Pending' && p.fromLink).length ?? 0}</span><span
                    className="kpi-label">Liens en attente</span></div>
            </div>

            <form className="card form" onSubmit={create}>
                <h2 className="h3"><LinkIcon size={18}/> Envoyer un lien de paiement</h2>
                <div className="field-row">
                    <label className="field"><span>Pour</span>
                        <select value={form.kind}
                                onChange={(e) => setForm((f) => ({...f, kind: e.target.value as PaymentKind}))}>
                            <option value="Seminar">Un séminaire (devis)</option>
                            <option value="Course">Une formation</option>
                            <option value="Other">Un accompagnement, un acompte…</option>
                        </select>
                    </label>
                    {form.kind === 'Course' ? (
                        <label className="field"><span>Formation</span>
                            <select required value={form.courseId}
                                    onChange={(e) => setForm((f) => ({...f, courseId: e.target.value}))}>
                                <option value="">Choisir…</option>
                                {courses?.map((c) => <option key={c.id}
                                                             value={c.id}>{c.title} · {eur(c.priceCents)}</option>)}
                            </select>
                        </label>
                    ) : (
                        <label className="field"><span>Libellé (vu par le client)</span>
                            <input maxLength={160} value={form.label}
                                   onChange={(e) => setForm((f) => ({...f, label: e.target.value}))}
                                   placeholder="Séminaire cohésion · 12 juin · équipe de 15"/>
                        </label>
                    )}
                </div>
                <div className="field-row">
                    <label className="field"><span>Client existant (facultatif)</span>
                        <select value={form.userId} onChange={(e) => {
                            const client = clients?.find((c) => c.id === e.target.value)
                            setForm((f) => ({
                                ...f,
                                userId: e.target.value,
                                email: client?.email ?? f.email,
                                name: client?.displayName ?? f.name
                            }))
                        }}>
                            <option value="">Aucun : saisir l'e-mail</option>
                            {clients?.map((c) => <option key={c.id}
                                                         value={c.id}>{c.displayName ?? c.email ?? c.phoneNumber}</option>)}
                        </select>
                        <small>Un client choisi ici accède à la formation dès le paiement.</small>
                    </label>
                    <label className="field"><span>Montant TTC (€)</span>
                        <input inputMode="decimal" value={form.amount}
                               onChange={(e) => setForm((f) => ({...f, amount: e.target.value}))}
                               placeholder={course ? fromCents(course.priceCents) : '1 200'}
                               required={form.kind !== 'Course'}/>
                    </label>
                </div>
                <div className="field-row">
                    <label className="field"><span>E-mail du client</span>
                        <input type="email" value={form.email}
                               onChange={(e) => setForm((f) => ({...f, email: e.target.value}))}
                               placeholder="prenom.nom@entreprise.fr"/>
                    </label>
                    <label className="field"><span>Nom</span>
                        <input maxLength={120} value={form.name}
                               onChange={(e) => setForm((f) => ({...f, name: e.target.value}))}/>
                    </label>
                </div>
                <label className="terms-check">
                    <input type="checkbox" checked={form.sendEmail}
                           onChange={(e) => setForm((f) => ({...f, sendEmail: e.target.checked}))}/>
                    <span>Envoyer le lien par e-mail (sinon, copiez-le pour WhatsApp, SMS…)</span>
                </label>
                {form.ticketId && <p className="fine-print">Lié à la demande n°{form.ticketId}.</p>}
                {formError && <p className="notice notice-error">{formError}</p>}
                {result && (
                    <div className="notice notice-success pay-link-result">
                        <p>Lien
                            créé{result.emailed ? ' et envoyé par e-mail' : result.smtp ? '' : ' (e-mails non configurés : envoyez-le vous-même)'}.
                            Copié dans le presse-papiers.</p>
                        <code>{result.url}</code>
                    </div>
                )}
                <button type="submit" className="btn btn-ink btn-small">Créer le lien de paiement</button>
            </form>

            <div className="segmented segmented-small payments-filter">
                {(['all', 'Pending', 'Paid', 'Failed', 'Canceled', 'Refunded'] as const).map((f) => (
                    <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                        {f === 'all' ? 'Tous' : payStatusLabels[f]}
                    </button>
                ))}
            </div>
            {!data && !error && <DialLoader/>}
            {data && list.length === 0 && <p className="tile-empty">Aucun paiement.</p>}
            {list.length > 0 && (
                <StaggerList className="rows">
                    {list.map((p) => (
                        <div className="row" key={p.id}>
                            <div className="row-main">
                                <span className="row-title">{p.label} · {eur(p.amountCents)}</span>
                                <span className="row-meta">
                                    {kindLabels[p.kind]} · {p.accountName ?? p.customerName ?? p.email ?? 'client'}
                                    {p.paidAt ? ` · payé le ${new Date(p.paidAt).toLocaleDateString('fr-FR')}` : ` · créé le ${new Date(p.createdAt).toLocaleDateString('fr-FR')}`}
                                    {p.paymentMethod && ` · ${methodLabels[p.paymentMethod] ?? p.paymentMethod}`}
                                    {p.ticketId && <> · <Link to={`/admin/demandes/${p.ticketId}`}>demande
                                        n°{p.ticketId}</Link></>}
                                </span>
                            </div>
                            <span className={`chip chip-pay-${p.status}`}>{payStatusLabels[p.status]}</span>
                            <span className="row-actions">
                                {p.status === 'Pending' && p.fromLink && (
                                    <>
                                        <button type="button" className="link-quiet" onClick={async () => {
                                            await navigator.clipboard?.writeText(p.url)
                                            feedback.toast('Lien copié.')
                                        }}>Copier le lien
                                        </button>
                                        {p.email && <button type="button" className="link-quiet" onClick={async () => {
                                            const r = await api<{
                                                emailed: boolean
                                            }>(`/admin/payments/${p.id}/send`, {method: 'POST'})
                                            feedback.toast(r.emailed ? 'Lien renvoyé par e-mail.' : 'E-mails non configurés : copiez le lien.', r.emailed ? 'success' : 'info')
                                        }}>Renvoyer</button>}
                                        <button type="button" className="link-quiet" onClick={async () => {
                                            if (!(await feedback.confirm({
                                                title: 'Annuler ce lien de paiement ?',
                                                message: 'Le client ne pourra plus payer avec.',
                                                danger: true,
                                                confirmLabel: 'Annuler le lien'
                                            }))) return
                                            await api(`/admin/payments/${p.id}/cancel`, {method: 'POST'})
                                            reload()
                                        }}>Annuler
                                        </button>
                                    </>
                                )}
                                {p.receiptUrl && <a className="link-quiet" href={p.receiptUrl} target="_blank"
                                                    rel="noreferrer">Reçu</a>}
                            </span>
                        </div>
                    ))}
                </StaggerList>
            )}
        </>
    )
}

function StripeCard() {
    const feedback = useFeedback()
    const {data, reload} = useResource<StripeStatus>('/admin/payments/stripe')
    const [key, setKey] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    if (!data) return null

    if (data.configured) {
        return (
            <section className="card stripe-card">
                <p className="stripe-state"><Check size={18}/> Stripe est
                    relié{data.mode === 'test' && ' en mode test (aucun vrai paiement)'}.</p>
                <p className="fine-print">
                    {data.webhookActive ? 'Synchronisation instantanée active : chaque paiement est validé aussitôt.'
                        : data.publicUrlIsLocal ? 'Mode local : les paiements sont validés au retour du client sur le site.'
                            : 'Les paiements sont validés au retour du client sur le site.'}
                    {' '}Paiement en 3 fois : activez Klarna dans Stripe › Paramètres › Moyens de paiement.
                </p>
                {!data.fromEnvironment && (
                    <button type="button" className="link-quiet" onClick={async () => {
                        if (!(await feedback.confirm({
                            title: 'Délier Stripe ?',
                            message: 'Plus aucun paiement ne sera possible sur le site.',
                            danger: true,
                            confirmLabel: 'Délier'
                        }))) return
                        await api('/admin/payments/stripe', {method: 'DELETE'})
                        reload()
                    }}>Délier Stripe</button>
                )}
            </section>
        )
    }

    return (
        <form className="card form stripe-card" onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError(null)
            try {
                await api('/admin/payments/stripe/connect', {method: 'POST', body: json({secretKey: key})})
                setKey('')
                feedback.toast('Stripe est relié.')
                reload()
            } catch (err) {
                setError(errorText(err))
            } finally {
                setBusy(false)
            }
        }}>
            <h2 className="h3">Relier Stripe pour encaisser en ligne</h2>
            <ol className="steps-inline">
                <li>Créez un compte gratuit sur <a href="https://dashboard.stripe.com/register" target="_blank"
                                                   rel="noreferrer">stripe.com</a>.
                </li>
                <li>Dans Stripe › Développeurs › Clés API, copiez la <strong>clé secrète</strong> (sk_test_… pour
                    essayer).
                </li>
                <li>Collez-la ci-dessous : elle est vérifiée auprès de Stripe puis stockée chiffrée.</li>
                <li>Pour le paiement en 3 fois, activez Klarna dans Stripe › Paramètres › Moyens de paiement.</li>
            </ol>
            <label className="field"><span>Clé secrète Stripe</span>
                <input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)}
                       placeholder="sk_test_…" required/>
            </label>
            {error && <p className="notice notice-error">{error}</p>}
            <button type="submit" className="btn btn-ink btn-small" disabled={busy}>Relier Stripe</button>
        </form>
    )
}
