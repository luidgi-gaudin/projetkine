import {type FormEvent, useMemo, useState} from 'react'
import {Link, useParams, useSearchParams} from 'react-router'
import {api, json} from '../../api/client'
import type {Classroom, ClassroomLesson, CommunityComment, CommunityPost, MyCourse, MyPayment} from '../../api/types'
import {useResource} from '../../api/useResource'
import {DialLoader} from '../../components/brand/Dial'
import {SpaceHeader, StaggerList} from '../../components/espace/SpaceLayout'
import {money} from '../../components/learning/format'
import {CourseCover, RichText, VideoFrame} from '../../components/learning/LearningBits'
import {ArrowRight, Check, Message, Trash} from '../../components/ui/Icons'
import {useFeedback} from '../../components/ui/feedback'
import {useI18n} from '../../i18n/context'

function ProgressBar({done, total}: { done: number, total: number }) {
    const pct = total === 0 ? 0 : Math.round((done / total) * 100)
    return <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{width: `${pct}%`}}/>
    </div>
}

// ---------- Mes formations ----------
export function EspaceFormationsPage() {
    const {t, format} = useI18n()
    const {data, error} = useResource<MyCourse[]>('/learning')

    return (
        <>
            <SpaceHeader title={t.learning.myCoursesTitle} text={t.learning.myCoursesText}>
                <Link to="/formations" className="btn btn-line btn-small">{t.learning.browse}</Link>
            </SpaceHeader>
            {error && <p className="notice notice-error">{t.espace.apiDown}</p>}
            {!data && !error && <DialLoader/>}
            {data?.length === 0 && (
                <p className="tile-empty">{t.learning.empty} <Link to="/formations">{t.learning.browse}</Link></p>
            )}
            {data && data.length > 0 && (
                <StaggerList className="my-courses">
                    {data.map((course) => (
                        <Link to={`/espace/formations/${course.slug}`} className="my-course" key={course.id}>
                            <CourseCover seed={course.slug} small/>
                            <div className="my-course-body">
                                <span className="row-title">{course.title}{!course.published &&
                                    <span className="chip"> {t.learning.draft}</span>}</span>
                                <span className="row-meta">{format(t.learning.progress, {
                                    done: course.done,
                                    total: course.lessons
                                })}</span>
                                <ProgressBar done={course.done} total={course.lessons}/>
                            </div>
                            <span className="link-arrow">{course.done > 0 ? t.learning.resume : t.learning.start}
                                <ArrowRight/></span>
                        </Link>
                    ))}
                </StaggerList>
            )}
        </>
    )
}

