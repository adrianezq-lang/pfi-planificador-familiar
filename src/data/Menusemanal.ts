export type PostreMenu = 'Fruta' | 'Yogur' | 'Sin postre';

export type MomentoPostre = 'comida' | 'cena';

export type DiaMenu = {
  dia: string;
  comida: string[];
  cena: string[];
  postreComida: PostreMenu;
  postreCena: PostreMenu;
  postreComidaReceta?: string;
  postreCenaReceta?: string;
  detallePostreComida?: string;
  detallePostreCena?: string;
  cantidadPostreComida?: number;
  cantidadPostreCena?: number;
  postreComidaManual?: boolean;
  postreCenaManual?: boolean;
  preparar: string;
};

export const menuSemanal: DiaMenu[] = [
  { dia: 'Lunes', comida: ['Lentejas'], cena: ['Lomo a la plancha con ensalada'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: 'Lubina' },
  { dia: 'Martes', comida: ['Lubina al horno con patatas'], cena: ['Vainas con patata y huevo'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: 'Pasta + huevos' },
  { dia: 'Miércoles', comida: ['Ensalada de pasta'], cena: ['Fajitas', 'Nachos', 'Guacamole'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: 'Ternera' },
  { dia: 'Jueves', comida: ['Lentejas'], cena: ['Filete de ternera con patatas'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: 'Pizza' },
  { dia: 'Viernes', comida: ['Macarrones boloñesa'], cena: ['Pizza jamón y queso', 'Pizza BBQ'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: 'Salmón' },
  { dia: 'Sábado', comida: ['Salmón a la plancha con arroz'], cena: ['Hamburguesas'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: 'Lentejas' },
  { dia: 'Domingo', comida: ['Comemos fuera'], cena: ['Cola Cao y galletas'], postreComida: 'Sin postre', postreCena: 'Sin postre', preparar: 'Lentejas' },
];
