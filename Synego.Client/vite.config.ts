import react from '@vitejs/plugin-react'
import {execFileSync} from 'node:child_process'
import {existsSync, mkdirSync} from 'node:fs'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {defineConfig} from 'vite'

// En dev, Vite tourne en HTTPS avec le certificat de dev ASP.NET :
// le cookie d'auth (Secure, SameSite=Strict, __Host-) fonctionne dans tous les navigateurs.
const certFolder = join(homedir(), '.aspnet', 'https')
const certName = 'synego.client'
const certFile = join(certFolder, `${certName}.pem`)
const keyFile = join(certFolder, `${certName}.key`)

function ensureDevCert() {
    if (existsSync(certFile) && existsSync(keyFile)) return
    mkdirSync(certFolder, {recursive: true})
    try {
        execFileSync(
            'dotnet',
            ['dev-certs', 'https', '--export-path', certFile, '--format', 'Pem', '--no-password'],
            {stdio: 'inherit'},
        )
    } catch {
        throw new Error(
            `Certificat de dev introuvable (${certFile}). Lance sur ta machine :\n` +
            `  dotnet dev-certs https --trust\n` +
            `  dotnet dev-certs https --export-path ~/.aspnet/https/${certName}.pem --format Pem --no-password`,
        )
    }
}

const apiTarget = process.env.API_URL ?? 'https://localhost:7253'

// https://vite.dev/config/
export default defineConfig(({command}) => {
    if (command === 'serve') ensureDevCert()

    return {
        plugins: [react()],
        server: {
            port: 5173,
            strictPort: true,
            https: command === 'serve' ? {cert: certFile, key: keyFile} : undefined,
            proxy: {
                '/api': {
                    target: apiTarget,
                    secure: false, // certificat de dev auto-signé
                    changeOrigin: true,
                },
            },
        },
        build: {
            // Le build est servi par ASP.NET en production (même origine => pas de CORS).
            outDir: '../Synégo.Server/wwwroot',
            emptyOutDir: true,
        },
    }
})
