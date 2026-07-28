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
  { dia: 'Lunes', comida: ['Lentejas'], cena: ['Lomo', 'Ensalada'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: 'Pollo' },
  { dia: 'Martes', comida: ['Pollo al horno', 'Patatas'], cena: ['Crema de calabacín', 'Tortilla francesa'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: 'Pasta + huevos' },
  { dia: 'Miércoles', comida: ['Ensalada de pasta'], cena: ['Fajitas', 'Nachos', 'Guacamole'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: 'Ternera' },
  { dia: 'Jueves', comida: ['Garbanzos fritos', 'Arroz blanco'], cena: ['Filete de ternera', 'Patatas'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: 'Pizza' },
  { dia: 'Viernes', comida: ['Macarrones boloñesa'], cena: ['Hamburguesas'], postreComida: 'Fruta', postreCena: 'Yogur', preparar: 'Salmón' },
  { dia: 'Sábado', comida: ['Salmón', 'Arroz blanco'], cena: ['Pizza jamón y queso', 'Pizza BBQ'], postreComida: 'Yogur', postreCena: 'Fruta', preparar: 'Hamburguesas' },
  { dia: 'Domingo', comida: ['Comemos fuera'], cena: ['Cola Cao y galletas'], postreComida: 'Sin postre', postreCena: 'Sin postre', preparar: 'Lentejas' },
];
