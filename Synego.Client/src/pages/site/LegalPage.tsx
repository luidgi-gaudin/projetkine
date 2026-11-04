import {Link} from 'react-router'
import {HeroDial} from '../../components/brand/Dial'
import {Reveal, SplitLines} from '../../components/motion/Reveal'
import {useI18n} from '../../i18n/context'

/** Mentions légales et confidentialité (projet pédagogique : données de l'entreprise fictives, voir brand.ts). */
export function LegalPage({page}: { page: 'mentions' | 'privacy' | 'cgv' }) {
    const {t} = useI18n()
    const content = t.legalPages[page]

    return (
        <article className="legal">
            <SplitLines lines={[content.title]} className="display-title"/>
            {content.sections.map((section, i) => (
                <Reveal key={section.heading} delay={i * 0.04} className="legal-section">
                    <h2 className="h3">{section.heading}</h2>
                    <p>{section.text}</p>
                </Reveal>
            ))}
        </article>
    )
}

export function NotFoundPage() {
    const {t} = useI18n()
    return (
        <section className="not-found">
            <div className="not-found-dial"><HeroDial/></div>
            <h1 className="h2">{t.ui.notFoundTitle}</h1>
            <Link to="/" className="btn btn-ink">{t.ui.notFoundCta}</Link>
        </section>
    )
}
