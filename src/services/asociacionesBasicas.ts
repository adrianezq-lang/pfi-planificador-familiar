import {
  cargarAsociacionesIngredientes,
  guardarAsociacionesIngredientes,
} from './asociacionesIngredientes.ts';

const CLAVE_MIGRACION_V1 = 'pfi-migracion-asociaciones-basicas-v1';
const CLAVE_MIGRACION_V2 = 'pfi-migracion-asociaciones-basicas-v2';
const CLAVE_MIGRACION_V3 = 'pfi-migracion-asociaciones-basicas-v3';

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

export const ASOCIACIONES_BASICAS_V3: Record<string, string> = {
  'Pan de hamburguesa': '13803',
};

export const ASOCIACIONES_BASICAS_VERIFICADAS: Record<string, string> = {
  ...ASOCIACIONES_BASICAS_V1,
  ...ASOCIACIONES_BASICAS_V2,
  ...ASOCIACIONES_BASICAS_V3,
};

type Migracion = {
  clave: string;
  asociaciones: Record<string, string>;
  reemplazaIds?: Record<string, string[]>;
};

const MIGRACIONES: Migracion[] = [
  { clave: CLAVE_MIGRACION_V1, asociaciones: ASOCIACIONES_BASICAS_V1 },
  { clave: CLAVE_MIGRACION_V2, asociaciones: ASOCIACIONES_BASICAS_V2 },
  {
    clave: CLAVE_MIGRACION_V3,
    asociaciones: ASOCIACIONES_BASICAS_V3,
    reemplazaIds: {
      'Pan de hamburguesa': ['82331'],
    },
  },
];

/**
 * Aplica por versiones los básicos cuyo SKU y formato comercial ya están
 * verificados. Cada versión rellena asociaciones vacías y, cuando la propia
 * migración declara un SKU retirado, sustituye únicamente ese SKU concreto.
 * Cualquier selección distinta hecha por el usuario se conserva.
 */
export function asegurarAsociacionesBasicas(): number {
  const actuales = cargarAsociacionesIngredientes();
  const siguientes = { ...actuales };
  let cambios = 0;
  let hayMigracionesPendientes = false;

  MIGRACIONES.forEach(({ clave, asociaciones, reemplazaIds }) => {
    if (localStorage.getItem(clave) === '1') return;
    hayMigracionesPendientes = true;

    Object.entries(asociaciones).forEach(([ingrediente, productoId]) => {
      const actual = siguientes[ingrediente];
      const idsReemplazables = reemplazaIds?.[ingrediente] ?? [];

      if (actual && actual !== productoId && !idsReemplazables.includes(actual)) {
        return;
      }
      if (actual === productoId) return;

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
