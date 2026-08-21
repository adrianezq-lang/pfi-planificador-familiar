import {
  Suspense,
  lazy,
  startTransition,
  useCallback,
  useEffect,
  useState,
} from 'react';
import BottomNav from './components/NavegacionInferior';
import { useMenu } from './hooks/useMenu';
import Home from './pages/Home';
import {
  EVENTO_ASOCIACIONES,
  repararAsociacionesIngredientes,
} from './services/asociacionesIngredientes';
import {
  cargarDespensa,
  sincronizarProductosRecetasConDespensa,
} from './services/despensa';
import { cargarRecetas, EVENTO_RECETAS } from './services/recetas';

const Menu = lazy(() => import('./pages/Menu'));
const Compra = lazy(() => import('./pages/Compra'));
const Recetas = lazy(() => import('./pages/Recetas'));
const Despensa = lazy(() => import('./pages/Despensa'));
const CatalogoMercadona = lazy(() => import('./pages/CatalogoMercadona'));
const Perfil = lazy(() => import('./pages/Perfil'));

export type Pantalla =
  | 'inicio'
  | 'menu'
  | 'compra'
  | 'despensa'
  | 'recetas'
  | 'catalogo'
  | 'perfil';

type VentanaConIdle = Window & {
  requestIdleCallback?: (
    callback: () => void,
    opciones?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (id: number) => void;
};

function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('inicio');
  const {
    menu,
    guardar,
    planMensual,
    guardarPlan,
    semanaActiva,
    seleccionarSemana,
  } = useMenu();

  const cambiarPantalla = useCallback((destino: Pantalla) => {
    startTransition(() => setPantalla(destino));
  }, []);

  useEffect(() => {
    let sincronizando = false;
    let pendiente = false;
    let cancelado = false;
    let temporizador: number | undefined;
    let idleId: number | undefined;

    const ejecutarSincronizacion = () => {
      if (cancelado) return;
      if (sincronizando) {
        pendiente = true;
        return;
      }

      sincronizando = true;
      const recetas = cargarRecetas();
      void repararAsociacionesIngredientes(recetas, cargarDespensa())
        .then(() => sincronizarProductosRecetasConDespensa(recetas))
        .finally(() => {
          sincronizando = false;
          if (pendiente && !cancelado) {
            pendiente = false;
            programarSincronizacion();
          }
        });
    };

    const programarSincronizacion = () => {
      const ventana = window as VentanaConIdle;
      if (ventana.requestIdleCallback) {
        idleId = ventana.requestIdleCallback(ejecutarSincronizacion, {
          timeout: 1800,
        });
      } else {
        temporizador = window.setTimeout(ejecutarSincronizacion, 250);
      }
    };

    programarSincronizacion();
    window.addEventListener(EVENTO_RECETAS, programarSincronizacion);
    window.addEventListener(EVENTO_ASOCIACIONES, programarSincronizacion);

    return () => {
      cancelado = true;
      window.removeEventListener(EVENTO_RECETAS, programarSincronizacion);
      window.removeEventListener(EVENTO_ASOCIACIONES, programarSincronizacion);
      if (temporizador !== undefined) window.clearTimeout(temporizador);
      if (idleId !== undefined) {
        (window as VentanaConIdle).cancelIdleCallback?.(idleId);
      }
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-logo" aria-hidden="true">
            🏡
          </div>
          <div className="app-brand">
            <h1>Planificador Familiar Inteligente</h1>
            <p>Menús, compra, despensa y presupuesto en un mismo lugar</p>
          </div>
          <span className="app-version">v0.9.15</span>
        </div>
      </header>

      <Suspense
        fallback={
          <main className="page page-loading" aria-live="polite">
            <div className="page-loading__dot" />
            <span>Abriendo…</span>
          </main>
        }
      >
        {pantalla === 'inicio' && (
          <Home
            menu={menu}
            planMensual={planMensual}
            semanaActiva={semanaActiva}
            navegar={cambiarPantalla}
          />
        )}
        {pantalla === 'menu' && (
          <Menu
            menu={menu}
            guardarMenu={guardar}
            planMensual={planMensual}
            guardarPlan={guardarPlan}
            semanaActiva={semanaActiva}
            seleccionarSemana={seleccionarSemana}
          />
        )}
        {pantalla === 'compra' && <Compra menu={menu} />}
        {pantalla === 'despensa' && <Despensa />}
        {pantalla === 'recetas' && <Recetas />}
        {pantalla === 'catalogo' && <CatalogoMercadona />}
        {pantalla === 'perfil' && <Perfil />}
      </Suspense>

      <BottomNav
        pantallaActual={pantalla}
        cambiarPantalla={cambiarPantalla}
      />
    </div>
  );
}

export default App;
