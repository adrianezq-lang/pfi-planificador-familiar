import type { Receta } from './Recetas';

/**
 * Ampliación de recetas de v0.9.23. Todas respetan las preferencias familiares:
 * sin maíz, champiñones, brócoli ni merluza y sin cebolla visible.
 */
export const recetasVariedadV0923: Receta[] = [
  {
    nombre: 'Lentejas con arroz y verduras',
    categoria: 'Legumbres',
    ingredientes: [
      { nombre: 'Lentejas secas', cantidad: 250, unidad: 'g', seccion: 'Despensa' },
      { nombre: 'Arroz', cantidad: 1, unidad: 'vaso pequeño', seccion: 'Despensa' },
      { nombre: 'Zanahorias', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Calabacín', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Tomate', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Ajo', cantidad: 2, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Ternera con zanahoria y patatas',
    categoria: 'Carne',
    ingredientes: [
      { nombre: 'Filetes de ternera', cantidad: 4, unidad: 'raciones', seccion: 'Carnicería' },
      { nombre: 'Patatas', cantidad: 1, unidad: 'kg', seccion: 'Fruta y verdura' },
      { nombre: 'Zanahorias', cantidad: 4, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Ajo', cantidad: 2, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Pavo al ajillo con verduras',
    categoria: 'Carne',
    ingredientes: [
      { nombre: 'Pechugas de pavo fileteadas', cantidad: 4, unidad: 'raciones', seccion: 'Carnicería' },
      { nombre: 'Calabacín', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Zanahorias', cantidad: 3, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Ajo', cantidad: 4, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Pollo al limón con patatas',
    categoria: 'Pollo',
    ingredientes: [
      { nombre: 'Pechugas de pollo', cantidad: 700, unidad: 'g', seccion: 'Carnicería' },
      { nombre: 'Patatas', cantidad: 1, unidad: 'kg', seccion: 'Fruta y verdura' },
      { nombre: 'Limón', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Ajo', cantidad: 4, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Bacalao con tomate y pimiento rojo',
    categoria: 'Pescado',
    ingredientes: [
      { nombre: 'Bacalao', cantidad: 4, unidad: 'raciones', seccion: 'Pescadería' },
      { nombre: 'Tomate', cantidad: 3, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Pimiento rojo', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Ajo', cantidad: 3, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Tortilla de calabacín',
    categoria: 'Huevos',
    ingredientes: [
      { nombre: 'Huevos', cantidad: 8, unidad: 'ud', seccion: 'Lácteos y huevos', ajusteAutomatico: true },
      { nombre: 'Calabacín', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Patatas', cantidad: 0.5, unidad: 'kg', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Vainas con tomate y huevo',
    categoria: 'Verduras',
    ingredientes: [
      { nombre: 'Judías verdes', cantidad: 0.8, unidad: 'kg', seccion: 'Congelados' },
      { nombre: 'Tomate', cantidad: 3, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Huevos', cantidad: 4, unidad: 'ud', seccion: 'Lácteos y huevos', ajusteAutomatico: true },
      { nombre: 'Ajo', cantidad: 2, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Lomo con calabacín y patatas',
    categoria: 'Carne',
    ingredientes: [
      { nombre: 'Lomo', cantidad: 4, unidad: 'raciones', seccion: 'Carnicería' },
      { nombre: 'Calabacín', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Patatas', cantidad: 0.8, unidad: 'kg', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Arroz salteado con pollo y verduras',
    categoria: 'Arroz',
    ingredientes: [
      { nombre: 'Arroz', cantidad: 1.5, unidad: 'vaso pequeño', seccion: 'Despensa' },
      { nombre: 'Pechugas de pollo', cantidad: 600, unidad: 'g', seccion: 'Carnicería' },
      { nombre: 'Zanahorias', cantidad: 3, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Calabacín', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Pimiento rojo', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Dorada al horno con verduras',
    categoria: 'Pescado',
    ingredientes: [
      { nombre: 'Dorada', cantidad: 4, unidad: 'raciones', seccion: 'Pescadería' },
      { nombre: 'Calabacín', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Zanahorias', cantidad: 3, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Tomate', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Pimiento rojo', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
    ],
  },
];
