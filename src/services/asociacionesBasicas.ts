import {
  cargarAsociacionesIngredientes,
  guardarAsociacionesIngredientes,
} from './asociacionesIngredientes.ts';

const CLAVE_MIGRACION = 'pfi-migracion-asociaciones-basicas-v1';

export const ASOCIACIONES_BASICAS_VERIFICADAS: Record<string, string> = {
  Arroz: '5044',
  'Pasta corta': '6250',
  'Lentejas secas': '5330',
  'Garbanzos cocidos': '26029',
  'Tomate triturado': '16043',
  Chorizo: '23145',
  'Queso rallado': '23621',
};

/**
 * Migra una sola vez los básicos cuyo SKU y formato comercial ya están
 * verificados. Solo rellena asociaciones vacías: cualquier selección que el
 * usuario ya haya hecho se conserva y, una vez migrado, tampoco se vuelve a
 * imponer un producto si el usuario decide cambiarlo o quitarlo después.
 */
export function asegurarAsociacionesBasicas(): number {
  if (localStorage.getItem(CLAVE_MIGRACION) === '1') {
    return 0;
  }

  const actuales = cargarAsociacionesIngredientes();
  const siguientes = { ...actuales };
  let cambios = 0;

  Object.entries(ASOCIACIONES_BASICAS_VERIFICADAS).forEach(
    ([ingrediente, productoId]) => {
      if (siguientes[ingrediente]) return;
      siguientes[ingrediente] = productoId;
      cambios += 1;
    },
  );

  if (cambios > 0) {
    guardarAsociacionesIngredientes(siguientes);
  }

  localStorage.setItem(CLAVE_MIGRACION, '1');
  return cambios;
}
