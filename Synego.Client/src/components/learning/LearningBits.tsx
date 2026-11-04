import {Link} from 'react-router'
import {useI18n} from '../../i18n/context'
import {paragraphs} from './format'

/** Case à cocher obligatoire : CGV + accès immédiat (renonciation au droit de rétractation). */
export function TermsCheckbox({checked, onChange}: { checked: boolean, onChange: (value: boolean) => void }) {
    const {t} = useI18n()
    return (
        <label className="terms-check">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}/>
            <span>
                {t.formations.termsBefore}
                <Link to="/cgv" target="_blank" rel="noopener">{t.formations.termsLink}</Link>
                {t.formations.termsAfter}
            </span>
        </label>
    )
}

/** Lecteur vidéo intégré (YouTube sans cookie, Vimeo ou Loom), au format 16/9. */
export function VideoFrame({src, title}: { src: string, title: string }) {
    return (
        <div className="video-frame">
            <iframe src={src} title={title} loading="lazy" referrerPolicy="strict-origin-when-cross-origin"
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen/>
        </div>
    )
}

/** Texte de leçon ou de message : paragraphes, retours à la ligne conservés, aucun HTML interprété. */
export function RichText({text, className}: { text: string, className?: string }) {
    return (
        <div className={className ?? 'rich-text'}>
            {paragraphs(text).map((p, i) => <p key={i}>{p}</p>)}
        </div>
    )
}

/** Couverture générée : cadran et facettes aux couleurs de la marque, variante selon la formation. */
export function CourseCover({seed, small}: { seed: string, small?: boolean }) {
    let hash = 0
    for (const c of seed) hash = (hash * 31 + c.charCodeAt(0)) >>> 0
    const rotation = hash % 360
    const variant = hash % 3
    return (
        <div className={`course-cover course-cover-${variant}${small ? ' is-small' : ''}`} aria-hidden="true">
            <svg viewBox="0 0 100 100" style={{transform: `rotate(${rotation}deg)`}}>
                <circle cx="50" cy="50" r="40"/>
                <circle cx="50" cy="50" r="27"/>
                {Array.from({length: 12}, (_, i) => (
                    <line key={i} x1="50" y1="6" x2="50" y2={i % 3 === 0 ? 14 : 10}
                          transform={`rotate(${i * 30} 50 50)`}/>
                ))}
            </svg>
        </div>
    )
}
