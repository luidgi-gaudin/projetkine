import {useState} from 'react'
import {AnimatePresence, motion} from 'motion/react'
import type {Appointment, BookingType} from '../../api/types'
import {useAuth} from '../../auth/AuthContext'
import {useI18n} from '../../i18n/context'
import {easeOut} from '../motion/ease'
import {CalendlyEmbed} from '../site/CalendlyEmbed'
import {ArrowRight, Lock} from '../ui/Icons'

function TypeChoice({type, selected, onSelect}: { type: BookingType, selected: boolean, onSelect: () => void }) {
    const {t} = useI18n()
    // Titre et résumé traduits côté front ; repli sur les textes de l'API (appsettings.json).
    const text = t.booking.types[type.key] ?? {title: type.title, summary: type.summary}

    return (
        <button type="button" className={`booking-choice${selected ? ' is-selected' : ''}`}
                onClick={onSelect} aria-pressed={selected} disabled={type.locked}>
            <span className="booking-choice-duration">{type.durationMinutes} {t.booking.minutes}</span>
            <span className="booking-choice-title">{text.title}</span>
            <span className="booking-choice-text">{text.summary}</span>
            <span className="booking-choice-cta">
                {type.locked
                    ? <><Lock size={16}/> {t.booking.clientsOnly}</>
                    : <>{t.booking.seeSlots} <ArrowRight size={16}/></>}
            </span>
        </button>
    )
}

/**
 * Choix du type de rendez-vous puis agenda Calendly, sans quitter la page.
 * Utilisé sur la page publique « Rendez-vous » et dans l'espace client.
 */
export function BookingChooser({types, preselect = null, onConfirmed}: {
    types: BookingType[]
    preselect?: string | null
    onConfirmed?: (appointment: Appointment) => void
}) {
    const {user, profile} = useAuth()
    const [selected, setSelected] = useState<string | null>(preselect)
    const current = types.find((type) => type.key === selected && type.calendlyUrl)

    return (
        <>
            <div className="booking-choices">
                {types.map((type) => (
                    <TypeChoice key={type.key} type={type} selected={selected === type.key}
                                onSelect={() => setSelected(selected === type.key ? null : type.key)}/>
                ))}
            </div>
            <AnimatePresence mode="wait">
                {current?.calendlyUrl && (
                    <motion.div key={current.key} className="booking-embed"
                                initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}}
                                exit={{opacity: 0, height: 0}} transition={{duration: 0.7, ease: easeOut}}>
                        <CalendlyEmbed url={current.calendlyUrl}
                                       name={profile?.displayName ?? user?.name}
                                       email={profile?.email ?? user?.email}
                                       onConfirmed={onConfirmed}/>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
