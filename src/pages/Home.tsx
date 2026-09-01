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
import { calcularReposicion, cargarDespensa, EVENTO_DESPENSA, type ProductoDespensa } from '../services/despensa';
import { EVENTO_INVENTARIO } from '../services/inventario';
import { formatearPlatosMenu, formatearPostreMenu, iconoRecetaPostre, obtenerRecetaPostre } from '../services/menu';
import { calcularResumenPresupuestoMensual, type ResumenPresupuestoMensual } from '../services/presupuestoMensual';

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
      const semanasHastaAhora = planMensual
        .slice(0, Math.max(1, semanaActiva + 1))
        .filter((semana) => !semana.excluida)
        .map((semana) => semana.menu);
      const menusParaCalcular = semanasHastaAhora.length > 0 ? semanasHastaAhora : [];
      const resultados = await Promise.all(menusParaCalcular.map((menuSemana) => generarCompraMercadona(menuSemana)));
      setPresupuesto(resultados.length > 0 ? calcularResumenPresupuestoMensual(resultados, semanaActiva) : { ...RESUMEN_VACIO, mostrarPresupuestoMensual: false });
    } catch {
      setPresupuesto({ ...RESUMEN_VACIO, mostrarPresupuestoMensual: semanaActiva === 0 });
    }
  }, [menu, planMensual, semanaActiva, recetas]);

  useEffect(() => {
    const ventana = window as VentanaConIdle; let cancelado = false; let idleId: number | undefined; let temporizador: number | undefined;
    const ejecutar = () => { if (!cancelado) void cargarResumen(); };
    if (ventana.requestIdleCallback) idleId = ventana.requestIdleCallback(ejecutar, { timeout: 1200 }); else temporizador = window.setTimeout(ejecutar, 120);
    return () => { cancelado = true; if (temporizador !== undefined) window.clearTimeout(temporizador); if (idleId !== undefined) ventana.cancelIdleCallback?.(idleId); };
  }, [cargarResumen, version]);
  useEffect(() => { const actualizar = () => setVersion((valor) => valor + 1); window.addEventListener(EVENTO_DESPENSA, actualizar); window.addEventListener(EVENTO_INVENTARIO, actualizar); return () => { window.removeEventListener(EVENTO_DESPENSA, actualizar); window.removeEventListener(EVENTO_INVENTARIO, actualizar); }; }, []);

  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const hoy = diasSemana[new Date().getDay()];
  const menuHoy = menu.find((dia) => dia.dia === hoy) ?? menu[0];
  const reposicion = useMemo(() => despensa.filter((producto) => calcularReposicion(producto) > 0).sort((a, b) => calcularReposicion(b) - calcularReposicion(a)), [despensa]);

  return (
    <main className="page">
      <section className="home-grid">
        <HomeCard destino="menu" navegar={navegar} icono="🍽️" etiqueta="Menú del día" className="home-card--menu">
          {menuHoy ? <><h2 className="home-day">{menuHoy.dia}</h2><div className="meal-stack"><MealRow etiqueta="COMIDA" nombre={formatearPlatosMenu(menuHoy.comida)} /><MealRow etiqueta="CENA" nombre={formatearPlatosMenu(menuHoy.cena)} /><MealRow etiqueta="POSTRE COMIDA" nombre={`${iconoRecetaPostre(obtenerRecetaPostre(menuHoy, 'comida'))} ${formatearPostreMenu(menuHoy, 'comida')}`} /><MealRow etiqueta="POSTRE CENA" nombre={`${iconoRecetaPostre(obtenerRecetaPostre(menuHoy, 'cena'))} ${formatearPostreMenu(menuHoy, 'cena')}`} /></div></> : <p className="empty-copy">No hay menú disponible.</p>}
        </HomeCard>
        <HomeCard destino="compra" navegar={navegar} icono="🛒" etiqueta="Compra" className="home-card--shopping">
          <strong>{presupuesto.presupuestoSemanal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</strong><span>estimación de la semana activa</span>
        </HomeCard>
        <HomeCard destino="despensa" navegar={navegar} icono="📦" etiqueta="Despensa" className="home-card--pantry"><strong>{reposicion.length}</strong><span>productos por reponer</span></HomeCard>
      </section>
    </main>
  );
}

function HomeCard({ destino, navegar, icono, etiqueta, children, className = '' }: { destino: DestinoInicio; navegar: (destino: DestinoInicio) => void; icono: string; etiqueta: string; children: ReactNode; className?: string }) {
  return <button type="button" className={`home-card ${className}`} onClick={() => navegar(destino)}><span className="home-card__icon">{icono}</span><span className="home-card__label">{etiqueta}</span><div className="home-card__content">{children}</div></button>;
}
function MealRow({ etiqueta, nombre }: { etiqueta: string; nombre: string }) { return <div className="meal-row"><span>{etiqueta}</span><strong>{nombre}</strong></div>; }
export default Home;
