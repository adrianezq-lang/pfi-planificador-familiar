import type { DiaMenu } from './Menusemanal';

export type SemanaMenu = {
  id: string;
  nombre: string;
  menu: DiaMenu[];
};

export const CENAS_VIERNES = [
  ['Pizza jamón y queso', 'Pizza BBQ'],
  ['Pizza BBQ', 'Pizza 4 quesos'],
] as const;

export const CENAS_SABADO = [
  ['Hamburguesas'],
  ['Perritos calientes'],
  ['Kebab'],
] as const;

export const menuMensualInicial: SemanaMenu[] = [
  {
    id: 'semana-1',
    nombre: 'Semana 1',
    menu: [
      { dia: 'Lunes', comida: ['Lentejas'], cena: ['Lomo', 'Ensalada'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
      { dia: 'Martes', comida: ['Lubina', 'Patatas'], cena: ['Crema de calabacín', 'Tortilla francesa'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: '' },
      { dia: 'Miércoles', comida: ['Ensalada de pasta'], cena: ['Fajitas', 'Nachos', 'Guacamole'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
      { dia: 'Jueves', comida: ['Garbanzos fritos', 'Arroz blanco'], cena: ['Filete de ternera', 'Patatas'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: '' },
      { dia: 'Viernes', comida: ['Macarrones boloñesa'], cena: ['Pizza jamón y queso', 'Pizza BBQ'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
      { dia: 'Sábado', comida: ['Salmón', 'Arroz blanco'], cena: ['Hamburguesas'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: '' },
      { dia: 'Domingo', comida: ['Comemos fuera'], cena: ['Cola Cao y galletas'], postreComida: 'Sin postre', postreCena: 'Sin postre', preparar: '' },
    ],
  },
  {
    id: 'semana-2',
    nombre: 'Semana 2',
    menu: [
      { dia: 'Lunes', comida: ['Cocido de garbanzos'], cena: ['Pechugas de pavo', 'Ensalada'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: '' },
      { dia: 'Martes', comida: ['Arroz con pollo'], cena: ['Crema de verduras', 'Tortilla de patata'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
      { dia: 'Miércoles', comida: ['Ensalada de pasta'], cena: ['Bacalao', 'Patatas'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: '' },
      { dia: 'Jueves', comida: ['Alubias blancas con almejas'], cena: ['Lomo', 'Patatas'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
      { dia: 'Viernes', comida: ['Carbonara tradicional'], cena: ['Pizza BBQ', 'Pizza 4 quesos'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: '' },
      { dia: 'Sábado', comida: ['Dorada', 'Patatas'], cena: ['Perritos calientes'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
      { dia: 'Domingo', comida: ['Comemos fuera'], cena: ['Cola Cao y galletas'], postreComida: 'Sin postre', postreCena: 'Sin postre', preparar: '' },
    ],
  },
  {
    id: 'semana-3',
    nombre: 'Semana 3',
    menu: [
      { dia: 'Lunes', comida: ['Alubias rojas'], cena: ['Pechugas de pollo', 'Arroz blanco'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
      { dia: 'Martes', comida: ['Salmón', 'Patatas'], cena: ['Crema de calabaza', 'Tortilla francesa'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: '' },
      { dia: 'Miércoles', comida: ['Ensalada de pasta'], cena: ['Fajitas', 'Nachos', 'Guacamole'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
      { dia: 'Jueves', comida: ['Garbanzos fritos', 'Arroz blanco'], cena: ['Filete de ternera', 'Patatas'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: '' },
      { dia: 'Viernes', comida: ['Macarrones con chorizo'], cena: ['Pizza jamón y queso', 'Pizza BBQ'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
      { dia: 'Sábado', comida: ['Lubina', 'Patatas'], cena: ['Kebab'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: '' },
      { dia: 'Domingo', comida: ['Comemos fuera'], cena: ['Cola Cao y galletas'], postreComida: 'Sin postre', postreCena: 'Sin postre', preparar: '' },
    ],
  },
  {
    id: 'semana-4',
    nombre: 'Semana 4',
    menu: [
      { dia: 'Lunes', comida: ['Lentejas'], cena: ['Pechugas de pavo', 'Patatas'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: '' },
      { dia: 'Martes', comida: ['Pollo al horno', 'Patatas'], cena: ['Crema de calabacín', 'Tortilla francesa'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
      { dia: 'Miércoles', comida: ['Ensalada de pasta'], cena: ['Bacalao', 'Patatas'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: '' },
      { dia: 'Jueves', comida: ['Alubias blancas con almejas'], cena: ['Lomo', 'Ensalada'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
      { dia: 'Viernes', comida: ['Macarrones con roquefort'], cena: ['Pizza BBQ', 'Pizza 4 quesos'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: '' },
      { dia: 'Sábado', comida: ['Salmón', 'Arroz blanco'], cena: ['Hamburguesas'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: '' },
      { dia: 'Domingo', comida: ['Comemos fuera'], cena: ['Cola Cao y galletas'], postreComida: 'Sin postre', postreCena: 'Sin postre', preparar: '' },
    ],
  },
];
