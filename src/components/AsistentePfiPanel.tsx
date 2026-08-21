import { useState } from 'react';
import type { DiaMenu } from '../data/Menusemanal';
import { procesarComandoAsistentePfi } from '../services/asistentePfi';

export default function AsistentePfiPanel({
  menu,
  guardarMenu,
  semanaActiva,
}: {
  menu: DiaMenu[];
  guardarMenu: (menu: DiaMenu[]) => void;
  semanaActiva: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [respuesta, setRespuesta] = useState('');

  const enviar = () => {
    const resultado = procesarComandoAsistentePfi(texto, menu, semanaActiva);
    if (resultado.menu) guardarMenu(resultado.menu);
    setRespuesta(resultado.respuesta);
    if (resultado.entendido) setTexto('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-label="Abrir asistente PFI"
        style={estilos.flotante}
      >
        🧠
      </button>

      {abierto && (
        <aside style={estilos.panel} aria-label="Asistente PFI">
          <header style={estilos.cabecera}>
            <div>
              <strong style={estilos.titulo}>Asistente PFI</strong>
              <span style={estilos.subtitulo}>Dime el cambio y lo aplico</span>
            </div>
            <button type="button" onClick={() => setAbierto(false)} style={estilos.cerrar}>×</button>
          </header>

          <div style={estilos.ejemplos}>
            <button type="button" onClick={() => setTexto('Esta semana no están los niños')}>Solo adultos</button>
            <button type="button" onClick={() => setTexto('El martes cenamos fuera')}>Cena fuera</button>
            <button type="button" onClick={() => setTexto('He congelado 2 raciones de lentejas')}>Guardar sobra</button>
          </div>

          <textarea
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviar();
              }
            }}
            placeholder="Ej. Cambia la cena del jueves por tortilla francesa"
            style={estilos.textarea}
          />
          <button type="button" onClick={enviar} disabled={!texto.trim()} style={estilos.enviar}>
            Aplicar cambio
          </button>

          {respuesta && <p style={estilos.respuesta}>{respuesta}</p>}
          <small style={estilos.privacidad}>Los cambios se guardan en esta PWA, igual que el menú y la despensa.</small>
        </aside>
      )}
    </>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  flotante: {
    position: 'fixed', right: 18, bottom: 92, zIndex: 80, width: 54, height: 54,
    borderRadius: 18, border: '1px solid rgba(255,255,255,.55)', background: '#355a42',
    color: '#fff', fontSize: 24, boxShadow: '0 10px 28px rgba(35,64,45,.28)', cursor: 'pointer',
  },
  panel: {
    position: 'fixed', left: 14, right: 14, bottom: 88, zIndex: 79, maxWidth: 520,
    margin: '0 auto', borderRadius: 24, padding: 16, background: 'rgba(255,252,244,.97)',
    border: '1px solid rgba(79,111,82,.2)', boxShadow: '0 18px 50px rgba(35,55,40,.28)',
    backdropFilter: 'blur(16px)', display: 'grid', gap: 11,
  },
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  titulo: { display: 'block', color: '#355a42', fontSize: 20 },
  subtitulo: { display: 'block', color: '#7b817b', fontSize: 13, marginTop: 2 },
  cerrar: { border: 0, background: 'transparent', fontSize: 28, color: '#6d786f', cursor: 'pointer' },
  ejemplos: { display: 'flex', gap: 6, overflowX: 'auto' },
  textarea: {
    width: '100%', boxSizing: 'border-box', border: '1px solid #d6dfd4', borderRadius: 14,
    padding: 12, resize: 'none', background: '#fff', color: '#263229', fontSize: 15, fontFamily: 'inherit',
  },
  enviar: { border: 0, borderRadius: 13, padding: 12, background: '#4f6f52', color: '#fff', fontWeight: 850, fontSize: 15 },
  respuesta: { margin: 0, padding: 11, borderRadius: 13, background: '#edf4eb', color: '#426046', lineHeight: 1.4, fontSize: 14 },
  privacidad: { color: '#8b8f89', lineHeight: 1.35 },
};

Object.assign(estilos.ejemplos, {});
