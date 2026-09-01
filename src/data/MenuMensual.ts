import type { DiaMenu } from './Menusemanal';

export type SemanaMenu = {
  id: string;
  nombre: string;
  inicio: string;
  fin: string;
  menu: DiaMenu[];
  excluida?: boolean;
};

// Se mantiene exportado porque el generador mensual lo usa como respaldo,
// pero la pizza queda fijada los viernes y estas cenas se reparten en sábado.
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

const PLANTILLAS_SEMANA: DiaMenu[][] = [
  [
    dia('Lunes', ['Lentejas'], ['Lomo', 'Ensalada'], 'Fruta', 'Yogur'),
    dia('Martes', ['Pollo al horno', 'Patatas'], ['Crema de calabacín', 'Tortilla francesa'], 'Yogur', 'Fruta'),
    dia('Miércoles', ['Ensalada de pasta'], ['Fajitas', 'Nachos', 'Guacamole'], 'Fruta', 'Yogur'),
    dia('Jueves', ['Garbanzos fritos', 'Arroz blanco'], ['Filete de ternera', 'Patatas'], 'Yogur', 'Fruta'),
    dia('Viernes', ['Macarrones boloñesa'], ['Pizza jamón y queso', 'Pizza BBQ'], 'Fruta', 'Yogur'),
    dia('Sábado', ['Salmón', 'Arroz blanco'], ['Hamburguesas'], 'Yogur', 'Fruta'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Arroz con pollo'], ['Pechugas de pavo', 'Ensalada'], 'Yogur', 'Fruta'),
    dia('Martes', ['Cocido de garbanzos'], ['Crema de verduras', 'Tortilla de patata'], 'Fruta', 'Yogur'),
    dia('Miércoles', ['Dorada', 'Patatas'], ['Lomo', 'Patatas'], 'Yogur', 'Fruta'),
    dia('Jueves', ['Ensalada de pasta'], ['Pechugas de pollo', 'Arroz blanco'], 'Fruta', 'Yogur'),
    dia('Viernes', ['Alubias rojas'], ['Pizza BBQ', 'Pizza 4 quesos'], 'Yogur', 'Fruta'),
    dia('Sábado', ['Lubina', 'Patatas'], ['Perritos calientes'], 'Fruta', 'Yogur'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Garbanzos fritos', 'Arroz blanco'], ['Filete de ternera', 'Ensalada'], 'Fruta', 'Yogur'),
    dia('Martes', ['Macarrones boloñesa'], ['Crema de calabaza', 'Tortilla francesa'], 'Yogur', 'Fruta'),
    dia('Miércoles', ['Bacalao', 'Patatas'], ['Kebab'], 'Fruta', 'Yogur'),
    dia('Jueves', ['Lentejas'], ['Pechugas de pavo', 'Patatas'], 'Yogur', 'Fruta'),
    dia('Viernes', ['Ensalada de pasta'], ['Pizza jamón y queso', 'Pizza 4 quesos'], 'Fruta', 'Yogur'),
    dia('Sábado', ['Arroz con pollo'], ['Hamburguesas'], 'Yogur', 'Fruta'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Cocido de garbanzos'], ['Lomo', 'Ensalada'], 'Yogur', 'Fruta'),
    dia('Martes', ['Bacalao', 'Patatas'], ['Crema de calabacín', 'Tortilla francesa'], 'Fruta', 'Yogur'),
    dia('Miércoles', ['Ensalada de pasta'], ['Pechugas de pollo', 'Arroz blanco'], 'Yogur', 'Fruta'),
    dia('Jueves', ['Alubias rojas'], ['Filete de ternera', 'Patatas'], 'Fruta', 'Yogur'),
    dia('Viernes', ['Arroz con pollo'], ['Pizza BBQ', 'Pizza 4 quesos'], 'Yogur', 'Fruta'),
    dia('Sábado', ['Dorada', 'Patatas'], ['Perritos calientes'], 'Fruta', 'Yogur'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Salmón', 'Arroz blanco'], ['Pechugas de pavo', 'Ensalada'], 'Fruta', 'Yogur'),
    dia('Martes', ['Lentejas'], ['Crema de verduras', 'Tortilla de patata'], 'Yogur', 'Fruta'),
    dia('Miércoles', ['Macarrones boloñesa'], ['Lomo', 'Patatas'], 'Fruta', 'Yogur'),
    dia('Jueves', ['Ensalada de pasta'], ['Filete de ternera', 'Ensalada'], 'Yogur', 'Fruta'),
    dia('Viernes', ['Garbanzos fritos', 'Arroz blanco'], ['Pizza jamón y queso', 'Pizza BBQ'], 'Fruta', 'Yogur'),
    dia('Sábado', ['Lubina', 'Patatas'], ['Kebab'], 'Yogur', 'Fruta'),
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
