import { useCallback, useEffect, useMemo, useState } from 'react';
import ProductoDetalleModal from '../components/ProductoDetalleModal';
import Card from '../components/ui/Card';
import Title from '../components/ui/Title';
import {
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

type VistaDespensa = 'inventario' | 'reposicion' | 'historial';
type FiltroInventario = 'todos' | 'reposicion' | 'menu-manual';

function Despensa() {
  const [vista, setVista] = useState<VistaDespensa>('inventario');
  const [filtro, setFiltro] = useState<FiltroInventario>('todos');
  const [productos, setProductos] = useState<ProductoDespensa[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [productoAbierto, setProductoAbierto] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState('');

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
    () =>
      productos.filter(
        (producto) =>
          producto.tipo === 'despensa' &&
          producto.frecuencia !== 'manual' &&
          calcularReposicion(producto) > 0,
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
    if (filtro === 'reposicion') return productosReposicion;
    if (filtro === 'menu-manual') return productosSegunMenuOManual;
    return productos;
  }, [filtro, productos, productosReposicion, productosSegunMenuOManual]);

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
    registrarConsumo(
      producto.productoId,
      1,
      'manual',
      'Consumo manual desde despensa',
    );
    setMensaje(`Consumido 1 ${producto.unidad}.`);
  };

  const productosPorId = useMemo(
    () => new Map(productos.map((producto) => [producto.productoId, producto])),
    [productos],
  );

  return (
    <main className="page legacy-page pantry-page">
      <Card className="page-hero-card">
        <Title style={{ color: '#4f6f52' }}>📦 Despensa e inventario</Title>
        <p className="pantry-lead">
          Pulsa cualquier foto para editar stock, objetivo, tipo y frecuencia.
          PFI aprende del historial y te propone ajustes cuando tiene datos suficientes.
        </p>

        <div className="pantry-summary-grid">
          <Resumen
            numero={productos.length}
            texto="productos controlados"
            activo={filtro === 'todos' && vista === 'inventario'}
            onClick={() => abrirResumen('todos')}
          />
          <Resumen
            numero={productosReposicion.length}
            texto="faltan en reposición automática"
            activo={filtro === 'reposicion' && vista === 'inventario'}
            onClick={() => abrirResumen('reposicion')}
          />
          <Resumen
            numero={productosSegunMenuOManual.length}
            texto="según menú o manuales"
            activo={filtro === 'menu-manual' && vista === 'inventario'}
            onClick={() => abrirResumen('menu-manual')}
          />
          <Resumen
            numero={totalReposicion.toLocaleString('es-ES', {
              style: 'currency',
              currency: 'EUR',
            })}
            texto="coste de reposición automática"
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
            texto="Reposición automática"
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
              <span>LISTA ACTIVA</span>
              <strong>{etiquetaFiltro(filtro)}</strong>
            </div>
            {filtro !== 'todos' && (
              <button type="button" onClick={() => setFiltro('todos')}>
                Ver todos
              </button>
            )}
          </div>

          <div className="pantry-grid">
            {productosVisibles.map((producto) => (
              <Card
                key={producto.id}
                className="pantry-product-card"
                style={{
                  borderLeft:
                    producto.tipo === 'perecedero' || producto.frecuencia === 'manual'
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
                  >
                    −
                  </button>
                  <div>
                    <strong>{producto.stockEsAproximado ? '≈ ' : ''}{producto.stockActual}</strong>
                    <span>{producto.unidad}</span>
                  </div>
                  <button type="button" onClick={() => sumarStock(producto)}>
                    +
                  </button>
                </div>

                <div className="pantry-progress">
                  <span
                    style={{
                      width: `${porcentajeStock(producto)}%`,
                    }}
                  />
                </div>

                <p className="pantry-state">{estadoProducto(producto)}</p>
              </Card>
            ))}
          </div>

          {productosVisibles.length === 0 && (
            <Card>
              <p className="pantry-empty">No hay productos en esta lista.</p>
            </Card>
          )}
        </section>
      )}

      {vista === 'reposicion' && (
        <>
          <Card className="pantry-restock-note">
            <strong>Reposición automática</strong>
            <p>
              Solo aparecen productos de despensa con objetivo fijo. Los perecederos
              se calculan desde el menú y los manuales se añaden cuando tú decidas.
            </p>
          </Card>
          <section className="pantry-grid">
            {productosReposicion.map((producto) => (
              <Card key={producto.id} className="pantry-product-card">
                <ProductoCabecera
                  producto={producto}
                  onAbrir={() => setProductoAbierto(producto.productoId)}
                />
                <div className="pantry-restock-quantity">
                  Comprar {calcularReposicion(producto)} {producto.unidad}
                </div>
                <p className="pantry-lead">
                  Stock {producto.stockActual} · objetivo {producto.stockObjetivo} ·{' '}
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
              <p className="pantry-empty">No hace falta reponer nada.</p>
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
                  <strong>{producto?.nombre ?? 'Producto eliminado'}</strong>
                  <small>
                    {etiquetaMovimiento(movimiento)} ·{' '}
                    {new Date(movimiento.fecha).toLocaleString('es-ES')}
                  </small>
                  {movimiento.observaciones && <small>{movimiento.observaciones}</small>}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    eliminarMovimiento(movimiento.id);
                    setMensaje('Movimiento eliminado.');
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
      <small>Ver lista →</small>
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
  if (filtro === 'reposicion') return 'Faltan en reposición automática';
  if (filtro === 'menu-manual') return 'Según menú o manuales';
  return 'Todos los productos controlados';
}

function etiquetaFrecuencia(frecuencia: FrecuenciaDespensa): string {
  if (frecuencia === 'cuando-falte') return 'cuando falte';
  return frecuencia;
}

function porcentajeStock(producto: ProductoDespensa): number {
  if (producto.stockObjetivo <= 0) return producto.stockActual > 0 ? 100 : 0;
  return Math.min(100, (producto.stockActual / producto.stockObjetivo) * 100);
}

function estadoProducto(producto: ProductoDespensa): string {
  if (producto.tipo === 'perecedero') {
    return 'Compra según las cantidades del menú · sin objetivo fijo';
  }
  if (producto.frecuencia === 'manual') {
    return `Reposición manual · stock ${producto.stockActual} ${producto.unidad}`;
  }
  const faltan = calcularReposicion(producto);
  return `Objetivo: ${producto.stockObjetivo} ${producto.unidad}${
    faltan > 0 ? ` · faltan ${faltan}` : ' · stock correcto'
  }`;
}

function etiquetaMovimiento(movimiento: MovimientoInventario): string {
  const signo = movimiento.tipo === 'consumo' ? '−' : movimiento.cantidad >= 0 ? '+' : '−';
  const cantidad = Math.abs(movimiento.cantidad);
  if (movimiento.tipo === 'compra') return `${signo}${cantidad} compra`;
  if (movimiento.tipo === 'consumo') return `${signo}${cantidad} consumo`;
  return `${signo}${cantidad} ajuste`;
}

export default Despensa;
