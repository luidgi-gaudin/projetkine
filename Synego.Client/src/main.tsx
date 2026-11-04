import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter} from 'react-router'
import {MotionConfig} from 'motion/react'
import App from './App.tsx'
import {AuthProvider} from './auth/AuthProvider.tsx'
import {FeedbackProvider} from './components/ui/FeedbackProvider.tsx'
import {I18nProvider} from './i18n/I18nProvider.tsx'
import {ThemeProvider} from './theme/ThemeProvider.tsx'
import {applyTheme, readPreference, resolveTheme} from './theme/theme'
import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource-variable/hanken-grotesk/index.css'
import './index.css'
import './styles/site.css'
import './styles/space.css'
import './styles/learning.css'

// Thème appliqué avant le premier rendu : pas de flash clair en mode sombre.
applyTheme(resolveTheme(readPreference()))

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        {/* reducedMotion="user" : animations coupées si le système le demande */}
        <MotionConfig reducedMotion="user">
            <BrowserRouter>
                <ThemeProvider>
                    <I18nProvider>
                        <FeedbackProvider>
                            <AuthProvider>
                                <App/>
                            </AuthProvider>
                        </FeedbackProvider>
                    </I18nProvider>
                </ThemeProvider>
            </BrowserRouter>
        </MotionConfig>
    </StrictMode>,
)
