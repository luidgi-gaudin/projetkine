import {type ReactNode, useEffect, useState} from 'react'
import {Link, useLocation} from 'react-router'
import {api} from '../../api/client'
import type {BookingType} from '../../api/types'
import {useAuth} from '../../auth/AuthContext'
import {DialLoader} from '../../components/brand/Dial'
import {BookingChooser} from '../../components/booking/BookingChooser'
import {Reveal} from '../../components/motion/Reveal'
import {scrollToTarget} from '../../components/motion/smoothScroll'
import {PageHero} from '../../components/site/Blocks'
import {useI18n} from '../../i18n/context'

function BookingSection({id, title, text, types, children}: {
    id: string
    title: string
    text: string
    types: BookingType[]
    children?: ReactNode
}) {
    return (
        <section id={id} className="booking-section" data-ambient={id === 'clients' ? 'sand' : 'paper'}>
            <Reveal className="booking-section-head">
                <h2 className="h2">{title}</h2>
                <p>{text}</p>
            </Reveal>
            {children}
            <BookingChooser types={types}/>
        </section>
    )
}

export function RendezVousPage() {
    const {user, profile, loading} = useAuth()
    const {t} = useI18n()
    const {rendezVous} = t
    const location = useLocation()
    const [types, setTypes] = useState<BookingType[] | null>(null)
    const [error, setError] = useState(false)

    // Rechargé quand le rôle change : un client signé voit apparaître les séances de suivi.
    useEffect(() => {
        if (loading) return
        api<BookingType[]>('/booking/types').then(setTypes).catch(() => setError(true))
    }, [loading, profile?.role])

    useEffect(() => {
        const target = location.hash && types ? document.querySelector<HTMLElement>(location.hash) : null
        if (target) scrollToTarget(target)
    }, [location.hash, types])

    const prospects = types?.filter((type) => type.audience === 'Prospect') ?? []
    const clients = types?.filter((type) => type.audience === 'Client') ?? []
    const signed = profile?.role === 'Client' || profile?.role === 'Coach'

    return (
        <>
            <PageHero eyebrow={rendezVous.eyebrow} lines={rendezVous.title} intro={rendezVous.intro}/>
            {error && <p className="notice notice-error page-notice">{t.booking.unavailable}</p>}
            {!types && !error && <DialLoader/>}
            {types && (
                <div className="booking">
                    <BookingSection id="prospects" title={rendezVous.prospects.title} text={rendezVous.prospects.text}
                                    types={prospects}/>
                    {clients.length > 0 && (
                        <BookingSection id="clients" title={rendezVous.clients.title} text={rendezVous.clients.text}
                                        types={clients}>
                            {!user && (
                                <p className="notice">
                                    {rendezVous.clients.loggedOut}{' '}
                                    <Link to="/connexion"
                                          state={{from: '/rendez-vous#clients'}}>{t.booking.login}</Link>
                                </p>
                            )}
                            {user && !signed && <p className="notice">{rendezVous.clients.notSigned}</p>}
                        </BookingSection>
                    )}
                </div>
            )}
        </>
    )
}
