import { Suspense, lazy, useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import './styles/recetario-tabs.css';
import './styles/pfi-polish.css';
import './styles/navigation-polish.css';
import './styles/premium-modern.css';
import './styles/premium-navigation.css';
import './styles/premium-final.css';
import './styles/pro-product.css';
import './styles/mobile-visual-fixes.css';
import './styles/premium-v2.css';
import './styles/premium-v3.css';
import './styles/premium-v4.css';
import './styles/premium-v5.css';
import './styles/assistant-pro.css';
import BottomNav from './components/NavegacionInferior';
import AppIcon from './components/AppIcon';
import NavegacionRecetario from './components/NavegacionRecetario';
import ContextoFamiliar from './components/ContextoFamiliar';
import { useMenu } from './hooks/useMenu';
import { RecetarioFiltroProvider } from './hooks/useRecetas';
import Home from './pages/Home';
import { asegurarAsociacionesBasicas } from './services/asociacionesBasicas';
import { EVENTO_ASOCIACIONES, repararAsociacionesIngredientes } from './services/asociacionesIngredientes';
import { cargarDespensa, sincronizarProductosRecetasConDespensa } from './services/despensa';
import { cargarRecetas, EVENTO_RECETAS } from './services/recetas';
import { cargarExcepciones, EVENTO_EXCEPCIONES, menuEfectivoMes, menuEfectivoSemana } from './services/excepcionesCalendario';
import { preservarCopiasAsociacionesExistentes } from './services/rescateAsociaciones';
import { crearCopiaAutomaticaSiNecesaria } from './services/copiasSeguridad';

const Menu = lazy(() => import('./pages/MenuModern'));
const Compra = lazy(() => import('./pages/CompraModern'));
const Recetas = lazy(() => import('./pages/Recetas'));
const Postres = lazy(() => import('./pages/Postres'));
const Despensa = lazy(() => import('./pages/Despensa'));
const CatalogoMercadona = lazy(() => import('./pages/CatalogoMercadona'));
const Perfil = lazy(() => import('./pages/Perfil'));
const Asistente = lazy(() => import('./pages/Asistente'));

export type Pantalla = 'inicio' | 'menu' | 'asistente' | 'compra' | 'despensa' | 'recetas' | 'postres' | 'catalogo' | 'perfil';

function App() {
  const [pantalla, setPantalla] = useState<Pantalla>('inicio');
  const [excepciones, setExcepciones] = useState(cargarExcepciones);
  const [sinConexion, setSinConexion] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  );
  const [actualizacionDisponible, setActualizacionDisponible] = useState(false);
  const {
    menu,
    planMensual,
    semanaActiva,
    guardar: guardarMenu,
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

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pantalla]);

  const menusSemanasCompra = useMemo(
    () => planMensual.map((semana) => menuEfectivoSemana(semana, excepciones)),
    [planMensual, excepciones],
  );
  const menuCompra = menusSemanasCompra[semanaActiva] ?? [];
  const menuMes = useMemo(
    () => menuEfectivoMes(planMensual, excepciones),
    [planMensual, excepciones],
  );

  useEffect(() => {
    const actualizar = () => setExcepciones(cargarExcepciones());
    window.addEventListener(EVENTO_EXCEPCIONES, actualizar);
    return () => window.removeEventListener(EVENTO_EXCEPCIONES, actualizar);
  }, []);

  useEffect(() => {
    const mostrarActualizacion = () => setActualizacionDisponible(true);
    window.addEventListener('pfi-version-disponible', mostrarActualizacion);
    return () =>
      window.removeEventListener('pfi-version-disponible', mostrarActualizacion);
  }, []);

  useEffect(() => {
    const conectado = () => setSinConexion(false);
    const desconectado = () => setSinConexion(true);
    window.addEventListener('online', conectado);
    window.addEventListener('offline', desconectado);
    return () => {
      window.removeEventListener('online', conectado);
      window.removeEventListener('offline', desconectado);
    };
  }, []);

  useEffect(() => {
    crearCopiaAutomaticaSiNecesaria('antes de la revisión automática');

    const protegerAlSalir = () => {
      crearCopiaAutomaticaSiNecesaria('cierre o pausa de PFI');
    };
    const protegerAlOcultar = () => {
      if (document.visibilityState === 'hidden') protegerAlSalir();
    };

    window.addEventListener('pagehide', protegerAlSalir);
    document.addEventListener('visibilitychange', protegerAlOcultar);
    return () => {
      window.removeEventListener('pagehide', protegerAlSalir);
      document.removeEventListener('visibilitychange', protegerAlOcultar);
    };
  }, []);

  useEffect(() => {
    let cancelado = false;
    const sync = () => {
      if (cancelado) return;

      preservarCopiasAsociacionesExistentes();
      asegurarAsociacionesBasicas();

      const recetas = cargarRecetas();
      void repararAsociacionesIngredientes(recetas, cargarDespensa()).then(() => {
        sincronizarProductosRecetasConDespensa(recetas);
        crearCopiaAutomaticaSiNecesaria('revisión automática completada');
      });
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
          <div className="app-logo" aria-hidden="true"><AppIcon name="home" size={25} /></div>
          <div className="app-brand">
            <h1>PFI</h1>
            <p>Planificador familiar</p>
          </div>
          <span className="app-version">v0.9.45</span>
        </div>
      </header>

      {actualizacionDisponible && (
        <aside className="app-update-banner" role="status">
          <span>
            <strong>PFI se ha actualizado</strong>
            <small>Hay una versión nueva lista para usar.</small>
          </span>
          <button type="button" onClick={() => window.location.reload()}>
            Actualizar ahora
          </button>
        </aside>
      )}

      {sinConexion && (
        <div
          role="status"
          style={{
            margin: '8px auto 0',
            width: 'min(960px, calc(100% - 24px))',
            padding: '8px 12px',
            borderRadius: 12,
            background: '#fff3d9',
            color: '#6d5620',
            fontSize: 13,
            fontWeight: 800,
            textAlign: 'center',
          }}
        >
          Sin conexión · PFI sigue disponible con los datos guardados en este dispositivo.
        </div>
      )}

      <NavegacionRecetario pantalla={pantalla} cambiarPantalla={cambiarPantalla} />

      {(pantalla === 'menu' || pantalla === 'compra') && <ContextoFamiliar />}

      <Suspense fallback={<main className="page page-loading"><span>Abriendo…</span></main>}>
        {pantalla === 'inicio' && (
          <Home
            menu={menuCompra}
            menusSemanas={menusSemanasCompra}
            menuMes={menuMes}
            semanaActiva={semanaActiva}
            navegar={cambiarPantalla}
          />
        )}
        {pantalla === 'menu' && (
          <Menu
            menu={menu}
            planMensual={planMensual}
            semanaActiva={semanaActiva}
            guardar={guardarMenu}
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
        {pantalla === 'asistente' && (
          <Asistente
            menu={menuCompra}
            menuEditable={menu}
            menuMes={menuMes}
            menusSemanas={menusSemanasCompra}
            planMensual={planMensual}
            semanaActiva={semanaActiva}
            mesActivo={mesActivo}
            guardarMenu={guardarMenu}
            navegar={cambiarPantalla}
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
