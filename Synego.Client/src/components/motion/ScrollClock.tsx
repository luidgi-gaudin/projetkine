import {motion, useScroll, useSpring, useTransform} from 'motion/react'

/** Petit cadran fixe : son aiguille fait un tour complet entre le haut et le bas de la page. */
export function ScrollClock() {
    const {scrollYProgress} = useScroll()
    const smooth = useSpring(scrollYProgress, {stiffness: 80, damping: 24, mass: 0.6})
    const rotate = useTransform(smooth, [0, 1], [0, 360])
    const dash = useTransform(smooth, [0, 1], [0, 1])

    return (
        <div className="scroll-clock" aria-hidden="true">
            <svg viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="27" className="scroll-clock-ring"/>
                <motion.circle
                    cx="30" cy="30" r="27" className="scroll-clock-progress"
                    style={{pathLength: dash, rotate: -90, transformBox: 'view-box', originX: '30px', originY: '30px'}}
                />
                {Array.from({length: 12}, (_, i) => (
                    <line key={i} x1="30" y1="7" x2="30" y2={i % 3 === 0 ? 12 : 10}
                          transform={`rotate(${i * 30} 30 30)`} className="scroll-clock-tick"/>
                ))}
                <motion.line x1="30" y1="30" x2="30" y2="11" className="scroll-clock-hand"
                             style={{rotate, transformBox: 'view-box', originX: '30px', originY: '30px'}}/>
                <circle cx="30" cy="30" r="2" className="scroll-clock-pin"/>
            </svg>
        </div>
    )
}
