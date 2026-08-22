import { useEffect, useMemo, useState } from 'react';
import {
  actualizarConservacion,
  anadirConservacion,
  cantidadClasificadaProducto,
  cargarConservacion,
  consumirConservacion,
  diasHastaCaducidad,
  eliminarConservacion,
  EVENTO_CONSERVACION,
  fechaLimiteSugerida,
  type ItemConservacion,
  type TipoConservacion,
} from '../services/conservacion';
import {
  cargarDespensa,
  EVENTO_DESPENSA,
  type ProductoDespensa,
} from '../services/despensa';
import { registrarConsumo, EVENTO_INVENTARIO } from '../services/inventario';
import {
  cantidadRealDesdeEnvases,
  configuracionStockReal,
  etiquetaUnidadStock,
  envasesDesdeCantidadReal,
  formatearNumeroStock,
  pasoCantidadStock,
} from '../services/stockReal';

const ETIQUETAS: Record<TipoConservacion, { titulo: string; icono: string; ayuda: string }> = {
  abierto: {
    titulo: 'Abiertos',
    icono: '🥫',
    ayuda: 'Parte del inventario que ya está abierta. No suma stock nuevo.',
  },
  congelado: {
    titulo: 'Congelados',
    icono: '🧊',
    ayuda: 'Parte del inventario que tienes congelada. Sigue contando una sola vez.',
  },
  sobra: {
    titulo: 'Sobras',
    icono: '🍲',
    ayuda: 'Comida ya preparada que queda disponible en raciones.',
  },
};

function fechaInputDesdeIso(iso?: string): string {
  return iso ? iso.slice(0, 10) : '';
}

function isoDesdeFechaInput(valor: string): string | undefined {
  if (!valor) return undefined;
  return new Date(`${valor}T23:59:59`).toISOString();
}

