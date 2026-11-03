import {createContext, useContext} from 'react'

export type Theme = 'light' | 'dark'
export type Preference = Theme | 'system'

export type ThemeValue = {
    theme: Theme
    toggle: () => void
}

export const THEME_STORAGE_KEY = 'synego:theme'
export const ThemeContext = createContext<ThemeValue | null>(null)
export const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

export function readPreference(): Preference {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY)
        if (stored === 'light' || stored === 'dark') return stored
    } catch {
        // stockage indisponible
    }
    return 'system'
}

export function resolveTheme(preference: Preference): Theme {
    return preference === 'system' ? (darkQuery().matches ? 'dark' : 'light') : preference
}

/** Applique le thème sur <html data-theme> : appelé aussi avant le premier rendu (main.tsx). */
export function applyTheme(theme: Theme) {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a1d35' : '#f2e8dc')
}

export function useTheme(): ThemeValue {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme doit être utilisé dans <ThemeProvider>.')
    return ctx
}
