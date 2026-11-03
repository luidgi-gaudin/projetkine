import {type ReactNode, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {AnimatePresence, motion} from 'motion/react'
import {useI18n} from '../../i18n/context'
import {easeOut} from '../motion/ease'
import {type AskOptions, type ConfirmOptions, FeedbackContext, type ToastTone} from './feedback'
import {Check, Close} from './Icons'

type Dialog = (ConfirmOptions & { input?: { label: string, defaultValue?: string } }) & {
    resolve: (value: string | boolean | null) => void
}

type Toast = { id: number, message: string, tone: ToastTone }

/** Dialogues et notifications aux couleurs de Synégo, à la place des fenêtres natives du navigateur. */
export function FeedbackProvider({children}: { children: ReactNode }) {
    const [dialog, setDialog] = useState<Dialog | null>(null)
    const [toasts, setToasts] = useState<Toast[]>([])
    const nextId = useRef(0)

    const toast = useCallback((message: string, tone: ToastTone = 'success') => {
        const id = ++nextId.current
        setToasts((list) => [...list.slice(-2), {id, message, tone}])
        setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), tone === 'error' ? 7000 : 4200)
    }, [])

    const value = useMemo(() => ({
        toast,
        confirm: (options: ConfirmOptions) =>
            new Promise<boolean>((resolve) => setDialog({...options, resolve: (v) => resolve(v === true)})),
        ask: (options: AskOptions) =>
            new Promise<string | null>((resolve) => setDialog({
                ...options,
                input: {label: options.label, defaultValue: options.defaultValue},
                resolve: (v) => resolve(typeof v === 'string' ? v : null),
            })),
    }), [toast])

    const close = (result: string | boolean | null) => {
        dialog?.resolve(result)
        setDialog(null)
    }

    return (
        <FeedbackContext.Provider value={value}>
            {children}
            {createPortal(
                <>
                    <AnimatePresence>
                        {dialog && <DialogView key="dialog" dialog={dialog} onClose={close}/>}
                    </AnimatePresence>
                    <div className="toasts" role="status" aria-live="polite">
                        <AnimatePresence initial={false}>
                            {toasts.map((t) => (
                                <motion.div key={t.id} layout className={`toast toast-${t.tone}`}
                                            initial={{opacity: 0, y: 24, scale: 0.96}}
                                            animate={{opacity: 1, y: 0, scale: 1}}
                                            exit={{opacity: 0, y: 12, scale: 0.96}}
                                            transition={{duration: 0.45, ease: easeOut}}>
                                    {t.tone === 'error' ? <Close size={16}/> : <Check size={16}/>}
                                    <span>{t.message}</span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </>,
                document.body,
            )}
        </FeedbackContext.Provider>
    )
}

function DialogView({dialog, onClose}: { dialog: Dialog, onClose: (result: string | boolean | null) => void }) {
    const {t} = useI18n()
    const [text, setText] = useState(dialog.input?.defaultValue ?? '')
    const confirmRef = useRef<HTMLButtonElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null
        ;(inputRef.current ?? confirmRef.current)?.focus()
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose(dialog.input ? null : false)
        }
        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('keydown', onKey)
            previous?.focus()
        }
    }, [dialog.input, onClose])

    const submit = () => onClose(dialog.input ? text.trim() : true)

    return (
        <motion.div className="dialog-backdrop" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}
                    transition={{duration: 0.3}} onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose(dialog.input ? null : false)
        }}>
            <motion.form className={`dialog${dialog.danger ? ' is-danger' : ''}`} role="alertdialog" aria-modal="true"
                         aria-labelledby="dialog-title"
                         initial={{opacity: 0, y: 24, scale: 0.97}} animate={{opacity: 1, y: 0, scale: 1}}
                         exit={{opacity: 0, y: 12, scale: 0.98}} transition={{duration: 0.45, ease: easeOut}}
                         onSubmit={(e) => {
                             e.preventDefault()
                             submit()
                         }}>
                <h2 id="dialog-title" className="h3">{dialog.title}</h2>
                {dialog.message && <p className="dialog-message">{dialog.message}</p>}
                {dialog.input && (
                    <label className="field">
                        <span>{dialog.input.label}</span>
                        <textarea ref={inputRef} rows={3} value={text} onChange={(e) => setText(e.target.value)}
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
                                  }}/>
                    </label>
                )}
                <div className="dialog-actions">
                    <button type="button" className="link-quiet" onClick={() => onClose(dialog.input ? null : false)}>
                        {dialog.cancelLabel ?? t.ui.dialogBack}
                    </button>
                    <button ref={confirmRef} type="submit" className={`btn btn-small ${dialog.danger ? 'btn-danger' : 'btn-ink'}`}>
                        {dialog.confirmLabel ?? t.ui.dialogConfirm}
                    </button>
                </div>
            </motion.form>
        </motion.div>
    )
}
