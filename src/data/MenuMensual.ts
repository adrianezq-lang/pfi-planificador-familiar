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
  ['Pizza BBQ', 'Pizza 4 quesos'],
  ['Pizza jamón y queso', 'Pizza 4 quesos'],
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
 * - Lunes: legumbres; la misma olla se termina el jueves.
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
    dia('Lunes', ['Lentejas'], ['Lomo', 'Ensalada'], 'Fruta', 'Yogur'),
    dia('Martes', ['Lubina', 'Patatas'], ['Vainas con patata y huevo'], 'Yogur', 'Fruta'),
    dia('Miércoles', ['Ensalada de pasta'], ['Fajitas', 'Nachos', 'Guacamole'], 'Fruta', 'Yogur'),
    dia('Jueves', ['Lentejas'], ['Filete de ternera', 'Patatas'], 'Yogur', 'Fruta'),
    dia('Viernes', ['Macarrones boloñesa'], ['Pizza jamón y queso', 'Pizza BBQ'], 'Fruta', 'Yogur'),
    dia('Sábado', ['Salmón', 'Arroz blanco'], ['Hamburguesas'], 'Yogur', 'Fruta'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Cocido de garbanzos'], ['Pechugas de pavo', 'Ensalada'], 'Yogur', 'Fruta'),
    dia('Martes', ['Dorada', 'Patatas'], ['Crema de calabacín', 'Tortilla francesa'], 'Fruta', 'Yogur'),
    dia('Miércoles', ['Ensalada de pasta con pollo'], ['Pollo al horno', 'Patatas'], 'Yogur', 'Fruta'),
    dia('Jueves', ['Cocido de garbanzos'], ['Lomo', 'Patatas'], 'Fruta', 'Yogur'),
    dia('Viernes', ['Macarrones con chorizo'], ['Pizza BBQ', 'Pizza 4 quesos'], 'Yogur', 'Fruta'),
    dia('Sábado', ['Bacalao', 'Arroz blanco'], ['Perritos calientes'], 'Fruta', 'Yogur'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Alubias rojas'], ['Pechugas de pollo', 'Arroz blanco'], 'Fruta', 'Yogur'),
    dia('Martes', ['Salmón', 'Patatas'], ['Verduras al horno', 'Tortilla francesa'], 'Yogur', 'Fruta'),
    dia('Miércoles', ['Ensalada de pasta con huevo'], ['Arroz con huevo y tomate'], 'Fruta', 'Yogur'),
    dia('Jueves', ['Alubias rojas'], ['Filete de ternera', 'Ensalada'], 'Yogur', 'Fruta'),
    dia('Viernes', ['Carbonara tradicional'], ['Pizza jamón y queso', 'Pizza 4 quesos'], 'Fruta', 'Yogur'),
    dia('Sábado', ['Lubina', 'Arroz blanco'], ['Kebab'], 'Yogur', 'Fruta'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Garbanzos fritos', 'Arroz blanco'], ['Albóndigas con tomate'], 'Yogur', 'Fruta'),
    dia('Martes', ['Bacalao', 'Patatas'], ['Crema de verduras', 'Tortilla de patata'], 'Fruta', 'Yogur'),
    dia('Miércoles', ['Ensalada de pasta mediterránea'], ['Pechugas de pavo', 'Patatas'], 'Yogur', 'Fruta'),
    dia('Jueves', ['Garbanzos fritos', 'Arroz blanco'], ['Pollo al ajillo'], 'Fruta', 'Yogur'),
    dia('Viernes', ['Macarrones con roquefort'], ['Pizza BBQ', 'Pizza 4 quesos'], 'Yogur', 'Fruta'),
    dia('Sábado', ['Dorada', 'Arroz blanco'], ['Hamburguesas', 'Ensalada'], 'Fruta', 'Yogur'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Alubias blancas con almejas'], ['Pechugas de pollo', 'Ensalada'], 'Fruta', 'Yogur'),
    dia('Martes', ['Lubina', 'Ensalada'], ['Crema de calabaza', 'Pechugas de pavo'], 'Yogur', 'Fruta'),
    dia('Miércoles', ['Ensalada de pasta con pavo'], ['Fajitas'], 'Fruta', 'Yogur'),
    dia('Jueves', ['Alubias blancas con almejas'], ['Filete de ternera', 'Calabacín a la plancha'], 'Yogur', 'Fruta'),
    dia('Viernes', ['Macarrones con atún'], ['Pizza jamón y queso', 'Pizza BBQ'], 'Fruta', 'Yogur'),
    dia('Sábado', ['Salmón', 'Ensalada'], ['Perritos calientes', 'Ensalada'], 'Yogur', 'Fruta'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Garbanzos guisados con verduras'], ['Arroz con pollo'], 'Yogur', 'Fruta'),
    dia('Martes', ['Bacalao', 'Verduras al horno'], ['Vainas salteadas con jamón'], 'Fruta', 'Yogur'),
    dia('Miércoles', ['Ensalada de pasta con atún y huevo'], ['Pollo al ajillo', 'Patatas'], 'Yogur', 'Fruta'),
    dia('Jueves', ['Garbanzos guisados con verduras'], ['Lomo', 'Calabacín a la plancha'], 'Fruta', 'Yogur'),
    dia('Viernes', ['Espaguetis con tomate y atún'], ['Pizza BBQ', 'Pizza 4 quesos'], 'Yogur', 'Fruta'),
    dia('Sábado', ['Dorada', 'Verduras al horno'], ['Kebab', 'Ensalada'], 'Fruta', 'Yogur'),
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
