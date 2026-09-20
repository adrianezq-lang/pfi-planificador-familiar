import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { DiaMenu } from '../data/Menusemanal';
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
import type { ResumenPresupuestoMensual } from '../services/presupuestoMensual';
import AppIcon, { type AppIconName } from '../components/AppIcon';
import {
  generarCompraMensual,
  generarCompraSemanalProyectada,
} from '../services/planificacionCompra';

type DestinoInicio = 'menu' | 'compra' | 'despensa';

type VentanaConIdle = Window & {
  requestIdleCallback?: (
    callback: () => void,
    opciones?: { timeout?: number },
  ) => number;
  cancelIdleCallback?: (id: number) => void;
};

type HomeProps = {
  menu: DiaMenu[];
  menusSemanas: DiaMenu[][];
  menuMes: DiaMenu[];
  semanaActiva: number;
  navegar: (destino: DestinoInicio) => void;
};

const RESUMEN_VACIO: ResumenPresupuestoMensual = {
  presupuestoSemanal: 0,
  presupuestoMensual: 0,
  totalAcumulado: 0,
  mostrarPresupuestoMensual: true,
};

function Home({
  menu,
  menusSemanas,
  menuMes,
  semanaActiva,
  navegar,
}: HomeProps) {
  const [presupuesto, setPresupuesto] =
    useState<ResumenPresupuestoMensual>(RESUMEN_VACIO);
  const [despensa, setDespensa] = useState<ProductoDespensa[]>([]);
  const [version, setVersion] = useState(0);

  const cargarResumen = useCallback(async () => {
    setDespensa(cargarDespensa());

    try {
      const [mensual, ...semanales] = await Promise.all([
        generarCompraMensual(menuMes),
        ...menusSemanas.slice(0, semanaActiva + 1).map((_, indice) =>
          generarCompraSemanalProyectada(menusSemanas, indice),
        ),
      ]);
      const semanalActual = semanales[semanaActiva]?.total ?? 0;
      const acumuladoSemanal = semanales.reduce(
        (total, resultado) => total + resultado.total,
        0,
      );
      setPresupuesto({
        presupuestoSemanal: semanalActual,
        presupuestoMensual: mensual.total,
        totalAcumulado: mensual.total + acumuladoSemanal,
        mostrarPresupuestoMensual: semanaActiva === 0,
      });
    } catch {
      setPresupuesto(RESUMEN_VACIO);
    }
  }, [menusSemanas, menuMes, semanaActiva]);

  useEffect(() => {
    const ventana = window as VentanaConIdle;
    let cancelado = false;
    let idleId: number | undefined;
    let temporizador: number | undefined;

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
      if (temporizador !== undefined) window.clearTimeout(temporizador);
      if (idleId !== undefined) ventana.cancelIdleCallback?.(idleId);
    };
  }, [cargarResumen, version]);

  useEffect(() => {
    const actualizar = () => setVersion((valor) => valor + 1);
    window.addEventListener(EVENTO_DESPENSA, actualizar);
    window.addEventListener(EVENTO_INVENTARIO, actualizar);
    return () => {
      window.removeEventListener(EVENTO_DESPENSA, actualizar);
      window.removeEventListener(EVENTO_INVENTARIO, actualizar);
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
  const menuHoy =
    menu.find((dia) => dia.dia === diasSemana[new Date().getDay()]) ?? menu[0];
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

  return (
    <main className="page home-page">
      <section className="home-grid">
        <HomeCard
          destino="menu"
          navegar={navegar}
          icono="utensils"
          etiqueta="Menú de hoy"
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
            etiqueta="Preparar para mañana"
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

      <section
        className={`budget-grid${
          presupuesto.mostrarPresupuestoMensual ? '' : ' budget-grid--compact'
        }`}
      >
        <BudgetCard
          etiqueta="Esta semana"
          icono="leaf"
          valor={presupuesto.presupuestoSemanal}
          navegar={navegar}
        />
        {presupuesto.mostrarPresupuestoMensual && (
          <BudgetCard
            etiqueta="Este mes"
            icono="basket"
            valor={presupuesto.presupuestoMensual}
            navegar={navegar}
          />
        )}
        <BudgetCard
          etiqueta="Total previsto"
          icono="euro"
          valor={presupuesto.totalAcumulado}
          navegar={navegar}
          total
        />
      </section>
    </main>
  );
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
}: {
  etiqueta: string;
  icono: AppIconName;
  valor: number;
  navegar: (destino: DestinoInicio) => void;
  total?: boolean;
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
    </HomeCard>
  );
}

export default Home;
