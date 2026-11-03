import type {ComponentType} from 'react'
import {Link, NavLink, useLocation, useNavigate, useOutlet} from 'react-router'
import {AnimatePresence, motion} from 'motion/react'
import {displayNameOf, useAuth} from '../../auth/AuthContext'
import {brand} from '../../i18n/brand'
import {useI18n} from '../../i18n/context'
import {LogoMark} from '../brand/Dial'
import {easeOut} from '../motion/ease'
import type {IconProps} from '../ui/Icons'
import {ArrowUpRight, Logout} from '../ui/Icons'
import {LocaleSwitch, ThemeToggle} from '../ui/Switches'

export type SpaceNavItem = { to: string, label: string, icon: ComponentType<IconProps>, end?: boolean }

/** Coque commune à l'espace client et au back-office : navigation latérale, contenu animé. */
export function SpaceLayout({nav, badge}: { nav: SpaceNavItem[], badge?: string }) {
    const {user, profile, logout} = useAuth()
    const {t} = useI18n()
    const location = useLocation()
    const outlet = useOutlet()
    const navigate = useNavigate()

    return (
        <div className="space">
            <aside className="space-side">
                <Link to="/" className="space-brand">
                    <LogoMark size={34}/>
                    <span>{brand.name}</span>
                    {badge && <span className="space-badge">{badge}</span>}
                </Link>
                <nav className="space-nav">
                    {nav.map(({to, label, icon: Icon, end}) => (
                        <NavLink key={to} to={to} end={end} className="space-nav-link">
                            {({isActive}) => (
                                <>
                                    {isActive && <motion.span layoutId="space-nav-active" className="space-nav-active"
                                                              transition={{duration: 0.5, ease: easeOut}}/>}
                                    <Icon/> <span>{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
                <div className="space-side-foot">
                    <div className="space-user">
                        <span className="space-avatar" aria-hidden="true">
                            {user?.photoURL
                                ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer"/>
                                : displayNameOf(user, profile).charAt(0).toUpperCase()}
                        </span>
                        <span className="space-user-name">{displayNameOf(user, profile)}</span>
                    </div>
                    <div className="space-tools">
                        <LocaleSwitch/>
                        <ThemeToggle/>
                    </div>
                    <Link to="/" className="space-nav-link"><ArrowUpRight/> <span>{t.espace.backToSite}</span></Link>
                    <button type="button" className="space-nav-link"
                            onClick={() => void logout().then(() => navigate('/'))}>
                        <Logout/> <span>{t.espace.logout}</span>
                    </button>
                </div>
            </aside>

            <AnimatePresence mode="wait" initial={false}>
                <motion.main key={location.pathname} className="space-main"
                             initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -8}}
                             transition={{duration: 0.45, ease: easeOut}}>
                    {outlet}
                </motion.main>
            </AnimatePresence>
        </div>
    )
}

export function SpaceHeader({title, text, children}: { title: string, text?: string, children?: React.ReactNode }) {
    return (
        <header className="space-header">
            <div>
                <h1 className="h2">{title}</h1>
                {text && <p className="space-header-text">{text}</p>}
            </div>
            {children && <div className="space-header-actions">{children}</div>}
        </header>
    )
}

/** Liste animée : chaque élément arrive avec un léger décalage. */
export function StaggerList({children, className}: { children: React.ReactNode[], className?: string }) {
    return (
        <ul className={className}>
            {children.map((child, i) => (
                <motion.li key={i} initial={{opacity: 0, y: 12}} animate={{opacity: 1, y: 0}}
                           transition={{duration: 0.5, delay: Math.min(i, 8) * 0.05, ease: easeOut}}>
                    {child}
                </motion.li>
            ))}
        </ul>
    )
}
