import { useEffect, useState } from 'react';
import AppIcon from './AppIcon';
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
    <aside className="family-context" aria-label="Personas incluidas en el cálculo">
      <span className="family-context__icon" aria-hidden="true">
        <AppIcon name="users" size={18} />
      </span>
      <div className="family-context__copy">
        <strong>Cantidades adaptadas</strong>
        <span>{describirFamilia(perfil)}</span>
        <small>PFI ajusta automáticamente cada comida según quién come en casa.</small>
      </div>
    </aside>
  );
}
