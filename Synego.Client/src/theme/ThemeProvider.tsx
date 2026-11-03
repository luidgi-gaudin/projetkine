import {type ReactNode, useEffect, useMemo, useState} from 'react'
import {
    applyTheme,
    darkQuery,
    type Preference,
    readPreference,
    type Theme,
    THEME_STORAGE_KEY,
    ThemeContext
} from './theme'

/** Suit le réglage du système tant que l'utilisateur n'a pas choisi lui-même. */
export function ThemeProvider({children}: { children: ReactNode }) {
    const [preference, setPreference] = useState<Preference>(readPreference)
    const [systemDark, setSystemDark] = useState(() => darkQuery().matches)
    const theme: Theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

    useEffect(() => {
        const query = darkQuery()
        const onChange = () => setSystemDark(query.matches)
        query.addEventListener('change', onChange)
        return () => query.removeEventListener('change', onChange)
    }, [])

    useEffect(() => applyTheme(theme), [theme])

    const value = useMemo(() => ({
        theme,
        toggle: () => {
            const next: Theme = theme === 'dark' ? 'light' : 'dark'
            setPreference(next)
            try {
                localStorage.setItem(THEME_STORAGE_KEY, next)
            } catch {
                // le choix ne sera simplement pas mémorisé
            }
        },
    }), [theme])

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
