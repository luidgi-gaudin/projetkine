import {type CSSProperties, useRef, useState} from 'react'
import {Link} from 'react-router'
import {
    AnimatePresence,
    motion,
    useMotionValue,
    useMotionValueEvent,
    useScroll,
    useSpring,
    useTransform,
} from 'motion/react'
import {HandDial, HeroDial} from '../../components/brand/Dial'
import {PillarIcon} from '../../components/brand/PillarIcon'
import {TimeRuler} from '../../components/brand/TimeRuler'
import {BreathPause} from '../../components/motion/BreathPause'
import {BreathWaves} from '../../components/motion/BreathWaves'
import {Magnetic} from '../../components/motion/Magnetic'
import {easeOut} from '../../components/motion/ease'
import {Marquee, Reveal, ScrollWords, SplitLines} from '../../components/motion/Reveal'
import {FinalCta, SectionTitle} from '../../components/site/Blocks'
import {ArrowRight, ArrowUpRight} from '../../components/ui/Icons'
import {useI18n} from '../../i18n/context'

function Hero() {
    const {t} = useI18n()
    const {home} = t
    const ref = useRef<HTMLElement>(null)
    const [pause, setPause] = useState(false)
    const {scrollYProgress} = useScroll({target: ref, offset: ['start start', 'end start']})
    const dialY = useTransform(scrollYProgress, [0, 1], ['0%', '22%'])
    const textY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%'])
    const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0])

    // Le cadran s'incline vers la souris, avec l'inertie d'un objet posé sur l'eau.
    const tiltX = useSpring(0, {stiffness: 50, damping: 16})
    const tiltY = useSpring(0, {stiffness: 50, damping: 16})

    return (
        <section ref={ref} className="home-hero" data-ambient="paper"
                 onPointerMove={(e) => {
                     if (e.pointerType !== 'mouse') return
                     const r = e.currentTarget.getBoundingClientRect()
                     tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 14)
                     tiltX.set(-((e.clientY - r.top) / r.height - 0.5) * 10)
                 }}
                 onPointerLeave={() => {
                     tiltX.set(0)
                     tiltY.set(0)
                 }}>
            <motion.div className="home-hero-waves" style={{opacity: fade}}><BreathWaves/></motion.div>
            <motion.div className="home-hero-text" style={{y: textY}}>
                <Reveal y={12}><p className="eyebrow">{home.eyebrow}</p></Reveal>
                <SplitLines lines={home.title} accent={home.accentWord} className="display-title display-xl"
                            delay={0.15}/>
                <Reveal delay={0.55}><p className="lede">{home.intro}</p></Reveal>
                <Reveal delay={0.7} className="hero-actions">
                    <Magnetic>
                        <Link to="/rendez-vous#prospects" className="btn btn-ink">
                            {home.primaryCta} <ArrowRight/>
                        </Link>
                    </Magnetic>
                    <Link to="/a-propos" className="btn btn-line">{home.secondaryCta}</Link>
                </Reveal>
            </motion.div>

            <motion.div className="home-hero-dial" style={{y: dialY}}
                        initial={{opacity: 0, scale: 0.94, rotate: -8}}
                        animate={{opacity: 1, scale: 1, rotate: 0}}
                        transition={{duration: 1.6, delay: 0.2, ease: easeOut}}>
                <motion.div className="hero-tilt" style={{rotateX: tiltX, rotateY: tiltY, transformPerspective: 1100}}>
                    <HeroDial/>
                </motion.div>
                <motion.button type="button" className="pause-trigger" onClick={() => setPause(true)}
                               initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 2.2, duration: 1}}>
                    <span className="pause-trigger-dot" aria-hidden="true"/>
                    {t.pause.cta}
                </motion.button>
            </motion.div>
            <BreathPause open={pause} onClose={() => setPause(false)}/>

            <motion.div className="scroll-cue" aria-hidden="true"
                        initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 1.6}}>
                <span>{t.ui.scroll}</span>
                <span className="scroll-cue-track">
                    <motion.span className="scroll-cue-line"
                                 animate={{y: ['-100%', '100%']}}
                                 transition={{duration: 2.2, repeat: Infinity, ease: 'easeInOut'}}/>
                </span>
            </motion.div>
        </section>
    )
}

