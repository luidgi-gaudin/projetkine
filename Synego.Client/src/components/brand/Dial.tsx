import {useEffect, useId, useState} from 'react'
import {AnimatePresence, motion, type MotionValue, useReducedMotion} from 'motion/react'
import {useI18n} from '../../i18n/context'
import {BREATH_SECONDS, easeInOut, easeOut} from '../motion/ease'

/* Géométrie du logo (viewBox 0 0 100 100) : un diamant dans un cadran à 12 graduations. */
const crownFacets = [
    {points: '32,44 38,54.8 21.4,54.8', tone: 'light'},
    {points: '32,44 50,44 38,54.8', tone: 'mid'},
    {points: '50,44 62,54.8 38,54.8', tone: 'light'},
    {points: '50,44 68,44 62,54.8', tone: 'mid'},
    {points: '68,44 78.6,54.8 62,54.8', tone: 'light'},
]
const pavilionFacets = [
    {points: '21.4,54.8 38,54.8 50,88', tone: 'mid'},
    {points: '38,54.8 50,54.8 50,88', tone: 'light'},
    {points: '50,54.8 62,54.8 50,88', tone: 'mid'},
    {points: '62,54.8 78.6,54.8 50,88', tone: 'light'},
]
const facets = [...crownFacets, ...pavilionFacets]
const diamondOutline = 'M32 44 H68 L78.6 54.8 L50 88 L21.4 54.8 Z'
const diamondLines = 'M21.4 54.8 H78.6 M32 44 L38 54.8 L50 44 L62 54.8 L68 44 M38 54.8 L50 88 M62 54.8 L50 88'
const sparkle = 'M50 21 L51.1 31.9 L65 33 L51.1 34.1 L50 42 L48.9 34.1 L35 33 L48.9 31.9 Z'

const hourTicks = Array.from({length: 12}, (_, i) => i * 30)

function polar(angle: number, radius: number, center = 50) {
    const rad = ((angle - 90) * Math.PI) / 180
    return {x: center + radius * Math.cos(rad), y: center + radius * Math.sin(rad)}
}

function Diamond({clipId}: { clipId?: string }) {
    return (
        <g>
            {facets.map((f) => (
                <polygon key={f.points} points={f.points} className={`facet facet-${f.tone}`}/>
            ))}
            {clipId && (
                <g clipPath={`url(#${clipId})`}>
                    <motion.rect
                        className="facet-shine"
                        x={-30} y={40} width={14} height={52}
                        transform="skewX(-20)"
                        animate={{x: [-30, 120]}}
                        transition={{duration: 2.4, ease: easeInOut, repeat: Infinity, repeatDelay: 4.5}}
                    />
                </g>
            )}
            <path d={diamondLines} className="diamond-line"/>
            <path d={diamondOutline} className="diamond-line"/>
        </g>
    )
}

/** Logo Synégo. `animated` : les graduations se dessinent et l'éclat scintille. */
export function LogoMark({size = 40, animated = false, title = 'Synégo'}: {
    size?: number
    animated?: boolean
    title?: string
}) {
    const reduce = useReducedMotion()
    const play = animated && !reduce
    const clipId = useId().replace(/:/g, '')

    return (
        <svg width={size} height={size} viewBox="0 0 100 100" className="logo-mark" role="img" aria-label={title}>
            <defs>
                <clipPath id={clipId}>
                    <path d={diamondOutline}/>
                </clipPath>
            </defs>
            <motion.circle
                cx="50" cy="50" r="44" className="dial-ring"
                initial={play ? {pathLength: 0, rotate: -90} : false}
                animate={{pathLength: 1, rotate: 0}}
                transition={{duration: 1.4, ease: easeOut}}
                style={{transformBox: 'view-box', originX: '50px', originY: '50px'}}
            />
            {hourTicks.map((angle, i) => {
                const a = polar(angle, 36.5)
                const b = polar(angle, 41.5)
                return (
                    <motion.line
                        key={angle} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="dial-tick"
                        initial={play ? {opacity: 0} : false}
                        animate={{opacity: 1}}
                        transition={{delay: 0.4 + i * 0.05, duration: 0.3}}
                    />
                )
            })}
            <Diamond clipId={animated ? clipId : undefined}/>
            <motion.path
                d={sparkle} className="sparkle"
                style={{transformBox: 'view-box', originX: '50px', originY: '33px'}}
                animate={play ? {scale: [1, 0.72, 1], rotate: [0, 45, 90], opacity: [1, 0.65, 1]} : undefined}
                transition={{duration: 3.2, ease: easeInOut, repeat: Infinity, repeatDelay: 2.4}}
            />
        </svg>
    )
}

/**
 * Le grand cadran du hero : l'anneau des minutes tourne lentement, une aiguille fait le tour
 * en une minute, et un cercle respire au rythme de la cohérence cardiaque (5 s / 5 s).
 */
