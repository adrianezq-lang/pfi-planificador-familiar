import type { Receta } from '../data/Recetas';
import { calcularCosteProporcionalIngrediente } from '../motor/compra';
import { obtenerProductoAsociado } from './asociacionesIngredientes';
import { ingredienteEstaDisponible } from './disponibilidadIngredientes';

export type ZonaTemporada =
  | 'norte'
  | 'mediterraneo'
  | 'interior'
  | 'canarias';

export type EstadoTemporada =
  | 'temporada'
  | 'transicion'
  | 'fuera'
  | 'sin-datos';

export type EvaluacionIngredienteTemporada = {
  ingrediente: string;
  estado: EstadoTemporada;
  meses: number[];
};

export type SustitucionRecetaTemporada = {
  recetaActual: string;
  recetaSugerida: string;
  ingredientesFuera: string[];
  costeActual: number | null;
  costeSugerido: number | null;
  diferencia: number | null;
};

const CLAVE_ZONA = 'pfi-zona-temporada-v1';
export const EVENTO_ZONA_TEMPORADA = 'pfi-zona-temporada-actualizada';

export const ETIQUETAS_ZONA_TEMPORADA: Record<ZonaTemporada, string> = {
  norte: 'Norte peninsular',
  mediterraneo: 'Mediterráneo',
  interior: 'Interior peninsular',
  canarias: 'Canarias',
};

const MESES_BASE: Record<string, readonly number[]> = {
  sandia: [5, 6, 7, 8, 9],
  melon: [6, 7, 8, 9],
  fresa: [2, 3, 4, 5, 6],
  fresas: [2, 3, 4, 5, 6],
  melocoton: [6, 7, 8, 9],
  nectarina: [6, 7, 8, 9],
  ciruela: [6, 7, 8, 9],
  uva: [8, 9, 10, 11],
  manzana: [8, 9, 10, 11, 12, 1, 2, 3],
  manzanas: [8, 9, 10, 11, 12, 1, 2, 3],
  pera: [7, 8, 9, 10, 11, 12, 1],
  peras: [7, 8, 9, 10, 11, 12, 1],
  naranja: [11, 12, 1, 2, 3, 4, 5],
  naranjas: [11, 12, 1, 2, 3, 4, 5],
  mandarina: [10, 11, 12, 1, 2],
  kiwi: [10, 11, 12, 1, 2, 3],
  tomate: [5, 6, 7, 8, 9, 10],
  pepino: [5, 6, 7, 8, 9],
  calabacin: [5, 6, 7, 8, 9, 10],
  calabaza: [9, 10, 11, 12, 1, 2],
  pimiento: [6, 7, 8, 9, 10],
  'pimiento rojo': [6, 7, 8, 9, 10],
  'pimiento tricolor': [6, 7, 8, 9, 10],
  'judias verdes': [5, 6, 7, 8, 9, 10],
  vainas: [5, 6, 7, 8, 9, 10],
};

const AJUSTES_ZONA: Partial<
  Record<ZonaTemporada, Record<string, readonly number[]>>
> = {
  norte: {
    sandia: [7, 8, 9],
    melon: [7, 8, 9],
    tomate: [6, 7, 8, 9, 10],
    pepino: [6, 7, 8, 9],
    calabacin: [6, 7, 8, 9, 10],
    pimiento: [7, 8, 9, 10],
    'pimiento rojo': [7, 8, 9, 10],
    'pimiento tricolor': [7, 8, 9, 10],
  },
  mediterraneo: {
    sandia: [5, 6, 7, 8, 9],
    melon: [5, 6, 7, 8, 9, 10],
    tomate: [4, 5, 6, 7, 8, 9, 10, 11],
    calabacin: [4, 5, 6, 7, 8, 9, 10, 11],
  },
  interior: {
    sandia: [6, 7, 8, 9],
    melon: [6, 7, 8, 9],
    tomate: [6, 7, 8, 9, 10],
  },
  canarias: {
    tomate: [1, 2, 3, 4, 5, 6, 10, 11, 12],
    calabacin: [1, 2, 3, 4, 5, 6, 10, 11, 12],
    pepino: [1, 2, 3, 4, 5, 6, 10, 11, 12],
  },
};

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function zonaValida(valor: unknown): valor is ZonaTemporada {
  return valor === 'norte' ||
    valor === 'mediterraneo' ||
    valor === 'interior' ||
    valor === 'canarias';
}

export function cargarZonaTemporada(): ZonaTemporada {
  try {
    const guardada = localStorage.getItem(CLAVE_ZONA);
    return zonaValida(guardada) ? guardada : 'norte';
  } catch {
    return 'norte';
  }
}

