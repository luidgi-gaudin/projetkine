import {useId} from 'react'
import {motion, type Variants} from 'motion/react'
import {easeInOut, easeOut} from '../motion/ease'

/*
 * Pictogrammes des quatre gestes. Ils se dessinent à l'entrée dans l'écran (variante « shown »)
 * et réagissent au survol de leur ligne (variante « hover », propagée par le parent).
 */

const draw: Variants = {
    hidden: {pathLength: 0, opacity: 0},
    shown: {pathLength: 1, opacity: 1, transition: {duration: 1.6, ease: easeOut}},
}

const CURVED = 'M28 6 C 21 16, 35 24, 28 32 C 21 40, 31 46, 28 50'
const STRAIGHT = 'M28 6 C 28 16, 28 24, 28 32 C 28 40, 28 46, 28 50'

function Posture() {
    return (
        <>
            {/* La colonne, légèrement courbée, se redresse au survol */}
            <motion.path
                variants={{
                    hidden: {pathLength: 0, opacity: 0, d: CURVED},
                    shown: {pathLength: 1, opacity: 1, d: CURVED, transition: {duration: 1.6, ease: easeOut}},
                    hover: {d: STRAIGHT, transition: {duration: 0.9, ease: easeInOut}},
                }}
            />
            {[14, 24, 34, 44].map((cy, i) => (
                <motion.circle key={cy} cx="28" cy={cy} r="1.8" className="pillar-icon-fill"
                               variants={{hidden: {scale: 0}, shown: {scale: 1, transition: {delay: 0.8 + i * 0.12}}}}/>
            ))}
        </>
    )
}

function Breathing() {
    return (
        <>
            {[8, 15, 22].map((r, i) => (
                <motion.circle key={r} cx="28" cy="28" r={r} variants={draw}
                               transition={{delay: i * 0.15}}/>
            ))}
            <motion.circle cx="28" cy="28" r="8" className="pillar-icon-soft"
                           animate={{scale: [1, 1.9, 1]}}
                           transition={{duration: 10, repeat: Infinity, ease: easeInOut}}/>
        </>
    )
}

const flow = (seconds: number): Variants => ({
    hidden: {pathLength: 0, opacity: 0, x: 0},
    shown: {pathLength: 1, opacity: 1, x: 0, transition: {duration: 1.6, ease: easeOut}},
    hover: {x: -32, transition: {duration: seconds, ease: 'linear', repeat: Infinity}},
})

function Movement() {
    const clip = useId().replace(/:/g, '')
    return (
        <g clipPath={`url(#${clip})`}>
            <clipPath id={clip}>
                <rect x="4" y="4" width="48" height="48" rx="4"/>
            </clipPath>
            <motion.path d="M-24 28 Q -16 18 -8 28 T 8 28 T 24 28 T 40 28 T 56 28 T 72 28 T 88 28"
                         variants={flow(1.6)}/>
            <motion.path d="M-24 38 Q -16 31 -8 38 T 8 38 T 24 38 T 40 38 T 56 38 T 72 38 T 88 38"
                         className="pillar-icon-soft-line"
                         variants={flow(2.4)}/>
        </g>
    )
}

function Recovery() {
    return (
        <>
            <motion.path d="M34 10 A 18 18 0 1 0 46 40 A 14 14 0 1 1 34 10 Z" variants={draw}/>
            {[[44, 14], [50, 24]].map(([x, y], i) => (
                <g key={x} className="pillar-twinkle" style={{animationDelay: `${i * 1.2}s`}}>
                    <motion.path d={`M${x} ${y - 3} V ${y + 3} M${x - 3} ${y} H ${x + 3}`} variants={draw}/>
                </g>
            ))}
        </>
    )
}

const icons = [Posture, Breathing, Movement, Recovery]

export function PillarIcon({index}: { index: number }) {
    const Icon = icons[index % icons.length]
    return (
        <svg width="56" height="56" viewBox="0 0 56 56" className="pillar-icon" fill="none" aria-hidden="true">
            <Icon/>
        </svg>
    )
}
