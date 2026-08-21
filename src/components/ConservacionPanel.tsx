import { useEffect, useMemo, useState } from 'react';
import {
  anadirConservacion,
  cargarConservacion,
  consumirConservacion,
  diasHastaCaducidad,
  eliminarConservacion,
  EVENTO_CONSERVACION,
  type ItemConservacion,
  type TipoConservacion,
} from '../services/conservacion';

const ETIQUETAS: Record<TipoConservacion, { titulo: string; icono: string }> = {
  abierto: { titulo: 'Abiertos', icono: '🥫' },
  congelado: { titulo: 'Congelados', icono: '🧊' },
  sobra: { titulo: 'Sobras', icono: '🍲' },
};

export default function ConservacionPanel() {
  const [items, setItems] = useState<ItemConservacion[]>(cargarConservacion);
  const [tipo, setTipo] = useState<TipoConservacion>('abierto');
  const [anadiendo, setAnadiendo] = useState(false);
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [unidad, setUnidad] = useState('ud');

  useEffect(() => {
    const recargar = () => setItems(cargarConservacion());
    window.addEventListener(EVENTO_CONSERVACION, recargar);
    return () => window.removeEventListener(EVENTO_CONSERVACION, recargar);
  }, []);

  const visibles = useMemo(() => items.filter((item) => item.tipo === tipo), [items, tipo]);
  const conteos = useMemo(
    () => ({
      abierto: items.filter((i) => i.tipo === 'abierto').length,
      congelado: items.filter((i) => i.tipo === 'congelado').length,
      sobra: items.filter((i) => i.tipo === 'sobra').length,
    }),
    [items],
  );

  const cambiarTipo = (nuevo: TipoConservacion) => {
    setTipo(nuevo);
    setUnidad(nuevo === 'sobra' ? 'ración' : 'ud');
  };

  const guardar = () => {
    if (!nombre.trim()) return;
    anadirConservacion({ tipo, nombre, cantidad: Math.max(0.01, cantidad), unidad });
    setNombre('');
    setCantidad(1);
    setAnadiendo(false);
  };

  return (
    <section style={estilos.panel}>
      <div style={estilos.cabecera}>
        <div>
          <strong style={estilos.titulo}>Conservación y sobras</strong>
          <span style={estilos.subtitulo}>Lo que ya está abierto, congelado o preparado.</span>
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

      {anadiendo && (
        <div style={estilos.formulario}>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={tipo === 'sobra' ? 'Ej. Lentejas' : 'Producto'}
            style={estilos.input}
          />
          <div style={estilos.filaFormulario}>
            <input
              type="number"
              min="0.01"
              step="0.5"
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              style={{ ...estilos.input, width: '35%' }}
            />
            <select value={unidad} onChange={(e) => setUnidad(e.target.value)} style={{ ...estilos.input, flex: 1 }}>
              <option value="ud">ud</option>
              <option value="ración">ración</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="l">l</option>
              <option value="envase">envase</option>
            </select>
            <button type="button" style={estilos.guardar} onClick={guardar}>Guardar</button>
          </div>
        </div>
      )}

      <div style={estilos.lista}>
        {visibles.map((item) => (
          <article key={item.id} style={estilos.item}>
            <span style={estilos.itemIcono}>{ETIQUETAS[item.tipo].icono}</span>
            <div style={estilos.itemTexto}>
              <strong>{item.nombre}</strong>
              <span>{item.cantidad.toLocaleString('es-ES')} {item.unidad}</span>
              <small>{textoCaducidad(item)}</small>
            </div>
            <div style={estilos.acciones}>
              <button type="button" style={estilos.usar} onClick={() => consumirConservacion(item.id)}>
                Usado
              </button>
              <button type="button" style={estilos.borrar} onClick={() => eliminarConservacion(item.id)} aria-label={`Eliminar ${item.nombre}`}>
                ×
              </button>
            </div>
          </article>
        ))}
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
  subtitulo: { display: 'block', color: '#7b817b', marginTop: 3, fontSize: 13 },
  anadir: { border: 0, borderRadius: 12, padding: '9px 12px', background: '#4f6f52', color: '#fff', fontWeight: 800 },
  pestanas: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 7 },
  pestana: { border: '1px solid #dde4da', borderRadius: 12, padding: '10px 5px', background: '#f7f8f5', color: '#647066', fontWeight: 750, fontSize: 12 },
  pestanaActiva: { background: '#4f6f52', color: '#fff', borderColor: '#4f6f52' },
  formulario: { background: '#f3f6f1', borderRadius: 16, padding: 12, display: 'grid', gap: 8 },
  filaFormulario: { display: 'flex', gap: 7 },
  input: { boxSizing: 'border-box', border: '1px solid #d7dfd4', borderRadius: 11, padding: '10px 11px', background: '#fff', color: '#263229', fontSize: 15 },
  guardar: { border: 0, borderRadius: 11, padding: '0 13px', background: '#355a42', color: '#fff', fontWeight: 800 },
  lista: { display: 'grid', gap: 8 },
  item: { display: 'flex', alignItems: 'center', gap: 11, padding: 12, border: '1px solid #e2e5df', borderRadius: 16, background: '#fffdf8' },
  itemIcono: { fontSize: 24 },
  itemTexto: { display: 'grid', gap: 2, flex: 1, color: '#3c4a3e' },
  acciones: { display: 'flex', alignItems: 'center', gap: 5 },
  usar: { border: 0, borderRadius: 10, padding: '8px 9px', background: '#eaf1e8', color: '#4f6f52', fontWeight: 800 },
  borrar: { border: 0, background: 'transparent', color: '#a08072', fontSize: 22, padding: 4 },
  vacio: { margin: 0, padding: '18px 8px', textAlign: 'center', color: '#808680' },
};