export default function ConservacionPanel() {
  const [items, setItems] = useState<ItemConservacion[]>(cargarConservacion);
  const [productos, setProductos] = useState<ProductoDespensa[]>(cargarDespensa);
  const [tipo, setTipo] = useState<TipoConservacion>('abierto');
  const [anadiendo, setAnadiendo] = useState(false);
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [unidadSobra, setUnidadSobra] = useState('ración');
  const [productoId, setProductoId] = useState('');
  const [fechaLimite, setFechaLimite] = useState(
    fechaInputDesdeIso(fechaLimiteSugerida('abierto')),
  );
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const recargarConservacion = () => setItems(cargarConservacion());
    const recargarInventario = () => setProductos(cargarDespensa());
    window.addEventListener(EVENTO_CONSERVACION, recargarConservacion);
    window.addEventListener(EVENTO_DESPENSA, recargarInventario);
    window.addEventListener(EVENTO_INVENTARIO, recargarInventario);
    return () => {
      window.removeEventListener(EVENTO_CONSERVACION, recargarConservacion);
      window.removeEventListener(EVENTO_DESPENSA, recargarInventario);
      window.removeEventListener(EVENTO_INVENTARIO, recargarInventario);
    };
  }, []);

  const productosPorId = useMemo(
    () => new Map(productos.map((producto) => [producto.productoId, producto])),
    [productos],
  );
  const productosConStock = useMemo(
    () => productos.filter((producto) => producto.stockActual > 0),
    [productos],
  );
  const visibles = useMemo(() => items.filter((item) => item.tipo === tipo), [items, tipo]);
  const conteos = useMemo(
    () => ({
      abierto: items.filter((i) => i.tipo === 'abierto').length,
      congelado: items.filter((i) => i.tipo === 'congelado').length,
      sobra: items.filter((i) => i.tipo === 'sobra').length,
    }),
    [items],
  );

  const productoSeleccionado = productoId ? productosPorId.get(productoId) ?? null : null;
  const configSeleccionada = productoSeleccionado
    ? configuracionStockReal(productoSeleccionado)
    : null;
  const totalNaturalSeleccionado =
    productoSeleccionado && configSeleccionada
      ? cantidadRealDesdeEnvases(productoSeleccionado.stockActual, configSeleccionada)
      : 0;
  const yaClasificadoSeleccionado = productoSeleccionado
    ? cantidadClasificadaProducto(productoSeleccionado.productoId)
    : 0;
  const disponibleNaturalSeleccionado = Math.max(
    0,
    totalNaturalSeleccionado - yaClasificadoSeleccionado,
  );
  const unidadNaturalSeleccionada = configSeleccionada
    ? etiquetaUnidadStock(configSeleccionada.unidadContenido, Math.max(1, cantidad))
    : '';

  const cambiarTipo = (nuevo: TipoConservacion) => {
    setTipo(nuevo);
    setNombre('');
    setProductoId('');
    setCantidad(nuevo === 'sobra' ? 1 : 1);
    setUnidadSobra('ración');
    setFechaLimite(fechaInputDesdeIso(fechaLimiteSugerida(nuevo)));
    setMensaje('');
  };

  const seleccionarProducto = (id: string) => {
    setProductoId(id);
    setMensaje('');
    const producto = productosPorId.get(id);
    if (!producto) return;
    const config = configuracionStockReal(producto);
    const totalNatural = cantidadRealDesdeEnvases(producto.stockActual, config);
    const disponible = Math.max(0, totalNatural - cantidadClasificadaProducto(id));
    setCantidad(Math.min(Math.max(pasoCantidadStock(config), 0.01), disponible || 1));
  };

  const guardar = () => {
    if (tipo === 'sobra') {
      if (!nombre.trim()) {
        setMensaje('Escribe qué comida ha sobrado.');
        return;
      }
      anadirConservacion({
        tipo,
        nombre,
        cantidad: Math.max(0.5, cantidad),
        unidad: unidadSobra,
        fechaLimite: isoDesdeFechaInput(fechaLimite),
      });
      setNombre('');
      setCantidad(1);
      setAnadiendo(false);
      setMensaje('Sobra guardada.');
      return;
    }

    if (!productoSeleccionado || !configSeleccionada) {
      setMensaje('Elige un producto que ya esté en tu inventario.');
      return;
    }
    if (disponibleNaturalSeleccionado <= 0) {
      setMensaje('Todo el stock de este producto ya está marcado como abierto o congelado.');
      return;
    }

    const cantidadSegura = Math.min(
      Math.max(0.01, cantidad),
      disponibleNaturalSeleccionado,
    );
    anadirConservacion({
      tipo,
      nombre: productoSeleccionado.nombre,
      cantidad: cantidadSegura,
      unidad: configSeleccionada.unidadContenido,
      productoId: productoSeleccionado.productoId,
      fechaLimite: isoDesdeFechaInput(fechaLimite),
    });
    setCantidad(1);
    setProductoId('');
    setAnadiendo(false);
    setMensaje(
      tipo === 'abierto'
        ? 'Producto marcado como abierto sin duplicar el stock.'
        : 'Producto marcado como congelado sin duplicar el stock.',
    );
  };

  const consumir = (item: ItemConservacion, cantidadSolicitada: number) => {
    const cantidadReal = Math.min(item.cantidad, Math.max(0.01, cantidadSolicitada));
    if (item.productoId) {
      const producto = productosPorId.get(item.productoId);
      if (producto) {
        const config = configuracionStockReal(producto);
        const envases = envasesDesdeCantidadReal(cantidadReal, config);
        const consumo = Math.min(producto.stockActual, envases);
        if (consumo > 0) {
          registrarConsumo(
            producto.productoId,
            consumo,
            'manual',
            `Consumo desde ${item.tipo === 'abierto' ? 'abiertos' : 'congelados'}`,
          );
        }
      }
    }
    consumirConservacion(item.id, cantidadReal);
    setMensaje(
      item.tipo === 'sobra'
        ? 'Sobra consumida.'
        : 'Consumo descontado también del inventario.',
    );
  };

  const moverEstado = (item: ItemConservacion, nuevoTipo: 'abierto' | 'congelado') => {
    actualizarConservacion(item.id, {
      tipo: nuevoTipo,
      fechaLimite: fechaLimiteSugerida(nuevoTipo),
    });
    setMensaje(
      nuevoTipo === 'congelado'
        ? 'Producto pasado a congelados.'
        : 'Producto pasado a abiertos.',
    );
  };

  return (
    <section style={estilos.panel}>
      <div style={estilos.cabecera}>
        <div>
          <strong style={estilos.titulo}>Conservación y sobras</strong>
          <span style={estilos.subtitulo}>
            Inventario = cantidad total. Abiertos/Congelados = estado. Sobras = comida preparada.
          </span>
        </div>
        <button type="button" style={estilos.anadir} onClick={() => setAnadiendo((v) => !v)}>
          {anadiendo ? 'Cerrar' : '+ Añadir'}
        </button>
      </div>

      <div style={estilos.pestanas}>
        {(Object.keys(ETIQUETAS) as TipoConservacion[]).map((clave) => (
          <button
            key={clave}
            type="button"
            style={{ ...estilos.pestana, ...(tipo === clave ? estilos.pestanaActiva : {}) }}
            onClick={() => cambiarTipo(clave)}
          >
            {ETIQUETAS[clave].icono} {ETIQUETAS[clave].titulo} · {conteos[clave]}
          </button>
        ))}
      </div>

      <p style={estilos.ayuda}>{ETIQUETAS[tipo].ayuda}</p>
      {mensaje && <p style={estilos.mensaje}>{mensaje}</p>}

      {anadiendo && (
        <div style={estilos.formulario}>
          {tipo === 'sobra' ? (
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Lentejas"
              style={estilos.input}
            />
          ) : (
            <select
              value={productoId}
              onChange={(e) => seleccionarProducto(e.target.value)}
              style={estilos.input}
            >
              <option value="">Producto del inventario…</option>
              {productosConStock.map((producto) => (
                <option key={producto.productoId} value={producto.productoId}>
                  {producto.nombre}
                </option>
              ))}
            </select>
          )}

          <div style={estilos.filaFormulario}>
            <input
              type="number"
              min={tipo === 'sobra' ? 0.5 : 0.01}
              max={
                tipo !== 'sobra' && disponibleNaturalSeleccionado > 0
                  ? disponibleNaturalSeleccionado
                  : undefined
              }
              step={
                tipo === 'sobra'
                  ? 0.5
                  : configSeleccionada
                    ? pasoCantidadStock(configSeleccionada)
                    : 1
              }
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              style={{ ...estilos.input, width: '32%' }}
            />
            {tipo === 'sobra' ? (
              <select
                value={unidadSobra}
                onChange={(e) => setUnidadSobra(e.target.value)}
                style={{ ...estilos.input, flex: 1 }}
              >
                <option value="ración">ración</option>
                <option value="ud">ud</option>
                <option value="g">g</option>
              </select>
            ) : (
              <div style={estilos.unidadNatural}>{unidadNaturalSeleccionada || 'unidad'}</div>
            )}
            <input
              type="date"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
              style={{ ...estilos.input, flex: 1 }}
              aria-label="Fecha límite"
            />
          </div>

          {tipo !== 'sobra' && productoSeleccionado && configSeleccionada && (
            <small style={estilos.disponible}>
              En inventario: {formatearNumeroStock(totalNaturalSeleccionado)}{' '}
              {etiquetaUnidadStock(configSeleccionada.unidadContenido, totalNaturalSeleccionado)} ·{' '}
              sin clasificar: {formatearNumeroStock(disponibleNaturalSeleccionado)}{' '}
              {etiquetaUnidadStock(configSeleccionada.unidadContenido, disponibleNaturalSeleccionado)}
            </small>
          )}

          <button type="button" style={estilos.guardar} onClick={guardar}>
            Guardar
          </button>
        </div>
      )}

      <div style={estilos.lista}>
        {visibles.map((item) => {
          const producto = item.productoId ? productosPorId.get(item.productoId) : undefined;
          const config = producto ? configuracionStockReal(producto) : null;
          const paso = item.tipo === 'sobra' ? 0.5 : config ? pasoCantidadStock(config) : 1;
          return (
            <article key={item.id} style={estilos.item}>
              <span style={estilos.itemIcono}>{ETIQUETAS[item.tipo].icono}</span>
              <div style={estilos.itemTexto}>
                <strong>{item.nombre}</strong>
                <span>
                  {formatearNumeroStock(item.cantidad)}{' '}
                  {etiquetaUnidadStock(item.unidad, item.cantidad)}
                </span>
                <small>{textoCaducidad(item)}</small>
                {item.productoId && (
                  <small style={estilos.vinculado}>
                    ✓ Incluido en Inventario; aquí solo se guarda su estado
                  </small>
                )}
                {item.productoId && !producto && (
                  <small style={estilos.alerta}>⚠️ El producto ya no está en Inventario</small>
                )}
              </div>
              <div style={estilos.acciones}>
                {item.tipo === 'abierto' && (
                  <button type="button" style={estilos.secundario} onClick={() => moverEstado(item, 'congelado')}>
                    Congelar
                  </button>
                )}
                {item.tipo === 'congelado' && (
                  <button type="button" style={estilos.secundario} onClick={() => moverEstado(item, 'abierto')}>
                    Descongelar
                  </button>
                )}
                <button
                  type="button"
                  style={estilos.usar}
                  onClick={() => consumir(item, Math.min(paso, item.cantidad))}
                >
                  − {formatearNumeroStock(Math.min(paso, item.cantidad))}
                </button>
                <button type="button" style={estilos.usarTodo} onClick={() => consumir(item, item.cantidad)}>
                  Todo usado
                </button>
                <button
                  type="button"
                  style={estilos.borrar}
                  onClick={() => eliminarConservacion(item.id)}
                  aria-label={`Eliminar ${item.nombre}`}
                >
                  ×
                </button>
              </div>
            </article>
          );
        })}
        {visibles.length === 0 && (
          <p style={estilos.vacio}>No hay {ETIQUETAS[tipo].titulo.toLocaleLowerCase('es')} guardados.</p>
        )}
      </div>
    </section>
  );
}

