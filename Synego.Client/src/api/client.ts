/** Erreur renvoyée par l'API (format ProblemDetails / ValidationProblem d'ASP.NET). */
export class ApiError extends Error {
    readonly status: number
    readonly errors: Record<string, string[]>

    constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
        super(message)
        this.status = status
        this.errors = errors
    }

    /** Tous les messages, à plat (validation incluse). */
    get messages(): string[] {
        const list = Object.values(this.errors).flat()
        return list.length > 0 ? list : [this.message]
    }
}

let tokenProvider: (() => Promise<string | null>) | null = null

export function setAuthTokenProvider(provider: () => Promise<string | null>) {
    tokenProvider = provider
}

type ProblemDetails = {
    title?: string
    detail?: string
    errors?: Record<string, string[]>
}

async function send(path: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    if (typeof init.body === 'string' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
    }

    // L'ID token Firebase est envoyé en Bearer : pas de cookie, donc pas de CSRF possible.
    const token = tokenProvider ? await tokenProvider() : null
    if (token) headers.set('Authorization', `Bearer ${token}`)

    const response = await fetch(`/api${path}`, {...init, headers})
    if (!response.ok) {
        let problem: ProblemDetails = {}
        try {
            problem = (await response.json()) as ProblemDetails
        } catch {
            // réponse sans corps JSON
        }
        const fallback = response.status === 429
            ? 'Trop de demandes en peu de temps. Réessayez dans quelques minutes.'
            : `Erreur ${response.status}`
        throw new ApiError(response.status, problem.detail ?? problem.title ?? fallback, problem.errors)
    }
    return response
}

/** Appel JSON vers l'API. */
export async function api<T = void>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await send(path, init)
    if (response.status === 204 || response.status === 202) return undefined as T
    const text = await response.text()
    return (text ? JSON.parse(text) : undefined) as T
}

export const json = (body: unknown) => JSON.stringify(body)

/** Envoi d'un fichier (multipart). */
export function upload<T>(path: string, file: File, fields: Record<string, string> = {}): Promise<T> {
    const form = new FormData()
    form.append('file', file)
    for (const [key, value] of Object.entries(fields)) form.append(key, value)
    return api<T>(path, {method: 'POST', body: form})
}

/** Téléchargement authentifié : le fichier transite par l'API, jamais par un lien public. */
export async function download(path: string, fileName: string) {
    const response = await send(path, {})
    const url = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
