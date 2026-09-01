import { useEffect, useMemo, useState } from 'react';
import {
  actualizarProductoDespensa,
  buscarProductoDespensa,
  crearProductoDespensaDesdeCatalogo,
  eliminarProductoDespensa,
  type FrecuenciaDespensa,
  type ProductoDespensa,
  type TipoProductoDespensa,
} from '../services/despensa';
import {
  cargarCatalogoMercadona,
  type ProductoMercadonaCatalogo,
} from '../services/catalogoMercadona';
import {
  consumoUltimos30Dias,
  previsionAgotamiento,
} from '../services/inventario';

type ProductoInicial = Pick<
  ProductoMercadonaCatalogo,
  'productoId' | 'nombre' | 'imagen' | 'formato' | 'precio'
> & Partial<ProductoMercadonaCatalogo>;

type ProductoDetalleModalProps = {
  productoId: string | null;
  productoInicial?: ProductoInicial | null;
  onCerrar: () => void;
  onActualizado?: () => void;
};

type SugerenciaInteligente = {
  objetivo: number;
  frecuencia: FrecuenciaDespensa;
  explicacion: string;
};

function sugerenciaParaProducto(
  producto: ProductoDespensa,
): SugerenciaInteligente | null {
  if (producto.tipo === 'perecedero') {
    return {
      objetivo: 0,
      frecuencia: 'semanal',
      explicacion:
        'Es perecedero: PFI lo calculará desde el menú en lugar de mantener un stock fijo.',
    };
  }

  const consumo30 = consumoUltimos30Dias(producto.productoId);
  if (consumo30 <= 0) return null;

  const frecuencia =
    consumo30 >= 8
      ? 'semanal'
      : consumo30 >= 2
        ? 'cuando-falte'
        : 'mensual';
  const diasCobertura =
    frecuencia === 'semanal' ? 9 : frecuencia === 'mensual' ? 30 : 15;
  const objetivo = Math.max(1, Math.ceil((consumo30 / 30) * diasCobertura));

  return {
    objetivo,
    frecuencia,
    explicacion: `Basado en un consumo de ${formatearNumero(consumo30)} ${producto.unidad} durante los últimos 30 días.`,
  };
}

