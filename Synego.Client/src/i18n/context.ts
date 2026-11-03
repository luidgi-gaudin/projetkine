import {createContext, useContext} from 'react'
import type {Dictionary} from './fr'

export const locales = [
    {code: 'fr', label: 'Français', short: 'FR'},
    {code: 'en', label: 'English', short: 'EN'},
] as const

export type Locale = (typeof locales)[number]['code']

export type I18nValue = {
    locale: Locale
    setLocale: (locale: Locale) => void
    t: Dictionary
    /** Remplace {clé} par la valeur correspondante. */
    format: (template: string, values: Record<string, string | number>) => string
    date: (iso: string, options?: Intl.DateTimeFormatOptions) => string
}

export const I18nContext = createContext<I18nValue | null>(null)

export function useI18n(): I18nValue {
    const ctx = useContext(I18nContext)
    if (!ctx) throw new Error('useI18n doit être utilisé dans <I18nProvider>.')
    return ctx
}
