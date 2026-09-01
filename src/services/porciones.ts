import type { Ingrediente, Receta } from '../data/Recetas';
import { aplicarAprendizajePorcion } from './aprendizaje';
import {
  calcularComensales,
  calcularRacionesEquivalentes,
  type PerfilFamiliar,
} from './perfil';

export type SugerenciaCantidad = {
  cantidad: number;
  unidad: string;
  explicacion: string;
};

type ContextoRegla = {
  nombreIngrediente: string;
  nombreReceta: string;
  categoria: string;
  raciones: number;
  comensales: number;
};

type ReglaPorcion = {
  coincide: (contexto: ContextoRegla) => boolean;
  calcular: (contexto: ContextoRegla) => SugerenciaCantidad;
};

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function contiene(texto: string, palabras: string[]): boolean {
  return palabras.some((palabra) => texto.includes(palabra));
}

function redondear(valor: number, paso: number): number {
  return Math.max(paso, Math.round(valor / paso) * paso);
}

function gramosPorRacion(
  gramos: number,
  paso = 25,
  descripcion = 'ración estándar',
): (contexto: ContextoRegla) => SugerenciaCantidad {
  return (contexto) => ({
    cantidad: redondear(contexto.raciones * gramos, paso),
    unidad: 'g',
    explicacion: `${gramos} g por ración equivalente (${descripcion})`,
  });
}

function unidadesPorComensal(
  unidades: number,
  minimo = 1,
  descripcion = 'por comensal',
): (contexto: ContextoRegla) => SugerenciaCantidad {
  return (contexto) => ({
    cantidad: Math.max(minimo, Math.ceil(contexto.comensales * unidades)),
    unidad: 'ud',
    explicacion: `${unidades} unidad${unidades === 1 ? '' : 'es'} ${descripcion}`,
  });
}

