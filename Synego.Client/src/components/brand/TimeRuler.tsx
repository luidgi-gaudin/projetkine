import {useRef} from 'react'
import {motion, useScroll, useSpring, useTransform} from 'motion/react'

/**
 * La règle du temps : le cadran Synégo « déroulé » à plat, de 08:00 à 19:00.
 * Elle sépare les grandes sections ; un petit diamant avance le long des heures au fil du scroll.
 */
export function TimeRuler({from = 8, to = 19}: { from?: number, to?: number }) {
    const ref = useRef<HTMLDivElement>(null)
    const {scrollYProgress} = useScroll({target: ref, offset: ['start 0.95', 'end 0.25']})
    const progress = useSpring(scrollYProgress, {stiffness: 70, damping: 22, mass: 0.6})
    const left = useTransform(progress, [0, 1], ['0%', '100%'])
    const hours = Array.from({length: to - from + 1}, (_, i) => from + i)
    const quarters = (hours.length - 1) * 4

    return (
        <div ref={ref} className="time-ruler" aria-hidden="true">
            <div className="time-ruler-track">
                {Array.from({length: quarters + 1}, (_, i) => (
                    <span key={i} className={`time-ruler-tick${i % 4 === 0 ? ' is-hour' : ''}`}
                          style={{left: `${(i / quarters) * 100}%`}}/>
                ))}
                {hours.map((hour, i) => (
                    <span key={hour} className="time-ruler-label" style={{left: `${(i / (hours.length - 1)) * 100}%`}}>
                        {String(hour).padStart(2, '0')}:00
                    </span>
                ))}
                <motion.span className="time-ruler-fill" style={{scaleX: progress}}/>
                <motion.span className="time-ruler-marker" style={{left}}>
                    <svg viewBox="0 0 24 24" width="22" height="22">
                        <path
                            d="M6 7 H18 L22 11 L12 22 L2 11 Z M2 11 H22 M6 7 L8.5 11 L12 7 L15.5 11 L18 7 M8.5 11 L12 22 M15.5 11 L12 22"/>
                    </svg>
                </motion.span>
            </div>
        </div>
    )
}
