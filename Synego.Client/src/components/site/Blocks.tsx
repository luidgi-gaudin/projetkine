import {type ReactNode, useRef} from 'react'
import {Link} from 'react-router'
import {motion, useScroll, useTransform} from 'motion/react'
import {useI18n} from '../../i18n/context'
import {LogoMark} from '../brand/Dial'
import {BreathWaves} from '../motion/BreathWaves'
import {Magnetic} from '../motion/Magnetic'
import {Reveal, SplitLines} from '../motion/Reveal'
import {ArrowRight} from '../ui/Icons'

/** En-tête de page : petit sur-titre, grand titre révélé ligne à ligne, chapeau. */
export function PageHero({eyebrow, lines, accent, intro, children}: {
    eyebrow: string
    lines: string[]
    accent?: string
    intro: string
    children?: ReactNode
}) {
    return (
        <section className="page-hero" data-ambient="paper">
            <div className="page-hero-waves"><BreathWaves lines={12}/></div>
            <Reveal y={12}><p className="eyebrow">{eyebrow}</p></Reveal>
            <SplitLines lines={lines} accent={accent ?? lines[lines.length - 1]} className="display-title"/>
            <Reveal delay={0.35}><p className="lede">{intro}</p></Reveal>
            {children && <Reveal delay={0.5}>{children}</Reveal>}
        </section>
    )
}

/** Bandeau final bleu profond, présent en bas des pages vitrine. */
export function FinalCta() {
    const {t} = useI18n()
    const {finalCta} = t.home
    const ref = useRef<HTMLElement>(null)
    const {scrollYProgress} = useScroll({target: ref, offset: ['start end', 'end start']})
    // Le grand cadran en filigrane tourne lentement pendant qu'on descend.
    const rotate = useTransform(scrollYProgress, [0, 1], [-40, 50])
    const scale = useTransform(scrollYProgress, [0, 1], [0.85, 1.1])
    return (
        <section ref={ref} className="final-cta">
            <motion.div className="final-cta-mark" aria-hidden="true" style={{rotate, scale}}><LogoMark size={220}/>
            </motion.div>
            <SplitLines lines={finalCta.title} accent={finalCta.title[finalCta.title.length - 1]} as="h2"
                        className="display-title" inView/>
            <Reveal delay={0.2}><p className="lede">{finalCta.text}</p></Reveal>
            <Reveal delay={0.3} className="final-cta-actions">
                <Magnetic>
                    <Link to="/rendez-vous#prospects" className="btn btn-paper">
                        {t.ui.finalCtaBook} <ArrowRight/>
                    </Link>
                </Magnetic>
                <Link to="/contact?type=devis" className="btn btn-ghost-light">{t.ui.finalCtaQuote}</Link>
            </Reveal>
        </section>
    )
}

export function SectionTitle({eyebrow, children}: { eyebrow: string, children: ReactNode }) {
    return (
        <div className="section-title">
            <Reveal y={12}><p className="eyebrow">{eyebrow}</p></Reveal>
            <Reveal delay={0.1}><h2 className="h2">{children}</h2></Reveal>
        </div>
    )
}
