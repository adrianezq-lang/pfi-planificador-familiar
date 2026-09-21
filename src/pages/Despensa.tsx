import { useCallback, useEffect, useMemo, useState } from 'react';
import ProductoDetalleModal from '../components/ProductoDetalleModal';
import AppIcon from '../components/AppIcon';
import Card from '../components/ui/Card';
import Title from '../components/ui/Title';
import { crearCopiaAutomaticaSiNecesaria } from '../services/copiasSeguridad';
import { compartirTexto } from '../services/compartir';
import {
  actualizarStockProductoDespensa,
  calcularCosteReposicion,
  calcularReposicion,
  cargarDespensa,
  EVENTO_DESPENSA,
  necesitaReposicion,
  type FrecuenciaDespensa,
  type ProductoDespensa,
} from '../services/despensa';
import {
  cargarMovimientos,
  eliminarMovimiento,
  EVENTO_INVENTARIO,
  registrarCompra,
  registrarConsumo,
  type MovimientoInventario,
} from '../services/inventario';
import '../styles/pantry-decimal.css';

type VistaDespensa = 'inventario' | 'reposicion' | 'historial';
type FiltroInventario = 'todos' | 'reposicion' | 'menu-manual';
type OrdenInventario = 'prioridad' | 'nombre' | 'stock';

