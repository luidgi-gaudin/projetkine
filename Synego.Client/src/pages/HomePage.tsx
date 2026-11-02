import {useAuth} from '../auth/AuthContext'

export function HomePage() {
    const {user, logout} = useAuth()

    return (
        <section className="card">
            <h1>Synégo</h1>
            <p>Connecté en tant que <strong>{user?.email}</strong>.</p>
            <button type="button" onClick={() => void logout()}>Se déconnecter</button>
        </section>
    )
}
