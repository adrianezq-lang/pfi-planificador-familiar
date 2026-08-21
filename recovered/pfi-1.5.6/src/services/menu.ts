import type { SemanaMenu } from '../data/MenuMensual';
import type { DiaMenu, MomentoPostre, PostreMenu } from '../data/Menusemanal';

const OPCIONES_ESPECIALES = [
  'Comemos fuera',
  'Cola Cao y galletas',
] as const;


export const POSTRES_DISPONIBLES: PostreMenu[] = [
  'Fruta',
  'Yogur',
  'Sin postre',
];



function normalizarDetallePostre(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

function normalizarCantidadPostre(valor: unknown, tipo: PostreMenu): number {
  if (tipo === 'Sin postre') return 0;
  const numero = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(numero) && numero > 0
    ? Math.min(3, Math.max(0.25, numero))
    : 1;
}

export function obtenerTipoPostre(
  dia: DiaMenu,
  momento: MomentoPostre,
): PostreMenu {
  return momento === 'comida' ? dia.postreComida : dia.postreCena;
}

export function obtenerDetallePostre(
  dia: DiaMenu,
  momento: MomentoPostre,
): string {
  return momento === 'comida'
    ? dia.detallePostreComida?.trim() ?? ''
    : dia.detallePostreCena?.trim() ?? '';
}

export function obtenerCantidadPostre(
  dia: DiaMenu,
  momento: MomentoPostre,
): number {
  const tipo = obtenerTipoPostre(dia, momento);
  const cantidad = momento === 'comida'
    ? dia.cantidadPostreComida
    : dia.cantidadPostreCena;
  return normalizarCantidadPostre(cantidad, tipo);
}

export function obtenerRecetaPostre(
  dia: DiaMenu,
  momento: MomentoPostre,
): string {
  const guardada = momento === 'comida'
    ? dia.postreComidaReceta
    : dia.postreCenaReceta;

  if (typeof guardada === 'string' && guardada.trim()) {
    return guardada.trim();
  }

  const tipo = obtenerTipoPostre(dia, momento);
  if (tipo === 'Sin postre') return 'Sin postre';

  const detalle = obtenerDetallePostre(dia, momento);
  if (detalle) return detalle;

  return tipo === 'Yogur' ? 'Yogur natural' : 'Fruta variada';
}

export function iconoRecetaPostre(nombre: string): string {
  const normalizado = nombre
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalizado.includes('sin postre')) return '➖';
  if (normalizado.includes('yogur')) return '🥣';
  if (normalizado.includes('sandia')) return '🍉';
  if (normalizado.includes('platano')) return '🍌';
  if (normalizado.includes('manzana')) return '🍎';
  if (normalizado.includes('pera')) return '🍐';
  if (normalizado.includes('naranja')) return '🍊';
  if (normalizado.includes('fruta')) return '🍓';
  return '🍰';
}

export function formatearPostreMenu(
  dia: DiaMenu,
  momento: MomentoPostre,
): string {
  return obtenerRecetaPostre(dia, momento);
}

export function postreAlternoPorIndice(indice: number): PostreMenu {
  return indice % 2 === 0 ? 'Fruta' : 'Yogur';
}

export function normalizarPostre(
  valor: unknown,
  indice = 0,
): PostreMenu {
  return POSTRES_DISPONIBLES.includes(valor as PostreMenu)
    ? (valor as PostreMenu)
    : postreAlternoPorIndice(indice);
}

const COMPOSICIONES_ANTIGUAS: Record<string, string[]> = {
  'Lomo + ensalada': ['Lomo', 'Ensalada'],
  'Pollo al horno + patatas': ['Pollo al horno', 'Patatas'],
  'Crema de calabacín + tortilla francesa': [
    'Crema de calabacín',
    'Tortilla francesa',
  ],
  'Crema de verduras + tortilla de patata': [
    'Crema de verduras',
    'Tortilla de patata',
  ],
  'Crema de calabaza + tortilla francesa': [
    'Crema de calabaza',
    'Tortilla francesa',
  ],
  'Fajitas + nachos + guacamole': [
    'Fajitas',
    'Nachos',
    'Guacamole',
  ],
  'Garbanzos fritos + arroz': [
    'Garbanzos fritos',
    'Arroz blanco',
  ],
  'Filete de ternera + patatas': [
    'Filete de ternera',
    'Patatas',
  ],
  'Pechugas de pavo + ensalada': [
    'Pechugas de pavo',
    'Ensalada',
  ],
  'Pechugas de pavo + patatas': [
    'Pechugas de pavo',
    'Patatas',
  ],
  'Pechugas de pollo + arroz': [
    'Pechugas de pollo',
    'Arroz blanco',
  ],
  'Pizza jamón y queso + BBQ': [
    'Pizza jamón y queso',
    'Pizza BBQ',
  ],
  'Pizza BBQ + cuatro quesos': [
    'Pizza BBQ',
    'Pizza 4 quesos',
  ],
  'Salmón + arroz': ['Salmón', 'Arroz blanco'],
  'Salmón + patatas': ['Salmón', 'Patatas'],
  'Lubina + patatas': ['Lubina', 'Patatas'],
  'Dorada + patatas': ['Dorada', 'Patatas'],
  'Bacalao + patatas': ['Bacalao', 'Patatas'],
  'Cola Cao + galletas': ['Cola Cao y galletas'],
};

