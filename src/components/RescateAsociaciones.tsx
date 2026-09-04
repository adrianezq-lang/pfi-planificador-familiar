import { useEffect, useMemo, useState } from 'react';
import { cargarDespensa } from '../services/despensa';
import { descargarDiagnosticoRescate } from '../services/diagnosticoRescate';
import { cargarRecetas } from '../services/recetas';
import {
  descargarCopiaAsociaciones,
  importarCopiaAsociaciones,
  obtenerEstadoCopiasAsociaciones,
  preservarCopiasAsociacionesExistentes,
  restaurarMejorCopiaAsociaciones,
} from '../services/rescateAsociaciones';

export default function RescateAsociaciones() {
  const totalIngredientes = useMemo(
    () =>
      new Set(
        cargarRecetas().flatMap((receta) =>
          receta.ingredientes.map((ingrediente) => ingrediente.nombre.trim()),
        ),
      ).size,
    [],
  );
  const productosDespensa = useMemo(() => cargarDespensa().length, []);
  const [revision, setRevision] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    preservarCopiasAsociacionesExistentes();
    const estadoInicial = obtenerEstadoCopiasAsociaciones();
    setAbierto(estadoInicial.mejor > estadoInicial.actuales);
    setRevision((valor) => valor + 1);
  }, []);

  void revision;
  const estado = obtenerEstadoCopiasAsociaciones();

  const recuperar = () => {
    setError('');
    const cantidad = restaurarMejorCopiaAsociaciones();
    if (cantidad === 0) {
      setMensaje('No he encontrado ninguna copia con asociaciones para restaurar.');
      return;
    }
    setMensaje(`Recuperadas ${cantidad} asociaciones. Ahora PFI revalidará los productos con el catálogo actual.`);
    setRevision((valor) => valor + 1);
  };

  const importar = async (archivo: File | undefined) => {
    if (!archivo) return;
    setError('');
    setMensaje('');
    try {
      const cantidad = importarCopiaAsociaciones(await archivo.text());
      setMensaje(`Copia importada: ${cantidad} asociaciones recuperadas.`);
      setRevision((valor) => valor + 1);
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se ha podido leer la copia.',
      );
    }
  };

  return (
    <section
      style={{
        margin: '12px auto 4px',
        width: 'min(100% - 24px, 980px)',
        border: '1px solid #d8e3d6',
        borderRadius: 16,
        background: '#f8fbf7',
        boxShadow: '0 8px 24px rgba(55, 78, 58, 0.08)',
      }}
    >
      <details
        open={abierto}
        onToggle={(evento) => setAbierto(evento.currentTarget.open)}
      >
        <summary
          style={{
            cursor: 'pointer',
            padding: '14px 16px',
            fontWeight: 800,
            color: '#3f5f45',
          }}
        >
          🛟 Recuperación de asociaciones y copias
        </summary>

        <div style={{ padding: '0 16px 16px', display: 'grid', gap: 12 }}>
          <p style={{ margin: 0, lineHeight: 1.45 }}>
            PFI conserva ahora un historial real que no se sobrescribe. Antes de reparar nada,
            busca datos en la asociación actual, la copia anterior, las claves antiguas y el historial.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            <div style={datoStyle}>
              <small>Asociaciones actuales</small>
              <strong>{estado.actuales}</strong>
            </div>
            <div style={datoStyle}>
              <small>Mejor copia encontrada</small>
              <strong>{estado.mejor}</strong>
            </div>
            <div style={datoStyle}>
              <small>Ingredientes en recetas</small>
              <strong>{totalIngredientes}</strong>
            </div>
            <div style={datoStyle}>
              <small>Productos guardados en despensa</small>
              <strong>{productosDespensa}</strong>
            </div>
            <div style={datoStyle}>
              <small>Mejor historial protegido</small>
              <strong>{estado.historial}</strong>
            </div>
          </div>

          <button type="button" onClick={recuperar} style={botonPrincipal}>
            ♻️ Recuperar la mejor copia disponible
          </button>

          <label style={botonSecundario}>
            📂 Importar una copia JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={(evento) => {
                void importar(evento.target.files?.[0]);
                evento.currentTarget.value = '';
              }}
              style={{ display: 'none' }}
            />
          </label>

          <button
            type="button"
            onClick={descargarCopiaAsociaciones}
            style={botonSecundario}
          >
            💾 Guardar una copia nueva
          </button>

          <div style={rescateManualStyle}>
            <strong>¿La mejor copia sigue siendo muy pequeña?</strong>
            <span>
              Exporta el diagnóstico de rescate. Incluye únicamente asociaciones, recetas,
              despensa e inventario/productos de PFI para poder reconstruir los vínculos que
              todavía sigan guardados en el móvil.
            </span>
            <button
              type="button"
              onClick={descargarDiagnosticoRescate}
              style={botonDiagnostico}
            >
              🧰 Exportar diagnóstico de rescate
            </button>
          </div>

          {mensaje && (
            <p style={{ margin: 0, fontWeight: 700, color: '#3f6b48' }}>{mensaje}</p>
          )}
          {error && (
            <p style={{ margin: 0, fontWeight: 700, color: '#9a3f3f' }}>{error}</p>
          )}
        </div>
      </details>
    </section>
  );
}

const datoStyle = {
  padding: '10px 12px',
  borderRadius: 12,
  background: '#ffffff',
  border: '1px solid #e1e9df',
  display: 'grid',
  gap: 3,
} as const;

const botonPrincipal = {
  minHeight: 46,
  border: 0,
  borderRadius: 12,
  padding: '10px 14px',
  fontWeight: 800,
  background: '#4f6f52',
  color: '#ffffff',
  cursor: 'pointer',
} as const;

const botonSecundario = {
  minHeight: 46,
  border: '1px solid #bfcfbd',
  borderRadius: 12,
  padding: '10px 14px',
  fontWeight: 800,
  background: '#ffffff',
  color: '#3f5f45',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

const rescateManualStyle = {
  display: 'grid',
  gap: 8,
  padding: 12,
  borderRadius: 12,
  background: '#fff8e8',
  border: '1px solid #ead9ac',
  color: '#5d543d',
  lineHeight: 1.4,
} as const;

const botonDiagnostico = {
  minHeight: 46,
  border: '1px solid #b99b55',
  borderRadius: 12,
  padding: '10px 14px',
  fontWeight: 800,
  background: '#fffdf7',
  color: '#624f25',
  cursor: 'pointer',
} as const;
