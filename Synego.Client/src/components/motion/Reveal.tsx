import {type ReactNode, useRef} from 'react'
import {
    motion,
    type MotionValue,
    useAnimationFrame,
    useMotionValue,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform,
    useVelocity,
} from 'motion/react'
import {easeOut} from './ease'

/** Apparition douce à l'entrée dans l'écran (une seule fois). */
export function Reveal({children, delay = 0, y = 28, className, as = 'div'}: {
    children: ReactNode
    delay?: number
    y?: number
    className?: string
    as?: 'div' | 'section' | 'li' | 'article' | 'p'
}) {
    const Component = motion[as]
    return (
        <Component
            className={className}
            initial={{opacity: 0, y}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true, amount: 0.25}}
            transition={{duration: 1, delay, ease: easeOut}}
        >
            {children}
        </Component>
    )
}

/**
 * Titre révélé ligne par ligne, chaque ligne glissant hors d'un masque.
 * `accent` : mot mis en italique (la seule emphase typographique du site).
 */
export function SplitLines({lines, accent, as = 'h1', className, delay = 0, inView = false}: {
    lines: string[]
    accent?: string
    as?: 'h1' | 'h2' | 'p'
    className?: string
    delay?: number
    inView?: boolean
}) {
    const Tag = motion[as]
    const trigger = inView
        ? {whileInView: 'shown', viewport: {once: true, amount: 0.6}}
        : {animate: 'shown'}

    return (
        <Tag className={className} initial="hidden" {...trigger} aria-label={lines.join(' ')}>
            {lines.map((line, i) => (
                <span className="split-line" key={line + i} aria-hidden="true">
                    <motion.span
                        className="split-line-inner"
                        variants={{hidden: {y: '115%', rotate: 4}, shown: {y: '0%', rotate: 0}}}
                        transition={{duration: 1.3, delay: delay + i * 0.11, ease: easeOut}}
                    >
                        {accent && line.includes(accent)
                            ? <>{line.replace(accent, '')}<em>{accent}</em></>
                            : line}
                    </motion.span>
                </span>
            ))}
        </Tag>
    )
}

function ScrollWord({word, progress, range}: { word: string, progress: MotionValue<number>, range: [number, number] }) {
    // Chaque mot sort de la brume : flou et pâle, puis net.
    const opacity = useTransform(progress, range, [0.14, 1])
    const filter = useTransform(progress, range, ['blur(5px)', 'blur(0px)'])
    const y = useTransform(progress, range, [6, 0])
    return <motion.span className="scroll-word" style={{opacity, filter, y}}>{word} </motion.span>
}

/** Paragraphe dont les mots s'allument au fil du scroll, comme une lecture à voix basse. */
export function ScrollWords({text, className}: { text: string, className?: string }) {
    const ref = useRef<HTMLParagraphElement>(null)
    const {scrollYProgress} = useScroll({target: ref, offset: ['start 0.85', 'end 0.45']})
    const words = text.split(' ')

    return (
        <p ref={ref} className={className} aria-label={text}>
            <span aria-hidden="true">
                {words.map((word, i) => (
                    <ScrollWord key={i} word={word} progress={scrollYProgress}
                                range={[i / words.length, Math.min(1, (i + 2) / words.length)]}/>
                ))}
            </span>
        </p>
    )
}

const wrap = (min: number, max: number, v: number) => {
    const range = max - min
    return ((((v - min) % range) + range) % range) + min
}

/**
 * Bandeau de mots : dérive lentement, accélère quand on fait défiler la page
 * et change de sens avec le scroll, comme un courant.
 */
export function Marquee({words, baseVelocity = -1.6}: { words: string[], baseVelocity?: number }) {
    const reduce = useReducedMotion()
    const baseX = useMotionValue(0)
    const {scrollY} = useScroll()
    const velocity = useSpring(useVelocity(scrollY), {damping: 50, stiffness: 300})
    const factor = useTransform(velocity, [0, 1000], [0, 4], {clamp: false})
    const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`)
    const direction = useRef(1)

    useAnimationFrame((_, delta) => {
        if (reduce) return
        const f = factor.get()
        if (f < 0) direction.current = -1
        else if (f > 0) direction.current = 1
        const moveBy = direction.current * baseVelocity * (delta / 1000)
        baseX.set(baseX.get() + moveBy + moveBy * Math.abs(f))
    })

    const row = words.map((w) => (
        <span key={w} className="marquee-item">
            {w}<span className="marquee-dot" aria-hidden="true"/>
        </span>
    ))
    return (
        <div className="marquee" aria-label={words.join(', ')}>
            <motion.div className="marquee-track" style={{x}} aria-hidden="true">
                {row}{row}
            </motion.div>
        </div>
    )
}
