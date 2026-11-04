import {useState} from 'react'
import {Link, useLocation, useNavigate, useParams} from 'react-router'
import {api, ApiError, json} from '../../api/client'
import type {CourseCard, CourseDetail} from '../../api/types'
import {useResource} from '../../api/useResource'
import {useAuth} from '../../auth/AuthContext'
import {DialLoader} from '../../components/brand/Dial'
import {money} from '../../components/learning/format'
import {CourseCover, RichText, TermsCheckbox, VideoFrame} from '../../components/learning/LearningBits'
import {Reveal} from '../../components/motion/Reveal'
import {FinalCta, PageHero} from '../../components/site/Blocks'
import {ArrowRight, Check, Lock} from '../../components/ui/Icons'
import {useI18n} from '../../i18n/context'

/** Catalogue public des formations (prix affichés, paiement comptant ou en 3 fois). */
export function FormationsPage() {
    const {t, locale, format} = useI18n()
    const {data, error} = useResource<CourseCard[]>('/courses')

    return (
        <>
            <PageHero eyebrow={t.formations.eyebrow} lines={t.formations.title} intro={t.formations.intro}/>
            <section className="courses" data-ambient="paper">
                {error && <p className="notice notice-error">{t.booking.unavailable}</p>}
                {!data && !error && <DialLoader/>}
                {data?.length === 0 && (
                    <p className="notice">{t.formations.empty} <Link to="/contact">{t.ui.footerReach}</Link></p>
                )}
                {data && data.length > 0 && (
                    <div className="course-grid">
                        {data.map((course, i) => (
                            <Reveal key={course.id} delay={Math.min(i, 5) * 0.06}>
                                <Link to={`/formations/${course.slug}`} className="course-card">
                                    <CourseCover seed={course.slug}/>
                                    <div className="course-card-body">
                                        <p className="course-card-meta">
                                            {format(t.formations.modules, {n: course.modules})}
                                            {' · '}{format(t.formations.lessons, {n: course.lessons})}
                                            {course.durationLabel && <> · {course.durationLabel}</>}
                                        </p>
                                        <h2 className="h3">{course.title}</h2>
                                        <p>{course.summary}</p>
                                        <p className="course-price">
                                            <strong>{money(course.priceCents, course.currency, locale)}</strong>
                                            <span>{t.formations.installments}</span>
                                        </p>
                                        <span className="link-arrow">{t.formations.seeProgram} <ArrowRight/></span>
                                    </div>
                                </Link>
                            </Reveal>
                        ))}
                    </div>
                )}
            </section>
            <FinalCta/>
        </>
    )
}

/** Fiche d'une formation : présentation, programme, aperçus gratuits, achat. */
export function FormationDetailPage() {
    const {slug} = useParams()
    const {t, locale, format} = useI18n()
    const {user} = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const {data: course, error} = useResource<CourseDetail>(`/courses/${slug}`)
    const [accepted, setAccepted] = useState(false)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [preview, setPreview] = useState<string | null>(null)

    if (error) {
        return (
            <section className="course-detail">
                <p className="notice">{t.formations.notFound}</p>
                <Link to="/formations" className="link-arrow">{t.formations.back} <ArrowRight/></Link>
            </section>
        )
    }
    if (!course) return <DialLoader/>

    const lessonCount = course.modules.reduce((n, m) => n + m.lessons.length, 0)

    async function buy() {
        if (!course) return
        if (!user) {
            navigate('/connexion', {state: {from: location.pathname}})
            return
        }
        if (!accepted) {
            setMessage(t.formations.termsRequired)
            return
        }
        setBusy(true)
        setMessage(null)
        try {
            const {url} = await api<{ url: string }>(`/courses/${course.id}/checkout`, {
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
        <>
            <section className="course-detail" data-ambient="mist">
                <Link to="/formations" className="link-quiet course-back">← {t.formations.back}</Link>
                <div className="course-detail-grid">
                    <div>
                        <Reveal y={12}><p className="eyebrow">{t.formations.eyebrow}</p></Reveal>
                        <Reveal delay={0.05}><h1 className="course-title">{course.title}</h1></Reveal>
                        <Reveal delay={0.1}><p className="lede">{course.summary}</p></Reveal>
                        {course.description && <Reveal delay={0.15}><RichText text={course.description}/></Reveal>}

                        <h2 className="h3 course-program-title">{t.formations.program}</h2>
                        <p className="course-card-meta">
                            {format(t.formations.modules, {n: course.modules.length})} · {format(t.formations.lessons, {n: lessonCount})}
                            {course.durationLabel && <> · {course.durationLabel}</>}
                        </p>
                        <ol className="course-program">
                            {course.modules.map((module, mi) => (
                                <li key={mi}>
                                    <p className="course-module-title">
                                        <span>{String(mi + 1).padStart(2, '0')}</span> {module.title}</p>
                                    <ul>
                                        {module.lessons.map((lesson) => (
                                            <li key={lesson.id} className="course-lesson-row">
                                                {lesson.freePreview ? (
                                                    <button type="button" className="course-lesson-preview"
                                                            onClick={() => setPreview(preview === lesson.id ? null : lesson.id)}>
                                                        {lesson.title} <span
                                                        className="chip">{t.formations.preview}</span>
                                                    </button>
                                                ) : (
                                                    <span><Lock size={14}/> {lesson.title}</span>
                                                )}
                                                {lesson.durationMinutes != null && (
                                                    <span
                                                        className="row-meta">{lesson.durationMinutes} {t.formations.minutes}</span>
                                                )}
                                                {preview === lesson.id && (
                                                    <div className="course-preview">
                                                        {lesson.videoEmbedUrl && <VideoFrame src={lesson.videoEmbedUrl}
                                                                                             title={lesson.title}/>}
                                                        {lesson.body && <RichText text={lesson.body}/>}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ol>
                    </div>

                    <aside className="course-buy">
                        <CourseCover seed={course.slug} small/>
                        <p className="course-price course-price-big">
                            <strong>{money(course.priceCents, course.currency, locale)}</strong>
                            <span>{t.formations.installments}</span>
                        </p>
                        <p className="eyebrow">{t.formations.included}</p>
                        <ul className="check-list">
                            {t.formations.includedItems.map((item) => <li key={item}><Check size={16}/> {item}</li>)}
                        </ul>
                        {course.hasAccess ? (
                            <Link to={`/espace/formations/${course.slug}`} className="btn btn-ink">
                                {t.formations.access} <ArrowRight/>
                            </Link>
                        ) : !course.paymentsEnabled ? (
                            <p className="notice">{t.formations.paymentsOff} <Link
                                to="/contact">{t.ui.footerReach}</Link></p>
                        ) : (
                            <>
                                {user && <TermsCheckbox checked={accepted} onChange={setAccepted}/>}
                                <button type="button" className="btn btn-ink" onClick={buy} disabled={busy}>
                                    {user ? t.formations.buy : t.formations.loginToBuy} <ArrowRight/>
                                </button>
                                <p className="fine-print">{t.formations.secure}</p>
                            </>
                        )}
                        {message && <p className="notice" role="status">{message}</p>}
                    </aside>
                </div>
            </section>
            <FinalCta/>
        </>
    )
}
