import react from '@vitejs/plugin-react'
import {execFileSync} from 'node:child_process'
import {existsSync, mkdirSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {defineConfig} from 'vite'

const certFolder = join(homedir(), '.aspnet', 'https')
const certName = 'synego.client'
const certFile = join(certFolder, `${certName}.pem`)
const keyFile = join(certFolder, `${certName}.key`)

function getHttpsConfig() {
    if (existsSync(certFile) && existsSync(keyFile)) {
        return {cert: certFile, key: keyFile}
    }
    try {
        mkdirSync(certFolder, {recursive: true})
        execFileSync(
            'dotnet',
            ['dev-certs', 'https', '--export-path', certFile, '--format', 'Pem', '--no-password'],
            {stdio: 'pipe'},
        )
        if (existsSync(certFile) && existsSync(keyFile)) {
            return {cert: certFile, key: keyFile}
        }
    } catch {
        // Fallback transparent en HTTP si dotnet dev-certs n'est pas disponible (ex. conteneur Docker ou dev sans cert)
    }
    return undefined
}

const apiTarget = process.env.API_URL ?? 'http://localhost:5270'

// https://vite.dev/config/
export default defineConfig(({command}) => {
    // SYNEGO_DEV_HTTP=1 : dev en HTTP simple (localhost reste un contexte sécurisé pour Firebase Auth).
    const httpsConfig = command === 'serve' && process.env.SYNEGO_DEV_HTTP !== '1' ? getHttpsConfig() : undefined

    return {
        plugins: [react()],
        envDir: '..',
        server: {
            port: 5173,
            strictPort: true,
            https: httpsConfig,
            // Dans Docker (SYNEGO_DEV_POLL=1), les événements fichiers du Mac n'arrivent pas toujours : on interroge.
            watch: process.env.SYNEGO_DEV_POLL === '1' ? {usePolling: true, interval: 250} : undefined,
            proxy: {
                '/api': {
                    target: apiTarget,
                    secure: false, // certificat de dev auto-signé
                    changeOrigin: true,
                },
            },
        },
        build: {
            // Le build (dist/) est servi par nginx en production, qui proxifie /api vers l'API .NET.
            outDir: 'dist',
            emptyOutDir: true,
            // Jamais de police en data: (petits sous-ensembles < 4 Ko) : la CSP n'autorise que font-src 'self'.
            assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
        },
    }
})
