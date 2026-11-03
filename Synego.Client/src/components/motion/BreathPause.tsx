import {useEffect, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {Link} from 'react-router'
import {AnimatePresence, motion, useReducedMotion} from 'motion/react'
import {useI18n} from '../../i18n/context'
import {Close} from '../ui/Icons'
import {BREATH_SECONDS, easeInOut, easeOut} from './ease'
import {lockScroll} from './smoothScroll'

const CYCLES = 3
const INTRO_MS = 3500

type Phase = { kind: 'intro' } | { kind: 'in' | 'out', cycle: number } | { kind: 'outro' }

/**
 * Trente secondes de respiration guidée, en plein écran : 3 cycles de cohérence cardiaque.
 * Le cercle se gonfle et se vide, une onde part à chaque inspiration, l'anneau compte le temps.
 */
export function BreathPause({open, onClose}: { open: boolean, onClose: () => void }) {
    return createPortal(
        <AnimatePresence>{open && <PauseScreen onClose={onClose}/>}</AnimatePresence>,
        document.body,
    )
}

function PauseScreen({onClose}: { onClose: () => void }) {
    const {t, format} = useI18n()
    const reduce = useReducedMotion()
    const [phase, setPhase] = useState<Phase>({kind: 'intro'})
    const closeRef = useRef<HTMLButtonElement>(null)

    // Déroulé : intro, puis inspiration / expiration × 3, puis remerciement.
    useEffect(() => {
        const next = (): [Phase, number] | null => {
            switch (phase.kind) {
                case 'intro':
                    return [{kind: 'in', cycle: 1}, INTRO_MS]
                case 'in':
                    return [{kind: 'out', cycle: phase.cycle}, BREATH_SECONDS * 1000]
                case 'out':
                    return [phase.cycle < CYCLES ? {kind: 'in', cycle: phase.cycle + 1} : {kind: 'outro'},
                        BREATH_SECONDS * 1000]
                default:
                    return null
            }
        }
        const step = next()
        if (!step) return
        const timer = setTimeout(() => setPhase(step[0]), step[1])
        return () => clearTimeout(timer)
    }, [phase])

    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null
        lockScroll(true)
        closeRef.current?.focus()
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => {
            lockScroll(false)
            window.removeEventListener('keydown', onKey)
            previous?.focus()
        }
    }, [onClose])

    const breathing = phase.kind === 'in' || phase.kind === 'out'
    const scale = reduce ? 0.8 : phase.kind === 'in' ? 1 : phase.kind === 'outro' ? 0.7 : 0.56
    const label = phase.kind === 'intro' ? t.pause.intro
        : phase.kind === 'in' ? t.pause.inhale
            : phase.kind === 'out' ? t.pause.exhale : t.pause.outroTitle

    return (
        <motion.div className="pause" role="dialog" aria-modal="true" aria-label={t.pause.cta}
                    initial={{clipPath: 'circle(0% at 50% 50%)'}}
                    animate={{clipPath: 'circle(150% at 50% 50%)'}}
                    exit={{clipPath: 'circle(0% at 50% 50%)', transition: {duration: 0.9, ease: easeInOut}}}
                    transition={{duration: 1.3, ease: easeInOut}}>
            <button ref={closeRef} type="button" className="pause-close icon-button" onClick={onClose}
                    aria-label={t.pause.close}>
                <Close size={22}/>
            </button>

            <div className="pause-stage">
                <svg viewBox="0 0 400 400" className="pause-svg" aria-hidden="true">
                    <circle cx="200" cy="200" r="186" className="pause-track"/>
                    {/* Anneau de progression : 30 s pour les trois respirations */}
                    {phase.kind !== 'intro' && (
                        <motion.circle cx="200" cy="200" r="186" className="pause-progress"
                                       style={{
                                           rotate: -90,
                                           transformBox: 'view-box',
                                           originX: '200px',
                                           originY: '200px'
                                       }}
                                       initial={{pathLength: 0}}
                                       animate={{pathLength: 1}}
                                       transition={{duration: CYCLES * 2 * BREATH_SECONDS, ease: 'linear'}}/>
                    )}
                    {/* Une onde s'échappe à chaque inspiration */}
                    {phase.kind === 'in' && !reduce && (
                        <motion.circle key={phase.cycle} cx="200" cy="200" r="120" className="pause-ripple"
                                       style={{transformBox: 'view-box', originX: '200px', originY: '200px'}}
                                       initial={{scale: 0.6, opacity: 0.7}}
                                       animate={{scale: 1.55, opacity: 0}}
                                       transition={{duration: 3.2, ease: easeOut}}/>
                    )}
                    <motion.circle cx="200" cy="200" r="150" className="pause-orb"
                                   style={{transformBox: 'view-box', originX: '200px', originY: '200px'}}
                                   initial={{scale: 0.3, opacity: 0}}
                                   animate={{scale, opacity: 1}}
                                   transition={{
                                       duration: phase.kind === 'intro' ? 1.6 : BREATH_SECONDS,
                                       ease: easeInOut
                                   }}/>
                    <motion.circle cx="200" cy="200" r="150" className="pause-orb-line"
                                   style={{transformBox: 'view-box', originX: '200px', originY: '200px'}}
                                   initial={{scale: 0.3}}
                                   animate={{scale}}
                                   transition={{
                                       duration: phase.kind === 'intro' ? 1.6 : BREATH_SECONDS,
                                       ease: easeInOut
                                   }}/>
                </svg>

                <div className="pause-text" aria-live="polite">
                    <AnimatePresence mode="wait">
                        <motion.p key={phase.kind + ('cycle' in phase ? phase.cycle : '')}
                                  className={phase.kind === 'intro' ? 'pause-intro' : 'pause-word'}
                                  initial={{opacity: 0, y: 10, filter: 'blur(8px)'}}
                                  animate={{opacity: 1, y: 0, filter: 'blur(0px)'}}
                                  exit={{opacity: 0, y: -10, filter: 'blur(8px)'}}
                                  transition={{duration: 0.9, ease: easeOut}}>
                            {label}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>

            <div className="pause-foot">
                <AnimatePresence mode="wait">
                    {breathing && (
                        <motion.p key="count" className="pause-count" initial={{opacity: 0}} animate={{opacity: 1}}
                                  exit={{opacity: 0}}>
                            {format(t.pause.cycle, {n: phase.cycle, total: CYCLES})}
                        </motion.p>
                    )}
                    {phase.kind === 'outro' && (
                        <motion.div key="outro" className="pause-outro"
                                    initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}}
                                    transition={{duration: 1, delay: 0.4, ease: easeOut}}>
                            <p>{t.pause.outroText}</p>
                            <div className="pause-actions">
                                <Link to="/seminaires" className="btn btn-paper"
                                      onClick={onClose}>{t.pause.discover}</Link>
                                <button type="button" className="btn btn-ghost-light"
                                        onClick={onClose}>{t.pause.back}</button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}