function Despensa() {
  const [vista, setVista] = useState<VistaDespensa>('inventario');
  const [filtro, setFiltro] = useState<FiltroInventario>('todos');
  const [productos, setProductos] = useState<ProductoDespensa[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [productoAbierto, setProductoAbierto] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [consulta, setConsulta] = useState('');
  const [orden, setOrden] = useState<OrdenInventario>('prioridad');

  const recargar = useCallback(() => {
    setProductos(cargarDespensa());
    setMovimientos(cargarMovimientos());
  }, []);

  useEffect(() => {
    recargar();
    window.addEventListener(EVENTO_DESPENSA, recargar);
    window.addEventListener(EVENTO_INVENTARIO, recargar);

    return () => {
      window.removeEventListener(EVENTO_DESPENSA, recargar);
      window.removeEventListener(EVENTO_INVENTARIO, recargar);
    };
  }, [recargar]);

  const productosReposicion = useMemo(
    () => productos.filter((producto) => calcularReposicion(producto) > 0),
    [productos],
  );

  const productosConMinimo = useMemo(
    () =>
      productos.filter(
        (producto) =>
          producto.tipo === 'despensa' &&
          producto.frecuencia !== 'manual' &&
          producto.stockMinimo > 0,
      ),
    [productos],
  );

  const productosSegunMenuOManual = useMemo(
    () =>
      productos.filter(
        (producto) =>
          producto.tipo === 'perecedero' || producto.frecuencia === 'manual',
      ),
    [productos],
  );

  const productosVisibles = useMemo(() => {
    const base = filtro === 'reposicion'
      ? productosReposicion
      : filtro === 'menu-manual'
        ? productosSegunMenuOManual
        : productos;
    const termino = consulta
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const filtrados = termino
      ? base.filter((producto) =>
          [producto.nombre, producto.formato, producto.unidad]
            .join(' ')
            .toLocaleLowerCase('es')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .includes(termino),
        )
      : [...base];

    return filtrados.sort((a, b) => {
      if (orden === 'nombre') return a.nombre.localeCompare(b.nombre, 'es');
      if (orden === 'stock') {
        const proporcionA = a.stockMinimo > 0 ? a.stockActual / a.stockMinimo : Number.POSITIVE_INFINITY;
        const proporcionB = b.stockMinimo > 0 ? b.stockActual / b.stockMinimo : Number.POSITIVE_INFINITY;
        return proporcionA - proporcionB || a.nombre.localeCompare(b.nombre, 'es');
      }

      const prioridadA = necesitaReposicion(a) ? 0 : a.tipo === 'perecedero' ? 1 : 2;
      const prioridadB = necesitaReposicion(b) ? 0 : b.tipo === 'perecedero' ? 1 : 2;
      return prioridadA - prioridadB || a.nombre.localeCompare(b.nombre, 'es');
    });
  }, [
    consulta,
    filtro,
    orden,
    productos,
    productosReposicion,
    productosSegunMenuOManual,
  ]);

  const totalReposicion = useMemo(
    () =>
      productosReposicion.reduce(
        (total, producto) => total + (calcularCosteReposicion(producto) ?? 0),
        0,
      ),
    [productosReposicion],
  );

  const valorInventario = useMemo(
    () =>
      productos.reduce(
        (total, producto) => total + (producto.precio ?? 0) * producto.stockActual,
        0,
      ),
    [productos],
  );

  const abrirResumen = (nuevoFiltro: FiltroInventario) => {
    setVista('inventario');
    setFiltro(nuevoFiltro);
    window.setTimeout(() => {
      document.getElementById('lista-despensa')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  };

  const sumarStock = (producto: ProductoDespensa) => {
    registrarCompra(producto.productoId, 1, 'Entrada manual desde despensa');
    setMensaje(`Añadido 1 ${producto.unidad}.`);
  };

  const restarStock = (producto: ProductoDespensa) => {
    if (producto.stockActual <= 0) return;
    const cantidad = Math.min(1, producto.stockActual);
    registrarConsumo(
      producto.productoId,
      cantidad,
      'manual',
      'Consumo manual desde despensa',
    );
    setMensaje(`Consumido ${formatearCantidad(cantidad)} ${producto.unidad}.`);
  };

  const guardarStock = (producto: ProductoDespensa, stockActual: number) => {
    actualizarStockProductoDespensa(producto.productoId, stockActual);
    setMensaje(
      `Stock de ${producto.nombre}: ${formatearCantidad(stockActual)} ${producto.unidad}.`,
    );
  };

  const compartirReposicion = async () => {
    const lineas = productosReposicion.map((producto) => {
      const cantidad = calcularReposicion(producto);
      const precio = calcularCosteReposicion(producto);
      return `- ${producto.nombre} · ${formatearCantidad(cantidad)} ${producto.unidad}${precio === null ? '' : ` · ${precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`}`;
    });
    const respuesta = await compartirTexto({
      titulo: 'PFI · Reposición de despensa',
      texto: `PFI · Reposición de despensa\n\n${lineas.join('\n')}\n\nTotal conocido: ${totalReposicion.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`,
    });
    if (respuesta === 'cancelado') return;
    setMensaje(
      respuesta === 'compartido'
        ? 'Reposición compartida.'
        : respuesta === 'copiado'
          ? 'Reposición copiada al portapapeles.'
          : 'No se ha podido compartir la reposición.',
    );
  };

  const productosPorId = useMemo(
    () => new Map(productos.map((producto) => [producto.productoId, producto])),
    [productos],
  );

  return (
    <main className="page legacy-page pantry-page">
      <Card className="page-hero-card">
        <Title style={{ color: '#4f6f52' }}>
          <span className="legacy-page-title">
            <span className="legacy-page-title__icon"><AppIcon name="box" /></span>
            Despensa e inventario
          </span>
        </Title>

        <div className="pantry-summary-grid">
          <Resumen
            numero={productos.length}
            texto="productos controlados"
            activo={filtro === 'todos' && vista === 'inventario'}
            onClick={() => abrirResumen('todos')}
          />
          <Resumen
            numero={productosReposicion.length}
            texto="por debajo del mínimo"
            activo={filtro === 'reposicion' && vista === 'inventario'}
            onClick={() => abrirResumen('reposicion')}
          />
          <Resumen
            numero={productosConMinimo.length}
            texto="con reserva mínima"
            onClick={() => abrirResumen('todos')}
          />
          <Resumen
            numero={totalReposicion.toLocaleString('es-ES', {
              style: 'currency',
              currency: 'EUR',
            })}
            texto="coste de completar reservas"
            onClick={() => {
              setVista('reposicion');
              setFiltro('reposicion');
            }}
          />
          <Resumen
            numero={valorInventario.toLocaleString('es-ES', {
              style: 'currency',
              currency: 'EUR',
            })}
            texto="valor aproximado en casa"
            onClick={() => abrirResumen('todos')}
          />
        </div>

        {mensaje && <p className="pantry-success">{mensaje}</p>}
      </Card>

      <Card>
        <div className="pantry-tabs">
          <Pestana
            activa={vista === 'inventario'}
            texto="Inventario"
            onClick={() => setVista('inventario')}
          />
          <Pestana
            activa={vista === 'reposicion'}
            texto="Reservas mínimas"
            onClick={() => setVista('reposicion')}
          />
          <Pestana
            activa={vista === 'historial'}
            texto="Historial"
            onClick={() => setVista('historial')}
          />
        </div>
      </Card>

      {vista === 'inventario' && (
        <section id="lista-despensa">
          <div className="pantry-filter-heading">
            <div>
              <strong>{etiquetaFiltro(filtro)}</strong>
              <small>{productosVisibles.length} visibles</small>
            </div>
            {filtro !== 'todos' && (
              <button type="button" onClick={() => setFiltro('todos')}>
                Ver todos
              </button>
            )}
          </div>

          <div className="pantry-smart-toolbar">
            <label className="pantry-search">
              <span>Buscar en despensa</span>
              <input
                type="search"
                value={consulta}
                onChange={(evento) => setConsulta(evento.target.value)}
                placeholder="Leche, arroz, salmón…"
              />
            </label>
            <label className="pantry-sort">
              <span>Ordenar</span>
              <select
                value={orden}
                onChange={(evento) => setOrden(evento.target.value as OrdenInventario)}
              >
                <option value="prioridad">Lo importante primero</option>
                <option value="stock">Menos stock primero</option>
                <option value="nombre">Nombre A–Z</option>
              </select>
            </label>
            <div className="pantry-filter-chips" aria-label="Filtros de inventario">
              <button
                type="button"
                aria-pressed={filtro === 'todos'}
                onClick={() => setFiltro('todos')}
              >
                Todo
              </button>
              <button
                type="button"
                aria-pressed={filtro === 'reposicion'}
                onClick={() => setFiltro('reposicion')}
              >
                Falta stock <span>{productosReposicion.length}</span>
              </button>
              <button
                type="button"
                aria-pressed={filtro === 'menu-manual'}
                onClick={() => setFiltro('menu-manual')}
              >
                Según menú
              </button>
            </div>
          </div>

          <div className="pantry-grid">
            {productosVisibles.map((producto) => (
              <Card
                key={producto.id}
                className="pantry-product-card"
                style={{
                  borderLeft:
                    producto.tipo === 'perecedero' ||
                    producto.frecuencia === 'manual' ||
                    producto.stockMinimo <= 0
                      ? '5px solid #9aa39b'
                      : necesitaReposicion(producto)
                        ? '5px solid #d69e62'
                        : '5px solid #4f6f52',
                }}
              >
                <ProductoCabecera
                  producto={producto}
                  onAbrir={() => setProductoAbierto(producto.productoId)}
                />

                <div className="pantry-stock-row">
                  <button
                    type="button"
                    onClick={() => restarStock(producto)}
                    disabled={producto.stockActual <= 0}
                    aria-label={`Restar una unidad de ${producto.nombre}`}
                  >
                    −
                  </button>
                  <StockEditable
                    producto={producto}
                    onGuardar={(stockActual) => guardarStock(producto, stockActual)}
                  />
                  <button
                    type="button"
                    onClick={() => sumarStock(producto)}
                    aria-label={`Sumar una unidad de ${producto.nombre}`}
                  >
                    +
                  </button>
                </div>

                {producto.stockMinimo > 0 &&
                  producto.tipo === 'despensa' &&
                  producto.frecuencia !== 'manual' && (
                    <div className="pantry-progress">
                      <span
                        style={{
                          width: `${porcentajeStock(producto)}%`,
                        }}
                      />
                    </div>
                  )}

                <p className="pantry-state">{estadoProducto(producto)}</p>
              </Card>
            ))}
          </div>

          {productosVisibles.length === 0 && (
            <Card>
              <p className="pantry-empty">
                {consulta
                  ? 'No hay productos que coincidan con la búsqueda.'
                  : 'No hay productos en esta lista.'}
              </p>
            </Card>
          )}
        </section>
      )}

      {vista === 'reposicion' && (
        <>
          {productosReposicion.length > 0 && (
            <section className="pro-action-bar pro-action-bar--pantry" aria-label="Acciones de reposición">
              <button type="button" onClick={() => void compartirReposicion()}>
                <AppIcon name="share" size={18} />
                <span>
                  <strong>Compartir reposición</strong>
                  <small>{productosReposicion.length} producto{productosReposicion.length === 1 ? '' : 's'} por reponer</small>
                </span>
              </button>
            </section>
          )}
          <section className="pantry-grid">
            {productosReposicion.map((producto) => (
              <Card key={producto.id} className="pantry-product-card">
                <ProductoCabecera
                  producto={producto}
                  onAbrir={() => setProductoAbierto(producto.productoId)}
                />
                <div className="pantry-restock-quantity">
                  Comprar {formatearCantidad(calcularReposicion(producto))}{' '}
                  {producto.unidad}
                </div>
                <p className="pantry-lead">
                  Stock {formatearCantidad(producto.stockActual)} · mínimo{' '}
                  {formatearCantidad(producto.stockMinimo)} ·{' '}
                  {etiquetaFrecuencia(producto.frecuencia)}
                </p>
                <strong className="pantry-price">
                  {calcularCosteReposicion(producto) === null
                    ? 'Precio pendiente'
                    : calcularCosteReposicion(producto)?.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                      })}
                </strong>
              </Card>
            ))}
          </section>
          {productosReposicion.length === 0 && (
            <Card>
              <p className="pantry-empty">Todas las reservas están cubiertas.</p>
            </Card>
          )}
        </>
      )}

      {vista === 'historial' && (
        <Card>
          <Title style={{ color: '#4f6f52', fontSize: '21px' }}>
            Últimos movimientos
          </Title>
          {movimientos.slice(0, 100).map((movimiento) => {
            const producto = productosPorId.get(movimiento.productoId);
            const nombreProducto = producto?.nombre ?? 'Producto eliminado';
            return (
              <div key={movimiento.id} className="pantry-movement">
                <span className="pantry-movement__icon">
                  {movimiento.tipo === 'compra'
                    ? '➕'
                    : movimiento.tipo === 'consumo'
                      ? '➖'
                      : '✏️'}
                </span>
                <span>
                  <strong>{nombreProducto}</strong>
                  <small>
                    {etiquetaMovimiento(movimiento)} ·{' '}
                    {new Date(movimiento.fecha).toLocaleString('es-ES')}
                  </small>
                  {movimiento.observaciones && <small>{movimiento.observaciones}</small>}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const confirmado = window.confirm(
                      `¿Eliminar este movimiento de «${nombreProducto}»? El stock se recalculará al instante.`,
                    );
                    if (!confirmado) return;
                    crearCopiaAutomaticaSiNecesaria('antes de eliminar un movimiento de inventario');
                    eliminarMovimiento(movimiento.id);
                    setMensaje('Movimiento eliminado y stock recalculado.');
                  }}
                >
                  Eliminar
                </button>
              </div>
            );
          })}
          {movimientos.length === 0 && (
            <p className="pantry-empty">Todavía no hay movimientos.</p>
          )}
        </Card>
      )}

      <ProductoDetalleModal
        productoId={productoAbierto}
        onCerrar={() => setProductoAbierto(null)}
        onActualizado={recargar}
      />
    </main>
  );
}

