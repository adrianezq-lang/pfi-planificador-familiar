import type { Ingrediente, Receta } from './Recetas';

function ingrediente(
  nombre: string,
  cantidad: number,
  unidad: string,
  seccion: string,
  ajusteAutomatico?: boolean,
): Ingrediente {
  return {
    nombre,
    cantidad,
    unidad,
    seccion,
    ...(ajusteAutomatico === undefined ? {} : { ajusteAutomatico }),
  };
}

/**
 * Platos completos de v0.9.24. Dar un nombre propio a cada preparación evita
 * que el plan aparente variedad por cambiar solo la guarnición. Se mantiene el
 * pimiento donde ya se usaba y se incorpora a más platos de verduras.
 */
export const recetasVariedadV0924: Receta[] = [
  {
    nombre: 'Lomo a la plancha con ensalada',
    categoria: 'Carne',
    ingredientes: [
      ingrediente('Lomo', 4, 'raciones', 'Carnicería'),
      ingrediente('Tomate', 2, 'ud', 'Fruta y verdura'),
      ingrediente('Pepino', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Atún', 1, 'lata', 'Despensa'),
      ingrediente('Aceitunas', 1, 'ración', 'Despensa'),
    ],
  },
  {
    nombre: 'Lubina al horno con patatas',
    categoria: 'Pescado',
    ingredientes: [
      ingrediente('Lubina', 4, 'raciones', 'Pescadería'),
      ingrediente('Patatas', 1, 'kg', 'Fruta y verdura'),
      ingrediente('Ajo', 3, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Filete de ternera con patatas',
    categoria: 'Carne',
    ingredientes: [
      ingrediente('Filetes de ternera', 4, 'raciones', 'Carnicería'),
      ingrediente('Patatas', 1, 'kg', 'Fruta y verdura'),
      ingrediente('Ajo', 2, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Salmón a la plancha con arroz',
    categoria: 'Pescado',
    ingredientes: [
      ingrediente('Salmón', 4, 'raciones', 'Pescadería'),
      ingrediente('Arroz', 1.5, 'vaso pequeño', 'Despensa'),
      ingrediente('Limón', 1, 'ud', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Dorada al horno con calabacín',
    categoria: 'Pescado',
    ingredientes: [
      ingrediente('Dorada', 4, 'raciones', 'Pescadería'),
      ingrediente('Calabacín', 2, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Ajo', 2, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Pollo al horno con patatas',
    categoria: 'Pollo',
    ingredientes: [
      ingrediente('Pollo entero', 1, 'ud', 'Carnicería'),
      ingrediente('Patatas', 1, 'kg', 'Fruta y verdura'),
      ingrediente('Ajo', 3, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Lomo salteado con calabacín',
    categoria: 'Carne',
    ingredientes: [
      ingrediente('Lomo', 4, 'raciones', 'Carnicería'),
      ingrediente('Calabacín', 2, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento tricolor', 1, 'bandeja', 'Fruta y verdura'),
      ingrediente('Ajo', 2, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Bacalao con tomate',
    categoria: 'Pescado',
    ingredientes: [
      ingrediente('Bacalao', 4, 'raciones', 'Pescadería'),
      ingrediente('Tomate triturado', 0.5, 'bote grande', 'Despensa'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Ajo', 2, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Pechugas de pollo a la plancha con ensalada',
    categoria: 'Pollo',
    ingredientes: [
      ingrediente('Pechugas de pollo', 700, 'g', 'Carnicería'),
      ingrediente('Tomate', 2, 'ud', 'Fruta y verdura'),
      ingrediente('Pepino', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Aceitunas', 1, 'ración', 'Despensa'),
    ],
  },
  {
    nombre: 'Salmón al horno con verduras',
    categoria: 'Pescado',
    ingredientes: [
      ingrediente('Salmón', 4, 'raciones', 'Pescadería'),
      ingrediente('Calabacín', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Zanahorias', 3, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Tomate', 2, 'ud', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Menestra de verduras con pavo',
    categoria: 'Verduras',
    ingredientes: [
      ingrediente('Menestra de verduras', 0.8, 'kg', 'Congelados'),
      ingrediente('Pechugas de pavo fileteadas', 4, 'raciones', 'Carnicería'),
      ingrediente('Ajo', 2, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Lubina a la plancha con ensalada',
    categoria: 'Pescado',
    ingredientes: [
      ingrediente('Lubina', 4, 'raciones', 'Pescadería'),
      ingrediente('Tomate', 2, 'ud', 'Fruta y verdura'),
      ingrediente('Pepino', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Aceitunas', 1, 'ración', 'Despensa'),
      ingrediente('Limón', 1, 'ud', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Bacalao al horno con patatas',
    categoria: 'Pescado',
    ingredientes: [
      ingrediente('Bacalao', 4, 'raciones', 'Pescadería'),
      ingrediente('Patatas', 1, 'kg', 'Fruta y verdura'),
      ingrediente('Ajo', 3, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Crema de calabaza con huevo duro',
    categoria: 'Verduras',
    ingredientes: [
      ingrediente('Calabaza', 0.5, 'ud', 'Fruta y verdura'),
      ingrediente('Calabacín', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Zanahorias', 2, 'ud', 'Fruta y verdura'),
      ingrediente('Huevos', 4, 'ud', 'Lácteos y huevos', true),
    ],
  },
  {
    nombre: 'Brochetas de pollo y calabacín',
    categoria: 'Pollo',
    ingredientes: [
      ingrediente('Pechugas de pollo', 700, 'g', 'Carnicería'),
      ingrediente('Calabacín', 2, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento tricolor', 1, 'bandeja', 'Fruta y verdura'),
      ingrediente('Tomate', 2, 'ud', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Ternera guisada con verduras',
    categoria: 'Carne',
    ingredientes: [
      ingrediente('Filetes de ternera', 4, 'raciones', 'Carnicería'),
      ingrediente('Patatas', 0.8, 'kg', 'Fruta y verdura'),
      ingrediente('Zanahorias', 3, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Tomate triturado', 0.5, 'bote grande', 'Despensa'),
    ],
  },
  {
    nombre: 'Dorada a la plancha con ensalada',
    categoria: 'Pescado',
    ingredientes: [
      ingrediente('Dorada', 4, 'raciones', 'Pescadería'),
      ingrediente('Tomate', 2, 'ud', 'Fruta y verdura'),
      ingrediente('Pepino', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Aceitunas', 1, 'ración', 'Despensa'),
      ingrediente('Limón', 1, 'ud', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Nachos gratinados con carne',
    categoria: 'Carne',
    ingredientes: [
      ingrediente('Nachos', 1, 'bolsa', 'Despensa'),
      ingrediente('Carne picada', 500, 'g', 'Carnicería'),
      ingrediente('Tomate frito', 0.5, 'brick', 'Despensa'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Mozzarella rallada', 125, 'g', 'Lácteos y huevos'),
    ],
  },
  {
    nombre: 'Pavo al horno con verduras',
    categoria: 'Carne',
    ingredientes: [
      ingrediente('Pechugas de pavo fileteadas', 4, 'raciones', 'Carnicería'),
      ingrediente('Calabacín', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Zanahorias', 3, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento tricolor', 1, 'bandeja', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Lubina en papillote con verduras',
    categoria: 'Pescado',
    ingredientes: [
      ingrediente('Lubina', 4, 'raciones', 'Pescadería'),
      ingrediente('Calabacín', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Zanahorias', 3, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Limón', 1, 'ud', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Verduras al horno con huevo',
    categoria: 'Verduras',
    ingredientes: [
      ingrediente('Calabacín', 2, 'ud', 'Fruta y verdura'),
      ingrediente('Zanahorias', 4, 'ud', 'Fruta y verdura'),
      ingrediente('Calabaza', 0.5, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Huevos', 4, 'ud', 'Lácteos y huevos', true),
    ],
  },
  {
    nombre: 'Pollo en salsa de tomate con patatas',
    categoria: 'Pollo',
    ingredientes: [
      ingrediente('Pechugas de pollo', 700, 'g', 'Carnicería'),
      ingrediente('Patatas', 0.8, 'kg', 'Fruta y verdura'),
      ingrediente('Tomate triturado', 0.5, 'bote grande', 'Despensa'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Ajo', 2, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Salmón con salsa de yogur y patatas',
    categoria: 'Pescado',
    ingredientes: [
      ingrediente('Salmón', 4, 'raciones', 'Pescadería'),
      ingrediente('Patatas', 0.8, 'kg', 'Fruta y verdura'),
      ingrediente('Salsa yogur', 0.3, 'envase', 'Salsas'),
      ingrediente('Limón', 1, 'ud', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Tortilla de patata con ensalada',
    categoria: 'Huevos',
    ingredientes: [
      ingrediente('Huevos', 8, 'ud', 'Lácteos y huevos', true),
      ingrediente('Patatas', 0.8, 'kg', 'Fruta y verdura'),
      ingrediente('Tomate', 2, 'ud', 'Fruta y verdura'),
      ingrediente('Pepino', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Aceitunas', 1, 'ración', 'Despensa'),
    ],
  },
  {
    nombre: 'Lomo al horno con verduras',
    categoria: 'Carne',
    ingredientes: [
      ingrediente('Lomo', 4, 'raciones', 'Carnicería'),
      ingrediente('Calabacín', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Zanahorias', 3, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Tomate', 2, 'ud', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Pollo especiado al horno con patatas',
    categoria: 'Pollo',
    ingredientes: [
      ingrediente('Pechugas de pollo', 700, 'g', 'Carnicería'),
      ingrediente('Patatas', 0.8, 'kg', 'Fruta y verdura'),
      ingrediente('Pimentón dulce', 0.05, 'envase', 'Especias'),
      ingrediente('Ajo', 3, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Pizza de atún',
    categoria: 'Pizza',
    ingredientes: [
      ingrediente('Bases de pizza', 1, 'ud', 'Panadería'),
      ingrediente('Tomate para pizza', 0.5, 'bote', 'Salsas'),
      ingrediente('Mozzarella rallada', 125, 'g', 'Lácteos y huevos'),
      ingrediente('Atún', 2, 'lata', 'Despensa'),
    ],
  },
];
