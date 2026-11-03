import {type ReactNode, useRef} from 'react'
import {motion, useSpring} from 'motion/react'

/** Le bouton se laisse attirer par la souris, puis revient en douceur (souris uniquement). */
export function Magnetic({children, strength = 0.28}: { children: ReactNode, strength?: number }) {
    const ref = useRef<HTMLSpanElement>(null)
    const spring = {stiffness: 150, damping: 15, mass: 0.4}
    const x = useSpring(0, spring)
    const y = useSpring(0, spring)

    return (
        <motion.span
            ref={ref}
            className="magnetic"
            style={{x, y}}
            onPointerMove={(e) => {
                if (e.pointerType !== 'mouse' || !ref.current) return
                const rect = ref.current.getBoundingClientRect()
                x.set((e.clientX - rect.left - rect.width / 2) * strength)
                y.set((e.clientY - rect.top - rect.height / 2) * strength * 1.2)
            }}
            onPointerLeave={() => {
                x.set(0)
                y.set(0)
            }}
        >
            {children}
        </motion.span>
    )
}
