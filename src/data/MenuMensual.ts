import type { DiaMenu } from './Menusemanal';

export type SemanaMenu = {
  id: string;
  nombre: string;
  inicio: string;
  fin: string;
  menu: DiaMenu[];
  excluida?: boolean;
};

export const CENAS_VIERNES = [
  ['Hamburguesas'],
  ['Perritos calientes'],
  ['Kebab'],
] as const;

export const CENAS_MIERCOLES = [
  ['Fajitas', 'Nachos', 'Guacamole'],
  ['Crema de verduras', 'Tortilla de patata'],
  ['Lomo', 'Patatas'],
  ['Crema de calabaza', 'Tortilla francesa'],
  ['Pechugas de pavo', 'Ensalada'],
] as const;

const baseSemanas = [
  ['Lentejas', 'Lomo', 'Ensalada'],
  ['Cocido de garbanzos', 'Pechugas de pavo', 'Ensalada'],
  ['Alubias rojas', 'Pechugas de pollo', 'Arroz blanco'],
  ['Lentejas', 'Pechugas de pavo', 'Patatas'],
] as const;

const menuDias = (indice: number): DiaMenu[] => [
  {
    dia: 'Lunes',
    comida: [baseSemanas[indice % 4][0]],
    cena: [baseSemanas[indice % 4][1], baseSemanas[indice % 4][2]],
    postreComida: 'Fruta',
    postreCena: 'Yogur',
    preparar: '',
  },
  {
    dia: 'Martes',
    comida: ['Lubina', 'Patatas'],
    cena: ['Crema de calabacín', 'Tortilla francesa'],
    postreComida: 'Yogur',
    postreCena: 'Fruta',
    preparar: '',
  },
  {
    dia: 'Miércoles',
    comida: ['Ensalada de pasta'],
    cena: [...CENAS_MIERCOLES[indice % CENAS_MIERCOLES.length]],
    postreComida: 'Fruta',
    postreCena: 'Yogur',
    preparar: '',
  },
  {
    dia: 'Jueves',
    comida: ['Garbanzos fritos', 'Arroz blanco'],
    cena: ['Filete de ternera', 'Patatas'],
    postreComida: 'Yogur',
    postreCena: 'Fruta',
    preparar: '',
  },
  {
    dia: 'Viernes',
    comida: ['Macarrones boloñesa'],
    cena: [...CENAS_VIERNES[indice % CENAS_VIERNES.length]],
    postreComida: 'Fruta',
    postreCena: 'Yogur',
    preparar: '',
  },
  {
    dia: 'Sábado',
    comida: ['Salmón', 'Arroz blanco'],
    cena: ['Pizza jamón y queso', 'Pizza BBQ'],
    postreComida: 'Yogur',
    postreCena: 'Fruta',
    preparar: '',
  },
  {
    dia: 'Domingo',
    comida: ['Comemos fuera'],
    cena: ['Cola Cao y galletas'],
    postreComida: 'Sin postre',
    postreCena: 'Sin postre',
    preparar: '',
  },
];

export const menuMensualInicial: SemanaMenu[] = Array.from(
  { length: 5 },
  (_, indice) => ({
    id: `semana-${indice + 1}`,
    nombre: `Semana ${indice + 1}`,
    inicio: '',
    fin: '',
    menu: menuDias(indice),
  }),
);
