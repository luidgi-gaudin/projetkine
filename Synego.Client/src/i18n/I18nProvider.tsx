import {type ReactNode, useEffect, useMemo, useState} from 'react'
import {en} from './en'
import {fr} from './fr'
import {I18nContext, type Locale, locales} from './context'

const dictionaries = {fr, en}
const STORAGE_KEY = 'synego:locale'

/** Langue choisie : ?lang=en > choix mémorisé > langue du navigateur > français. */
function initialLocale(): Locale {
    const isLocale = (v: string | null): v is Locale => locales.some((l) => l.code === v)
    const fromUrl = new URLSearchParams(window.location.search).get('lang')
    if (isLocale(fromUrl)) return fromUrl
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (isLocale(stored)) return stored
    } catch {
        // stockage indisponible (navigation privée…)
    }
    const browser = navigator.language.slice(0, 2)
    return isLocale(browser) ? browser : 'fr'
}

export function I18nProvider({children}: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(initialLocale)

    useEffect(() => {
        document.documentElement.lang = locale
    }, [locale])

    const value = useMemo(() => {
        const intlLocale = locale === 'fr' ? 'fr-FR' : 'en-GB'
        return {
            locale,
            t: dictionaries[locale],
            setLocale: (next: Locale) => {
                setLocaleState(next)
                try {
                    localStorage.setItem(STORAGE_KEY, next)
                } catch {
                    // le choix ne sera simplement pas mémorisé
                }
            },
            format: (template: string, values: Record<string, string | number>) =>
                template.replace(/\{(\w+)}/g, (_, key: string) => String(values[key] ?? `{${key}}`)),
            date: (iso: string, options: Intl.DateTimeFormatOptions = {dateStyle: 'long'}) =>
                new Intl.DateTimeFormat(intlLocale, options).format(new Date(iso)),
        }
    }, [locale])

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
