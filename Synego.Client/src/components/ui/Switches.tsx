import {useId} from 'react'
import {motion} from 'motion/react'
import {locales, useI18n} from '../../i18n/context'
import {useTheme} from '../../theme/theme'
import {easeOut} from '../motion/ease'

/**
 * Soleil ↔ lune. Les rayons du soleil sont les graduations du cadran Synégo :
 * en mode sombre ils se rétractent et un second disque vient creuser le croissant.
 */
export function ThemeToggle() {
    const {theme, toggle} = useTheme()
    const {t} = useI18n()
    const dark = theme === 'dark'
    const maskId = useId().replace(/:/g, '')
    const transition = {duration: 0.7, ease: easeOut}

    return (
        <button type="button" className="icon-button" onClick={toggle}
                aria-label={dark ? t.ui.themeToLight : t.ui.themeToDark}
                title={dark ? t.ui.themeToLight : t.ui.themeToDark}>
            <motion.svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" animate={{rotate: dark ? 40 : 0}} transition={transition}
                        aria-hidden="true">
                <mask id={maskId}>
                    <rect width="24" height="24" fill="white"/>
                    <motion.circle r="6" fill="black" initial={false}
                                   animate={dark ? {cx: 16, cy: 8} : {cx: 30, cy: -6}} transition={transition}/>
                </mask>
                <motion.circle cx="12" cy="12" fill="currentColor" stroke="none" mask={`url(#${maskId})`}
                               initial={false} animate={{r: dark ? 8 : 4.5}} transition={transition}/>
                {Array.from({length: 8}, (_, i) => (
                    <motion.line key={i} x1="12" y1="2.5" x2="12" y2="4.5" transform={`rotate(${i * 45} 12 12)`}
                                 initial={false} animate={{opacity: dark ? 0 : 1, pathLength: dark ? 0 : 1}}
                                 transition={{...transition, delay: dark ? 0 : 0.2 + i * 0.03}}/>
                ))}
            </motion.svg>
        </button>
    )
}

/** Sélecteur de langue : une pastille glisse sous la langue active. */
export function LocaleSwitch() {
    const {locale, setLocale, t} = useI18n()

    return (
        <div className="locale-switch" role="group" aria-label={t.ui.language}>
            {locales.map((l) => (
                <button key={l.code} type="button" onClick={() => setLocale(l.code)}
                        aria-pressed={locale === l.code} title={l.label} lang={l.code}>
                    {locale === l.code && (
                        <motion.span layoutId="locale-pill" className="locale-pill"
                                     transition={{duration: 0.5, ease: easeOut}}/>
                    )}
                    <span className="locale-label">{l.short}</span>
                </button>
            ))}
        </div>
    )
}
