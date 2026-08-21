import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  cargarConservacion,
  EVENTO_CONSERVACION,
} from '../services/conservacion';
import {
  cargarDespensa,
  EVENTO_DESPENSA,
} from '../services/despensa';
import {
  cargarExcepcionesSemana,
  EVENTO_EXCEPCIONES_SEMANA,
} from '../services/excepcionesSemana';
import { EVENTO_INVENTARIO } from '../services/inventario';
import { generarResumenAtencionHoy } from '../services/atencionHoy';
import { describirCantidadStock } from '../services/stockReal';
import '../styles/atencion-hoy.css';

type DestinoAtencion = 'menu' | 'despensa';

type AtencionHoyProps = {
  semanaActiva: number;
  navegar: (destino: DestinoAtencion) => void;
};

function AtencionHoy({ semanaActiva, navegar }: AtencionHoyProps) {
  const [version, setVersion] = useState(0);

  const actualizar = useCallback(() => {
    setVersion((valor) => valor + 1);
  }, []);

  useEffect(() => {
    window.addEventListener(EVENTO_CONSERVACION, actualizar);
    window.addEventListener(EVENTO_DESPENSA, actualizar);
    window.addEventListener(EVENTO_INVENTARIO, actualizar);
    window.addEventListener(EVENTO_EXCEPCIONES_SEMANA, actualizar);

    return () => {
      window.removeEventListener(EVENTO_CONSERVACION, actualizar);
      window.removeEventListener(EVENTO_DESPENSA, actualizar);
      window.removeEventListener(EVENTO_INVENTARIO, actualizar);
      window.removeEventListener(EVENTO_EXCEPCIONES_SEMANA, actualizar);
    };
  }, [actualizar]);

  const resumen = useMemo(
    () =>
      generarResumenAtencionHoy(
        cargarConservacion(),
        cargarExcepcionesSemana(semanaActiva),
        cargarDespensa(),
      ),
    [semanaActiva, version],
  );

  return (
    <section className="attention-today" aria-label="Atención hoy">
      <header className="attention-today__header">
        <h2 className="attention-today__title">
          <span aria-hidden="true">✨</span>
          Atención hoy
        </h2>
        <span className="attention-today__badge" aria-label={`${resumen.total} avisos`}>
          {resumen.total}
        </span>
      </header>

      {resumen.total === 0 ? (
        <div className="attention-today__ok">
          Todo al día. No hay caducidades próximas, excepciones activas ni reposiciones urgentes.
        </div>
      ) : (
        <div className="attention-today__grid">
          <GrupoAtencion
            etiqueta="Consumir pronto"
            icono="🧊"
            cantidad={resumen.conservacion.length}
            onClick={() => navegar('despensa')}
          >
            {resumen.conservacion.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className={`attention-today__item${item.dias <= 0 ? ' attention-today__item--urgent' : ''}`}
              >
                <strong>{item.nombre}</strong>
                <span>{item.detalle}</span>
              </div>
            ))}
            {resumen.conservacion.length > 3 && (
              <span className="attention-today__more">
                +{resumen.conservacion.length - 3} más
              </span>
            )}
          </GrupoAtencion>

          <GrupoAtencion
            etiqueta="Esta semana"
            icono="📅"
            cantidad={resumen.excepciones.length}
            onClick={() => navegar('menu')}
          >
            {resumen.excepciones.slice(0, 3).map((texto) => (
              <div key={texto} className="attention-today__item">
                <strong>{texto}</strong>
                <span>La compra ya está recalculada</span>
              </div>
            ))}
            {resumen.excepciones.length > 3 && (
              <span className="attention-today__more">
                +{resumen.excepciones.length - 3} más
              </span>
            )}
          </GrupoAtencion>

          <GrupoAtencion
            etiqueta="Stock bajo"
            icono="📦"
            cantidad={resumen.stock.length}
            onClick={() => navegar('despensa')}
          >
            {resumen.stock.slice(0, 3).map((producto) => {
              const cantidad = describirCantidadStock(producto, producto.stockActual);
              return (
                <div key={producto.id} className="attention-today__item">
                  <strong>{producto.nombre}</strong>
                  <span>Queda {cantidad.texto}</span>
                </div>
              );
            })}
            {resumen.stock.length > 3 && (
              <span className="attention-today__more">
                +{resumen.stock.length - 3} más
              </span>
            )}
          </GrupoAtencion>
        </div>
      )}
    </section>
  );
}

function GrupoAtencion({
  etiqueta,
  icono,
  cantidad,
  onClick,
  children,
}: {
  etiqueta: string;
  icono: string;
  cantidad: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div className="attention-today__group">
      <button type="button" onClick={onClick} disabled={cantidad === 0}>
        <div className="attention-today__eyebrow">
          <span>{icono} {etiqueta}</span>
          <strong>{cantidad}</strong>
        </div>
        {cantidad > 0 ? (
          <div className="attention-today__list">{children}</div>
        ) : (
          <div className="attention-today__item">
            <span>Sin avisos</span>
          </div>
        )}
      </button>
    </div>
  );
}

export default AtencionHoy;
