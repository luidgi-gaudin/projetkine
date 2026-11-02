/** Erreur renvoyée par l'API (format ProblemDetails / ValidationProblem d'ASP.NET). */
export class ApiError extends Error {
    readonly status: number
    readonly errors: Record<string, string[]>

    constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
        super(message)
        this.status = status
        this.errors = errors
    }
}

type ProblemDetails = {
    title?: string
    detail?: string
    errors?: Record<string, string[]>
}

/**
 * Wrapper fetch pour l'API.
 * - same-origin : le cookie HttpOnly est envoyé automatiquement (aucun token en JS).
 * - X-Requested-With : en-tête exigé par le serveur (protection CSRF).
 */
export async function api<T = void>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    headers.set('X-Requested-With', 'XMLHttpRequest')
    if (init.body !== undefined && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
    }

    const response = await fetch(`/api${path}`, {
        ...init,
        headers,
        credentials: 'same-origin',
    })

    if (!response.ok) {
        let problem: ProblemDetails = {}
        try {
            problem = (await response.json()) as ProblemDetails
        } catch {
            // réponse sans corps JSON
        }
        const message = problem.detail ?? problem.title ?? `Erreur HTTP ${response.status}`
        throw new ApiError(response.status, message, problem.errors)
    }

    if (response.status === 204 || response.headers.get('Content-Length') === '0') {
        return undefined as T
    }
    const text = await response.text()
    return (text ? JSON.parse(text) : undefined) as T
}

export const json = (body: unknown) => JSON.stringify(body)
