import {useCallback, useEffect, useState} from 'react'
import {api} from './client'

/** Charge une ressource de l'API et expose `reload` après une modification. */
export function useResource<T>(path: string | null) {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<Error | null>(null)
    const [version, setVersion] = useState(0)

    useEffect(() => {
        if (!path) return
        let cancelled = false
        api<T>(path)
            .then((result) => {
                if (!cancelled) {
                    setData(result)
                    setError(null)
                }
            })
            .catch((err: Error) => {
                if (!cancelled) setError(err)
            })
        return () => {
            cancelled = true
        }
    }, [path, version])

    const reload = useCallback(() => setVersion((v) => v + 1), [])
    return {data, error, reload, loading: data === null && error === null}
}
