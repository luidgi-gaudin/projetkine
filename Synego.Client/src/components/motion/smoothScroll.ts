import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

/*
 * Défilement fluide (inertie douce) sur la vitrine uniquement.
 * Désactivé si l'utilisateur a demandé à réduire les animations ; au doigt, le défilement natif est conservé.
 */

let lenis: Lenis | null = null

export function startSmoothScroll() {
    if (lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    lenis = new Lenis({autoRaf: true, lerp: 0.085, wheelMultiplier: 0.9, anchors: {offset: -90}})
}

export function stopSmoothScroll() {
    lenis?.destroy()
    lenis = null
}

/** Bloque le défilement (menu, pause respiration) sans faire sauter la page. */
export function lockScroll(locked: boolean) {
    if (locked) lenis?.stop()
    else lenis?.start()
    document.documentElement.style.overflow = locked ? 'hidden' : ''
}

export function scrollToTarget(target: HTMLElement | number, immediate = false) {
    if (lenis) {
        lenis.scrollTo(target, {immediate, offset: typeof target === 'number' ? 0 : -90, duration: 1.4})
    } else if (typeof target === 'number') {
        window.scrollTo(0, target)
    } else {
        target.scrollIntoView({behavior: immediate ? 'auto' : 'smooth'})
    }
}