export function obtenerOpcionesEspeciales(): string[] {
  return [...OPCIONES_ESPECIALES];
}

export function esOpcionEspecial(nombre: string): boolean {
  return OPCIONES_ESPECIALES.includes(
    nombre as (typeof OPCIONES_ESPECIALES)[number],
  );
}

export function normalizarPlatosMenu(valor: unknown): string[] {
  if (Array.isArray(valor)) {
    const platos = valor
      .filter((plato): plato is string =>
        typeof plato === 'string',
      )
      .flatMap((plato) => {
        const limpio = plato.trim();
        return COMPOSICIONES_ANTIGUAS[limpio]
          ? COMPOSICIONES_ANTIGUAS[limpio]
          : limpio
            ? [limpio]
            : [];
      });

    return Array.from(new Set(platos));
  }

  if (typeof valor !== 'string') return [];

  const limpio = valor.trim();
  if (!limpio) return [];

  return COMPOSICIONES_ANTIGUAS[limpio]
    ? [...COMPOSICIONES_ANTIGUAS[limpio]]
    : [limpio];
}

export function normalizarMenu(
  valor: unknown,
  menuAlternativo: DiaMenu[],
): DiaMenu[] {
  if (!Array.isArray(valor)) {
    return copiarMenu(menuAlternativo);
  }

  const dias = valor
    .filter(
      (dia): dia is Record<string, unknown> =>
        typeof dia === 'object' && dia !== null,
    )
    .map((dia, indice) => ({
      dia:
        typeof dia.dia === 'string'
          ? dia.dia.trim()
          : '',
      comida: normalizarPlatosMenu(dia.comida),
      cena: normalizarPlatosMenu(dia.cena),
      postreComida: normalizarPostre(
        dia.postreComida ?? dia.postre,
        indice * 2,
      ),
      postreCena: normalizarPostre(
        dia.postreCena,
        indice * 2 + 1,
      ),
      postreComidaReceta:
        typeof dia.postreComidaReceta === 'string' && dia.postreComidaReceta.trim()
          ? dia.postreComidaReceta.trim()
          : (() => {
              const tipo = normalizarPostre(dia.postreComida ?? dia.postre, indice * 2);
              const detalle = normalizarDetallePostre(
                dia.detallePostreComida ?? dia.postreComidaDetalle,
              );
              if (tipo === 'Sin postre') return 'Sin postre';
              return detalle || (tipo === 'Yogur' ? 'Yogur natural' : 'Fruta variada');
            })(),
      postreCenaReceta:
        typeof dia.postreCenaReceta === 'string' && dia.postreCenaReceta.trim()
          ? dia.postreCenaReceta.trim()
          : (() => {
              const tipo = normalizarPostre(dia.postreCena, indice * 2 + 1);
              const detalle = normalizarDetallePostre(
                dia.detallePostreCena ?? dia.postreCenaDetalle,
              );
              if (tipo === 'Sin postre') return 'Sin postre';
              return detalle || (tipo === 'Yogur' ? 'Yogur natural' : 'Fruta variada');
            })(),
      detallePostreComida: normalizarDetallePostre(
        dia.detallePostreComida ?? dia.postreComidaDetalle,
      ),
      detallePostreCena: normalizarDetallePostre(
        dia.detallePostreCena ?? dia.postreCenaDetalle,
      ),
      cantidadPostreComida: normalizarCantidadPostre(
        dia.cantidadPostreComida ?? dia.postreComidaCantidad,
        normalizarPostre(dia.postreComida ?? dia.postre, indice * 2),
      ),
      cantidadPostreCena: normalizarCantidadPostre(
        dia.cantidadPostreCena ?? dia.postreCenaCantidad,
        normalizarPostre(dia.postreCena, indice * 2 + 1),
      ),
      postreComidaManual: dia.postreComidaManual === true,
      postreCenaManual: dia.postreCenaManual === true,
      preparar:
        typeof dia.preparar === 'string'
          ? dia.preparar.trim()
          : '',
    }))
    .filter((dia) => dia.dia.length > 0);

  return dias.length > 0
    ? dias
    : copiarMenu(menuAlternativo);
}

