import { useEffect, useState } from 'react';
import {
  cargarPerfil,
  describirFamilia,
  EVENTO_PERFIL,
} from '../services/perfil';

export default function ContextoFamiliar() {
  const [perfil, setPerfil] = useState(cargarPerfil);

  useEffect(() => {
    const actualizar = () => setPerfil(cargarPerfil());
    window.addEventListener(EVENTO_PERFIL, actualizar);
    return () => window.removeEventListener(EVENTO_PERFIL, actualizar);
  }, []);

  return (
    <aside style={estiloContenedor} aria-label="Personas incluidas en el cálculo">
      <span style={estiloIcono} aria-hidden="true">✓</span>
      <div style={estiloTexto}>
        <strong style={estiloTitulo}>Cantidades adaptadas a vuestra familia</strong>
        <span style={estiloDetalle}>{describirFamilia(perfil)}</span>
        <small style={estiloAyuda}>
          PFI ajusta automáticamente las cantidades según quién come en casa cada día.
        </small>
      </div>
    </aside>
  );
}

const estiloContenedor = {
  boxSizing: 'border-box',
  width: 'min(1120px, calc(100% - 32px))',
  margin: '14px auto 0',
  display: 'grid',
  gridTemplateColumns: '40px minmax(0, 1fr)',
  gap: 12,
  alignItems: 'center',
  padding: '11px 13px',
  border: '1px solid rgba(39, 76, 49, .18)',
  borderRadius: 16,
  background: 'linear-gradient(135deg, rgba(255,253,248,.96), rgba(228,236,224,.96))',
  boxShadow: '0 7px 20px rgba(28, 59, 36, .08)',
} as const;

const estiloIcono = {
  display: 'grid',
  placeItems: 'center',
  width: 36,
  height: 36,
  borderRadius: 12,
  background: '#2d5b3b',
  color: '#fff',
  fontSize: 17,
  fontWeight: 900,
} as const;

const estiloTexto = {
  minWidth: 0,
  display: 'grid',
  gap: 2,
} as const;

const estiloTitulo = {
  color: '#1d3d29',
  fontSize: 12,
  fontWeight: 900,
} as const;

const estiloDetalle = {
  color: '#536359',
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.4,
  overflowWrap: 'anywhere',
} as const;

const estiloAyuda = {
  color: '#6c756e',
  fontSize: 10,
  lineHeight: 1.35,
} as const;
