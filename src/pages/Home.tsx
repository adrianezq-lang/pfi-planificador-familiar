import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SemanaMenu } from '../data/MenuMensual';
import type { DiaMenu } from '../data/Menusemanal';
import { useRecetas } from '../hooks/useRecetas';
import { generarCompraMercadona } from '../motor/compra';
import {
  calcularReposicion,
  cargarDespensa,
  EVENTO_DESPENSA,
  type ProductoDespensa,
} from '../services/despensa';
import { EVENTO_INVENTARIO } from '../services/inventario';
import {
  formatearPlatosMenu,
  formatearPostreMenu,
  iconoRecetaPostre,
  obtenerRecetaPostre,
} from '../services/menu';
import {
  calcularResumenPresupuestoMensual,
  type ResumenPresupuestoMensual,
} from '../services/presupuestoMensual';

type DestinoInicio = 'menu' | 'compra' | 'despensa';
type VentanaConIdle = Window & { requestIdleCallback?: (callback: () => void, opciones?: { timeout?: number }) => number; cancelIdleCallback?: (id: number) => void };
type HomeProps = { menu: DiaMenu[]; planMensual: SemanaMenu[]; semanaActiva: number; navegar: (destino: DestinoInicio) => void };
const RESUMEN_VACIO: ResumenPresupuestoMensual = { presupuestoSemanal: 0, presupuestoMensual: 0, totalAcumulado: 0, mostrarPresupuestoMensual: true };

function Home({ menu, planMensual, semanaActiva, navegar }: HomeProps) {
  const { recetas } = useRecetas();
  const [presupuesto, setPresupuesto] = useState<ResumenPresupuestoMensual>(RESUMEN_VACIO);
  const [despensa, setDespensa] = useState<ProductoDespensa[]>([]);
  const [version, setVersion] = useState(0);
  const cargarResumen = useCallback(async () => {
    setDespensa(cargarDespensa());
    try {
      const semanasIncluidas = planMensual.slice(0, Math.max(1, semanaActiva + 1)).filter((semana) => !semana.excluida);
      const resultados = await Promise.all(semanasIncluidas.map((semana) => generarCompraMercadona(semana.menu)));
      setPresupuesto(resultados.length ? calcularResumenPresupuestoMensual(resultados, Math.max(0, resultados.length - 1)) : RESUMEN_VACIO);
    } catch { setPresupuesto(RESUMEN_VACIO); }
  }, [menu, planMensual, semanaActiva, recetas]);
  useEffect(() => { const ventana = window as VentanaConIdle; let cancelado=false; let idleId:number|undefined; let temporizador:number|undefined; const ejecutar=()=>{if(!cancelado) void cargarResumen();}; if(ventana.requestIdleCallback) idleId=ventana.requestIdleCallback(ejecutar,{timeout:1200}); else temporizador=window.setTimeout(ejecutar,120); return()=>{cancelado=true;if(temporizador!==undefined)window.clearTimeout(temporizador);if(idleId!==undefined)ventana.cancelIdleCallback?.(idleId);};},[cargarResumen,version]);
  useEffect(()=>{const actualizar=()=>setVersion((v)=>v+1);window.addEventListener(EVENTO_DESPENSA,actualizar);window.addEventListener(EVENTO_INVENTARIO,actualizar);return()=>{window.removeEventListener(EVENTO_DESPENSA,actualizar);window.removeEventListener(EVENTO_INVENTARIO,actualizar);};},[]);
  const diasSemana=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const menuHoy=menu.find((dia)=>dia.dia===diasSemana[new Date().getDay()])??menu[0];
  const reposicion=useMemo(()=>despensa.filter((p)=>calcularReposicion(p)>0).sort((a,b)=>calcularReposicion(b)-calcularReposicion(a)),[despensa]);
  return <main className="page"><section className="home-grid"><HomeCard destino="menu" navegar={navegar} icono="🍽️" etiqueta="Menú del día" className="home-card--menu">{menuHoy?<><h2 className="home-day">{menuHoy.dia}</h2><div className="meal-stack"><MealRow etiqueta="COMIDA" nombre={formatearPlatosMenu(menuHoy.comida)}/><MealRow etiqueta="CENA" nombre={formatearPlatosMenu(menuHoy.cena)}/><MealRow etiqueta="POSTRE COMIDA" nombre={`${iconoRecetaPostre(obtenerRecetaPostre(menuHoy,'comida'))} ${formatearPostreMenu(menuHoy,'comida')}`}/><MealRow etiqueta="POSTRE CENA" nombre={`${iconoRecetaPostre(obtenerRecetaPostre(menuHoy,'cena'))} ${formatearPostreMenu(menuHoy,'cena')}`}/></div></>:<p className="empty-copy">No hay menú disponible.</p>}</HomeCard><div className="home-side-grid"><HomeCard destino="menu" navegar={navegar} icono="🧊" etiqueta="Preparar para mañana" className="home-card--prep"><p className="home-highlight-text">{menuHoy?.preparar||'Nada pendiente'}</p></HomeCard><HomeCard destino="despensa" navegar={navegar} icono="📦" etiqueta="Próximas reposiciones" className="home-card--restock">{reposicion.length?<div className="restock-list">{reposicion.slice(0,4).map((p)=><div className="restock-row" key={p.id}><span>{p.nombre}</span><strong>+{calcularReposicion(p)} {p.unidad}</strong></div>)}{reposicion.length>4&&<small className="empty-copy">y {reposicion.length-4} más</small>}</div>:<p className="empty-copy">No hay reposiciones pendientes.</p>}</HomeCard></div></section><section className={`budget-grid${presupuesto.mostrarPresupuestoMensual?'':' budget-grid--compact'}`}><BudgetCard etiqueta="Presupuesto semanal" icono="🥬" valor={presupuesto.presupuestoSemanal} navegar={navegar}/>{presupuesto.mostrarPresupuestoMensual&&<BudgetCard etiqueta="Presupuesto mensual" icono="🧺" valor={presupuesto.presupuestoMensual} navegar={navegar}/>}<BudgetCard etiqueta="Total acumulado" icono="💶" valor={presupuesto.totalAcumulado} navegar={navegar} total/></section></main>;
}
function HomeCard({destino,navegar,icono,etiqueta,className='',children}:{destino:DestinoInicio;navegar:(destino:DestinoInicio)=>void;icono:string;etiqueta:string;className?:string;children:ReactNode}){return <button type="button" onClick={()=>navegar(destino)} className={`pfi-card home-card ${className}`.trim()} aria-label={`${etiqueta}. Abrir ${destino}`}><div className="home-card__body"><div className="home-card__top"><span className="home-card__eyebrow"><span className="home-card__icon" aria-hidden="true">{icono}</span>{etiqueta}</span><span className="home-card__arrow" aria-hidden="true">→</span></div>{children}</div></button>}
function MealRow({etiqueta,nombre}:{etiqueta:string;nombre:string}){return <div className="meal-row"><span className="meal-row__label">{etiqueta}</span><strong>{nombre}</strong></div>}
function BudgetCard({etiqueta,icono,valor,navegar,total=false}:{etiqueta:string;icono:string;valor:number;navegar:(destino:DestinoInicio)=>void;total?:boolean}){return <HomeCard destino="compra" navegar={navegar} icono={icono} etiqueta={etiqueta} className={`budget-card${total?' budget-card--total':''}`}><p className="budget-amount">{valor.toLocaleString('es-ES',{style:'currency',currency:'EUR'})}</p></HomeCard>}
export default Home;
