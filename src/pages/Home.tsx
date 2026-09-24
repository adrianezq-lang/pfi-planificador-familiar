import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { DiaMenu } from '../data/Menusemanal';
import type { SemanaMenu } from '../data/MenuMensual';
import { semanaContieneFecha } from '../services/fechaSemana';
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
import AppIcon, { type AppIconName } from '../components/AppIcon';
import { cargarPerfil, EVENTO_PERFIL } from '../services/perfil';
import {
  generarCompraMensual,
  generarCompraSemanalProyectada,
} from '../services/planificacionCompra';
import {
  cargarProductosManualesCompra,
  EVENTO_PRODUCTOS_MANUALES_COMPRA,
} from '../services/productosManualesCompra';
import {
  calcularResumenEconomicoMensual,
  contarCausasImportePendiente,
  type DesgloseEconomico,
  type ResumenEconomicoMensual,
} from '../services/resumenEconomico';

type DestinoInicio = 'menu' | 'asistente' | 'compra' | 'despensa';

type VentanaConIdle = Window & {
  requestIdleCallback?: (
    callback: () => void,
    opciones?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (id: number) => void;
};

type HomeProps = {
  menu: DiaMenu[];
  semana: SemanaMenu | undefined;
  menusSemanas: DiaMenu[][];
  menuMes: DiaMenu[];
  mesActivo: string;
  semanaActiva: number;
  navegar: (destino: DestinoInicio) => void;
};

function Home({
  menu,
  semana,
  menusSemanas,
  menuMes,
  mesActivo,
  semanaActiva,
  navegar,
}: HomeProps) {
  const [presupuesto, setPresupuesto] =
    useState<ResumenEconomicoMensual | null>(null);
  const [errorPresupuesto, setErrorPresupuesto] = useState(false);
  const solicitudPresupuesto = useRef(0);
  const [despensa, setDespensa] = useState<ProductoDespensa[]>([]);
  const [version, setVersion] = useState(0);
  const [limiteMensual, setLimiteMensual] = useState(() => cargarPerfil().presupuesto);

  const cargarResumen = useCallback(async () => {
    const solicitud = ++solicitudPresupuesto.current;
    setErrorPresupuesto(false);
    setDespensa(cargarDespensa());

    try {
      const [mensual, ...semanales] = await Promise.all([
        generarCompraMensual(menuMes),
        ...menusSemanas.map((_, indice) =>
          generarCompraSemanalProyectada(menusSemanas, indice),
        ),
      ]);
      if (solicitud !== solicitudPresupuesto.current) return;
      setPresupuesto(
        calcularResumenEconomicoMensual({
          compraMes: mensual,
          comprasSemanas: semanales,
          productosManuales: cargarProductosManualesCompra(),
          mesActivo,
          semanaActiva,
        }),
      );
    } catch {
      if (solicitud === solicitudPresupuesto.current) setErrorPresupuesto(true);
    }
  }, [menusSemanas, menuMes, mesActivo, semanaActiva]);

  useEffect(() => {
    const ventana = window as VentanaConIdle;
    let cancelado = false;
    let idleId: number | undefined;
    let temporizador: number | undefined;
    setPresupuesto(null);
    setErrorPresupuesto(false);

    const ejecutar = () => {
      if (!cancelado) void cargarResumen();
    };

    if (ventana.requestIdleCallback) {
      idleId = ventana.requestIdleCallback(ejecutar, { timeout: 1200 });
    } else {
      temporizador = window.setTimeout(ejecutar, 120);
    }

    return () => {
      cancelado = true;
      solicitudPresupuesto.current += 1;
      if (temporizador !== undefined) window.clearTimeout(temporizador);
      if (idleId !== undefined) ventana.cancelIdleCallback?.(idleId);
    };
  }, [cargarResumen, version]);

  useEffect(() => {
    const actualizar = () => setVersion((valor) => valor + 1);
    const actualizarPerfil = () => setLimiteMensual(cargarPerfil().presupuesto);
    window.addEventListener(EVENTO_DESPENSA, actualizar);
    window.addEventListener(EVENTO_INVENTARIO, actualizar);
    window.addEventListener(EVENTO_PRODUCTOS_MANUALES_COMPRA, actualizar);
    window.addEventListener(EVENTO_PERFIL, actualizarPerfil);
    return () => {
      window.removeEventListener(EVENTO_DESPENSA, actualizar);
      window.removeEventListener(EVENTO_INVENTARIO, actualizar);
      window.removeEventListener(EVENTO_PRODUCTOS_MANUALES_COMPRA, actualizar);
      window.removeEventListener(EVENTO_PERFIL, actualizarPerfil);
    };
  }, []);

  const diasSemana = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ];
  const semanaDeHoy = semanaContieneFecha(semana);
  const menuHoy =
    (semanaDeHoy
      ? menu.find((dia) => dia.dia === diasSemana[new Date().getDay()])
      : undefined) ?? menu[0];
  const reposicion = useMemo(
    () =>
      despensa
        .filter((producto) => calcularReposicion(producto) > 0)
        .sort((a, b) => calcularReposicion(b) - calcularReposicion(a)),
    [despensa],
  );

  const postreComida = menuHoy
    ? `${iconoRecetaPostre(obtenerRecetaPostre(menuHoy, 'comida'))} ${formatearPostreMenu(menuHoy, 'comida')}`
    : '';
  const postreCena = menuHoy
    ? `${iconoRecetaPostre(obtenerRecetaPostre(menuHoy, 'cena'))} ${formatearPostreMenu(menuHoy, 'cena')}`
    : '';

  const detallePresupuesto = useMemo(() => {
    if (!presupuesto) return '';
    const pendientes = presupuesto.prevision.partidasSinImporte;
    const estimadas = presupuesto.prevision.cantidadesEstimadas;
    const precision = detallePrecision(presupuesto.prevision);
    if (limiteMensual <= 0 || presupuesto.previsionMes <= 0) return precision;
    const diferencia = limiteMensual - presupuesto.previsionMes;
    const importe = Math.abs(diferencia).toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
    });
    if (pendientes > 0) {
      const causas = detalleCausasPendientes(presupuesto.prevision);
      return diferencia >= 0
        ? `Margen máximo ${importe} · faltan ${pendientes} partida${pendientes === 1 ? '' : 's'}${causas ? ` · ${causas}` : ''}`
        : `Al menos ${importe} por encima · faltan ${pendientes} partida${pendientes === 1 ? '' : 's'}${causas ? ` · ${causas}` : ''}`;
    }
    if (estimadas > 0) {
      return diferencia >= 0
        ? `Margen estimado ${importe} · ${estimadas} cantidad${estimadas === 1 ? '' : 'es'} estimada${estimadas === 1 ? '' : 's'}`
        : `${importe} por encima (estimado) · ${estimadas} cantidad${estimadas === 1 ? '' : 'es'} por confirmar`;
    }
    return diferencia >= 0
      ? `Te quedan ${importe} de tu objetivo mensual`
      : `${importe} por encima de tu objetivo mensual`;
  }, [limiteMensual, presupuesto]);

  return (
    <main className="page home-page">
      <section className="home-grid">
        <HomeCard
          destino="menu"
          navegar={navegar}
          icono="utensils"
          etiqueta={semanaDeHoy ? 'Menú de hoy' : 'Menú de la semana elegida'}
          className="home-card--menu"
        >
          {menuHoy ? (
            <>
              <h2 className="home-day">{menuHoy.dia}</h2>
              <div className="meal-stack">
                <MealRow
                  etiqueta="Comida"
                  nombre={formatearPlatosMenu(menuHoy.comida)}
                  detalle={`Postre · ${postreComida}`}
                />
                <MealRow
                  etiqueta="Cena"
                  nombre={formatearPlatosMenu(menuHoy.cena)}
                  detalle={`Postre · ${postreCena}`}
                />
              </div>
            </>
          ) : (
            <p className="empty-copy">No hay menú disponible.</p>
          )}
        </HomeCard>

        <div className="home-side-grid">
          <HomeCard
            destino="menu"
            navegar={navegar}
            icono="snowflake"
            etiqueta={semanaDeHoy ? 'Preparar para mañana' : 'Preparación de la semana elegida'}
            className="home-card--prep"
          >
            <p className="home-highlight-text">
              {menuHoy?.preparar || 'Nada pendiente'}
            </p>
          </HomeCard>

          <HomeCard
            destino="despensa"
            navegar={navegar}
            icono="box"
            etiqueta="Próximas reposiciones"
            className="home-card--restock"
          >
            {reposicion.length ? (
              <div className="restock-list">
                {reposicion.slice(0, 4).map((producto) => (
                  <div className="restock-row" key={producto.id}>
                    <span>{producto.nombre}</span>
                    <strong>
                      +{calcularReposicion(producto)} {producto.unidad}
                    </strong>
                  </div>
                ))}
                {reposicion.length > 4 && (
                  <small className="empty-copy">
                    y {reposicion.length - 4} más
                  </small>
                )}
              </div>
            ) : (
              <p className="empty-copy">No hay reposiciones pendientes.</p>
            )}
          </HomeCard>
        </div>
      </section>

      <button
        type="button"
        className="assistant-home-cta"
        onClick={() => navegar('asistente')}
      >
        <span className="assistant-home-cta__icon" aria-hidden="true">
          <AppIcon name="sparkles" size={22} />
        </span>
        <span className="assistant-home-cta__copy">
          <small>ASISTENTE PFI</small>
          <strong>Pregunta sobre tu planificación</strong>
          <span>Qué toca hoy, qué falta, presupuesto, despensa o qué cocinar con lo que tienes.</span>
        </span>
        <span className="assistant-home-cta__arrow" aria-hidden="true">›</span>
      </button>

      {presupuesto ? <section
        className={`budget-grid${
          presupuesto.mostrarPresupuestoMensual ? '' : ' budget-grid--compact'
        }`}
      >
        <BudgetCard
          etiqueta="Esta semana"
          icono="leaf"
          valor={presupuesto.presupuestoSemanal}
          navegar={navegar}
          detalle={detallePrecision(presupuesto.semana)}
        />
        {presupuesto.mostrarPresupuestoMensual && (
          <BudgetCard
            etiqueta="Este mes"
            icono="basket"
            valor={presupuesto.presupuestoMensual}
            navegar={navegar}
            detalle={detallePrecision(presupuesto.compraMensual)}
          />
        )}
        <BudgetCard
          etiqueta="Previsión del mes"
          icono="euro"
          valor={presupuesto.previsionMes}
          navegar={navegar}
          detalle={detallePresupuesto}
          total
        />
      </section> : <section className="budget-grid" aria-live="polite">
        <p role={errorPresupuesto ? 'alert' : 'status'}>
          {errorPresupuesto ? 'No se pudo calcular el presupuesto del mes.' : 'Calculando presupuesto del mes…'}
          {errorPresupuesto && (
            <button type="button" onClick={() => void cargarResumen()}>Reintentar</button>
          )}
        </p>
      </section>}
    </main>
  );
}

