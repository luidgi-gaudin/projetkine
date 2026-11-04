import {Link} from 'react-router'
import {motion} from 'motion/react'
import {easeOut} from '../motion/ease'
import {useI18n} from '../../i18n/context'
import {brand} from '../../i18n/brand'
import {LogoMark} from '../brand/Dial'

export function SiteFooter() {
    const {t} = useI18n()

    return (
        <footer className="site-footer">
            <div className="site-footer-top">
                <div className="site-footer-brand">
                    <LogoMark size={56}/>
                    <p className="site-footer-name">{brand.name}</p>
                    <p className="site-footer-tagline">{t.brandText.tagline}</p>
                </div>

                <div className="site-footer-cols">
                    <div>
                        <p className="site-footer-title">{t.ui.footerExplore}</p>
                        <ul>
                            {t.nav.map((item) => <li key={item.to}><Link to={item.to}>{item.label}</Link></li>)}
                            <li><Link to="/rendez-vous">{t.ui.book}</Link></li>
                        </ul>
                    </div>
                    <div>
                        <p className="site-footer-title">{t.ui.footerReach}</p>
                        <ul>
                            <li><a href={`mailto:${brand.email}`}>{brand.email}</a></li>
                            <li><a href={`tel:${brand.phoneE164}`}>{brand.phone}</a></li>
                            <li>{t.brandText.area}</li>
                        </ul>
                    </div>
                    <div>
                        <p className="site-footer-title">{t.ui.clientSpace}</p>
                        <ul>
                            <li><Link to="/connexion">{t.ui.footerLogin}</Link></li>
                            <li><Link to="/inscription">{t.ui.footerRegister}</Link></li>
                        </ul>
                    </div>
                </div>
            </div>

            <p className="site-footer-disclaimer">{t.legal.disclaimer}</p>

            {/* Déclencheur sur le conteneur : les lettres, masquées par lui, ne seraient jamais « visibles » */}
            <motion.div className="footer-wordmark" aria-hidden="true"
                        initial="hidden" whileInView="shown" viewport={{once: true, amount: 0.3}}>
                {Array.from(brand.name).map((letter, i) => (
                    <motion.span key={i} variants={{hidden: {y: '105%'}, shown: {y: '0%'}}}
                                 transition={{duration: 1.4, delay: i * 0.07, ease: easeOut}}>
                        {letter}
                    </motion.span>
                ))}
            </motion.div>

            <div className="site-footer-bottom">
                <span>© {new Date().getFullYear()} {brand.name}. {t.ui.footerQuoteOnly}</span>
                <span className="site-footer-legal">
                    <Link to="/mentions-legales">{t.ui.legalNotice}</Link>
                    <Link to="/confidentialite">{t.ui.privacy}</Link>
                </span>
            </div>
        </footer>
    )
}
