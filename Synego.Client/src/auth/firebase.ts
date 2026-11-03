import {getApp, getApps, initializeApp} from 'firebase/app'
import {getAuth} from 'firebase/auth'

const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBV6wb5qBhnzDhXvyaK_2XoIjovMNx6hnk',
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
