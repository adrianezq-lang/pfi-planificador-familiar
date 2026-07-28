import type { Pantalla } from '../App';

type NavegacionInferiorProps = {
  pantallaActual: Pantalla;
  cambiarPantalla: (pantalla: Pantalla) => void;
};

type BotonNavegacion = {
  id: Pantalla;
  icono: string;
  texto: string;
};

const botones: BotonNavegacion[] = [
  { id: 'inicio', icono: '🏠', texto: 'Inicio' },
  { id: 'menu', icono: '📅', texto: 'Menú' },
  { id: 'compra', icono: '🛒', texto: 'Compra' },
  { id: 'despensa', icono: '📦', texto: 'Despensa' },
  { id: 'recetas', icono: '📖', texto: 'Recetas' },
  { id: 'catalogo', icono: '🏪', texto: 'Catálogo' },
  { id: 'perfil', icono: '👤', texto: 'Perfil' },
];

function NavegacionInferior({
  pantallaActual,
  cambiarPantalla,
}: NavegacionInferiorProps) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      <div className="bottom-nav__inner">
        {botones.map((boton) => {
          const activo = pantallaActual === boton.id;

          return (
            <button
              key={boton.id}
              type="button"
              onClick={() => cambiarPantalla(boton.id)}
              className={`nav-button${activo ? ' nav-button--active' : ''}`}
              aria-current={activo ? 'page' : undefined}
            >
              <span className="nav-button__icon" aria-hidden="true">
                {boton.icono}
              </span>
              <span className="nav-button__text">{boton.texto}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default NavegacionInferior;
