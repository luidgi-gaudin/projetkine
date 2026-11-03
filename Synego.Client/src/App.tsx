import {Route, Routes} from 'react-router'
import {useAuth} from './auth/AuthContext'
import {RequireAuth} from './auth/RequireAuth'
import {SpaceLayout, type SpaceNavItem} from './components/espace/SpaceLayout'
import {PublicLayout} from './components/site/PublicLayout'
import {Calendar, FileIcon, Home, LinkIcon, Lock, Message, UserIcon, Users} from './components/ui/Icons'
import {useI18n} from './i18n/context'
import {
    AdminAppointmentsPage,
    AdminClientsPage,
    AdminCoachesPage,
    AdminRequestDetailPage,
    AdminRequestsPage,
} from './pages/admin/AdminPages'
import {AdminCalendlyPage} from './pages/admin/AdminCalendlyPage'
import {LoginPage} from './pages/auth/LoginPage'
import {RegisterPage} from './pages/auth/RegisterPage'
import {
    EspaceAppointmentsPage,
    EspaceDocumentsPage,
    EspaceHomePage,
    EspaceProfilePage,
    EspaceRequestDetailPage,
    EspaceRequestsPage,
} from './pages/espace/EspacePages'
import {AccompagnementPage} from './pages/site/AccompagnementPage'
import {AProposPage} from './pages/site/AProposPage'
import {ContactPage} from './pages/site/ContactPage'
import {HomePage} from './pages/site/HomePage'
import {LegalPage, NotFoundPage} from './pages/site/LegalPage'
import {RendezVousPage} from './pages/site/RendezVousPage'
import {SeminairesPage} from './pages/site/SeminairesPage'

const adminNav: SpaceNavItem[] = [
    {to: '/admin', label: 'Clients', icon: Users, end: true},
    {to: '/admin/rendez-vous', label: 'Rendez-vous', icon: Calendar},
    {to: '/admin/demandes', label: 'Demandes', icon: Message},
    {to: '/admin/calendly', label: 'Calendly', icon: LinkIcon},
    {to: '/admin/coachs', label: 'Coachs', icon: Lock},
    {to: '/espace', label: 'Mon espace', icon: Home},
]

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
            <Route path="connexion" element={<LoginPage/>}/>
            <Route path="inscription" element={<RegisterPage/>}/>

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
                   element={<RequireAuth role="Coach"><SpaceLayout nav={adminNav} badge="Coach"/></RequireAuth>}>
                <Route index element={<AdminClientsPage/>}/>
                <Route path="rendez-vous" element={<AdminAppointmentsPage/>}/>
                <Route path="demandes" element={<AdminRequestsPage/>}/>
                <Route path="demandes/:id" element={<AdminRequestDetailPage/>}/>
                <Route path="calendly" element={<AdminCalendlyPage/>}/>
                <Route path="coachs" element={<AdminCoachesPage/>}/>
            </Route>
        </Routes>
    )
}