function detallePrecision(desglose: DesgloseEconomico): string {
  const partes: string[] = [];
  if (desglose.partidasSinImporte > 0) {
    partes.push(
      `${desglose.partidasSinImporte} partida${desglose.partidasSinImporte === 1 ? '' : 's'} sin importe`,
    );
    const causas = detalleCausasPendientes(desglose);
    if (causas) partes.push(causas);
  }
  if (desglose.cantidadesEstimadas > 0) {
    const productos = desglose.productosEstimados.length;
    partes.push(
      `${desglose.cantidadesEstimadas} cálculo${desglose.cantidadesEstimadas === 1 ? '' : 's'} aproximado${desglose.cantidadesEstimadas === 1 ? '' : 's'}${productos > 0 ? ` en ${productos} producto${productos === 1 ? '' : 's'}` : ''}`,
    );
  }
  if (partes.length === 0) return '';
  return `${desglose.partidasSinImporte > 0 ? 'Subtotal mínimo' : 'Total estimado'} · ${partes.join(' · ')}`;
}

function detalleCausasPendientes(desglose: DesgloseEconomico): string {
  const causas: string[] = [];
  if (desglose.ingredientesSinProducto.length > 0) {
    causas.push(
      `${desglose.ingredientesSinProducto.length} asociación${desglose.ingredientesSinProducto.length === 1 ? '' : 'es'} pendiente${desglose.ingredientesSinProducto.length === 1 ? '' : 's'}`,
    );
  }
  if (desglose.productosSinPrecio.length > 0) {
    causas.push(
      `${desglose.productosSinPrecio.length} producto${desglose.productosSinPrecio.length === 1 ? '' : 's'} sin precio`,
    );
  }
  if (desglose.comprasManualesSinPrecio.length > 0) {
    causas.push(
      `${desglose.comprasManualesSinPrecio.length} compra${desglose.comprasManualesSinPrecio.length === 1 ? '' : 's'} manual${desglose.comprasManualesSinPrecio.length === 1 ? '' : 'es'} sin precio`,
    );
  }
  return contarCausasImportePendiente(desglose) > 0
    ? causas.join(' · ')
    : '';
}

