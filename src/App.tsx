import { Suspense, lazy, useCallback, useEffect, useState, startTransition } from 'react';
import './styles/recetario-tabs.css';
import BottomNav from './components/NavegacionInferior';
import NavegacionRecetario from './components/NavegacionRecetario';
import { useMenu } from './hooks/useMenu';
import Home from './pages/Home';
import { EVENTO_ASOCIACIONES, repararAsociacionesIngredientes } from './services/asociacionesIngredientes';
import { cargarDespensa, sincronizarProductosRecetasConDespensa } from './services/despensa';
import { cargarRecetas, EVENTO_RECETAS } from './services/recetas';
const Menu = lazy(() => import('./pages/Menu'));
const Compra = lazy(() => import('./pages/Compra'));
const Recetas = lazy(() => import('./pages/Recetas'));
const Postres = lazy(() => import('./pages/Postres'));
const Despensa = lazy(() => import('./pages/Despensa'));
const CatalogoMercadona = lazy(() => import('./pages/CatalogoMercadona'));
const Perfil = lazy(() => import('./pages/Perfil'));
export type Pantalla = 'inicio'|'menu'|'compra'|'despensa'|'recetas'|'postres'|'catalogo'|'perfil';
function App() {
 const [pantalla,setPantalla]=useState<Pantalla>('inicio');
 const {menu,planMensual,semanaActiva,seleccionarSemana,mesActivo,cambiarMes,excluirSemana,generarNuevoMes,reiniciarMes}=useMenu();
 const cambiarPantalla=useCallback((destino:Pantalla)=>startTransition(()=>setPantalla(destino)),[]);
 useEffect(()=>{let cancelado=false;const sync=()=>{if(cancelado)return;const recetas=cargarRecetas();void repararAsociacionesIngredientes(recetas,cargarDespensa()).then(()=>sincronizarProductosRecetasConDespensa(recetas));};sync();window.addEventListener(EVENTO_RECETAS,sync);window.addEventListener(EVENTO_ASOCIACIONES,sync);return()=>{cancelado=true;window.removeEventListener(EVENTO_RECETAS,sync);window.removeEventListener(EVENTO_ASOCIACIONES,sync);};},[]);
 return <div className="app-shell">
  <header className="app-header"><div className="app-header__inner"><div className="app-logo" aria-hidden="true">🏡</div><div className="app-brand"><h1>Planificador Familiar Inteligente</h1><p>Menús, compra, despensa y presupuesto</p></div><span className="app-version">PFI</span></div></header>
  <Suspense fallback={<main className="page page-loading"><span>Abriendo…</span></main>}>
   {pantalla==='inicio'&&<Home menu={menu} planMensual={planMensual} semanaActiva={semanaActiva} navegar={cambiarPantalla}/>} 
   {pantalla==='menu'&&<Menu menu={menu} planMensual={planMensual} semanaActiva={semanaActiva} seleccionarSemana={seleccionarSemana} mesActivo={mesActivo} cambiarMes={cambiarMes} excluirSemana={excluirSemana} generarNuevoMes={generarNuevoMes} reiniciarMes={reiniciarMes}/>} 
   {pantalla==='compra'&&<Compra menu={menu}/>} {pantalla==='despensa'&&<Despensa/>} {pantalla==='recetas'&&<Recetas/>} {pantalla==='postres'&&<Postres/>} {pantalla==='catalogo'&&<CatalogoMercadona/>} {pantalla==='perfil'&&<Perfil/>}
  </Suspense>
  <NavegacionRecetario pantalla={pantalla} cambiarPantalla={cambiarPantalla}/>
  <BottomNav pantallaActual={pantalla === 'postres' ? 'recetas' : pantalla} cambiarPantalla={cambiarPantalla}/>
 </div>;
}
export default App;
