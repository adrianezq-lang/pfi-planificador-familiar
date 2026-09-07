import type { Receta } from './Recetas';

/**
 * Recetas añadidas en v0.9.22 para ampliar la variedad mensual sin alterar
 * las recetas base que el usuario ya pueda haber editado en localStorage.
 */
export const recetasVariedadV0922: Receta[] = [
  {
    nombre: 'Vainas con patata y huevo',
    categoria: 'Verduras',
    ingredientes: [
      { nombre: 'Judías verdes', cantidad: 1, unidad: 'kg', seccion: 'Congelados' },
      { nombre: 'Patatas', cantidad: 0.8, unidad: 'kg', seccion: 'Fruta y verdura' },
      { nombre: 'Huevos', cantidad: 4, unidad: 'ud', seccion: 'Lácteos y huevos', ajusteAutomatico: true },
      { nombre: 'Ajo', cantidad: 2, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Vainas salteadas con jamón',
    categoria: 'Verduras',
    ingredientes: [
      { nombre: 'Judías verdes', cantidad: 0.8, unidad: 'kg', seccion: 'Congelados' },
      { nombre: 'Jamón cocido', cantidad: 1, unidad: 'paquete', seccion: 'Charcutería' },
      { nombre: 'Ajo', cantidad: 2, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Verduras al horno',
    categoria: 'Verduras',
    ingredientes: [
      { nombre: 'Calabacín', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Zanahorias', cantidad: 4, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Calabaza', cantidad: 0.5, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Tomate', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Calabacín a la plancha',
    categoria: 'Verduras',
    ingredientes: [
      { nombre: 'Calabacín', cantidad: 3, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Ajo', cantidad: 2, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Albóndigas con tomate',
    categoria: 'Carne',
    ingredientes: [
      { nombre: 'Carne picada', cantidad: 700, unidad: 'g', seccion: 'Carnicería' },
      { nombre: 'Tomate frito', cantidad: 1.5, unidad: 'brick', seccion: 'Despensa' },
      { nombre: 'Ajo', cantidad: 2, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Pollo al ajillo',
    categoria: 'Pollo',
    ingredientes: [
      { nombre: 'Pechugas de pollo', cantidad: 700, unidad: 'g', seccion: 'Carnicería' },
      { nombre: 'Ajo', cantidad: 0.5, unidad: 'cabeza', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Garbanzos guisados con verduras',
    categoria: 'Legumbres',
    ingredientes: [
      { nombre: 'Garbanzos secos', cantidad: 500, unidad: 'g', seccion: 'Despensa' },
      { nombre: 'Zanahorias', cantidad: 3, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Calabacín', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Tomate', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Ajo', cantidad: 2, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Ensalada de pasta con pollo',
    categoria: 'Pasta',
    ingredientes: [
      { nombre: 'Pasta corta', cantidad: 500, unidad: 'g', seccion: 'Despensa' },
      { nombre: 'Pechugas de pollo', cantidad: 400, unidad: 'g', seccion: 'Carnicería' },
      { nombre: 'Tomate', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Pepino', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Mayonesa', cantidad: 1, unidad: 'revisar', seccion: 'Salsas' },
    ],
  },
  {
    nombre: 'Ensalada de pasta con huevo',
    categoria: 'Pasta',
    ingredientes: [
      { nombre: 'Pasta corta', cantidad: 500, unidad: 'g', seccion: 'Despensa' },
      { nombre: 'Huevos', cantidad: 6, unidad: 'ud', seccion: 'Lácteos y huevos', ajusteAutomatico: true },
      { nombre: 'Tomate', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Pepino', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Aceitunas', cantidad: 1, unidad: 'ración', seccion: 'Despensa' },
    ],
  },
  {
    nombre: 'Ensalada de pasta mediterránea',
    categoria: 'Pasta',
    ingredientes: [
      { nombre: 'Pasta corta', cantidad: 500, unidad: 'g', seccion: 'Despensa' },
      { nombre: 'Atún', cantidad: 2, unidad: 'lata', seccion: 'Despensa' },
      { nombre: 'Tomate', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Pepino', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Aceitunas', cantidad: 1, unidad: 'ración', seccion: 'Despensa' },
      { nombre: 'Queso curado', cantidad: 0.5, unidad: 'cuña', seccion: 'Lácteos y huevos' },
    ],
  },
  {
    nombre: 'Ensalada de pasta con pavo',
    categoria: 'Pasta',
    ingredientes: [
      { nombre: 'Pasta corta', cantidad: 500, unidad: 'g', seccion: 'Despensa' },
      { nombre: 'Pechugas de pavo fileteadas', cantidad: 4, unidad: 'raciones', seccion: 'Carnicería' },
      { nombre: 'Tomate', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Pepino', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Ensalada de pasta con atún y huevo',
    categoria: 'Pasta',
    ingredientes: [
      { nombre: 'Pasta corta', cantidad: 500, unidad: 'g', seccion: 'Despensa' },
      { nombre: 'Atún', cantidad: 2, unidad: 'lata', seccion: 'Despensa' },
      { nombre: 'Huevos', cantidad: 4, unidad: 'ud', seccion: 'Lácteos y huevos', ajusteAutomatico: true },
      { nombre: 'Tomate', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Pepino', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Macarrones con atún',
    categoria: 'Pasta',
    ingredientes: [
      { nombre: 'Pasta corta', cantidad: 500, unidad: 'g', seccion: 'Despensa' },
      { nombre: 'Atún', cantidad: 3, unidad: 'lata', seccion: 'Despensa' },
      { nombre: 'Tomate frito', cantidad: 1, unidad: 'brick', seccion: 'Despensa' },
      { nombre: 'Queso rallado', cantidad: 1, unidad: 'bolsa', seccion: 'Lácteos y huevos' },
    ],
  },
  {
    nombre: 'Espaguetis con tomate y atún',
    categoria: 'Pasta',
    ingredientes: [
      { nombre: 'Espaguetis', cantidad: 500, unidad: 'g', seccion: 'Despensa' },
      { nombre: 'Atún', cantidad: 3, unidad: 'lata', seccion: 'Despensa' },
      { nombre: 'Tomate frito', cantidad: 1, unidad: 'brick', seccion: 'Despensa' },
      { nombre: 'Queso rallado', cantidad: 1, unidad: 'bolsa', seccion: 'Lácteos y huevos' },
    ],
  },
];