function formatearNumero(valor: number): string {
  return valor.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

function ProductoDetalleModal({
  productoId,
  productoInicial = null,
  onCerrar,
  onActualizado,
}: ProductoDetalleModalProps) {
  const [catalogo, setCatalogo] = useState<ProductoMercadonaCatalogo | null>(
    productoInicial && 'url' in productoInicial
      ? (productoInicial as ProductoMercadonaCatalogo)
      : null,
  );
  const [despensa, setDespensa] = useState<ProductoDespensa | null>(null);
  const [editor, setEditor] = useState<ProductoDespensa | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!productoId) return;

    const guardado = buscarProductoDespensa(productoId) ?? null;
    setDespensa(guardado);
    setEditor(guardado ? { ...guardado } : null);

    let cancelado = false;
    setCargando(true);
    void cargarCatalogoMercadona()
      .then((resultado) => {
        if (cancelado) return;
        const encontrado = resultado.productos.find(
          (producto) => producto.productoId === productoId,
        );
        if (encontrado) setCatalogo(encontrado);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [productoId]);

  const productoVisible = catalogo ?? productoInicial ?? despensa;
  const sugerencia = useMemo(
    () => (editor ? sugerenciaParaProducto(editor) : null),
    [editor],
  );
  const diasRestantes = useMemo(
    () => (productoId ? previsionAgotamiento(productoId) : null),
    [productoId, editor?.stockActual],
  );

  if (!productoId || !productoVisible) return null;

  const guardar = () => {
    if (!editor) return;

    actualizarProductoDespensa(editor.id, {
      stockActual: editor.stockActual,
      stockEsAproximado: editor.stockEsAproximado,
      stockObjetivo: editor.stockObjetivo,
      unidad: editor.unidad,
      tipo: editor.tipo,
      frecuencia: editor.frecuencia,
      umbralAviso: editor.umbralAviso,
    });
    const actualizado = buscarProductoDespensa(editor.productoId) ?? editor;
    setDespensa(actualizado);
    setEditor({ ...actualizado });
    setMensaje('Cambios guardados.');
    onActualizado?.();
  };

  const añadir = () => {
    if (!catalogo) return;
    crearProductoDespensaDesdeCatalogo(catalogo);
    const creado = buscarProductoDespensa(catalogo.productoId) ?? null;
    setDespensa(creado);
    setEditor(creado ? { ...creado } : null);
    setMensaje('Producto añadido a la despensa. Ya puedes configurarlo.');
    onActualizado?.();
  };

  const quitar = () => {
    if (!despensa) return;
    eliminarProductoDespensa(despensa.id);
    setDespensa(null);
    setEditor(null);
    setMensaje('Producto quitado de la despensa.');
    onActualizado?.();
  };

  return (
    <div className="product-detail-backdrop" role="presentation">
      <section
        className="product-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Información de ${productoVisible.nombre}`}
      >
        <button
          type="button"
          className="product-detail-modal__close"
          onClick={onCerrar}
          aria-label="Cerrar"
        >
          ×
        </button>

        <header className="product-detail-modal__header">
          {productoVisible.imagen ? (
            <img src={productoVisible.imagen} alt="" />
          ) : (
            <div className="product-detail-modal__placeholder">🛒</div>
          )}
          <div>
            <span className="product-detail-modal__eyebrow">PRODUCTO</span>
            <h2>{productoVisible.nombre}</h2>
            <p>{productoVisible.formato}</p>
            <strong>
              {productoVisible.precio === null
                ? 'Precio no disponible'
                : productoVisible.precio.toLocaleString('es-ES', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
            </strong>
          </div>
        </header>

        <div className="product-detail-modal__actions">
          {catalogo?.url && (
            <a
              href={catalogo.url}
              target="_blank"
              rel="noreferrer"
              className="product-detail-modal__mercadona"
            >
              🛒 Abrir en Mercadona
            </a>
          )}
          {!despensa && catalogo && (
            <button type="button" onClick={añadir}>
              + Añadir a despensa
            </button>
          )}
        </div>

        {cargando && !catalogo && (
          <p className="product-detail-modal__notice">Buscando ficha de Mercadona…</p>
        )}
        {mensaje && <p className="product-detail-modal__success">{mensaje}</p>}

        {editor ? (
          <>
            <section className="product-detail-smart">
              <div>
                <span>🧠 RECOMENDACIÓN PFI</span>
                {sugerencia ? (
                  <>
                    <strong>
                      Objetivo {sugerencia.objetivo} {editor.unidad} ·{' '}
                      {etiquetaFrecuencia(sugerencia.frecuencia)}
                    </strong>
                    <p>{sugerencia.explicacion}</p>
                  </>
                ) : (
                  <>
                    <strong>Aún estoy observando este producto</strong>
                    <p>
                      Registra compras y consumos para que PFI pueda proponerte un
                      objetivo personalizado.
                    </p>
                  </>
                )}
                {diasRestantes !== null && (
                  <small>
                    Al ritmo actual quedan aproximadamente{' '}
                    {Math.max(0, Math.round(diasRestantes))} días de stock.
                  </small>
                )}
              </div>
              {sugerencia && (
                <button
                  type="button"
                  onClick={() =>
                    setEditor({
                      ...editor,
                      stockObjetivo: sugerencia.objetivo,
                      frecuencia: sugerencia.frecuencia,
                    })
                  }
                >
                  Aplicar
                </button>
              )}
            </section>

            <div className="product-detail-form">
              <CampoNumero
                etiqueta="Stock actual"
                valor={editor.stockActual}
                onChange={(stockActual) => setEditor({ ...editor, stockActual })}
              />
              <label>
                <span>Cantidad aproximada</span>
                <select
                  value={editor.stockEsAproximado ? 'aproximada' : 'exacta'}
                  onChange={(evento) =>
                    setEditor({
                      ...editor,
                      stockEsAproximado: evento.target.value === 'aproximada',
                    })
                  }
                >
                  <option value="exacta">Exacta</option>
                  <option value="aproximada">Aproximada (más o menos)</option>
                </select>
              </label>
              <CampoNumero
                etiqueta="Stock objetivo"
                valor={editor.stockObjetivo}
                onChange={(stockObjetivo) =>
                  setEditor({ ...editor, stockObjetivo })
                }
              />
              <CampoNumero
                etiqueta="Avisar cuando quede"
                valor={editor.umbralAviso}
                onChange={(umbralAviso) => setEditor({ ...editor, umbralAviso })}
              />
              <label>
                <span>Unidad</span>
                <input
                  value={editor.unidad}
                  onChange={(evento) =>
                    setEditor({ ...editor, unidad: evento.target.value })
                  }
                />
              </label>
              <label>
                <span>Tipo</span>
                <select
                  value={editor.tipo}
                  onChange={(evento) =>
                    setEditor({
                      ...editor,
                      tipo: evento.target.value as TipoProductoDespensa,
                    })
                  }
                >
                  <option value="despensa">Despensa</option>
                  <option value="perecedero">Perecedero</option>
                </select>
              </label>
              <label>
                <span>Reposición</span>
                <select
                  value={editor.frecuencia}
                  onChange={(evento) =>
                    setEditor({
                      ...editor,
                      frecuencia: evento.target.value as FrecuenciaDespensa,
                    })
                  }
                >
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                  <option value="cuando-falte">Cuando falte</option>
                  <option value="manual">Manual</option>
                </select>
              </label>
            </div>

            <div className="product-detail-modal__footer">
              <button type="button" className="primary" onClick={guardar}>
                Guardar cambios
              </button>
              <button type="button" className="danger" onClick={quitar}>
                Quitar de despensa
              </button>
            </div>
          </>
        ) : (
          <p className="product-detail-modal__notice">
            Este producto no está controlado en la despensa. Puedes abrir su ficha
            de Mercadona o añadirlo para configurar stock y reposición.
          </p>
        )}
      </section>
    </div>
  );
}

function CampoNumero({
  etiqueta,
  valor,
  onChange,
}: {
  etiqueta: string;
  valor: number;
  onChange: (valor: number) => void;
}) {
  return (
    <label>
      <span>{etiqueta}</span>
      <input
        type="number"
        min="0"
        step="0.25"
        value={valor}
        onChange={(evento) => {
          const numero = Number(evento.target.value);
          onChange(Number.isFinite(numero) ? Math.max(0, numero) : 0);
        }}
      />
    </label>
  );
}

function etiquetaFrecuencia(frecuencia: FrecuenciaDespensa): string {
  return frecuencia === 'cuando-falte'
    ? 'reponer cuando falte'
    : frecuencia === 'manual'
      ? 'reposición manual'
      : `reposición ${frecuencia}`;
}

export default ProductoDetalleModal;
