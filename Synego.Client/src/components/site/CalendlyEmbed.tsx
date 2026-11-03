import {useEffect, useMemo, useState} from 'react'
import {motion} from 'motion/react'
import {api, json} from '../../api/client'
import type {Appointment} from '../../api/types'
import {AddToCalendar} from '../booking/AddToCalendar'
import {useI18n} from '../../i18n/context'
import {useTheme} from '../../theme/theme'
import {DialLoader} from '../brand/Dial'
import {easeOut} from '../motion/ease'
import {Check} from '../ui/Icons'

type CalendlyMessage = {
    event?: string
    payload?: { invitee?: { uri?: string } }
}

/**
 * Calendly intégré en iframe (aucun script tiers chargé sur notre page).
 * Après réservation, Calendly envoie `calendly.event_scheduled` : on prévient l'API,
 * qui relit la réservation chez Calendly et la range dans l'espace client.
 */
export function CalendlyEmbed({url, name, email, onConfirmed}: {
    url: string
    name?: string | null
    email?: string | null
    /** Appelé quand l'API a enregistré le rendez-vous (heure, lien Meet…). */
    onConfirmed?: (appointment: Appointment) => void
}) {
    const {t, locale} = useI18n()
    const {theme} = useTheme()
    const [appointment, setAppointment] = useState<Appointment | null>(null)
    const [loaded, setLoaded] = useState(false)
    const [booked, setBooked] = useState(false)

    const src = useMemo(() => {
        const target = new URL(url)
        const dark = theme === 'dark'
        target.searchParams.set('embed_domain', window.location.host)
        target.searchParams.set('embed_type', 'Inline')
        target.searchParams.set('hide_gdpr_banner', '1')
        target.searchParams.set('hide_landing_page_details', '1')
        // Couleurs appliquées par Calendly sur les offres payantes (ignorées en gratuit).
        target.searchParams.set('background_color', dark ? '10284a' : 'f7f1e9')
        target.searchParams.set('text_color', dark ? 'f2e8dc' : '0a1d35')
        target.searchParams.set('primary_color', dark ? '6caed6' : '0a1d35')
        if (name) target.searchParams.set('name', name)
        if (email) target.searchParams.set('email', email)
        return target.toString()
    }, [url, name, email, theme])

    useEffect(() => {
        const onMessage = (e: MessageEvent<CalendlyMessage>) => {
            if (e.origin !== 'https://calendly.com' || e.data?.event !== 'calendly.event_scheduled') return
            setBooked(true)
            const inviteeUri = e.data.payload?.invitee?.uri
            if (inviteeUri) {
                api<Appointment | undefined>('/booking/confirm', {method: 'POST', body: json({inviteeUri, locale})})
                    .then((result) => {
                        setAppointment(result ?? null)
                        if (result) onConfirmed?.(result)
                    })
                    .catch(() => undefined)
            }
        }
        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
    }, [locale, onConfirmed])

    return (
        <div className="calendly">
            {!loaded && <div className="calendly-loading"><DialLoader/></div>}
            <iframe key={src} src={src} title={t.booking.iframeTitle} onLoad={() => setLoaded(true)}
                    className={loaded ? 'is-loaded' : ''}/>
            {booked && (
                <motion.p className="calendly-done" initial={{opacity: 0, y: 12}} animate={{opacity: 1, y: 0}}
                          transition={{duration: 0.6, ease: easeOut}}>
                    <Check/> {t.booking.booked}
                </motion.p>
            )}
            {appointment && (
                <div className="calendly-calendar">
                    <AddToCalendar event={{
                        id: appointment.id,
                        title: `${t.booking.types[appointment.typeKey]?.title ?? appointment.title} · Synégo`,
                        start: appointment.startsAt,
                        end: appointment.endsAt,
                        url: appointment.meetingUrl,
                        location: appointment.location,
                    }}/>
                </div>
            )}
        </div>
    )
}
