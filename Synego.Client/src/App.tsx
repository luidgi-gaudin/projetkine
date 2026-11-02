import {Navigate, Route, Routes} from 'react-router'
import {RequireAuth} from './auth/RequireAuth'
import {HomePage} from './pages/HomePage'
import {LoginPage} from './pages/LoginPage'
import {RegisterPage} from './pages/RegisterPage'
import './App.css'

export default function App() {
    return (
        <main>
            <Routes>
                <Route path="/login" element={<LoginPage/>}/>
                <Route path="/register" element={<RegisterPage/>}/>
                <Route path="/" element={<RequireAuth><HomePage/></RequireAuth>}/>
                <Route path="*" element={<Navigate to="/" replace/>}/>
            </Routes>
        </main>
    )
}
