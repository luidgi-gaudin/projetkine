import {useState} from 'react'
import {AnimatePresence, motion} from 'motion/react'
import {useI18n} from '../../i18n/context'
import {easeOut} from '../motion/ease'
import {Calendar} from '../ui/Icons'
import {type CalendarEvent, downloadIcs, googleCalendarUrl, outlookCalendarUrl} from './calendar'

/** « Ajouter à mon agenda » : Google, Outlook, Apple, Samsung et tous les agendas compatibles .ics. */
export function AddToCalendar({event, compact = false}: { event: CalendarEvent, compact?: boolean }) {
    const {t} = useI18n()
    const [open, setOpen] = useState(!compact)

    const options = [
        {label: 'Google Agenda', href: googleCalendarUrl(event)},
        {label: 'Apple Calendar', ics: true},
        {label: 'Outlook', href: outlookCalendarUrl(event)},
        {label: 'Samsung Calendar', ics: true},
        {label: t.booking.calendarOther, ics: true},
    ]

    return (
        <div className={`add-calendar${compact ? ' is-compact' : ''}`}>
            {compact && (
                <button type="button" className="link-quiet add-calendar-toggle" aria-expanded={open}
                        onClick={() => setOpen((o) => !o)}>
                    <Calendar size={16}/> {t.booking.addToCalendar}
                </button>
            )}
            {!compact && <p className="add-calendar-title"><Calendar size={18}/> {t.booking.addToCalendar}</p>}
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div className="add-calendar-options"
                                initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}}
                                exit={{opacity: 0, height: 0}} transition={{duration: 0.45, ease: easeOut}}>
                        {options.map((option, i) => (
                            <motion.span key={option.label} initial={{opacity: 0, y: 8}} animate={{opacity: 1, y: 0}}
                                         transition={{delay: 0.05 * i, duration: 0.4, ease: easeOut}}>
                                {option.href
                                    ? <a className="chip-button" href={option.href} target="_blank"
                                         rel="noreferrer">{option.label}</a>
                                    : <button type="button" className="chip-button"
                                              onClick={() => downloadIcs(event)}>{option.label}</button>}
                            </motion.span>
                        ))}
                        {!compact && <p className="fine-print">{t.booking.calendarHint}</p>}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