function StockEditable({
  producto,
  onGuardar,
}: {
  producto: ProductoDespensa;
  onGuardar: (stockActual: number) => void;
}) {
  const [texto, setTexto] = useState(() => formatearCantidadEditable(producto.stockActual));

  useEffect(() => {
    setTexto(formatearCantidadEditable(producto.stockActual));
  }, [producto.stockActual]);

  const restaurar = () => {
    setTexto(formatearCantidadEditable(producto.stockActual));
  };

  const confirmar = () => {
    const cantidad = parsearCantidad(texto);
    if (cantidad === null) {
      restaurar();
      return;
    }

    const normalizada = normalizarCantidad(cantidad);
    setTexto(formatearCantidadEditable(normalizada));
    if (Math.abs(normalizada - producto.stockActual) >= 0.0001) {
      onGuardar(normalizada);
    }
  };

  return (
    <div className="pantry-stock-editor">
      <div className="pantry-stock-editor__value">
        {producto.stockEsAproximado && (
          <span className="pantry-stock-editor__approx" aria-hidden="true">
            ≈
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={texto}
          aria-label={`Stock actual de ${producto.nombre}`}
          onFocus={(evento) => evento.currentTarget.select()}
          onChange={(evento) => {
            const siguiente = evento.target.value;
            if (/^\d*(?:[.,]\d*)?$/.test(siguiente)) setTexto(siguiente);
          }}
          onBlur={confirmar}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') evento.currentTarget.blur();
            if (evento.key === 'Escape') {
              restaurar();
              evento.currentTarget.blur();
            }
          }}
        />
      </div>
      <span className="pantry-stock-editor__unit">{producto.unidad}</span>
      <small className="pantry-stock-editor__hint">Admite decimales</small>
    </div>
  );
}

