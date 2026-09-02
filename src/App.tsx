import { Suspense, lazy, useCallback, useEffect, useState, startTransition } from 'react';
import './styles/recetario-tabs.css';
import './styles/pfi-polish.css';
import './styles/navigation-polish.css';
import BottomNav from './components/NavegacionInferior';
import NavegacionRecetario from './components/NavegacionRecetario';
import RescateAsociaciones from './components/RescateAsociaciones';
import { useMenu } from './hooks/useMenu';
import { RecetarioFiltroProvider } from './hooks/useRecetas';
import Home from './pages/Home';
import { asegurarAsociacionesBasicas } from './services/asociacionesBasicas';
import { EVENTO_ASOCIACIONES, repararAsociacionesIngredientes } from './services/asociacionesIngredientes';
import { cargarDespensa, sincronizarProductosRecetasConDespensa } from './services/despensa';
import { cargarRecetas, EVENTO_RECETAS } from './services/recetas';
import { EVENTO_EXCEPCIONES, menuEfectivoMes, menuEfectivoSemana } from './services/excepcionesCalendario';
import { preservarCopiasAsociacionesExistentes } from './services/rescateAsociaciones';

const Menu = lazy(() => import('./pages/Menu'));
const Compra = lazy(() => import('./pages/CompraPlanificada'));
const Recetas = lazy(() => import('./pages/Recetas'));
const Postres = lazy(() => import('./pages/Postres'));
const Despensa = lazy(() => import('./pages/Despensa'));
const CatalogoMercadona = lazy(() => import('./pages/CatalogoMercadona'));
const Perfil = lazy(() => import('./pages/Perfil'));

export type Pantalla = 'inicio' | 'menu' | 'compra' | 'despensa' | 'recetas' | 'postres' | 'catalogo' | 'perfil';

function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('inicio');
  const [revisionExcepciones, setRevisionExcepciones] = useState(0);
  const {
    menu,
    planMensual,
    semanaActiva,
    seleccionarSemana,
    mesActivo,
    cambiarMes,
    excluirSemana,
    generarNuevoMes,
    reiniciarMes,
  } = useMenu();

  const cambiarPantalla = useCallback(
    (destino: Pantalla) => startTransition(() => setPantalla(destino)),
    [],
  );

  const menusSemanasCompra = planMensual.map((semana) => menuEfectivoSemana(semana));
  const menuCompra = menusSemanasCompra[semanaActiva] ?? [];
  const menuMes = menuEfectivoMes(planMensual);
  void revisionExcepciones;

  useEffect(() => {
    const actualizar = () => setRevisionExcepciones((valor) => valor + 1);
    window.addEventListener(EVENTO_EXCEPCIONES, actualizar);
    return () => window.removeEventListener(EVENTO_EXCEPCIONES, actualizar);
  }, []);

  useEffect(() => {
    let cancelado = false;
    const sync = () => {
      if (cancelado) return;

      // Antes de cualquier reparación, conserva todas las variantes que todavía
      // existan en localStorage para que una reparación nunca vuelva a pisar la
      // única copia recuperable.
      preservarCopiasAsociacionesExistentes();
      asegurarAsociacionesBasicas();

      const recetas = cargarRecetas();
      void repararAsociacionesIngredientes(recetas, cargarDespensa()).then(() =>
        sincronizarProductosRecetasConDespensa(recetas),
      );
    };

    sync();
    window.addEventListener(EVENTO_RECETAS, sync);
    window.addEventListener(EVENTO_ASOCIACIONES, sync);
    return () => {
      cancelado = true;
      window.removeEventListener(EVENTO_RECETAS, sync);
      window.removeEventListener(EVENTO_ASOCIACIONES, sync);
    };
  }, []);

  return (
    <div className={`app-shell app-shell--${pantalla}`}>
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-logo" aria-hidden="true">🏡</div>
          <div className="app-brand">
            <h1>Planificador Familiar Inteligente</h1>
            <p>Menús, compra, despensa y presupuesto</p>
          </div>
          <span className="app-version">PFI</span>
        </div>
      </header>

      <RescateAsociaciones />

      <NavegacionRecetario pantalla={pantalla} cambiarPantalla={cambiarPantalla} />

      <Suspense fallback={<main className="page page-loading"><span>Abriendo…</span></main>}>
        {pantalla === 'inicio' && (
          <Home
            menu={menuCompra}
            menusSemanas={menusSemanasCompra}
            menuMes={menuMes}
            planMensual={planMensual}
            semanaActiva={semanaActiva}
            navegar={cambiarPantalla}
          />
        )}
        {pantalla === 'menu' && (
          <Menu
            menu={menu}
            planMensual={planMensual}
            semanaActiva={semanaActiva}
            seleccionarSemana={seleccionarSemana}
            mesActivo={mesActivo}
            cambiarMes={cambiarMes}
            excluirSemana={excluirSemana}
            generarNuevoMes={generarNuevoMes}
            reiniciarMes={reiniciarMes}
          />
        )}
        {pantalla === 'compra' && (
          <Compra
            menu={menuCompra}
            menuMes={menuMes}
            menusSemanas={menusSemanasCompra}
            mesActivo={mesActivo}
            semanaActiva={semanaActiva}
          />
        )}
        {pantalla === 'despensa' && <Despensa />}
        {pantalla === 'recetas' && (
          <RecetarioFiltroProvider filtro="platos">
            <Recetas />
          </RecetarioFiltroProvider>
        )}
        {pantalla === 'postres' && (
          <RecetarioFiltroProvider filtro="postres">
            <Postres />
          </RecetarioFiltroProvider>
        )}
        {pantalla === 'catalogo' && <CatalogoMercadona />}
        {pantalla === 'perfil' && <Perfil />}
      </Suspense>

      <BottomNav
        pantallaActual={pantalla === 'postres' ? 'recetas' : pantalla}
        cambiarPantalla={cambiarPantalla}
      />
    </div>
  );
}

export default App;