export function HeroDial() {
    const reduce = useReducedMotion()
    const {t} = useI18n()
    const [phase, setPhase] = useState<'in' | 'out'>('in')
    const clipId = useId().replace(/:/g, '')

    useEffect(() => {
        if (reduce) return
        const timer = setInterval(() => setPhase((p) => (p === 'in' ? 'out' : 'in')), BREATH_SECONDS * 1000)
        return () => clearInterval(timer)
    }, [reduce])

    return (
        <div className="hero-dial">
            <svg viewBox="0 0 400 400" className="hero-dial-svg" aria-hidden="true">
                <defs>
                    <clipPath id={clipId}>
                        <path d={diamondOutline}/>
                    </clipPath>
                    <radialGradient id={`${clipId}-halo`}>
                        <stop offset="0%" stopColor="var(--diamond)" stopOpacity="0.95"/>
                        <stop offset="70%" stopColor="var(--diamond)" stopOpacity="0.35"/>
                        <stop offset="100%" stopColor="var(--diamond)" stopOpacity="0"/>
                    </radialGradient>
                </defs>

                <circle cx="200" cy="200" r="196" className="hero-ring-outer"/>

                {/* Anneau des minutes : 60 graduations, une révolution toutes les 2 minutes */}
                <motion.g
                    style={{transformBox: 'view-box', originX: '200px', originY: '200px'}}
                    animate={reduce ? undefined : {rotate: 360}}
                    transition={{duration: 120, ease: 'linear', repeat: Infinity}}
                >
                    {Array.from({length: 60}, (_, i) => {
                        const major = i % 5 === 0
                        const a = polar(i * 6, major ? 162 : 170, 200)
                        const b = polar(i * 6, 180, 200)
                        return (
                            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                                  className={major ? 'hero-tick major' : 'hero-tick'}/>
                        )
                    })}
                </motion.g>

                {/* Respiration */}
                <motion.circle
                    cx="200" cy="200" r="132" fill={`url(#${clipId}-halo)`}
                    style={{transformBox: 'view-box', originX: '200px', originY: '200px'}}
                    initial={{scale: 0.62}}
                    animate={reduce ? {scale: 0.85} : {scale: phase === 'in' ? 1 : 0.62}}
                    transition={{duration: BREATH_SECONDS, ease: easeInOut}}
                />
                <motion.circle
                    cx="200" cy="200" r="132" className="hero-breath-line"
                    style={{transformBox: 'view-box', originX: '200px', originY: '200px'}}
                    initial={{scale: 0.62}}
                    animate={reduce ? {scale: 0.85} : {scale: phase === 'in' ? 1 : 0.62}}
                    transition={{duration: BREATH_SECONDS, ease: easeInOut}}
                />

                {/* Aiguille : un tour par minute */}
                <motion.line
                    x1="200" y1="214" x2="200" y2="52" className="hero-hand"
                    style={{transformBox: 'view-box', originX: '200px', originY: '200px'}}
                    animate={reduce ? undefined : {rotate: 360}}
                    transition={{duration: 60, ease: 'linear', repeat: Infinity}}
                />
                <circle cx="200" cy="200" r="4" className="hero-hand-pin"/>

                <g transform="translate(105 96) scale(1.9)">
                    <Diamond clipId={clipId}/>
                    <motion.path
                        d={sparkle} className="sparkle"
                        style={{transformBox: 'view-box', originX: '50px', originY: '33px'}}
                        animate={reduce ? undefined : {scale: [1, 0.7, 1], rotate: [0, 45, 90]}}
                        transition={{duration: 3.6, ease: easeInOut, repeat: Infinity, repeatDelay: 1.8}}
                    />
                </g>
            </svg>

            <div className="hero-breath-label" aria-live="off">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                        key={reduce ? 'static' : phase}
                        initial={{opacity: 0, y: 6, filter: 'blur(4px)'}}
                        animate={{opacity: 1, y: 0, filter: 'blur(0px)'}}
                        exit={{opacity: 0, y: -6, filter: 'blur(4px)'}}
                        transition={{duration: 0.8, ease: easeOut}}
                    >
                        {reduce ? t.ui.breathFree : phase === 'in' ? t.ui.breathIn : t.ui.breathOut}
                    </motion.span>
                </AnimatePresence>
                <small>{t.ui.breathCaption}</small>
            </div>
        </div>
    )
}

/** Cadran dont l'aiguille est pilotée de l'extérieur (méthode, progression de lecture). */
export function HandDial({angle, size = 320, labels, active}: {
    angle: MotionValue<number>
    size?: number
    labels?: string[]
    active?: number
}) {
    return (
        <svg width={size} height={size} viewBox="0 0 400 400" className="hand-dial" aria-hidden="true">
            <circle cx="200" cy="200" r="190" className="hand-dial-ring"/>
            {Array.from({length: 60}, (_, i) => {
                const major = i % 15 === 0
                const a = polar(i * 6, major ? 158 : 172, 200)
                const b = polar(i * 6, 182, 200)
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                             className={major ? 'hero-tick major' : 'hero-tick'}/>
            })}
            {labels?.map((label, i) => {
                const p = polar(i * 90, 104, 200)
                return (
                    <text key={label} x={p.x} y={p.y} className={`hand-dial-label${active === i ? ' active' : ''}`}
                          textAnchor="middle" dominantBaseline="central">
                        {label}
                    </text>
                )
            })}
            <motion.g style={{rotate: angle, transformBox: 'view-box', originX: '200px', originY: '200px'}}>
                <line x1="200" y1="200" x2="200" y2="128" className="hand-dial-hand"/>
                <circle cx="200" cy="124" r="6" className="hand-dial-tip"/>
            </motion.g>
            <circle cx="200" cy="200" r="6" className="hero-hand-pin"/>
        </svg>
    )
}

/** Petit indicateur de chargement : les graduations s'allument tour à tour. */
export function DialLoader({label}: { label?: string }) {
    const {t} = useI18n()
    return (
        <div className="dial-loader" role="status">
            <svg width="44" height="44" viewBox="0 0 100 100" aria-hidden="true">
                {hourTicks.map((angle, i) => {
                    const a = polar(angle, 30)
                    const b = polar(angle, 44)
                    return (
                        <motion.line
                            key={angle} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="dial-tick"
                            animate={{opacity: [0.15, 1, 0.15]}}
                            transition={{duration: 1.2, repeat: Infinity, delay: i * 0.1, ease: 'linear'}}
                        />
                    )
                })}
            </svg>
            <span className="sr-only">{label ?? t.ui.loading}…</span>
        </div>
    )
}
