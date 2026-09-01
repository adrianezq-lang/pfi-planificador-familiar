import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Receta } from '../data/Recetas';
import {
  cargarRecetas,
  esRecetaPostre,
  EVENTO_RECETAS,
  guardarRecetas,
  restaurarRecetasOriginales,
} from '../services/recetas';

type FiltroRecetario = 'todos' | 'platos' | 'postres';

const ContextoFiltroRecetario = createContext<FiltroRecetario>('todos');

export function RecetarioFiltroProvider({
  filtro,
  children,
}: {
  filtro: FiltroRecetario;
  children: ReactNode;
}) {
  return createElement(
    ContextoFiltroRecetario.Provider,
    { value: filtro },
    children,
  );
}

function aplicarReglasFamiliares(recetas: Receta[]): Receta[] {
  return recetas.map((receta) =>
    receta.nombre === 'Tortilla de patata'
      ? {
          ...receta,
          ingredientes: receta.ingredientes.map((ingrediente) =>
            ingrediente.nombre === 'Huevos'
              ? { ...ingrediente, cantidad: 8, unidad: 'ud' }
              : ingrediente,
          ),
        }
      : receta,
  );
}

function cargarRecetasFamiliares(): Receta[] {
  return aplicarReglasFamiliares(cargarRecetas());
}

function filtrarRecetas(recetas: Receta[], filtro: FiltroRecetario): Receta[] {
  if (filtro === 'platos') {
    return recetas.filter((receta) => !esRecetaPostre(receta));
  }
  if (filtro === 'postres') return recetas.filter(esRecetaPostre);
  return recetas;
}

function combinarConRecetasOcultas(
  nuevasRecetas: Receta[],
  filtro: FiltroRecetario,
): Receta[] {
  if (filtro === 'todos') return nuevasRecetas;

  const actuales = cargarRecetasFamiliares();
  if (filtro === 'platos') {
    return [
      ...nuevasRecetas.filter((receta) => !esRecetaPostre(receta)),
      ...actuales.filter(esRecetaPostre),
    ];
  }

  return [
    ...actuales.filter((receta) => !esRecetaPostre(receta)),
    ...nuevasRecetas.filter(esRecetaPostre),
  ];
}

export function useRecetas() {
  const filtro = useContext(ContextoFiltroRecetario);
  const [todasLasRecetas, setTodasLasRecetas] =
    useState<Receta[]>(cargarRecetasFamiliares);

  useEffect(() => {
    const actualizar = () => setTodasLasRecetas(cargarRecetasFamiliares());

    window.addEventListener(EVENTO_RECETAS, actualizar);
    return () => window.removeEventListener(EVENTO_RECETAS, actualizar);
  }, []);

  const recetas = useMemo(
    () => filtrarRecetas(todasLasRecetas, filtro),
    [todasLasRecetas, filtro],
  );

  const guardar = useCallback(
    (nuevasRecetas: Receta[]) => {
      guardarRecetas(
        aplicarReglasFamiliares(
          combinarConRecetasOcultas(nuevasRecetas, filtro),
        ),
      );
      setTodasLasRecetas(cargarRecetasFamiliares());
    },
    [filtro],
  );

  const restaurar = useCallback(() => {
    restaurarRecetasOriginales();
    setTodasLasRecetas(cargarRecetasFamiliares());
  }, []);

  return {
    recetas,
    guardar,
    restaurar,
  };
}
