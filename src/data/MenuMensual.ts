import type { DiaMenu } from './Menusemanal';

export type SemanaMenu = {
  id: string;
  nombre: string;
  inicio: string;
  fin: string;
  menu: DiaMenu[];
  excluida?: boolean;
};

// Regla familiar: la pizza se mantiene el viernes, alternando variedades.
export const CENAS_VIERNES = [
  ['Pizza jamón y queso', 'Pizza BBQ'],
  ['Pizza 4 quesos', 'Pizza de atún'],
  ['Pizza jamón y queso', 'Pizza 4 quesos'],
  ['Pizza BBQ', 'Pizza de atún'],
  ['Pizza jamón y queso', 'Pizza de atún'],
  ['Pizza BBQ', 'Pizza 4 quesos'],
] as const;

const dia = (
  nombre: string,
  comida: string[],
  cena: string[],
  postreComida: 'Fruta' | 'Yogur' | 'Sin postre',
  postreCena: 'Fruta' | 'Yogur' | 'Sin postre',
): DiaMenu => ({
  dia: nombre,
  comida,
  cena,
  postreComida,
  postreCena,
  preparar: '',
});

/*
 * Patrón familiar estable, platos concretos variables:
 * - Lunes: legumbres; las ollas grandes se terminan el jueves, salvo los garbanzos fritos.
 * - Martes: pescado + cena vegetal.
 * - Miércoles: ensalada de pasta distinta + cena variada.
 * - Jueves: sobrante de legumbre + carne con guarnición.
 * - Viernes: pasta distinta + pizza.
 * - Sábado: pescado + cena informal.
 * - Domingo: comida fuera + Cola Cao y galletas.
 *
 * Hay seis plantillas porque algunos meses ocupan seis semanas de calendario.
 */
const PLANTILLAS_SEMANA: DiaMenu[][] = [
  [
    dia('Lunes', ['Lentejas'], ['Lomo a la plancha con ensalada'], 'Fruta', 'Yogur'),
    dia('Martes', ['Lubina al horno con patatas'], ['Vainas con patata y huevo'], 'Yogur', 'Fruta'),
    dia('Miércoles', ['Ensalada de pasta'], ['Fajitas', 'Nachos', 'Guacamole'], 'Fruta', 'Yogur'),
    dia('Jueves', ['Lentejas'], ['Filete de ternera con patatas'], 'Yogur', 'Fruta'),
    dia('Viernes', ['Macarrones boloñesa'], ['Pizza jamón y queso', 'Pizza BBQ'], 'Fruta', 'Yogur'),
    dia('Sábado', ['Salmón a la plancha con arroz'], ['Hamburguesas'], 'Yogur', 'Fruta'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Cocido de garbanzos'], ['Pavo al ajillo con verduras'], 'Yogur', 'Fruta'),
    dia('Martes', ['Dorada al horno con calabacín'], ['Tortilla de calabacín'], 'Fruta', 'Yogur'),
    dia('Miércoles', ['Ensalada de pasta con pollo'], ['Pollo al horno con patatas'], 'Yogur', 'Fruta'),
    dia('Jueves', ['Cocido de garbanzos'], ['Lomo salteado con calabacín'], 'Fruta', 'Yogur'),
    dia('Viernes', ['Macarrones con chorizo'], ['Pizza 4 quesos', 'Pizza de atún'], 'Yogur', 'Fruta'),
    dia('Sábado', ['Bacalao con tomate'], ['Perritos calientes'], 'Fruta', 'Yogur'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Alubias rojas'], ['Pechugas de pollo a la plancha con ensalada'], 'Fruta', 'Yogur'),
    dia('Martes', ['Salmón al horno con verduras'], ['Menestra de verduras con pavo'], 'Yogur', 'Fruta'),
    dia('Miércoles', ['Ensalada de pasta con huevo'], ['Vainas salteadas con jamón'], 'Fruta', 'Yogur'),
    dia('Jueves', ['Alubias rojas'], ['Ternera con zanahoria y patatas'], 'Yogur', 'Fruta'),
    dia('Viernes', ['Carbonara tradicional'], ['Pizza jamón y queso', 'Pizza 4 quesos'], 'Fruta', 'Yogur'),
    dia('Sábado', ['Lubina a la plancha con ensalada'], ['Kebab'], 'Yogur', 'Fruta'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Garbanzos fritos', 'Arroz blanco'], ['Albóndigas con tomate'], 'Yogur', 'Fruta'),
    dia('Martes', ['Bacalao al horno con patatas'], ['Crema de calabaza con huevo duro'], 'Fruta', 'Yogur'),
    dia('Miércoles', ['Ensalada de pasta mediterránea'], ['Brochetas de pollo y calabacín'], 'Yogur', 'Fruta'),
    dia('Jueves', ['Lentejas con arroz y verduras'], ['Ternera guisada con verduras'], 'Fruta', 'Yogur'),
    dia('Viernes', ['Macarrones con roquefort'], ['Pizza BBQ', 'Pizza de atún'], 'Yogur', 'Fruta'),
    dia('Sábado', ['Dorada a la plancha con ensalada'], ['Nachos gratinados con carne'], 'Fruta', 'Yogur'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Alubias blancas con almejas'], ['Pavo al horno con verduras'], 'Fruta', 'Yogur'),
    dia('Martes', ['Lubina en papillote con verduras'], ['Verduras al horno con huevo'], 'Yogur', 'Fruta'),
    dia('Miércoles', ['Ensalada de pasta con pavo'], ['Pollo en salsa de tomate con patatas'], 'Fruta', 'Yogur'),
    dia('Jueves', ['Alubias blancas con almejas'], ['Lomo con calabacín y patatas'], 'Yogur', 'Fruta'),
    dia('Viernes', ['Macarrones con atún'], ['Pizza jamón y queso', 'Pizza de atún'], 'Fruta', 'Yogur'),
    dia('Sábado', ['Salmón con salsa de yogur y patatas'], ['Tortilla de patata con ensalada'], 'Yogur', 'Fruta'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Garbanzos guisados con verduras'], ['Crema de calabacín', 'Tortilla francesa'], 'Yogur', 'Fruta'),
    dia('Martes', ['Bacalao con tomate y pimiento rojo'], ['Vainas con tomate y huevo'], 'Fruta', 'Yogur'),
    dia('Miércoles', ['Ensalada de pasta con atún y huevo'], ['Pollo al limón con patatas'], 'Yogur', 'Fruta'),
    dia('Jueves', ['Garbanzos guisados con verduras'], ['Lomo al horno con verduras'], 'Fruta', 'Yogur'),
    dia('Viernes', ['Espaguetis con tomate y atún'], ['Pizza BBQ', 'Pizza 4 quesos'], 'Yogur', 'Fruta'),
    dia('Sábado', ['Dorada al horno con verduras'], ['Pollo especiado al horno con patatas'], 'Fruta', 'Yogur'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
];

export const menuMensualInicial: SemanaMenu[] = PLANTILLAS_SEMANA.map(
  (menu, indice) => ({
    id: `semana-${indice + 1}`,
    nombre: `Semana ${indice + 1}`,
    inicio: '',
    fin: '',
    menu,
  }),
);
