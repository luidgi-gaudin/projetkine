import {useLayoutEffect, useRef, useState} from 'react'
import {Link} from 'react-router'
import {AnimatePresence, motion, type MotionValue, useScroll, useSpring, useTransform} from 'motion/react'
import {TimeRuler} from '../../components/brand/TimeRuler'
import {easeOut} from '../../components/motion/ease'
import {Reveal} from '../../components/motion/Reveal'
import {FinalCta, PageHero, SectionTitle} from '../../components/site/Blocks'
import {ArrowRight, Plus} from '../../components/ui/Icons'
import {useI18n} from '../../i18n/context'

/** Formats en liste éditoriale : une ligne s'ouvre pour révéler le détail. */
function Formats() {
    const {t} = useI18n()
    const [open, setOpen] = useState<number | null>(0)

    return (
        <section className="formats" data-ambient="paper">
            <SectionTitle eyebrow={t.ui.formatsEyebrow}>{t.ui.formatsTitle}</SectionTitle>
            <ul className="format-list">
                {t.seminaires.formats.map((format, i) => {
                    const isOpen = open === i
                    return (
                        <Reveal as="li" key={format.title} className={`format${isOpen ? ' is-open' : ''}`}>
                            <button type="button" className="format-head" aria-expanded={isOpen}
                                    onClick={() => setOpen(isOpen ? null : i)}>
                                <span className="format-index">{String(i + 1).padStart(2, '0')}</span>
                                <span className="format-title">{format.title}</span>
                                <span className="format-duration">{format.duration}</span>
                                <motion.span className="format-toggle" animate={{rotate: isOpen ? 45 : 0}}
                                             transition={{duration: 0.4, ease: easeOut}}>
                                    <Plus size={22}/>
                                </motion.span>
                            </button>
                            <AnimatePresence initial={false}>
                                {isOpen && (
                                    <motion.div className="format-body"
                                                initial={{height: 0, opacity: 0}}
                                                animate={{height: 'auto', opacity: 1}}
                                                exit={{height: 0, opacity: 0}}
                                                transition={{duration: 0.6, ease: easeOut}}>
                                        <div className="format-body-inner">
                                            <p>{format.text}</p>
                                            <ul className="tick-list">
                                                {format.details.map((d) => <li key={d}>{d}</li>)}
                                            </ul>
                                            <Link to={`/contact?type=devis&sujet=${encodeURIComponent(format.title)}`}
                                                  className="link-arrow">
                                                {t.ui.formatCta} <ArrowRight/>
                                            </Link>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Reveal>
                    )
                })}
            </ul>
        </section>
    )
}

type Slot = { time: string, title: string, text: string }

/** Une carte de la journée : nette et pleine au centre de l'écran, plus discrète sur les bords. */
function DaySlot({slot, index, x, step, origin, focus}: {
    slot: Slot
    index: number
    x: MotionValue<number>
    step: number
    origin: number
    focus: boolean
}) {
    const distance = useTransform(x, (value) => {
        if (!focus || step === 0) return 0
        const center = origin + index * step + (step - 22) / 2 + value
        return Math.min(1, Math.abs(center - window.innerWidth / 2) / (window.innerWidth * 0.55))
    })
    const opacity = useTransform(distance, [0, 1], [1, 0.4])
    const scale = useTransform(distance, [0, 1], [1, 0.93])
    const timeY = useTransform(distance, [0, 1], [0, 14])

    return (
        <motion.li className="day-slot" style={focus ? {opacity, scale} : undefined}>
            <motion.span className="day-time" style={focus ? {y: timeY} : undefined}>{slot.time}</motion.span>
            <h3 className="h3">{slot.title}</h3>
            <p>{slot.text}</p>
        </motion.li>
    )
}

/** La journée type défile à l'horizontale pendant que l'on descend. */
function DayTimeline() {
    const {day} = useI18n().t.seminaires
    const section = useRef<HTMLElement>(null)
    const track = useRef<HTMLOListElement>(null)
    const [distance, setDistance] = useState(0)
    const [step, setStep] = useState(0)
    const [origin, setOrigin] = useState(0)
    const {scrollYProgress} = useScroll({target: section, offset: ['start start', 'end end']})
    const smooth = useSpring(scrollYProgress, {stiffness: 120, damping: 30, mass: 0.4})
    const x = useTransform(smooth, [0, 1], [0, -distance])
    const progress = useTransform(smooth, [0, 1], ['0%', '100%'])

    useLayoutEffect(() => {
        const measure = () => {
            if (!track.current) return
            setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth + 48))
            const first = track.current.firstElementChild as HTMLElement | null
            setStep(window.innerWidth > 760 && first ? first.offsetWidth + 22 : 0)
            setOrigin(first?.offsetLeft ?? 0)
        }
        measure()
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
    }, [])

    return (
        <section ref={section} className="day" data-ambient="sand">
            <div className="day-sticky">
                <div className="day-head">
                    <p className="eyebrow">{day.eyebrow}</p>
                    <h2 className="h2">{day.title}</h2>
                    <div className="day-progress">
                        <motion.span style={{width: progress}}/>
                    </div>
                </div>
                <motion.ol ref={track} className="day-track" style={{x}}>
                    {day.slots.map((slot, i) => (
                        <DaySlot key={slot.time} slot={slot} index={i} x={x} step={step} origin={origin}
                                 focus={step > 0}/>
                    ))}
                </motion.ol>
            </div>
        </section>
    )
}

function Faq() {
    const {t} = useI18n()
    const [open, setOpen] = useState<number | null>(null)
    return (
        <section className="faq" data-ambient="mist">
            <SectionTitle eyebrow={t.ui.faqEyebrow}>{t.ui.faqTitle}</SectionTitle>
            <dl className="faq-list">
                {t.seminaires.faq.map((item, i) => (
                    <Reveal key={item.q} className="faq-item">
                        <dt>
                            <button type="button" aria-expanded={open === i}
                                    onClick={() => setOpen(open === i ? null : i)}>
                                {item.q}
                                <motion.span animate={{rotate: open === i ? 45 : 0}}><Plus/></motion.span>
                            </button>
                        </dt>
                        <AnimatePresence initial={false}>
                            {open === i && (
                                <motion.dd initial={{height: 0, opacity: 0}} animate={{height: 'auto', opacity: 1}}
                                           exit={{height: 0, opacity: 0}} transition={{duration: 0.5, ease: easeOut}}>
                                    <p>{item.a}</p>
                                </motion.dd>
                            )}
                        </AnimatePresence>
                    </Reveal>
                ))}
            </dl>
        </section>
    )
}

export function SeminairesPage() {
    const {t} = useI18n()
    return (
        <>
            <PageHero eyebrow={t.seminaires.eyebrow} lines={t.seminaires.title} intro={t.seminaires.intro}>
                <div className="hero-actions">
                    <Link to="/rendez-vous#prospects" className="btn btn-ink">{t.ui.seminarAudit} <ArrowRight/></Link>
                    <Link to="/contact?type=devis" className="btn btn-line">{t.ui.finalCtaQuote}</Link>
                </div>
            </PageHero>
            <Formats/>
            <DayTimeline/>
            <TimeRuler from={9} to={17}/>
            <Faq/>
            <FinalCta/>
        </>
    )
}