function ProductoCabecera({
  producto,
  onAbrir,
}: {
  producto: ProductoDespensa;
  onAbrir: () => void;
}) {
  return (
    <div className="pantry-product-header">
      <button
        type="button"
        className="product-photo-button"
        onClick={onAbrir}
        aria-label={`Editar ${producto.nombre}`}
      >
        {producto.imagen ? (
          <img src={producto.imagen} alt="" />
        ) : (
          <span>📦</span>
        )}
      </button>
      <div>
        <strong>{producto.nombre}</strong>
        <span>{producto.formato}</span>
        <span>
          {producto.precio === null
            ? 'Precio pendiente'
            : producto.precio.toLocaleString('es-ES', {
                style: 'currency',
                currency: 'EUR',
              })}
        </span>
        {producto.ultimaCompraTienda && producto.ultimoProductoComprado && (
          <span className="pantry-last-purchase">
            Última compra: {producto.ultimaCompraTienda} · {producto.ultimoProductoComprado}
            {producto.ultimoPrecioCompra !== null
              ? ` · ${producto.ultimoPrecioCompra.toLocaleString('es-ES', {
                  style: 'currency',
                  currency: 'EUR',
                })}`
              : ''}
          </span>
        )}
        <button type="button" className="pantry-edit-link" onClick={onAbrir}>
          Editar producto
        </button>
      </div>
    </div>
  );
}

