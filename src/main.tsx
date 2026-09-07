import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { asegurarAsociacionesBasicas } from './services/asociacionesBasicas.ts'
import { instalarNormalizacionPeriodicidadDespensa } from './services/periodicidadDespensa.ts'
import { crearCopiaAutomaticaSiNecesaria } from './services/copiasSeguridad.ts'
import { aplicarMigracionVariedadV0922 } from './services/migracionV0922.ts'
import { instalarMigracionV0923 } from './services/migracionV0923.ts'

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('No se pudo registrar el modo PWA:', error)
    })
  })
}

crearCopiaAutomaticaSiNecesaria('antes de iniciar o actualizar PFI')
asegurarAsociacionesBasicas()
aplicarMigracionVariedadV0922()
instalarMigracionV0923()
instalarNormalizacionPeriodicidadDespensa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