export function copiarMenu(menu: DiaMenu[]): DiaMenu[] {
  return menu.map((dia) => ({
    ...dia,
    comida: [...dia.comida],
    cena: [...dia.cena],
    postreComida: dia.postreComida,
    postreCena: dia.postreCena,
    postreComidaReceta: obtenerRecetaPostre(dia, 'comida'),
    postreCenaReceta: obtenerRecetaPostre(dia, 'cena'),
    detallePostreComida: dia.detallePostreComida ?? '',
    detallePostreCena: dia.detallePostreCena ?? '',
    cantidadPostreComida: obtenerCantidadPostre(dia, 'comida'),
    cantidadPostreCena: obtenerCantidadPostre(dia, 'cena'),
    postreComidaManual: dia.postreComidaManual === true,
    postreCenaManual: dia.postreCenaManual === true,
  }));
}

export function formatearPlatosMenu(
  platos: string[],
): string {
  return platos.length > 0
    ? platos.join(' + ')
    : 'Sin asignar';
}


export function obtenerPreparacionParaPlatos(
  platosSiguienteDia: string[],
): string {
  const platos = platosSiguienteDia.join(' ').toLocaleLowerCase('es');

  if (!platos.trim()) return 'Nada pendiente';
  if (platos.includes('lenteja')) return 'Lentejas';
  if (platos.includes('alubia')) return 'Poner alubias a remojo';
  if (platos.includes('cocido')) return 'Poner garbanzos a remojo';
  if (platos.includes('garbanzo')) return 'Garbanzos';
  if (platos.includes('pollo')) return 'Pollo';
  if (platos.includes('pavo')) return 'Pavo';
  if (
    platos.includes('pasta') ||
    platos.includes('macarron') ||
    platos.includes('carbonara')
  ) {
    return 'Pasta + huevos';
  }
  if (platos.includes('ternera')) return 'Ternera';
  if (platos.includes('pizza')) return 'Pizza';
  if (platos.includes('salmón')) return 'Salmón';
  if (platos.includes('lubina')) return 'Lubina';
  if (platos.includes('dorada')) return 'Dorada';
  if (platos.includes('bacalao')) return 'Bacalao';
  if (platos.includes('hamburguesa')) return 'Hamburguesas';
  if (platos.includes('perrito')) return 'Perritos';
  if (platos.includes('kebab')) return 'Kebab';

  return formatearPlatosMenu(platosSiguienteDia);
}

export function obtenerPreparacionParaDia(
  menu: DiaMenu[],
  indice: number,
  lunesSemanaSiguiente?: DiaMenu,
): string {
  const diaSiguiente = menu[indice + 1] ?? lunesSemanaSiguiente ?? menu[0];
  return diaSiguiente
    ? obtenerPreparacionParaPlatos(diaSiguiente.comida)
    : 'Nada pendiente';
}

export function recalcularPreparaciones(
  menu: DiaMenu[],
  lunesSemanaSiguiente?: DiaMenu,
): DiaMenu[] {
  return menu.map((dia, indice) => ({
    ...dia,
    comida: [...dia.comida],
    cena: [...dia.cena],
    preparar: obtenerPreparacionParaDia(menu, indice, lunesSemanaSiguiente),
  }));
}

export function recalcularPreparacionesPlan(
  plan: SemanaMenu[],
): SemanaMenu[] {
  if (plan.length === 0) return [];

  return plan.map((semana, indiceSemana) => {
    const siguiente = plan[(indiceSemana + 1) % plan.length];
    const lunesSiguiente = siguiente?.menu[0];

    return {
      ...semana,
      menu: recalcularPreparaciones(semana.menu, lunesSiguiente),
    };
  });
}

export function renombrarPlatoEnLista(
  platos: string[],
  nombreAnterior: string,
  nombreNuevo: string,
): string[] {
  return platos.map((plato) =>
    plato === nombreAnterior ? nombreNuevo : plato,
  );
}