const REGLAS: ReglaPorcion[] = [
  {
    coincide: ({ nombreIngrediente }) =>
      contiene(nombreIngrediente, [
        'platanos',
        'manzanas',
        'peras',
        'naranjas',
        'yogures naturales',
        'fruta variada',
      ]),
    calcular: unidadesPorComensal(1),
  },
  {
    coincide: ({ nombreIngrediente }) =>
      contiene(nombreIngrediente, ['filete de ternera', 'filetes de ternera']),
    calcular: gramosPorRacion(190, 25, 'carne principal'),
  },
  {
    coincide: ({ nombreIngrediente }) =>
      nombreIngrediente === 'lomo' || nombreIngrediente.includes('filetes de lomo'),
    calcular: gramosPorRacion(170, 25, 'carne principal'),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      contiene(nombreIngrediente, ['pechugas de pollo', 'pechugas de pavo']) &&
      !nombreReceta.includes('fajita') &&
      !nombreReceta.includes('kebab'),
    calcular: gramosPorRacion(180, 25, 'ave principal'),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      contiene(nombreIngrediente, ['pechugas de pollo', 'pollo']) &&
      nombreReceta.includes('fajita'),
    calcular: gramosPorRacion(150, 25, 'relleno de fajitas'),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      contiene(nombreIngrediente, ['pechugas de pollo', 'pollo']) &&
      nombreReceta.includes('kebab'),
    calcular: gramosPorRacion(165, 25, 'relleno de kebab'),
  },
  {
    coincide: ({ nombreIngrediente }) =>
      contiene(nombreIngrediente, ['salmon', 'bacalao']),
    calcular: gramosPorRacion(180, 25, 'pescado principal'),
  },
  {
    coincide: ({ nombreIngrediente }) =>
      contiene(nombreIngrediente, ['lubina', 'dorada']),
    calcular: gramosPorRacion(220, 50, 'pescado entero limpio aproximado'),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'carne picada' && nombreReceta.includes('pizza'),
    calcular: gramosPorRacion(45, 25, 'cobertura de pizza'),
  },
  {
    coincide: ({ nombreIngrediente }) => nombreIngrediente === 'carne picada',
    calcular: gramosPorRacion(140, 25, 'salsa o plato principal'),
  },
  {
    coincide: ({ nombreIngrediente }) =>
      contiene(nombreIngrediente, ['morcillo']),
    calcular: gramosPorRacion(130, 25, 'carne para cocido'),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      contiene(nombreIngrediente, ['pasta corta', 'espaguetis']) &&
      !nombreReceta.includes('ensalada'),
    calcular: gramosPorRacion(90, 25, 'pasta seca como plato principal'),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      contiene(nombreIngrediente, ['pasta corta', 'espaguetis']) &&
      nombreReceta.includes('ensalada'),
    calcular: gramosPorRacion(85, 25, 'pasta seca para ensalada'),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'arroz' &&
      (nombreReceta.includes('arroz con') || nombreReceta === 'arroz con pollo'),
    calcular: gramosPorRacion(85, 25, 'arroz seco como plato principal'),
  },
  {
    coincide: ({ nombreIngrediente }) => nombreIngrediente === 'arroz',
    calcular: gramosPorRacion(60, 25, 'arroz seco como guarnición'),
  },
  {
    coincide: ({ nombreIngrediente }) =>
      contiene(nombreIngrediente, [
        'lentejas secas',
        'garbanzos secos',
        'alubias blancas secas',
        'alubias rojas secas',
      ]),
    calcular: gramosPorRacion(90, 25, 'legumbre seca'),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'zanahorias' &&
      contiene(nombreReceta, ['lenteja', 'crema', 'cocido', 'alubia', 'arroz con pollo']),
    calcular: ({ raciones }) => ({
      cantidad: Math.max(1, Math.round(raciones * 0.65)),
      unidad: 'ud',
      explicacion: 'aprox. 0,65 zanahorias por ración equivalente',
    }),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'calabacin' && nombreReceta.includes('crema'),
    calcular: ({ raciones }) => ({
      cantidad: Math.max(1, Math.round(raciones * 0.85)),
      unidad: 'ud',
      explicacion: 'aprox. 0,85 calabacines por ración equivalente',
    }),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'tomate' && nombreReceta.includes('ensalada'),
    calcular: ({ raciones }) => ({
      cantidad: Math.max(0.5, Math.round(raciones * 0.5 * 2) / 2),
      unidad: 'ud',
      explicacion: 'aprox. medio tomate por ración equivalente',
    }),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'pepino' && nombreReceta.includes('ensalada'),
    calcular: ({ raciones }) => ({
      cantidad: Math.max(0.5, Math.round(raciones * 0.25 * 2) / 2),
      unidad: 'ud',
      explicacion: 'aprox. un cuarto de pepino por ración equivalente',
    }),
  },
  {
    coincide: ({ nombreIngrediente }) => nombreIngrediente === 'cebolla',
    calcular: ({ raciones }) => ({
      cantidad: Math.max(0.5, Math.round((raciones / 3.5) * 2) / 2),
      unidad: 'ud',
      explicacion: 'base aproximada de media a una cebolla por receta familiar',
    }),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'atun' && nombreReceta.includes('ensalada de pasta'),
    calcular: ({ raciones }) => ({
      cantidad: Math.max(1, Math.ceil(raciones * 0.8)),
      unidad: 'lata',
      explicacion: 'aprox. 0,8 latas por ración equivalente',
    }),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'atun' && nombreReceta.includes('ensalada'),
    calcular: ({ raciones }) => ({
      cantidad: Math.max(1, Math.ceil(raciones * 0.3)),
      unidad: 'lata',
      explicacion: 'aprox. una lata por cada tres raciones equivalentes',
    }),
  },
  {
    coincide: ({ nombreIngrediente }) => nombreIngrediente === 'bases de pizza',
    calcular: () => ({
      cantidad: 1,
      unidad: 'ud',
      explicacion: 'cada receta de pizza corresponde a una base',
    }),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      contiene(nombreIngrediente, ['mozzarella rallada', 'queso rallado', 'mezcla cuatro quesos']) &&
      nombreReceta.includes('pizza'),
    calcular: () => ({
      cantidad: 125,
      unidad: 'g',
      explicacion: '125 g de queso por pizza',
    }),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'jamon cocido' && nombreReceta.includes('pizza'),
    calcular: () => ({
      cantidad: 120,
      unidad: 'g',
      explicacion: '120 g de jamón por pizza',
    }),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'bacon' && nombreReceta.includes('pizza'),
    calcular: () => ({
      cantidad: 100,
      unidad: 'g',
      explicacion: '100 g de bacon por pizza',
    }),
  },
  {
    coincide: ({ nombreIngrediente }) => nombreIngrediente === 'patatas',
    calcular: ({ raciones, nombreReceta }) => {
      const gramos = nombreReceta.includes('tortilla') ? 275 : 230;
      return {
        cantidad: redondear(raciones * gramos, 100),
        unidad: 'g',
        explicacion: `${gramos} g por ración equivalente (${nombreReceta.includes('tortilla') ? 'tortilla' : 'guarnición'})`,
      };
    },
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'huevos' && nombreReceta.includes('tortilla francesa'),
    calcular: ({ raciones }) => ({
      cantidad: Math.max(2, Math.round(raciones * 2)),
      unidad: 'ud',
      explicacion: '2 huevos por ración equivalente',
    }),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'huevos' && nombreReceta.includes('tortilla de patata'),
    calcular: ({ raciones }) => ({
      cantidad: Math.max(4, Math.round(raciones * 2.25)),
      unidad: 'ud',
      explicacion: '2,25 huevos por ración equivalente',
    }),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'huevos' && nombreReceta.includes('carbonara'),
    calcular: ({ comensales }) => ({
      cantidad: Math.max(2, comensales),
      unidad: 'ud',
      explicacion: '1 huevo por comensal',
    }),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'huevos' && nombreReceta.includes('arroz con huevo'),
    calcular: unidadesPorComensal(1),
  },
  {
    coincide: ({ nombreIngrediente }) => nombreIngrediente === 'huevos',
    calcular: unidadesPorComensal(1),
  },
  {
    coincide: ({ nombreIngrediente }) => nombreIngrediente === 'hamburguesas',
    calcular: unidadesPorComensal(1),
  },
  {
    coincide: ({ nombreIngrediente }) => nombreIngrediente === 'pan de hamburguesa',
    calcular: unidadesPorComensal(1),
  },
  {
    coincide: ({ nombreIngrediente }) => nombreIngrediente === 'salchichas',
    calcular: unidadesPorComensal(1.25),
  },
  {
    coincide: ({ nombreIngrediente }) => nombreIngrediente === 'pan de perrito',
    calcular: unidadesPorComensal(1),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'tortillas de trigo' && nombreReceta.includes('kebab'),
    calcular: unidadesPorComensal(1),
  },
  {
    coincide: ({ nombreIngrediente, nombreReceta }) =>
      nombreIngrediente === 'tortillas de trigo' && nombreReceta.includes('fajita'),
    calcular: ({ raciones }) => ({
      cantidad: Math.max(4, Math.ceil(raciones * 1.5)),
      unidad: 'ud',
      explicacion: 'aprox. 1,5 tortillas por ración equivalente en fajitas',
    }),
  },
  {
    coincide: ({ nombreIngrediente }) => nombreIngrediente === 'tortillas de trigo',
    calcular: unidadesPorComensal(2),
  },
  {
    coincide: ({ nombreIngrediente }) => nombreIngrediente === 'pollo entero',
    calcular: ({ raciones }) => ({
      cantidad: redondear(raciones * 350, 250),
      unidad: 'g',
      explicacion: '350 g de pollo con hueso por ración equivalente',
    }),
  },
  {
    coincide: ({ nombreIngrediente }) => nombreIngrediente === 'almejas',
    calcular: gramosPorRacion(150, 50, 'almejas con concha'),
  },
];

