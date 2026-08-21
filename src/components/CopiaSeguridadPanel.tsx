import { useRef, useState } from 'react';
import {
  crearCopiaSeguridad,
  leerCopiaSeguridad,
  nombreArchivoCopia,
  restaurarCopiaSeguridad,
  serializarCopiaSeguridad,
} from '../services/copiaSeguridad';

export default function CopiaSeguridadPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const exportar = () => {
    setError('');
    const copia = crearCopiaSeguridad();
    const blob = new Blob([serializarCopiaSeguridad(copia)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivoCopia();
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
    setMensaje(`Copia creada con ${Object.keys(copia.datos).length} bloques de datos.`);
  };

  const importar = async (archivo: File | undefined) => {
    if (!archivo) return;
    setMensaje('');
    setError('');

    try {
      const texto = await archivo.text();
      const copia = leerCopiaSeguridad(texto);
      const fecha = new Date(copia.creada).toLocaleString('es-ES');
      const confirmado = window.confirm(
        `Vas a restaurar una copia de PFI creada el ${fecha}. Se reemplazarán los datos actuales de esta PWA. ¿Continuar?`,
      );
      if (!confirmado) return;

      const restaurados = restaurarCopiaSeguridad(copia, true);
      setMensaje(`Copia restaurada: ${restaurados} bloques de datos. PFI se recargará ahora.`);
      window.setTimeout(() => window.location.reload(), 350);
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se ha podido importar la copia.',
      );
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <section style={estilos.panel}>
      <div>
        <strong style={estilos.titulo}>💾 Copia de seguridad</strong>
        <p style={estilos.texto}>
          Guarda menú, recetas, perfil, inventario, aprendizaje, excepciones y demás ajustes de esta PWA en un archivo JSON. Úsalo para recuperar PFI si cambias de móvil o borras los datos del navegador.
        </p>
      </div>

      <div style={estilos.acciones}>
        <button type="button" onClick={exportar} style={estilos.principal}>
          Exportar copia
        </button>
        <button type="button" onClick={() => inputRef.current?.click()} style={estilos.secundario}>
          Importar copia
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(evento) => void importar(evento.target.files?.[0])}
        />
      </div>

      {mensaje && <p style={estilos.exito}>{mensaje}</p>}
      {error && <p style={estilos.error}>{error}</p>}
    </section>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  panel: { display: 'grid', gap: 12 },
  titulo: { color: '#4f6f52', fontSize: 19 },
  texto: { color: '#667067', lineHeight: 1.5, margin: '8px 0 0' },
  acciones: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 },
  principal: { border: 0, borderRadius: 13, padding: 12, background: '#4f6f52', color: '#fff', fontWeight: 800, cursor: 'pointer' },
  secundario: { border: '1px solid #cdd8ca', borderRadius: 13, padding: 12, background: '#f5f7f2', color: '#4f6f52', fontWeight: 800, cursor: 'pointer' },
  exito: { margin: 0, borderRadius: 12, padding: 10, background: '#eef5ed', color: '#4f6f52', fontWeight: 700 },
  error: { margin: 0, borderRadius: 12, padding: 10, background: '#fff0ec', color: '#8b4f43', fontWeight: 700 },
};
