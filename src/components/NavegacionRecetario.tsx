import type { Pantalla } from '../App';

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
        🍽️ Recetas
      </button>
      <button
        type="button"
        className={pantalla === 'postres' ? 'recetario-tab recetario-tab--active' : 'recetario-tab'}
        onClick={() => cambiarPantalla('postres')}
      >
        🍰 Postres
      </button>
    </nav>
  );
}
