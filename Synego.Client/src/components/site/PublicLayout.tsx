import {useEffect, useRef, useState} from 'react'
import {useLocation, useOutlet} from 'react-router'
import {AnimatePresence, motion, useReducedMotion} from 'motion/react'
import {useI18n} from '../../i18n/context'
import {LogoMark} from '../brand/Dial'
import {easeInOut, easeOut} from '../motion/ease'
import {ScrollClock} from '../motion/ScrollClock'
import {lockScroll, scrollToTarget, startSmoothScroll, stopSmoothScroll} from '../motion/smoothScroll'
import {SiteFooter} from './SiteFooter'
import {SiteHeader} from './SiteHeader'

const INTRO_KEY = 'synego:intro-seen'

function readIntroSeen() {
    try {
        return sessionStorage.getItem(INTRO_KEY) === '1'
    } catch {
        return true
    }
}

/** Rideau d'ouverture (une fois par visite) : le logo se dessine, puis le rideau se lève. */
function IntroCurtain({onDone}: { onDone: () => void }) {
    return (
        <motion.div
            className="intro-curtain"
            initial={{y: 0}}
            animate={{y: '-100%'}}
            transition={{delay: 1.5, duration: 1, ease: easeInOut}}
            onAnimationComplete={onDone}
        >
            <motion.div initial={{opacity: 0, scale: 0.92}} animate={{opacity: 1, scale: 1}}
                        transition={{duration: 0.8, ease: easeOut}}>
                <LogoMark size={96} animated/>
            </motion.div>
        </motion.div>
    )
}

/**
 * Suit la section au centre de l'écran et teinte doucement le fond du site
 * (ivoire, brume bleutée, sable) : la page change d'ambiance comme la lumière dans la journée.
 */
function AmbientWatcher() {
    const ref = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        const site = document.querySelector<HTMLElement>('.site')
        const page = ref.current?.parentElement
        if (!site || !page) return
        site.dataset.ambient = 'paper'
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) site.dataset.ambient = (entry.target as HTMLElement).dataset.ambient
            }
        }, {rootMargin: '-50% 0px -50% 0px'})
        page.querySelectorAll('[data-ambient]').forEach((el) => observer.observe(el))
        return () => observer.disconnect()
    }, [])

    return <span ref={ref} hidden/>
}

export function PublicLayout() {
    const location = useLocation()
    const outlet = useOutlet()
    const reduce = useReducedMotion()
    const {t} = useI18n()
    const [intro, setIntro] = useState(() => !reduce && !readIntroSeen())

    useEffect(() => {
        startSmoothScroll()
        return stopSmoothScroll
    }, [])

    useEffect(() => {
        lockScroll(intro)
    }, [intro])

    const finishIntro = () => {
        try {
            sessionStorage.setItem(INTRO_KEY, '1')
        } catch {
            // stockage indisponible : le rideau réapparaîtra, sans gravité
        }
        setIntro(false)
    }

    return (
        <div className="site">
            <a href="#contenu" className="skip-link">{t.ui.skip}</a>
            {intro && <IntroCurtain onDone={finishIntro}/>}
            <SiteHeader/>
            <AnimatePresence mode="wait" initial={false} onExitComplete={() => scrollToTarget(0, true)}>
                <motion.main
                    id="contenu"
                    key={location.pathname}
                    className="site-main"
                    initial={{opacity: 0, y: 24, filter: 'blur(6px)'}}
                    animate={{opacity: 1, y: 0, filter: 'blur(0px)'}}
                    exit={{opacity: 0, y: -12, filter: 'blur(6px)'}}
                    transition={{duration: 0.6, ease: easeOut}}
                >
                    {outlet}
                    <AmbientWatcher/>
                </motion.main>
            </AnimatePresence>
            <SiteFooter/>
            <ScrollClock/>
            <div className="grain" aria-hidden="true"/>
        </div>
    )
}