function Resumen({
  numero,
  texto,
  onClick,
  activo = false,
}: {
  numero: number | string;
  texto: string;
  onClick: () => void;
  activo?: boolean;
}) {
  return (
    <button
      type="button"
      className={`pantry-summary-card${activo ? ' pantry-summary-card--active' : ''}`}
      onClick={onClick}
    >
      <strong>{numero}</strong>
      <span>{texto}</span>
    </button>
  );
}

function Pestana({
  activa,
  texto,
  onClick,
}: {
  activa: boolean;
  texto: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={activa ? 'pantry-tab pantry-tab--active' : 'pantry-tab'}
    >
      {texto}
    </button>
  );
}

function etiquetaFiltro(filtro: FiltroInventario): string {
  if (filtro === 'reposicion') return 'Por debajo del mínimo';
  if (filtro === 'menu-manual') return 'Según menú o manuales';
  return 'Todos los productos controlados';
}

function etiquetaFrecuencia(frecuencia: FrecuenciaDespensa): string {
  if (frecuencia === 'cuando-falte') return 'cuando falte';
  return frecuencia;
}

function porcentajeStock(producto: ProductoDespensa): number {
  if (producto.stockMinimo <= 0) return 0;
  return Math.min(100, (producto.stockActual / producto.stockMinimo) * 100);
}

function estadoProducto(producto: ProductoDespensa): string {
  if (producto.tipo === 'perecedero') {
    return 'Según menú';
  }
  if (producto.frecuencia === 'manual') {
    return `Manual · ${formatearCantidad(producto.stockActual)} ${producto.unidad}`;
  }
  if (producto.stockMinimo <= 0) {
    return `Sin mínimo · stock ${formatearCantidad(producto.stockActual)} ${producto.unidad}`;
  }
  const faltan = calcularReposicion(producto);
  return `Mínimo: ${formatearCantidad(producto.stockMinimo)} ${producto.unidad}${
    faltan > 0 ? ` · faltan ${formatearCantidad(faltan)}` : ' · reserva cubierta'
  }`;
}

function etiquetaMovimiento(movimiento: MovimientoInventario): string {
  const signo = movimiento.tipo === 'consumo' ? '−' : movimiento.cantidad >= 0 ? '+' : '−';
  const cantidad = formatearCantidad(Math.abs(movimiento.cantidad));
  if (movimiento.tipo === 'compra') return `${signo}${cantidad} compra`;
  if (movimiento.tipo === 'consumo') return `${signo}${cantidad} consumo`;
  return `${signo}${cantidad} ajuste`;
}

function parsearCantidad(texto: string): number | null {
  const normalizado = texto.trim().replace(',', '.');
  if (!normalizado) return null;
  const numero = Number(normalizado);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

function normalizarCantidad(cantidad: number): number {
  return Math.round(Math.max(0, cantidad) * 1000) / 1000;
}

function formatearCantidad(cantidad: number): string {
  return normalizarCantidad(cantidad).toLocaleString('es-ES', {
    maximumFractionDigits: 3,
  });
}

function formatearCantidadEditable(cantidad: number): string {
  return normalizarCantidad(cantidad).toLocaleString('es-ES', {
    useGrouping: false,
    maximumFractionDigits: 3,
  });
}

export default Despensa;
