import {LogoMark} from '../../components/brand/Dial'
import {TimeRuler} from '../../components/brand/TimeRuler'
import {Reveal} from '../../components/motion/Reveal'
import {FinalCta, PageHero, SectionTitle} from '../../components/site/Blocks'
import {useI18n} from '../../i18n/context'

export function AProposPage() {
    const {t} = useI18n()
    const {apropos} = t
    return (
        <>
            <PageHero eyebrow={apropos.eyebrow} lines={apropos.title} intro={apropos.intro}/>
            <section className="values" data-ambient="sand">
                <SectionTitle eyebrow={t.ui.valuesEyebrow}>{t.ui.valuesTitle}</SectionTitle>
                <div className="values-grid">
                    {apropos.values.map((value, i) => (
                        <Reveal key={value.title} delay={i * 0.08} className="value">
                            <span className="value-hour"
                                  aria-hidden="true">{String((i + 1) * 3).padStart(2, '0')}h</span>
                            <h3 className="h3">{value.title}</h3>
                            <p>{value.text}</p>
                        </Reveal>
                    ))}
                </div>
            </section>
            <TimeRuler from={6} to={18}/>
            <section className="signature" data-ambient="mist">
                <Reveal><LogoMark size={120} animated/></Reveal>
                <Reveal delay={0.15}><p className="signature-text">{apropos.signature}</p></Reveal>
            </section>
            <FinalCta/>
        </>
    )
}
