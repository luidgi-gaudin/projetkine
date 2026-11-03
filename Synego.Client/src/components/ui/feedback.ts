import {createContext, useContext} from 'react'

export type ConfirmOptions = {
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    /** Action destructrice : bouton rouge. */
    danger?: boolean
}

export type AskOptions = ConfirmOptions & {
    label: string
    defaultValue?: string
}

export type ToastTone = 'success' | 'error' | 'info'

export type FeedbackValue = {
    /** Remplace window.confirm : résout true si l'utilisateur confirme. */
    confirm: (options: ConfirmOptions) => Promise<boolean>
    /** Remplace window.prompt : résout le texte saisi, ou null si annulé. */
    ask: (options: AskOptions) => Promise<string | null>
    /** Message éphémère en bas de l'écran. */
    toast: (message: string, tone?: ToastTone) => void
}

export const FeedbackContext = createContext<FeedbackValue | null>(null)

export function useFeedback(): FeedbackValue {
    const ctx = useContext(FeedbackContext)
    if (!ctx) throw new Error('useFeedback doit être utilisé dans <FeedbackProvider>.')
    return ctx
}
