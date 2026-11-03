import {useRef} from 'react'
import {Link} from 'react-router'
import {motion, useScroll, useTransform} from 'motion/react'
import {Reveal} from '../../components/motion/Reveal'
import {FinalCta, PageHero, SectionTitle} from '../../components/site/Blocks'
import {ArrowRight, Check} from '../../components/ui/Icons'
import {useI18n} from '../../i18n/context'

/** Parcours en 4 étapes, reliées par un fil qui se trace au scroll. */
function Steps() {
    const {t} = useI18n()
    const ref = useRef<HTMLOListElement>(null)
    const {scrollYProgress} = useScroll({target: ref, offset: ['start 0.75', 'end 0.6']})
    const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1])

    return (
        <section className="journey" data-ambient="mist">
            <SectionTitle eyebrow={t.ui.journeyEyebrow}>{t.ui.journeyTitle}</SectionTitle>
            <ol ref={ref} className="journey-list">
                <motion.span className="journey-thread" style={{scaleY}} aria-hidden="true"/>
                {t.accompagnement.steps.map((step, i) => (
                    <Reveal as="li" key={step.title} className="journey-step">
                        <span className="journey-dot" aria-hidden="true">{i + 1}</span>
                        <h3 className="h3">{step.title}</h3>
                        <p>{step.text}</p>
                    </Reveal>
                ))}
            </ol>
        </section>
    )
}

export function AccompagnementPage() {
    const {t} = useI18n()
    const {accompagnement} = t
    return (
        <>
            <PageHero eyebrow={accompagnement.eyebrow} lines={accompagnement.title} intro={accompagnement.intro}>
                <div className="hero-actions">
                    <Link to="/rendez-vous#prospects" className="btn btn-ink">{t.ui.discoveryCall} <ArrowRight/></Link>
                </div>
            </PageHero>
            <Steps/>
            <section className="space-preview" data-ambient="sand">
                <Reveal className="space-preview-card">
                    <p className="eyebrow">{t.ui.spaceEyebrow}</p>
                    <h2 className="h2">{accompagnement.space.title}</h2>
                    <ul className="check-list">
                        {accompagnement.space.items.map((item) => <li key={item}><Check/> {item}</li>)}
                    </ul>
                    <Link to="/connexion" className="link-arrow">{t.ui.spaceCta} <ArrowRight/></Link>
                </Reveal>
            </section>
            <FinalCta/>
        </>
    )
}