export function guardarZonaTemporada(zona: ZonaTemporada): ZonaTemporada {
  localStorage.setItem(CLAVE_ZONA, zona);
  window.dispatchEvent(new Event(EVENTO_ZONA_TEMPORADA));
  return zona;
}

function claveEstacional(nombre: string): string | null {
  const clave = normalizar(nombre);
  const exacta = Object.keys(MESES_BASE).find((item) => clave === item);
  if (exacta) return exacta;

  return Object.keys(MESES_BASE)
    .sort((a, b) => b.length - a.length)
    .find((item) => clave.includes(item)) ?? null;
}

export function mesesTemporadaIngrediente(
  ingrediente: string,
  zona: ZonaTemporada = cargarZonaTemporada(),
): number[] {
  const clave = claveEstacional(ingrediente);
  if (!clave) return [];
  const ajustados = AJUSTES_ZONA[zona]?.[clave];
  return [...(ajustados ?? MESES_BASE[clave] ?? [])];
}

export function evaluarIngredienteTemporada(
  ingrediente: string,
  mesOFecha: string,
  zona: ZonaTemporada = cargarZonaTemporada(),
): EvaluacionIngredienteTemporada {
  const mesTexto = /^\d{4}-(0[1-9]|1[0-2])(?:-\d{2})?$/.exec(mesOFecha)?.[1];
  const meses = mesesTemporadaIngrediente(ingrediente, zona);
  if (!mesTexto || meses.length === 0) {
    return { ingrediente, estado: 'sin-datos', meses };
  }

  const mes = Number(mesTexto);
  if (meses.includes(mes)) {
    return { ingrediente, estado: 'temporada', meses };
  }

  const anterior = mes === 1 ? 12 : mes - 1;
  const siguiente = mes === 12 ? 1 : mes + 1;
  const transicion = meses.includes(anterior) || meses.includes(siguiente);
  return {
    ingrediente,
    estado: transicion ? 'transicion' : 'fuera',
    meses,
  };
}

export function ingredientesFueraDeTemporada(
  receta: Receta,
  mesOFecha: string,
  zona: ZonaTemporada = cargarZonaTemporada(),
): EvaluacionIngredienteTemporada[] {
  return receta.ingredientes
    .map((ingrediente) =>
      evaluarIngredienteTemporada(ingrediente.nombre, mesOFecha, zona),
    )
    .filter((evaluacion) => evaluacion.estado === 'fuera');
}

async function estimarCosteReceta(receta: Receta): Promise<number | null> {
  let total = 0;

  for (const ingrediente of receta.ingredientes) {
    const producto = await obtenerProductoAsociado(ingrediente.nombre);
    if (!producto) return null;
    const calculo = calcularCosteProporcionalIngrediente(ingrediente, producto);
    if (calculo.coste === null) return null;
    total += calculo.coste;
  }

  return Math.round(total * 100) / 100;
}

export async function sugerirSustitucionesRecetaTemporada(
  recetaActual: Receta,
  recetas: Receta[],
  mesOFecha: string,
  zona: ZonaTemporada = cargarZonaTemporada(),
  limite = 3,
): Promise<SustitucionRecetaTemporada[]> {
  const fueraActual = ingredientesFueraDeTemporada(
    recetaActual,
    mesOFecha,
    zona,
  );
  if (fueraActual.length === 0) return [];

  const categoria = normalizar(recetaActual.categoria);
  const candidatos = recetas.filter((receta) => {
    if (receta.nombre === recetaActual.nombre) return false;
    if (normalizar(receta.categoria) !== categoria) return false;
    if (ingredientesFueraDeTemporada(receta, mesOFecha, zona).length > 0) {
      return false;
    }
    return receta.ingredientes.every((ingrediente) =>
      ingredienteEstaDisponible(ingrediente.nombre),
    );
  });

  const costeActual = await estimarCosteReceta(recetaActual);
  const resultados = await Promise.all(
    candidatos.map(async (receta) => {
      const costeSugerido = await estimarCosteReceta(receta);
      return {
        recetaActual: recetaActual.nombre,
        recetaSugerida: receta.nombre,
        ingredientesFuera: fueraActual.map((item) => item.ingrediente),
        costeActual,
        costeSugerido,
        diferencia:
          costeActual !== null && costeSugerido !== null
            ? Math.round((costeSugerido - costeActual) * 100) / 100
            : null,
      } satisfies SustitucionRecetaTemporada;
    }),
  );

  return resultados
    .sort((a, b) => {
      if (a.diferencia === null && b.diferencia === null) {
        return a.recetaSugerida.localeCompare(b.recetaSugerida, 'es');
      }
      if (a.diferencia === null) return 1;
      if (b.diferencia === null) return -1;
      return a.diferencia - b.diferencia;
    })
    .slice(0, Math.max(0, limite));
}
