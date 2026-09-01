import type { DiaMenu } from './Menusemanal';

export type SemanaMenu = {
  id: string;
  nombre: string;
  inicio: string;
  fin: string;
  menu: DiaMenu[];
  excluida?: boolean;
};

// Regla familiar: la pizza se mantiene el viernes, pero se alternan variedades.
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
 * La estructura se mantiene estable para que cada semana esté equilibrada:
 * - Lunes: legumbres + cena de proteína con verdura/guarnición.
 * - Martes: pescado + cena de verduras/crema y huevo.
 * - Miércoles: pasta + cena de pollo/pavo o similar.
 * - Jueves: legumbre/arroz + carne con guarnición.
 * - Viernes: pasta + pizza.
 * - Sábado: pescado + cena informal.
 * - Domingo: comida fuera + Cola Cao y galletas.
 *
 * Los platos concretos cambian entre semanas. La ensalada de pasta aparece
 * de forma ocasional en la plantilla base; durante junio, julio y agosto el
 * planificador la fuerza una vez por semana como preferencia de verano.
 */
const PLANTILLAS_SEMANA: DiaMenu[][] = [
  [
    dia('Lunes', ['Lentejas'], ['Lomo', 'Ensalada'], 'Fruta', 'Yogur'),
    dia('Martes', ['Lubina', 'Patatas'], ['Crema de calabacín', 'Tortilla francesa'], 'Yogur', 'Fruta'),
    dia('Miércoles', ['Ensalada de pasta'], ['Fajitas', 'Nachos', 'Guacamole'], 'Fruta', 'Yogur'),
    dia('Jueves', ['Garbanzos fritos', 'Arroz blanco'], ['Filete de ternera', 'Patatas'], 'Yogur', 'Fruta'),
    dia('Viernes', ['Macarrones boloñesa'], ['Pizza jamón y queso', 'Pizza BBQ'], 'Fruta', 'Yogur'),
    dia('Sábado', ['Salmón', 'Arroz blanco'], ['Hamburguesas'], 'Yogur', 'Fruta'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Cocido de garbanzos'], ['Pechugas de pavo', 'Ensalada'], 'Yogur', 'Fruta'),
    dia('Martes', ['Dorada', 'Patatas'], ['Crema de verduras', 'Tortilla de patata'], 'Fruta', 'Yogur'),
    dia('Miércoles', ['Carbonara tradicional'], ['Pechugas de pollo', 'Arroz blanco'], 'Yogur', 'Fruta'),
    dia('Jueves', ['Alubias rojas'], ['Lomo', 'Patatas'], 'Fruta', 'Yogur'),
    dia('Viernes', ['Macarrones con chorizo'], ['Pizza BBQ', 'Pizza 4 quesos'], 'Yogur', 'Fruta'),
    dia('Sábado', ['Bacalao', 'Patatas'], ['Perritos calientes'], 'Fruta', 'Yogur'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Alubias rojas'], ['Lomo', 'Ensalada'], 'Fruta', 'Yogur'),
    dia('Martes', ['Bacalao', 'Patatas'], ['Crema de calabaza', 'Tortilla francesa'], 'Yogur', 'Fruta'),
    dia('Miércoles', ['Carbonara tradicional'], ['Pechugas de pavo', 'Patatas'], 'Fruta', 'Yogur'),
    dia('Jueves', ['Garbanzos fritos', 'Arroz blanco'], ['Filete de ternera', 'Ensalada'], 'Yogur', 'Fruta'),
    dia('Viernes', ['Macarrones con roquefort'], ['Pizza jamón y queso', 'Pizza 4 quesos'], 'Fruta', 'Yogur'),
    dia('Sábado', ['Dorada', 'Patatas'], ['Kebab'], 'Yogur', 'Fruta'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Lentejas'], ['Pechugas de pollo', 'Ensalada'], 'Yogur', 'Fruta'),
    dia('Martes', ['Salmón', 'Arroz blanco'], ['Crema de verduras', 'Tortilla de patata'], 'Fruta', 'Yogur'),
    dia('Miércoles', ['Macarrones boloñesa'], ['Kebab'], 'Yogur', 'Fruta'),
    dia('Jueves', ['Cocido de garbanzos'], ['Filete de ternera', 'Patatas'], 'Fruta', 'Yogur'),
    dia('Viernes', ['Macarrones con chorizo'], ['Pizza BBQ', 'Pizza 4 quesos'], 'Yogur', 'Fruta'),
    dia('Sábado', ['Lubina', 'Patatas'], ['Hamburguesas'], 'Fruta', 'Yogur'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Alubias rojas'], ['Lomo', 'Patatas'], 'Fruta', 'Yogur'),
    dia('Martes', ['Dorada', 'Patatas'], ['Crema de calabacín', 'Tortilla francesa'], 'Yogur', 'Fruta'),
    dia('Miércoles', ['Macarrones boloñesa'], ['Pechugas de pollo', 'Arroz blanco'], 'Fruta', 'Yogur'),
    dia('Jueves', ['Garbanzos fritos', 'Arroz blanco'], ['Filete de ternera', 'Ensalada'], 'Yogur', 'Fruta'),
    dia('Viernes', ['Carbonara tradicional'], ['Pizza jamón y queso', 'Pizza BBQ'], 'Fruta', 'Yogur'),
    dia('Sábado', ['Salmón', 'Arroz blanco'], ['Perritos calientes'], 'Yogur', 'Fruta'),
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