function textoCaducidad(item: ItemConservacion): string {
  const dias = diasHastaCaducidad(item);
  if (dias === null) return 'Sin fecha límite';
  if (dias < 0) return `⚠️ Caducó hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`;
  if (dias === 0) return '⚠️ Consumir hoy';
  if (dias === 1) return 'Consumir mañana';
  return `Consumir en ${dias} días aprox.`;
}

const estilos: Record<string, React.CSSProperties> = {
  panel: { display: 'grid', gap: 14 },
  cabecera: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  titulo: { display: 'block', color: '#355a42', fontSize: 20 },
  subtitulo: { display: 'block', color: '#7b817b', marginTop: 3, fontSize: 13, lineHeight: 1.4 },
  anadir: { border: 0, borderRadius: 12, padding: '9px 12px', background: '#4f6f52', color: '#fff', fontWeight: 800 },
  pestanas: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 7 },
  pestana: { border: '1px solid #dde4da', borderRadius: 12, padding: '10px 5px', background: '#f7f8f5', color: '#647066', fontWeight: 750, fontSize: 12 },
  pestanaActiva: { background: '#4f6f52', color: '#fff', borderColor: '#4f6f52' },
  ayuda: { margin: 0, padding: '10px 12px', borderRadius: 12, background: '#f4f7f1', color: '#68746b', fontSize: 13, lineHeight: 1.45 },
  mensaje: { margin: 0, padding: '10px 12px', borderRadius: 12, background: '#eef4ea', color: '#355a42', fontWeight: 700, fontSize: 13 },
  formulario: { background: '#f3f6f1', borderRadius: 16, padding: 12, display: 'grid', gap: 8 },
  filaFormulario: { display: 'flex', gap: 7, flexWrap: 'wrap' },
  input: { boxSizing: 'border-box', border: '1px solid #d7dfd4', borderRadius: 11, padding: '10px 11px', background: '#fff', color: '#263229', fontSize: 15, minWidth: 0 },
  unidadNatural: { display: 'flex', alignItems: 'center', padding: '0 10px', minHeight: 42, borderRadius: 11, background: '#fff', border: '1px solid #d7dfd4', color: '#4f6f52', fontWeight: 800 },
  disponible: { color: '#69766b', lineHeight: 1.4 },
  guardar: { border: 0, borderRadius: 11, padding: '10px 13px', background: '#355a42', color: '#fff', fontWeight: 800 },
  lista: { display: 'grid', gap: 8 },
  item: { display: 'flex', alignItems: 'center', gap: 11, padding: 12, border: '1px solid #e2e5df', borderRadius: 16, background: '#fffdf8', flexWrap: 'wrap' },
  itemIcono: { fontSize: 24 },
  itemTexto: { display: 'grid', gap: 2, flex: '1 1 180px', color: '#3c4a3e' },
  vinculado: { color: '#52745a' },
  alerta: { color: '#a45145' },
  acciones: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, flexWrap: 'wrap' },
  usar: { border: 0, borderRadius: 10, padding: '8px 9px', background: '#eaf1e8', color: '#4f6f52', fontWeight: 800 },
  usarTodo: { border: 0, borderRadius: 10, padding: '8px 9px', background: '#4f6f52', color: '#fff', fontWeight: 800 },
  secundario: { border: '1px solid #d8e0d5', borderRadius: 10, padding: '8px 9px', background: '#fff', color: '#55705a', fontWeight: 800 },
  borrar: { border: 0, background: 'transparent', color: '#a08072', fontSize: 22, padding: 4 },
  vacio: { margin: 0, padding: '18px 8px', textAlign: 'center', color: '#808680' },
};
