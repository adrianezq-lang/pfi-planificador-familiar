import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { asegurarAsociacionesBasicas } from './services/asociacionesBasicas.ts'
import { instalarNormalizacionPeriodicidadDespensa } from './services/periodicidadDespensa.ts'
import { crearCopiaAutomaticaSiNecesaria } from './services/copiasSeguridad.ts'
import { aplicarMigracionVariedadV0922 } from './services/migracionV0922.ts'
import { instalarMigracionV0923 } from './services/migracionV0923.ts'

const EVENTO_VERSION_DISPONIBLE = 'pfi-version-disponible'

function recursoPrincipalActual(): string | null {
  const script = Array.from(document.scripts).find((elemento) =>
    elemento.type === 'module' && elemento.src.includes('/assets/index-'),
  )
  return script ? new URL(script.src).pathname : null
}

async function comprobarVersionPublicada(): Promise<void> {
  if (!navigator.onLine) return

  try {
    const actual = recursoPrincipalActual()
    if (!actual) return

    const respuesta = await fetch(`/?pfi-version=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
    if (!respuesta.ok) return

    const html = await respuesta.text()
    const coincidencia = html.match(
      /<script[^>]+src=["']([^"']*\/assets\/index-[^"']+\.js)["']/i,
    )
    if (!coincidencia) return

    const publicada = new URL(coincidencia[1], window.location.origin).pathname
    if (publicada !== actual) {
      window.dispatchEvent(new CustomEvent(EVENTO_VERSION_DISPONIBLE))
    }
  } catch {
    // Una comprobación de actualización nunca debe impedir usar PFI.
  }
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const teniaControlador = Boolean(navigator.serviceWorker.controller)
    let recargandoPorActualizacion = false

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!teniaControlador || recargandoPorActualizacion) return
      recargandoPorActualizacion = true
      window.location.reload()
    })

    navigator.serviceWorker
      .register('/sw.js')
      .then((registro) => {
        void registro.update()
        void comprobarVersionPublicada()

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState !== 'visible') return
          void registro.update()
          void comprobarVersionPublicada()
        })

        window.addEventListener('focus', () => {
          void comprobarVersionPublicada()
        })
      })
      .catch((error) => {
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
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
