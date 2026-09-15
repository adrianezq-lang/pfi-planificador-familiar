import { Component, type ErrorInfo, type ReactNode } from 'react';
import { crearCopiaAutomaticaSiNecesaria } from '../services/copiasSeguridad';

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PFI ha recuperado un error de interfaz.', error, info);
    try {
      crearCopiaAutomaticaSiNecesaria('recuperación tras un error de interfaz');
    } catch {
      // El panel de recuperación debe mostrarse incluso si el almacenamiento está lleno.
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main
        role="alert"
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#f7f3e9',
          color: '#263229',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <section
          style={{
            width: 'min(560px, 100%)',
            padding: 24,
            borderRadius: 20,
            background: '#fff',
            boxShadow: '0 18px 55px rgba(48, 62, 51, .14)',
          }}
        >
          <span style={{ fontSize: 34 }} aria-hidden="true">🛟</span>
          <h1 style={{ margin: '10px 0 8px', color: '#405f45' }}>
            PFI ha tenido un problema
          </h1>
          <p style={{ lineHeight: 1.55, color: '#59645b' }}>
            Tus datos locales no se han borrado. Puedes volver a cargar la app y continuar.
            Si el problema se repite, entra después en Perfil → Datos y copias para revisar o
            restaurar un estado anterior.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              width: '100%',
              marginTop: 10,
              border: 0,
              borderRadius: 12,
              padding: '12px 14px',
              background: '#4f6f52',
              color: '#fff',
              font: 'inherit',
              fontWeight: 850,
              cursor: 'pointer',
            }}
          >
            Volver a cargar PFI
          </button>
          <details style={{ marginTop: 14, color: '#6e756f', fontSize: 12 }}>
            <summary>Detalle técnico</summary>
            <code style={{ display: 'block', marginTop: 8, overflowWrap: 'anywhere' }}>
              {this.state.error.message}
            </code>
          </details>
        </section>
      </main>
    );
  }
}