function Pillars() {
    const {t} = useI18n()
    const {home} = t
    return (
        <section className="pillars" data-ambient="mist">
            <SectionTitle eyebrow={t.ui.pillarsEyebrow}>{t.ui.pillarsTitle}</SectionTitle>
            <ol className="pillar-list">
                {home.pillars.map((pillar, i) => (
                    <motion.li key={pillar.word} className="pillar"
                               initial="hidden" whileInView="shown" whileHover="hover"
                               viewport={{once: true, amount: 0.4}}
                               variants={{hidden: {opacity: 0, y: 28}, shown: {opacity: 1, y: 0}}}
                               transition={{duration: 1, ease: easeOut}}>
                        <span className="pillar-index">
                            <PillarIcon index={i}/>
                            {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="pillar-word">{pillar.word}</span>
                        <p className="pillar-text">{pillar.text}</p>
                    </motion.li>
                ))}
            </ol>
        </section>
    )
}

/** La méthode sur un cadran : l'aiguille saute d'une étape à l'autre au fil du scroll. */
function Method() {
    const {home} = useI18n().t
    const ref = useRef<HTMLElement>(null)
    const {steps} = home.method
    const {scrollYProgress} = useScroll({target: ref, offset: ['start start', 'end end']})
    const [active, setActive] = useState(0)
    const target = useMotionValue(0)
    const angle = useSpring(target, {stiffness: 90, damping: 16})

    useMotionValueEvent(scrollYProgress, 'change', (p) => {
        const index = Math.min(steps.length - 1, Math.max(0, Math.floor(p * steps.length)))
        if (index !== active) {
            setActive(index)
            target.set(index * 90)
        }
    })

    return (
        <section ref={ref} className="method" data-ambient="sand" style={{'--steps': steps.length} as CSSProperties}>
            <div className="method-sticky">
                <div className="method-dial">
                    <HandDial angle={angle} labels={steps.map((s) => s.short)} active={active}/>
                </div>
                <div className="method-copy">
                    <p className="eyebrow">{home.method.eyebrow}</p>
                    <h2 className="h2">{home.method.title}</h2>
                    <div className="method-step">
                        <AnimatePresence mode="wait">
                            <motion.div key={active}
                                        initial={{opacity: 0, y: 24, filter: 'blur(6px)'}}
                                        animate={{opacity: 1, y: 0, filter: 'blur(0px)'}}
                                        exit={{opacity: 0, y: -16, filter: 'blur(6px)'}}
                                        transition={{duration: 0.6, ease: easeOut}}>
                                <span className="method-hour">{steps[active].hour}h</span>
                                <h3 className="h3">{steps[active].title}</h3>
                                <p>{steps[active].text}</p>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                    <ol className="method-progress" aria-hidden="true">
                        {steps.map((s, i) => <li key={s.title} className={i <= active ? 'done' : ''}/>)}
                    </ol>
                </div>
            </div>

            {/* Version mobile : la méthode en liste simple */}
            <ol className="method-list">
                {steps.map((s) => (
                    <Reveal as="li" key={s.title}>
                        <span className="method-hour">{s.hour}h</span>
                        <h3 className="h3">{s.title}</h3>
                        <p>{s.text}</p>
                    </Reveal>
                ))}
            </ol>
        </section>
    )
}

function ForWhom() {
    const {home} = useI18n().t
    return (
        <section className="for-whom" data-ambient="paper">
            {home.forWhom.map((block, i) => (
                <Reveal key={block.title} delay={i * 0.12} className={`for-whom-card tone-${i}`}>
                    <h3 className="h3">{block.title}</h3>
                    <p>{block.text}</p>
                    <Link to={block.to} className="link-arrow">
                        {block.cta} <ArrowUpRight/>
                    </Link>
                </Reveal>
            ))}
        </section>
    )
}

function QuoteStatement() {
    const {home} = useI18n().t
    return (
        <section className="statement" data-ambient="mist">
            <SplitLines lines={[home.quote.title]} accent={home.quote.title.split(' ').pop()} as="h2"
                        className="display-title" inView/>
            <Reveal delay={0.2}><p className="lede">{home.quote.text}</p></Reveal>
            <Reveal delay={0.3}>
                <Link to="/contact?type=devis" className="btn btn-line">{home.quote.cta} <ArrowRight/></Link>
            </Reveal>
        </section>
    )
}

export function HomePage() {
    const {t} = useI18n()
    const {home} = t
    return (
        <>
            <Hero/>
            <Marquee words={home.marquee}/>
            <section className="manifesto" data-ambient="mist">
                <p className="eyebrow">{t.ui.whyEyebrow}</p>
                <ScrollWords text={home.manifesto} className="manifesto-text"/>
            </section>
            <Pillars/>
            <TimeRuler/>
            <Method/>
            <ForWhom/>
            <TimeRuler from={12} to={23}/>
            <QuoteStatement/>
            <FinalCta/>
        </>
    )
}
