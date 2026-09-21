import { useEffect, useRef, useState } from 'react';
import type { Pantalla } from '../App';
import AppIcon, { type AppIconName } from './AppIcon';

type NavegacionInferiorProps = {
  pantallaActual: Pantalla;
  cambiarPantalla: (pantalla: Pantalla) => void;
};

type BotonNavegacion = {
  id: Pantalla;
  icono: AppIconName;
  texto: string;
};

const principales: BotonNavegacion[] = [
  { id: 'inicio', icono: 'home', texto: 'Inicio' },
  { id: 'menu', icono: 'calendar', texto: 'Menú' },
  { id: 'compra', icono: 'cart', texto: 'Compra' },
  { id: 'despensa', icono: 'box', texto: 'Despensa' },
];

const secundarios: BotonNavegacion[] = [
  { id: 'asistente', icono: 'sparkles', texto: 'Asistente' },
  { id: 'recetas', icono: 'book', texto: 'Recetas y postres' },
  { id: 'catalogo', icono: 'store', texto: 'Mercadona' },
  { id: 'perfil', icono: 'user', texto: 'Cuenta y datos' },
];

function NavegacionInferior({
  pantallaActual,
  cambiarPantalla,
}: NavegacionInferiorProps) {
  const [masAbierto, setMasAbierto] = useState(false);
  const contenedor = useRef<HTMLElement | null>(null);
  const secundarioActivo = pantallaActual === 'asistente' ||
    pantallaActual === 'recetas' ||
    pantallaActual === 'postres' ||
    pantallaActual === 'catalogo' ||
    pantallaActual === 'perfil';

  useEffect(() => {
    if (!masAbierto) return;
    const cerrarFuera = (evento: PointerEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) setMasAbierto(false);
    };
    const cerrarEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMasAbierto(false);
    };
    document.addEventListener('pointerdown', cerrarFuera);
    document.addEventListener('keydown', cerrarEscape);
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera);
      document.removeEventListener('keydown', cerrarEscape);
    };
  }, [masAbierto]);

  const navegar = (pantalla: Pantalla) => {
    setMasAbierto(false);
    cambiarPantalla(pantalla);
  };

  return (
    <nav ref={contenedor} className="bottom-nav" aria-label="Navegación principal">
      {masAbierto && (
        <div className="bottom-more-menu" role="menu" aria-label="Más secciones">
          <div className="bottom-more-menu__heading">
            <strong>Más</strong>
            <small>Asistente, recetas, tienda y tu cuenta</small>
          </div>
          {secundarios.map((boton) => {
            const activo = pantallaActual === boton.id ||
              (boton.id === 'recetas' && pantallaActual === 'postres');
            return (
              <button
                key={boton.id}
                type="button"
                role="menuitem"
                className={activo ? 'bottom-more-item is-active' : 'bottom-more-item'}
                onClick={() => navegar(boton.id)}
              >
                <span aria-hidden="true"><AppIcon name={boton.icono} size={18} /></span>
                <strong>{boton.texto}</strong>
                <span aria-hidden="true">›</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="bottom-nav__inner">
        {principales.map((boton) => {
          const activo = pantallaActual === boton.id;
          return (
            <button
              key={boton.id}
              type="button"
              onClick={() => navegar(boton.id)}
              className={`nav-button${activo ? ' nav-button--active' : ''}`}
              aria-current={activo ? 'page' : undefined}
            >
              <span className="nav-button__icon" aria-hidden="true"><AppIcon name={boton.icono} /></span>
              <span className="nav-button__text">{boton.texto}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={`nav-button${secundarioActivo || masAbierto ? ' nav-button--active' : ''}`}
          aria-expanded={masAbierto}
          aria-haspopup="menu"
          onClick={() => setMasAbierto((abierto) => !abierto)}
        >
          <span className="nav-button__icon nav-button__icon--more" aria-hidden="true"><AppIcon name="more" /></span>
          <span className="nav-button__text">Más</span>
        </button>
      </div>
    </nav>
  );
}

export default NavegacionInferior;
