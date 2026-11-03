import type {ReactNode} from 'react'
import {Link} from 'react-router'
import {motion} from 'motion/react'
import {HeroDial, LogoMark} from '../../components/brand/Dial'
import {easeOut} from '../../components/motion/ease'
import {LocaleSwitch, ThemeToggle} from '../../components/ui/Switches'
import {brand} from '../../i18n/brand'
import {useI18n} from '../../i18n/context'

/** Écran partagé : le cadran qui respire à gauche, le formulaire à droite. */
export function AuthLayout({title, text, children, footer}: {
    title: string
    text: string
    children: ReactNode
    footer: ReactNode
}) {
    const {t} = useI18n()
    return (
        <div className="auth">
            <aside className="auth-aside" aria-hidden="true">
                <Link to="/" className="auth-brand"><LogoMark size={36}/> {brand.name}</Link>
                <div className="auth-dial"><HeroDial/></div>
                <p className="auth-aside-note">{t.brandText.tagline}</p>
            </aside>
            <main className="auth-main">
                <div className="auth-tools">
                    <Link to="/" className="link-quiet auth-back">{brand.name}</Link>
                    <LocaleSwitch/>
                    <ThemeToggle/>
                </div>
                <motion.div className="auth-card" initial={{opacity: 0, y: 24}} animate={{opacity: 1, y: 0}}
                            transition={{duration: 0.9, ease: easeOut}}>
                    <h1 className="h2">{title}</h1>
                    <p className="auth-text">{text}</p>
                    {children}
                    <p className="auth-footer">{footer}</p>
                    <p className="fine-print">{t.auth.privacyNote}</p>
                </motion.div>
            </main>
        </div>
    )
}
