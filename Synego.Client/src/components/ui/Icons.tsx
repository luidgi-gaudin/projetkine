import type {ReactNode, SVGProps} from 'react'

export type IconProps = SVGProps<SVGSVGElement> & { size?: number }

/** Icônes au trait fin, dessinées pour le site (aucune librairie externe). */
function Icon({size = 18, children, ...props}: IconProps & { children: ReactNode }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            {children}
        </svg>
    )
}

export const ArrowRight = (p: IconProps) => <Icon {...p}>
    <path d="M4 12h15M13 6l6 6-6 6"/>
</Icon>
export const ArrowUpRight = (p: IconProps) => <Icon {...p}>
    <path d="M7 17 17 7M8 7h9v9"/>
</Icon>
export const Plus = (p: IconProps) => <Icon {...p}>
    <path d="M12 5v14M5 12h14"/>
</Icon>
export const Close = (p: IconProps) => <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18"/>
</Icon>
export const Check = (p: IconProps) => <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5"/>
</Icon>
export const Lock = (p: IconProps) => <Icon {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2"/>
    <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
</Icon>
export const Mail = (p: IconProps) => <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2"/>
    <path d="m4 7 8 6 8-6"/>
</Icon>
export const Phone = (p: IconProps) => <Icon {...p}>
    <rect x="7" y="2.5" width="10" height="19" rx="2.5"/>
    <path d="M11 18.5h2"/>
</Icon>
export const Calendar = (p: IconProps) => <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2"/>
    <path d="M8 3v4M16 3v4M3.5 10h17"/>
</Icon>
export const FileIcon = (p: IconProps) => <Icon {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>
    <path d="M14 3v5h5"/>
</Icon>
export const Upload = (p: IconProps) => <Icon {...p}>
    <path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>
</Icon>
export const Download = (p: IconProps) => <Icon {...p}>
    <path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>
</Icon>
export const Trash = (p: IconProps) => <Icon {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>
</Icon>
export const Message = (p: IconProps) => <Icon {...p}>
    <path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>
</Icon>
export const UserIcon = (p: IconProps) => <Icon {...p}>
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 21a8 8 0 0 1 16 0"/>
</Icon>
export const Users = (p: IconProps) => <Icon {...p}>
    <circle cx="9" cy="8" r="3.5"/>
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>
</Icon>
export const Logout = (p: IconProps) => <Icon {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>
</Icon>
export const Home = (p: IconProps) => <Icon {...p}>
    <path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>
</Icon>
export const LinkIcon = (p: IconProps) => <Icon {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/>
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>
</Icon>
export const Refresh = (p: IconProps) => <Icon {...p}>
    <path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>
</Icon>
export const Menu = (p: IconProps) => <Icon {...p}>
    <path d="M4 8h16M4 16h10"/>
</Icon>

export function GoogleIcon({size = 18}: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4"
                  d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2.1-1.9 3.3-4.8 3.3-8.1z"/>
            <path fill="#34A853"
                  d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10z"/>
            <path fill="#EA4335"
                  d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z"/>
        </svg>
    )
}

export const Play = (p: IconProps) => <Icon {...p}>
    <rect x="3" y="4" width="18" height="14" rx="3"/>
    <path d="M10 8.5v5l4.5-2.5z"/>
    <path d="M8 21h8"/>
</Icon>
export const CardIcon = (p: IconProps) => <Icon {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5"/>
    <path d="M2.5 10h19M6.5 15h4"/>
</Icon>
