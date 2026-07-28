import { useCallback, useEffect, useState } from 'react';
import type { Receta } from '../data/Recetas';
import {
  cargarRecetas,
  EVENTO_RECETAS,
  guardarRecetas,
  restaurarRecetasOriginales,
} from '../services/recetas';

export function useRecetas() {
  const [recetas, setRecetas] = useState<Receta[]>(cargarRecetas);

  useEffect(() => {
    const actualizar = () => setRecetas(cargarRecetas());

    window.addEventListener(EVENTO_RECETAS, actualizar);
    return () => window.removeEventListener(EVENTO_RECETAS, actualizar);
  }, []);

  const guardar = useCallback((nuevasRecetas: Receta[]) => {
    guardarRecetas(nuevasRecetas);
    setRecetas(cargarRecetas());
  }, []);

  const restaurar = useCallback(() => {
    restaurarRecetasOriginales();
    setRecetas(cargarRecetas());
  }, []);

  return {
    recetas,
    guardar,
    restaurar,
  };
}