// ---------- Salle de cours ----------
export function EspaceClassroomPage() {
    const {slug} = useParams()
    const {t, format} = useI18n()
    const [params, setParams] = useSearchParams()
    const {data, error, reload} = useResource<Classroom>(`/learning/${slug}`)
    const tab = params.get('vue') === 'communaute' ? 'community' : 'lessons'

    const lessons = useMemo(() => data?.modules.flatMap((m) => m.lessons) ?? [], [data])
    const current: ClassroomLesson | undefined =
        lessons.find((l) => l.id === params.get('lecon')) ?? lessons.find((l) => !l.done) ?? lessons[0]
    const index = current ? lessons.indexOf(current) : -1
    const done = lessons.filter((l) => l.done).length

    if (error) return <p className="notice">{t.formations.notFound} <Link
        to="/espace/formations">{t.learning.back}</Link></p>
    if (!data) return <DialLoader/>

    const go = (lesson: ClassroomLesson) => setParams({lecon: lesson.id}, {replace: false})

    async function toggleDone(lesson: ClassroomLesson) {
        await api(`/learning/lessons/${lesson.id}/progress`, {method: 'POST', body: json({done: !lesson.done})})
        reload()
        if (!lesson.done && index < lessons.length - 1) go(lessons[index + 1])
    }

    return (
        <>
            <Link to="/espace/formations" className="link-quiet">← {t.learning.back}</Link>
            <SpaceHeader title={data.title} text={format(t.learning.progress, {done, total: lessons.length})}>
                <div className="segmented" role="tablist">
                    <button type="button" role="tab" aria-selected={tab === 'lessons'}
                            className={tab === 'lessons' ? 'is-active' : ''}
                            onClick={() => setParams(current ? {lecon: current.id} : {})}>{t.learning.tabLessons}</button>
                    <button type="button" role="tab" aria-selected={tab === 'community'}
                            className={tab === 'community' ? 'is-active' : ''}
                            onClick={() => setParams({vue: 'communaute'})}>{t.learning.tabCommunity}</button>
                </div>
            </SpaceHeader>
            <ProgressBar done={done} total={lessons.length}/>

            {tab === 'community' ? <Community key={data.slug} slug={data.slug}
                                              isCoach={data.isCoach}/> : lessons.length === 0 || !current ? (
                <p className="tile-empty">{t.learning.noLessons}</p>
            ) : (
                <div className="classroom">
                    <nav className="classroom-nav" aria-label={t.learning.tabLessons}>
                        {data.modules.map((module, mi) => (
                            <div key={module.id} className="classroom-module">
                                <p className="classroom-module-title">
                                    <span>{String(mi + 1).padStart(2, '0')}</span> {module.title}</p>
                                <ul>
                                    {module.lessons.map((lesson) => (
                                        <li key={lesson.id}>
                                            <button type="button" onClick={() => go(lesson)}
                                                    className={`classroom-lesson${lesson.id === current.id ? ' is-current' : ''}${lesson.done ? ' is-done' : ''}`}>
                                                <span className="classroom-check">{lesson.done &&
                                                    <Check size={12}/>}</span>
                                                <span>{lesson.title}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>

                    <article className="classroom-lesson-view" key={current.id}>
                        <h2 className="h3">{current.title}</h2>
                        {current.durationMinutes != null &&
                            <p className="row-meta">{current.durationMinutes} {t.formations.minutes}</p>}
                        {current.videoEmbedUrl && <VideoFrame src={current.videoEmbedUrl} title={current.title}/>}
                        {current.body && <RichText text={current.body}/>}
                        <div className="classroom-actions">
                            <button type="button" className={`btn btn-small ${current.done ? 'btn-line' : 'btn-ink'}`}
                                    onClick={() => toggleDone(current)}>
                                {current.done ? <><Check size={16}/> {t.learning.done}</> : t.learning.markDone}
                            </button>
                            <span className="classroom-pager">
                                {index > 0 && <button type="button" className="link-quiet"
                                                      onClick={() => go(lessons[index - 1])}>← {t.learning.previous}</button>}
                                {index < lessons.length - 1 && <button type="button" className="link-quiet"
                                                                       onClick={() => go(lessons[index + 1])}>{t.learning.next} →</button>}
                            </span>
                        </div>
                        <LessonComments lessonId={current.id}/>
                    </article>
                </div>
            )}
        </>
    )
}

function Composer({placeholder, onSend, rows = 2}: {
    placeholder: string,
    onSend: (body: string) => Promise<void>,
    rows?: number
}) {
    const {t} = useI18n()
    const [body, setBody] = useState('')
    const [busy, setBusy] = useState(false)

    async function submit(e: FormEvent) {
        e.preventDefault()
        if (!body.trim()) return
        setBusy(true)
        try {
            await onSend(body)
            setBody('')
        } finally {
            setBusy(false)
        }
    }

    return (
        <form className="composer" onSubmit={submit}>
            <textarea rows={rows} maxLength={5000} value={body} placeholder={placeholder}
                      onChange={(e) => setBody(e.target.value)}/>
            <button type="submit" className="btn btn-ink btn-small"
                    disabled={busy || !body.trim()}>{t.learning.send}</button>
        </form>
    )
}

function CommentList({comments, onDelete}: { comments: CommunityComment[], onDelete: (id: string) => void }) {
    const {t, date} = useI18n()
    return (
        <ul className="comments">
            {comments.map((c) => (
                <li key={c.id} className="comment">
                    <p className="comment-head">
                        <strong>{c.authorName}</strong>
                        {c.authorIsCoach && <span className="chip chip-coach">{t.learning.coach}</span>}
                        <span className="row-meta">{date(c.createdAt, {dateStyle: 'medium', timeStyle: 'short'})}</span>
                        {c.canDelete && (
                            <button type="button" className="icon-button" aria-label={t.learning.delete}
                                    onClick={() => onDelete(c.id)}>
                                <Trash size={14}/>
                            </button>
                        )}
                    </p>
                    <RichText text={c.body} className="comment-body"/>
                </li>
            ))}
        </ul>
    )
}

function LessonComments({lessonId}: { lessonId: string }) {
    const {t} = useI18n()
    const feedback = useFeedback()
    const {data, reload} = useResource<CommunityComment[]>(`/learning/lessons/${lessonId}/comments`)

    return (
        <section className="lesson-comments">
            <h3 className="space-subtitle"><Message size={16}/> {t.learning.comments}</h3>
            {data?.length === 0 && <p className="row-meta">{t.learning.noComments}</p>}
            {data && <CommentList comments={data} onDelete={async (id) => {
                if (!(await feedback.confirm({
                    title: t.learning.confirmDelete,
                    danger: true,
                    confirmLabel: t.learning.delete
                }))) return
                await api(`/learning/comments/${id}`, {method: 'DELETE'})
                reload()
            }}/>}
            <Composer placeholder={t.learning.commentPlaceholder} onSend={async (body) => {
                await api(`/learning/lessons/${lessonId}/comments`, {method: 'POST', body: json({body})})
                reload()
            }}/>
        </section>
    )
}

function Community({slug, isCoach}: { slug: string, isCoach: boolean }) {
    const {t, date} = useI18n()
    const feedback = useFeedback()
    const {data, error, reload} = useResource<CommunityPost[]>(`/learning/${slug}/posts`)
    const [open, setOpen] = useState<string | null>(null)


    async function remove(path: string) {
        if (!(await feedback.confirm({
            title: t.learning.confirmDelete,
            danger: true,
            confirmLabel: t.learning.delete
        }))) return
        await api(path, {method: 'DELETE'})
        reload()
    }

    return (
        <section className="community">
            <p className="fine-print">{t.learning.communityText}</p>
            <Composer placeholder={t.learning.newPost} rows={3} onSend={async (body) => {
                await api(`/learning/${slug}/posts`, {method: 'POST', body: json({body})})
                reload()
            }}/>
            {error && <p className="notice notice-error">{t.espace.apiDown}</p>}
            {!data && !error && <DialLoader/>}
            {data?.length === 0 && <p className="tile-empty">{t.learning.noPosts}</p>}
            {data && data.length > 0 && (
                <ul className="posts">
                    {data.map((post) => (
                        <li key={post.id} className={`post${post.pinned ? ' is-pinned' : ''}`}>
                            <p className="comment-head">
                                <strong>{post.authorName}</strong>
                                {post.authorIsCoach && <span className="chip chip-coach">{t.learning.coach}</span>}
                                {post.pinned && <span className="chip">{t.learning.pinned}</span>}
                                <span className="row-meta">{date(post.createdAt, {
                                    dateStyle: 'medium',
                                    timeStyle: 'short'
                                })}</span>
                            </p>
                            <RichText text={post.body} className="post-body"/>
                            <div className="post-actions">
                                <button type="button" className={`link-quiet${post.likedByMe ? ' is-liked' : ''}`}
                                        onClick={async () => {
                                            await api(`/learning/posts/${post.id}/like`, {method: 'POST'})
                                            reload()
                                        }}>♥ {t.learning.like}{post.likes > 0 && ` · ${post.likes}`}</button>
                                <button type="button" className="link-quiet"
                                        onClick={() => setOpen(open === post.id ? null : post.id)}>
                                    {t.learning.comment}{post.comments.length > 0 && ` · ${post.comments.length}`}
                                </button>
                                {isCoach && (
                                    <button type="button" className="link-quiet" onClick={async () => {
                                        await api(`/learning/posts/${post.id}`, {
                                            method: 'PATCH',
                                            body: json({pinned: !post.pinned})
                                        })
                                        reload()
                                    }}>{post.pinned ? t.learning.unpin : t.learning.pin}</button>
                                )}
                                {post.canDelete && (
                                    <button type="button" className="link-quiet"
                                            onClick={() => remove(`/learning/posts/${post.id}`)}>{t.learning.delete}</button>
                                )}
                            </div>
                            {open === post.id && (
                                <div className="post-thread">
                                    <CommentList comments={post.comments}
                                                 onDelete={(id) => remove(`/learning/comments/${id}`)}/>
                                    <Composer placeholder={t.learning.commentPlaceholder} onSend={async (body) => {
                                        await api(`/learning/posts/${post.id}/comments`, {
                                            method: 'POST',
                                            body: json({body})
                                        })
                                        reload()
                                    }}/>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

// ---------- Paiements ----------
export function EspacePaymentsPage() {
    const {t, locale, date, format} = useI18n()
    const {data, error} = useResource<MyPayment[]>('/payments/mine')

    return (
        <>
            <SpaceHeader title={t.learning.paymentsTitle} text={t.learning.paymentsText}/>
            {error && <p className="notice notice-error">{t.espace.apiDown}</p>}
            {!data && !error && <DialLoader/>}
            {data?.length === 0 && <p className="tile-empty">{t.learning.noPayments}</p>}
            {data && data.length > 0 && (
                <StaggerList className="rows">
                    {data.map((p) => (
                        <div className="row" key={p.id}>
                            <div className="row-main">
                                <span className="row-title">{p.label}</span>
                                <span className="row-meta">
                                    {t.payment.kind[p.kind]} · {money(p.amountCents, p.currency, locale)} · {date(p.paidAt ?? p.createdAt)}
                                    {p.status === 'Pending' && <> · {format(t.learning.due, {date: date(p.expiresAt)})}</>}
                                </span>
                            </div>
                            <span className={`chip chip-pay-${p.status}`}>{t.learning.status[p.status]}</span>
                            {p.payUrl && <a className="btn btn-ink btn-small" href={p.payUrl}>{t.learning.payNow}</a>}
                            {p.receiptUrl && <a className="link-quiet" href={p.receiptUrl} target="_blank"
                                                rel="noreferrer">{t.learning.receipt}</a>}
                        </div>
                    ))}
                </StaggerList>
            )}
        </>
    )
}