function HomeCard({
  destino,
  navegar,
  icono,
  etiqueta,
  className = '',
  children,
}: {
  destino: DestinoInicio;
  navegar: (destino: DestinoInicio) => void;
  icono: AppIconName;
  etiqueta: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => navegar(destino)}
      className={`pfi-card home-card ${className}`.trim()}
      aria-label={`${etiqueta}. Abrir ${destino}`}
    >
      <div className="home-card__body">
        <div className="home-card__top">
          <span className="home-card__eyebrow">
            <span className="home-card__icon" aria-hidden="true">
              <AppIcon name={icono} />
            </span>
            {etiqueta}
          </span>
          <span className="home-card__arrow" aria-hidden="true">
            →
          </span>
        </div>
        {children}
      </div>
    </button>
  );
}

function MealRow({
  etiqueta,
  nombre,
  detalle,
}: {
  etiqueta: string;
  nombre: string;
  detalle?: string;
}) {
  return (
    <div className="meal-row">
      <span className="meal-row__label">{etiqueta}</span>
      <span className="meal-row__content">
        <strong>{nombre}</strong>
        {detalle && <small className="meal-row__detail">{detalle}</small>}
      </span>
    </div>
  );
}

function BudgetCard({
  etiqueta,
  icono,
  valor,
  navegar,
  total = false,
  detalle = '',
}: {
  etiqueta: string;
  icono: AppIconName;
  valor: number;
  navegar: (destino: DestinoInicio) => void;
  total?: boolean;
  detalle?: string;
}) {
  return (
    <HomeCard
      destino="compra"
      navegar={navegar}
      icono={icono}
      etiqueta={etiqueta}
      className={`budget-card${total ? ' budget-card--total' : ''}`}
    >
      <p className="budget-amount">
        {valor.toLocaleString('es-ES', {
          style: 'currency',
          currency: 'EUR',
        })}
      </p>
      {detalle && <small className="budget-detail">{detalle}</small>}
    </HomeCard>
  );
}

export default Home;
