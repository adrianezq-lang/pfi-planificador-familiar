import type { Pantalla } from '../App';
import AppIcon from './AppIcon';

type Props = {
  pantalla: Pantalla;
  cambiarPantalla: (pantalla: Pantalla) => void;
};

export default function NavegacionRecetario({ pantalla, cambiarPantalla }: Props) {
  if (pantalla !== 'recetas' && pantalla !== 'postres') return null;

  return (
    <nav className="recetario-tabs" aria-label="Recetario">
      <button
        type="button"
        className={pantalla === 'recetas' ? 'recetario-tab recetario-tab--active' : 'recetario-tab'}
        onClick={() => cambiarPantalla('recetas')}
      >
        <AppIcon name="book" size={17} /> Recetas
      </button>
      <button
        type="button"
        className={pantalla === 'postres' ? 'recetario-tab recetario-tab--active' : 'recetario-tab'}
        onClick={() => cambiarPantalla('postres')}
      >
        <AppIcon name="sparkles" size={17} /> Postres
      </button>
    </nav>
  );
}
