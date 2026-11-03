/** Événement à ajouter dans l'agenda du client. */
export type CalendarEvent = {
    id: string
    title: string
    start: string
    end: string
    description?: string
    location?: string | null
    url?: string | null
}

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Lien Google Agenda pré-rempli. */
export function googleCalendarUrl(e: CalendarEvent) {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: e.title,
        dates: `${stamp(e.start)}/${stamp(e.end)}`,
        details: [e.description, e.url].filter(Boolean).join('\n\n'),
        location: e.url ?? e.location ?? '',
    })
    return `https://calendar.google.com/calendar/render?${params}`
}

/** Lien Outlook (outlook.com / Microsoft 365) pré-rempli. */
export function outlookCalendarUrl(e: CalendarEvent) {
    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: e.title,
        startdt: new Date(e.start).toISOString(),
        enddt: new Date(e.end).toISOString(),
        body: [e.description, e.url].filter(Boolean).join('\n\n'),
        location: e.url ?? e.location ?? '',
    })
    return `https://outlook.live.com/calendar/0/action/compose?${params}`
}

const escapeIcs = (text: string) => text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Fichier .ics standard : Apple Calendar, Samsung Calendar, Thunderbird… (alerte 1 h avant). */
export function icsContent(e: CalendarEvent) {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Synego//Rendez-vous//FR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${e.id}@synego`,
        `DTSTAMP:${stamp(new Date().toISOString())}`,
        `DTSTART:${stamp(e.start)}`,
        `DTEND:${stamp(e.end)}`,
        `SUMMARY:${escapeIcs(e.title)}`,
        e.description || e.url ? `DESCRIPTION:${escapeIcs([e.description, e.url].filter(Boolean).join('\n\n'))}` : '',
        e.url || e.location ? `LOCATION:${escapeIcs(e.url ?? e.location ?? '')}` : '',
        e.url ? `URL:${e.url}` : '',
        'BEGIN:VALARM',
        'TRIGGER:-PT1H',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapeIcs(e.title)}`,
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
    ]
    return lines.filter(Boolean).join('\r\n')
}

export function downloadIcs(e: CalendarEvent) {
    const url = URL.createObjectURL(new Blob([icsContent(e)], {type: 'text/calendar;charset=utf-8'}))
    const link = document.createElement('a')
    link.href = url
    link.download = `synego-${e.start.slice(0, 10)}.ics`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
