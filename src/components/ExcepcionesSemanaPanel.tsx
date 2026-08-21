import { useEffect, useState } from 'react';
import {
  alternarComidaFuera,
  cargarExcepcionesSemana,
  describirExcepciones,
  EVENTO_EXCEPCIONES_SEMANA,
  guardarExcepcionesSemana,
  hayExcepcionesActivas,
  limpiarExcepcionesSemana,
  type ExcepcionesSemana,
} from '../services/excepcionesSemana';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function ExcepcionesSemanaPanel({ semanaActiva }: { semanaActiva: number }) {
  const [excepciones, setExcepciones] = useState<ExcepcionesSemana>(() =>
    cargarExcepcionesSemana(semanaActiva),
  );
  const [abierto, setAbierto] = useState(false);

  const recargar = () => setExcepciones(cargarExcepcionesSemana(semanaActiva));

  useEffect(() => {
    recargar();
    window.addEventListener(EVENTO_EXCEPCIONES_SEMANA, recargar);
    return () => window.removeEventListener(EVENTO_EXCEPCIONES_SEMANA, recargar);
  }, [semanaActiva]);

  const actualizar = (cambios: Partial<ExcepcionesSemana>) => {
    setExcepciones(
      guardarExcepcionesSemana({ ...excepciones, ...cambios }, semanaActiva),
    );
  };

  const activas = describirExcepciones(excepciones);

  return (
    <section style={estilos.panel} aria-label="Excepciones de esta semana">
      <button type="button" style={estilos.cabecera} onClick={() => setAbierto((v) => !v)}>
        <span style={estilos.icono}>⚡</span>
        <span style={estilos.textoCabecera}>
          <strong>Excepciones de esta semana</strong>
          <small>
            {hayExcepcionesActivas(excepciones)
              ? activas.slice(0, 2).join(' · ')
              : 'Sin cambios temporales'}
          </small>
        </span>
        <span style={estilos.flecha}>{abierto ? '−' : '+'}</span>
      </button>

      {abierto && (
        <div style={estilos.contenido}>
          <div style={estilos.rapidas}>
            <button
              type="button"
              style={{ ...estilos.opcion, ...(excepciones.soloAdultos ? estilos.opcionActiva : {}) }}
              onClick={() => actualizar({ soloAdultos: !excepciones.soloAdultos })}
            >
              👨‍👩 Solo adultos
            </button>
            <button
              type="button"
              style={{ ...estilos.opcion, ...(excepciones.fueraTodaSemana ? estilos.opcionActiva : {}) }}
              onClick={() => actualizar({ fueraTodaSemana: !excepciones.fueraTodaSemana })}
            >
              🏠 Toda la semana fuera
            </button>
          </div>

          <p style={estilos.ayuda}>
            También puedes marcar solo una comida o cena. Esto cambia Compra y las cantidades de esta semana, no vuestro perfil permanente.
          </p>

          <div style={estilos.dias}>
            {DIAS.map((dia) => (
              <div key={dia} style={estilos.diaFila}>
                <strong style={estilos.diaNombre}>{dia}</strong>
                <button
                  type="button"
                  style={{ ...estilos.momento, ...(excepciones.comidasFuera[dia]?.comida ? estilos.momentoActivo : {}) }}
                  onClick={() => setExcepciones(alternarComidaFuera(dia, 'comida', semanaActiva))}
                >
                  🍽️ Comida fuera
                </button>
                <button
                  type="button"
                  style={{ ...estilos.momento, ...(excepciones.comidasFuera[dia]?.cena ? estilos.momentoActivo : {}) }}
                  onClick={() => setExcepciones(alternarComidaFuera(dia, 'cena', semanaActiva))}
                >
                  🌙 Cena fuera
                </button>
              </div>
            ))}
          </div>

          {hayExcepcionesActivas(excepciones) && (
            <button
              type="button"
              style={estilos.limpiar}
              onClick={() => {
                limpiarExcepcionesSemana(semanaActiva);
                recargar();
              }}
            >
              Quitar excepciones de esta semana
            </button>
          )}
        </div>
      )}
    </section>
  );
}

const estilos: Record<string, React.CSSProperties> = {
  panel: {
    margin: '0 0 16px',
    border: '1px solid rgba(79,111,82,.18)',
    borderRadius: 22,
    background: 'rgba(255,252,245,.88)',
    boxShadow: '0 8px 24px rgba(47,70,52,.08)',
    overflow: 'hidden',
  },
  cabecera: {
    width: '100%', border: 0, background: 'transparent', padding: '16px 18px',
    display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: '#355a42', cursor: 'pointer',
  },
  icono: { fontSize: 24 },
  textoCabecera: { display: 'grid', gap: 3, flex: 1, fontSize: 17 },
  flecha: { fontSize: 26, fontWeight: 500 },
  contenido: { padding: '0 16px 16px' },
  rapidas: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 },
  opcion: {
    border: '1px solid #d8e1d6', borderRadius: 14, padding: '11px 8px', background: '#f4f7f1',
    color: '#4f6f52', fontWeight: 800, cursor: 'pointer',
  },
  opcionActiva: { background: '#4f6f52', color: '#fff', borderColor: '#4f6f52' },
  ayuda: { color: '#6c746d', fontSize: 13, lineHeight: 1.45, margin: '12px 2px' },
  dias: { display: 'grid', gap: 7 },
  diaFila: { display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 7, alignItems: 'center' },
  diaNombre: { color: '#4f5d51', fontSize: 13 },
  momento: {
    border: '1px solid #e0e5dd', borderRadius: 11, padding: '8px 5px', background: '#fff',
    color: '#6a746b', fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },
  momentoActivo: { background: '#f1dfb6', color: '#745d20', borderColor: '#d8bd78' },
  limpiar: {
    width: '100%', marginTop: 12, border: 0, borderRadius: 12, padding: 10,
    background: '#f3eee5', color: '#7a6650', fontWeight: 750, cursor: 'pointer',
  },
};
