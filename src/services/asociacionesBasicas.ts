import {
  cargarAsociacionesIngredientes,
  guardarAsociacionesIngredientes,
} from './asociacionesIngredientes.ts';

const CLAVE_MIGRACION_V1 = 'pfi-migracion-asociaciones-basicas-v1';
const CLAVE_MIGRACION_V2 = 'pfi-migracion-asociaciones-basicas-v2';

export const ASOCIACIONES_BASICAS_V1: Record<string, string> = {
  Arroz: '5044',
  'Pasta corta': '6250',
  'Lentejas secas': '5330',
  'Garbanzos cocidos': '26029',
  'Tomate triturado': '16043',
  Chorizo: '23145',
  'Queso rallado': '23621',
};

export const ASOCIACIONES_BASICAS_V2: Record<string, string> = {
  Leche: '10380',
  'Yogures naturales': '22313',
  'Queso curado': '50965',
  'Queso roquefort': '86276',
  'Mezcla cuatro quesos': '51234',
  Salchichas: '53143',
};

export const ASOCIACIONES_BASICAS_VERIFICADAS: Record<string, string> = {
  ...ASOCIACIONES_BASICAS_V1,
  ...ASOCIACIONES_BASICAS_V2,
};

type Migracion = {
  clave: string;
  asociaciones: Record<string, string>;
};

const MIGRACIONES: Migracion[] = [
  { clave: CLAVE_MIGRACION_V1, asociaciones: ASOCIACIONES_BASICAS_V1 },
  { clave: CLAVE_MIGRACION_V2, asociaciones: ASOCIACIONES_BASICAS_V2 },
];

/**
 * Aplica por versiones los básicos cuyo SKU y formato comercial ya están
 * verificados. Cada versión solo rellena asociaciones vacías: cualquier
 * selección del usuario se conserva. Una versión ya aplicada no vuelve a
 * imponer un producto si el usuario decide cambiarlo o quitarlo después.
 */
export function asegurarAsociacionesBasicas(): number {
  const actuales = cargarAsociacionesIngredientes();
  const siguientes = { ...actuales };
  let cambios = 0;
  let hayMigracionesPendientes = false;

  MIGRACIONES.forEach(({ clave, asociaciones }) => {
    if (localStorage.getItem(clave) === '1') return;
    hayMigracionesPendientes = true;

    Object.entries(asociaciones).forEach(([ingrediente, productoId]) => {
      if (siguientes[ingrediente]) return;
      siguientes[ingrediente] = productoId;
      cambios += 1;
    });

    localStorage.setItem(clave, '1');
  });

  if (hayMigracionesPendientes && cambios > 0) {
    guardarAsociacionesIngredientes(siguientes);
  }

  return cambios;
}
