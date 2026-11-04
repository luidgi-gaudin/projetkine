import {getApp, getApps, initializeApp} from '@firebase/app'
import {getAuth} from '@firebase/auth'

// La clé web n'est JAMAIS écrite dans le code : elle vient uniquement du .env (VITE_FIREBASE_API_KEY),
// lu par Vite en développement et passé au build Docker en production.
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
if (!apiKey) {
    console.error('[synego] VITE_FIREBASE_API_KEY manquante dans .env : le site s\'affiche, mais la connexion est indisponible.')
}

const config = {
    // Sans clé, une valeur factice évite de bloquer tout le site : seules les connexions échouent, avec un message clair.
    apiKey: apiKey || 'cle-absente-voir-env',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'synego-b3b86.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'synego-b3b86',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'synego-b3b86.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '619219130972',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:619219130972:web:8f911b07057c54a9fa2499',
}

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config)
export const firebaseAuth = getAuth(firebaseApp)

// SMS et écrans Google dans la langue de l'appareil.
firebaseAuth.useDeviceLanguage()

// Démo / développement : avec des « numéros de test » déclarés dans la console Firebase
// (Authentication > Méthodes de connexion > Téléphone), aucun SMS ni reCAPTCHA réel n'est nécessaire.
if (import.meta.env.VITE_FIREBASE_PHONE_TEST_MODE === 'true') {
    firebaseAuth.settings.appVerificationDisabledForTesting = true
}