export function obtenerSugerenciaBaseIngrediente(
  ingrediente: Ingrediente,
  receta: Pick<Receta, 'nombre' | 'categoria'>,
  perfil: PerfilFamiliar,
): SugerenciaCantidad | null {
  const contexto: ContextoRegla = {
    nombreIngrediente: normalizar(ingrediente.nombre),
    nombreReceta: normalizar(receta.nombre),
    categoria: normalizar(receta.categoria),
    raciones: calcularRacionesEquivalentes(perfil),
    comensales: calcularComensales(perfil),
  };

  const regla = REGLAS.find((candidata) => candidata.coincide(contexto));
  return regla?.calcular(contexto) ?? null;
}

export function obtenerSugerenciaIngrediente(
  ingrediente: Ingrediente,
  receta: Pick<Receta, 'nombre' | 'categoria'>,
  perfil: PerfilFamiliar,
): SugerenciaCantidad | null {
  const sugerenciaBase = obtenerSugerenciaBaseIngrediente(
    ingrediente,
    receta,
    perfil,
  );

  return sugerenciaBase
    ? aplicarAprendizajePorcion(
        receta.nombre,
        ingrediente.nombre,
        sugerenciaBase,
      )
    : null;
}

export function ajustarIngredienteAlPerfil(
  ingrediente: Ingrediente,
  receta: Pick<Receta, 'nombre' | 'categoria'>,
  perfil: PerfilFamiliar,
  activarAutomatico = false,
): Ingrediente {
  const sugerencia = obtenerSugerenciaIngrediente(ingrediente, receta, perfil);
  const automatico = activarAutomatico
    ? Boolean(sugerencia)
    : ingrediente.ajusteAutomatico === true;

  if (!sugerencia || !automatico) {
    return {
      ...ingrediente,
      ajusteAutomatico: automatico,
    };
  }

  return {
    ...ingrediente,
    cantidad: sugerencia.cantidad,
    unidad: sugerencia.unidad,
    ajusteAutomatico: true,
  };
}

export function ajustarRecetaAlPerfil(
  receta: Receta,
  perfil: PerfilFamiliar,
  activarAutomatico = false,
): Receta {
  return {
    ...receta,
    ingredientes: receta.ingredientes.map((ingrediente) =>
      ajustarIngredienteAlPerfil(
        ingrediente,
        receta,
        perfil,
        activarAutomatico,
      ),
    ),
  };
}

export function ajustarRecetasAlPerfil(
  recetas: Receta[],
  perfil: PerfilFamiliar,
  activarAutomatico = false,
): Receta[] {
  return recetas.map((receta) =>
    ajustarRecetaAlPerfil(receta, perfil, activarAutomatico),
  );
}
