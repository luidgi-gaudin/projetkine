import {useEffect, useRef} from 'react'
import {useReducedMotion} from 'motion/react'
import {useTheme} from '../../theme/theme'
import {BREATH_SECONDS} from './ease'

/**
 * Surface d'eau : des lignes fines ondulent au rythme de la respiration (5 s / 5 s, même horloge
 * que le cadran). Sous la souris, l'eau frémit doucement. Pause automatique hors écran.
 */
export function BreathWaves({lines = 18, className}: { lines?: number, className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const {theme} = useTheme()
    const reduce = useReducedMotion()

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return

        const styles = getComputedStyle(document.documentElement)
        const cool = styles.getPropertyValue('--sky').trim() || '#6caed6'
        const warm = styles.getPropertyValue('--warm').trim() || '#b49a78'
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        let width = 0
        let height = 0

        const resize = () => {
            const rect = canvas.getBoundingClientRect()
            width = rect.width
            height = rect.height
            canvas.width = Math.round(width * dpr)
            canvas.height = Math.round(height * dpr)
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }
        resize()
        const resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(canvas)

        // Le pointeur est lissé : l'eau suit la main avec un temps de retard, jamais brusquement.
        const pointer = {x: 0, y: 0, tx: 0, ty: 0, power: 0, target: 0, seen: false}
        const onMove = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse') return
            const rect = canvas.getBoundingClientRect()
            pointer.tx = e.clientX - rect.left
            pointer.ty = e.clientY - rect.top
            if (!pointer.seen) {
                pointer.x = pointer.tx
                pointer.y = pointer.ty
                pointer.seen = true
            }
            pointer.target = 1
        }
        const onLeave = () => {
            pointer.target = 0
        }
        window.addEventListener('pointermove', onMove)
        document.documentElement.addEventListener('pointerleave', onLeave)

        let visible = true
        const intersection = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting
        })
        intersection.observe(canvas)

        const start = performance.now()
        let frame = 0

        const draw = (now: number) => {
            const t = (now - start) / 1000
            // 0 → 1 pendant l'inspiration (5 s), 1 → 0 pendant l'expiration (5 s)
            const breath = reduce ? 0.5 : (1 - Math.cos((Math.PI * t) / BREATH_SECONDS)) / 2
            pointer.x += (pointer.tx - pointer.x) * 0.06
            pointer.y += (pointer.ty - pointer.y) * 0.06
            pointer.power += (pointer.target - pointer.power) * 0.04

            ctx.clearRect(0, 0, width, height)
            ctx.lineWidth = 1
            for (let i = 0; i < lines; i++) {
                const depth = i / (lines - 1)
                const baseY = height * (0.34 + depth * 0.66)
                const amplitude = (5 + depth * 20) * (0.55 + breath * 0.9)
                ctx.beginPath()
                for (let x = 0; x <= width + 8; x += 8) {
                    const dx = x - pointer.x
                    const dy = baseY - pointer.y
                    const ripple = pointer.power * 22
                        * Math.exp(-(dx * dx) / 38000 - (dy * dy) / 14000)
                        * Math.sin(dx * 0.03 - t * 2.4)
                    const y = baseY
                        + Math.sin(x * 0.0042 + t * 0.32 + i * 0.47) * amplitude
                        + Math.sin(x * 0.011 - t * 0.21 + i * 1.3) * amplitude * 0.32
                        + ripple
                    if (x === 0) ctx.moveTo(x, y)
                    else ctx.lineTo(x, y)
                }
                ctx.strokeStyle = i % 4 === 2 ? warm : cool
                ctx.globalAlpha = 0.08 + depth * 0.26
                ctx.stroke()
            }
            ctx.globalAlpha = 1
        }

        const loop = (now: number) => {
            frame = requestAnimationFrame(loop)
            if (visible && !document.hidden) draw(now)
        }
        if (reduce) draw(start)
        else frame = requestAnimationFrame(loop)

        return () => {
            cancelAnimationFrame(frame)
            resizeObserver.disconnect()
            intersection.disconnect()
            window.removeEventListener('pointermove', onMove)
            document.documentElement.removeEventListener('pointerleave', onLeave)
        }
    }, [lines, reduce, theme])

    return <canvas ref={canvasRef} className={`breath-waves ${className ?? ''}`} aria-hidden="true"/>
}
