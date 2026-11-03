import {useEffect, useState} from 'react'
import {Link, NavLink} from 'react-router'
import {AnimatePresence, motion, useMotionValueEvent, useScroll} from 'motion/react'
import {homeFor, useAuth} from '../../auth/AuthContext'
import {useI18n} from '../../i18n/context'
import {brand} from '../../i18n/brand'
import {LogoMark} from '../brand/Dial'
import {easeOut} from '../motion/ease'
import {lockScroll} from '../motion/smoothScroll'
import {Close, Menu} from '../ui/Icons'
import {LocaleSwitch, ThemeToggle} from '../ui/Switches'

export function SiteHeader() {
    const {user, profile} = useAuth()
    const {t} = useI18n()
    const {scrollY} = useScroll()
    const [scrolled, setScrolled] = useState(false)
    const [hidden, setHidden] = useState(false)
    const [open, setOpen] = useState(false)

    // L'en-tête s'efface quand on descend et revient dès qu'on remonte.
    useMotionValueEvent(scrollY, 'change', (y) => {
        const previous = scrollY.getPrevious() ?? 0
        setScrolled(y > 24)
        setHidden(y > 240 && y > previous && !open)
    })

    useEffect(() => {
        lockScroll(open)
        return () => lockScroll(false)
    }, [open])

    return (
        <>
            <motion.header
                className={`site-header${scrolled ? ' is-scrolled' : ''}${open ? ' menu-open' : ''}`}
                animate={{y: hidden ? '-110%' : '0%'}}
                transition={{duration: 0.5, ease: easeOut}}
            >
                <Link to="/" className="site-brand" aria-label={`${brand.name}, ${t.ui.home}`}>
                    <LogoMark size={38} animated/>
                    <span className="site-brand-name">{brand.name}</span>
                </Link>

                <nav className="site-nav" aria-label={t.ui.mainNav}>
                    {t.nav.map((item) => (
                        <NavLink key={item.to} to={item.to} className="site-nav-link">
                            {({isActive}) => (
                                <>
                                    {item.label}
                                    {isActive && <motion.span layoutId="nav-underline" className="site-nav-underline"/>}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="site-header-actions">
                    <LocaleSwitch/>
                    <ThemeToggle/>
                    <Link to={user ? homeFor(profile) : '/connexion'} className="link-quiet hide-mobile">
                        {user ? t.ui.mySpace : t.ui.clientSpace}
                    </Link>
                    <Link to="/rendez-vous" className="btn btn-ink btn-small hide-mobile">{t.ui.book}</Link>
                    <button type="button" className="site-menu-toggle" onClick={() => setOpen((o) => !o)}
                            aria-expanded={open} aria-controls="site-menu"
                            aria-label={open ? t.ui.closeMenu : t.ui.openMenu}>
                        {open ? <Close size={22}/> : <Menu size={22}/>}
                    </button>
                </div>
            </motion.header>

            <AnimatePresence>
                {open && (
                    <motion.div
                        id="site-menu"
                        className="site-menu"
                        initial={{clipPath: 'circle(0% at calc(100% - 40px) 40px)'}}
                        animate={{clipPath: 'circle(150% at calc(100% - 40px) 40px)'}}
                        exit={{clipPath: 'circle(0% at calc(100% - 40px) 40px)'}}
                        transition={{duration: 0.8, ease: easeOut}}
                    >
                        <nav aria-label={t.ui.mobileNav}>
                            {[{to: '/', label: t.ui.home}, ...t.nav, {
                                to: '/rendez-vous',
                                label: t.ui.bookShort
                            }].map((item, i) => (
                                <motion.div key={item.to}
                                            initial={{opacity: 0, y: 24}}
                                            animate={{opacity: 1, y: 0}}
                                            transition={{delay: 0.2 + i * 0.06, duration: 0.6, ease: easeOut}}>
                                    <Link to={item.to} className="site-menu-link" onClick={() => setOpen(false)}>
                                        <span className="site-menu-index">{String(i + 1).padStart(2, '0')}</span>
                                        {item.label}
                                    </Link>
                                </motion.div>
                            ))}
                        </nav>
                        <Link to={user ? homeFor(profile) : '/connexion'} className="btn btn-paper"
                              onClick={() => setOpen(false)}>
                            {user ? t.ui.mySpace : t.ui.clientSpace}
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
