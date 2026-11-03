import {type ComponentType, lazy, type ReactNode, Suspense, useEffect, useState} from 'react'
import {Route, Routes} from 'react-router'
import {api} from './api/client'
import {useAuth} from './auth/AuthContext'
import {RequireAuth} from './auth/RequireAuth'
import {SpaceLayout, type SpaceNavItem} from './components/espace/SpaceLayout'
import {PublicLayout} from './components/site/PublicLayout'
import {Calendar, FileIcon, Home, LinkIcon, Lock, Message, UserIcon, Users} from './components/ui/Icons'
import {useI18n} from './i18n/context'
import {DialLoader} from './components/brand/Dial'
import type {Overview} from './pages/admin/AdminPages'
import {AccompagnementPage} from './pages/site/AccompagnementPage'
import {AProposPage} from './pages/site/AProposPage'
import {ContactPage} from './pages/site/ContactPage'
import {HomePage} from './pages/site/HomePage'
import {LegalPage, NotFoundPage} from './pages/site/LegalPage'
import {RendezVousPage} from './pages/site/RendezVousPage'
import {SeminairesPage} from './pages/site/SeminairesPage'

// Pages chargées à la demande : la vitrine reste légère, l'espace et le back-office arrivent ensuite.
function page<M>(loader: () => Promise<M>, name: keyof M) {
    return lazy(async () => ({default: (await loader())[name] as unknown as ComponentType}))
}

const auth = {login: () => import('./pages/auth/LoginPage'), register: () => import('./pages/auth/RegisterPage')}
const espace = () => import('./pages/espace/EspacePages')
const admin = () => import('./pages/admin/AdminPages')
const LoginPage = page(auth.login, 'LoginPage')
const RegisterPage = page(auth.register, 'RegisterPage')
const EspaceHomePage = page(espace, 'EspaceHomePage')
const EspaceAppointmentsPage = page(espace, 'EspaceAppointmentsPage')
const EspaceDocumentsPage = page(espace, 'EspaceDocumentsPage')
const EspaceRequestsPage = page(espace, 'EspaceRequestsPage')
const EspaceRequestDetailPage = page(espace, 'EspaceRequestDetailPage')
const EspaceProfilePage = page(espace, 'EspaceProfilePage')
const AdminTodayPage = page(admin, 'AdminTodayPage')
const AdminClientsPage = page(admin, 'AdminClientsPage')
const AdminAppointmentsPage = page(admin, 'AdminAppointmentsPage')
const AdminRequestsPage = page(admin, 'AdminRequestsPage')
const AdminRequestDetailPage = page(admin, 'AdminRequestDetailPage')
const AdminCoachesPage = page(admin, 'AdminCoachesPage')
const AdminCalendlyPage = page(() => import('./pages/admin/AdminCalendlyPage'), 'AdminCalendlyPage')

const Loading = ({children}: { children: ReactNode }) => <Suspense fallback={<DialLoader/>}>{children}</Suspense>

const adminNav: SpaceNavItem[] = [
    {to: '/admin', label: 'Aujourd\'hui', icon: Home, end: true},
    {to: '/admin/clients', label: 'Clients', icon: Users},
    {to: '/admin/rendez-vous', label: 'Rendez-vous', icon: Calendar},
    {to: '/admin/demandes', label: 'Demandes', icon: Message},
    {to: '/admin/calendly', label: 'Calendly', icon: LinkIcon},
    {to: '/admin/coachs', label: 'Coachs', icon: Lock},
    {to: '/espace', label: 'Mon espace', icon: UserIcon},
]

/** Back-office : pastilles « à traiter » (demandes nouvelles, alertes) mises à jour chaque minute. */
function CoachShell() {
    const [counts, setCounts] = useState<{ newTickets: number, alerts: number } | null>(null)

    useEffect(() => {
        const load = () => api<Overview>('/admin/overview').then(setCounts).catch(() => undefined)
        load()
        const timer = setInterval(load, 60_000)
        return () => clearInterval(timer)
    }, [])

    const nav = adminNav.map((item) => ({
        ...item,
        badge: item.to === '/admin/demandes' ? counts?.newTickets
            : item.to === '/admin/rendez-vous' ? counts?.alerts : undefined,
    }))
    return <SpaceLayout nav={nav} badge="Coach"/>
}

export default function App() {
    const {t} = useI18n()
    const {profile} = useAuth()

    const espaceNav: SpaceNavItem[] = [
        {to: '/espace', label: t.espace.nav.home, icon: Home, end: true},
        {to: '/espace/rendez-vous', label: t.espace.nav.appointments, icon: Calendar},
        {to: '/espace/documents', label: t.espace.nav.documents, icon: FileIcon},
        {to: '/espace/demandes', label: t.espace.nav.requests, icon: Message},
        {to: '/espace/profil', label: t.espace.nav.profile, icon: UserIcon},
        ...(profile?.role === 'Coach' ? [{to: '/admin', label: t.espace.nav.admin, icon: Lock}] : []),
    ]

    return (
        <Routes>
            {/* Site vitrine */}
            <Route element={<PublicLayout/>}>
                <Route index element={<HomePage/>}/>
                <Route path="seminaires" element={<SeminairesPage/>}/>
                <Route path="accompagnement" element={<AccompagnementPage/>}/>
                <Route path="a-propos" element={<AProposPage/>}/>
                <Route path="rendez-vous" element={<RendezVousPage/>}/>
                <Route path="contact" element={<ContactPage/>}/>
                <Route path="mentions-legales" element={<LegalPage page="mentions"/>}/>
                <Route path="confidentialite" element={<LegalPage page="privacy"/>}/>
                <Route path="*" element={<NotFoundPage/>}/>
            </Route>

            {/* Connexion : e-mail + mot de passe, SMS ou Google (Firebase Auth) */}
            <Route path="connexion" element={<Loading><LoginPage/></Loading>}/>
            <Route path="inscription" element={<Loading><RegisterPage/></Loading>}/>

            {/* Espace client sécurisé */}
            <Route path="espace" element={<RequireAuth><SpaceLayout nav={espaceNav}/></RequireAuth>}>
                <Route index element={<EspaceHomePage/>}/>
                <Route path="rendez-vous" element={<EspaceAppointmentsPage/>}/>
                <Route path="documents" element={<EspaceDocumentsPage/>}/>
                <Route path="demandes" element={<EspaceRequestsPage/>}/>
                <Route path="demandes/:id" element={<EspaceRequestDetailPage/>}/>
                <Route path="profil" element={<EspaceProfilePage/>}/>
            </Route>

            {/* Back-office : rôle Admin + VPN en production */}
            <Route path="admin"
                   element={<RequireAuth role="Coach"><CoachShell/></RequireAuth>}>
                <Route index element={<AdminTodayPage/>}/>
                <Route path="clients" element={<AdminClientsPage/>}/>
                <Route path="rendez-vous" element={<AdminAppointmentsPage/>}/>
                <Route path="demandes" element={<AdminRequestsPage/>}/>
                <Route path="demandes/:id" element={<AdminRequestDetailPage/>}/>
                <Route path="calendly" element={<AdminCalendlyPage/>}/>
                <Route path="coachs" element={<AdminCoachesPage/>}/>
            </Route>
        </Routes>
    )
}
