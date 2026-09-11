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
 * Alternativas familiares de sartén, olla y airfryer. Mantienen el pimiento,
 * evitan la cebolla visible y amplían las cenas de verduras sin arroz ni pasta.
 */
export const recetasVariedadV0927: Receta[] = [
  {
    nombre: 'Lubina a la sartén con patatas y pimiento',
    categoria: 'Pescado',
    ingredientes: [
      ingrediente('Lubina', 4, 'raciones', 'Pescadería'),
      ingrediente('Patatas', 0.8, 'kg', 'Fruta y verdura'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Ajo', 3, 'dientes', 'Fruta y verdura'),
      ingrediente('Limón', 1, 'ud', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Dorada en airfryer con calabacín y pimiento',
    categoria: 'Pescado',
    ingredientes: [
      ingrediente('Dorada', 4, 'raciones', 'Pescadería'),
      ingrediente('Calabacín', 2, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Ajo', 2, 'dientes', 'Fruta y verdura'),
      ingrediente('Limón', 1, 'ud', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Pollo guisado con patatas y pimiento',
    categoria: 'Pollo',
    ingredientes: [
      ingrediente('Pechugas de pollo', 700, 'g', 'Carnicería'),
      ingrediente('Patatas', 0.8, 'kg', 'Fruta y verdura'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Zanahorias', 3, 'ud', 'Fruta y verdura'),
      ingrediente('Tomate triturado', 0.5, 'bote grande', 'Despensa'),
      ingrediente('Ajo', 2, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Salmón a la plancha con pisto suave',
    categoria: 'Pescado',
    ingredientes: [
      ingrediente('Salmón', 4, 'raciones', 'Pescadería'),
      ingrediente('Calabacín', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Berenjena', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Tomate triturado', 0.5, 'bote grande', 'Despensa'),
      ingrediente('Ajo', 2, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Bacalao a la sartén con patatas y pimiento',
    categoria: 'Pescado',
    ingredientes: [
      ingrediente('Bacalao', 4, 'raciones', 'Pescadería'),
      ingrediente('Patatas', 0.8, 'kg', 'Fruta y verdura'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Tomate', 2, 'ud', 'Fruta y verdura'),
      ingrediente('Ajo', 3, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Pavo salteado con verduras',
    categoria: 'Carne',
    ingredientes: [
      ingrediente('Pechugas de pavo fileteadas', 4, 'raciones', 'Carnicería'),
      ingrediente('Calabacín', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Zanahorias', 3, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento tricolor', 1, 'bandeja', 'Fruta y verdura'),
      ingrediente('Ajo', 2, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Lubina a la plancha con verduras salteadas',
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
    nombre: 'Wok de verduras con huevo',
    categoria: 'Verduras',
    ingredientes: [
      ingrediente('Calabacín', 2, 'ud', 'Fruta y verdura'),
      ingrediente('Zanahorias', 4, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento tricolor', 1, 'bandeja', 'Fruta y verdura'),
      ingrediente('Judías verdes', 0.5, 'kg', 'Congelados'),
      ingrediente('Huevos', 4, 'ud', 'Lácteos y huevos', true),
    ],
  },
  {
    nombre: 'Lomo al ajillo con verduras',
    categoria: 'Carne',
    ingredientes: [
      ingrediente('Lomo', 4, 'raciones', 'Carnicería'),
      ingrediente('Calabacín', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Zanahorias', 3, 'ud', 'Fruta y verdura'),
      ingrediente('Ajo', 3, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Dorada a la sartén con verduras',
    categoria: 'Pescado',
    ingredientes: [
      ingrediente('Dorada', 4, 'raciones', 'Pescadería'),
      ingrediente('Calabacín', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Tomate', 2, 'ud', 'Fruta y verdura'),
      ingrediente('Ajo', 2, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Pollo especiado en airfryer con vainas',
    categoria: 'Pollo',
    ingredientes: [
      ingrediente('Pechugas de pollo', 700, 'g', 'Carnicería'),
      ingrediente('Judías verdes', 0.8, 'kg', 'Congelados'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Ajo', 2, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Vainas salteadas con tomate y pimiento',
    categoria: 'Verduras',
    ingredientes: [
      ingrediente('Judías verdes', 0.8, 'kg', 'Congelados'),
      ingrediente('Tomate', 3, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Ajo', 2, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Calabacín a la sartén con huevo y jamón',
    categoria: 'Verduras',
    ingredientes: [
      ingrediente('Calabacín', 3, 'ud', 'Fruta y verdura'),
      ingrediente('Huevos', 6, 'ud', 'Lácteos y huevos', true),
      ingrediente('Jamón cocido', 1, 'paquete', 'Charcutería'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Pisto suave con huevo',
    categoria: 'Verduras',
    ingredientes: [
      ingrediente('Calabacín', 2, 'ud', 'Fruta y verdura'),
      ingrediente('Berenjena', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Tomate triturado', 0.5, 'bote grande', 'Despensa'),
      ingrediente('Huevos', 4, 'ud', 'Lácteos y huevos', true),
      ingrediente('Ajo', 2, 'dientes', 'Fruta y verdura'),
    ],
  },
  {
    nombre: 'Nachos con carne y pimiento a la sartén',
    categoria: 'Carne',
    ingredientes: [
      ingrediente('Nachos', 1, 'bolsa', 'Despensa'),
      ingrediente('Carne picada', 500, 'g', 'Carnicería'),
      ingrediente('Tomate frito', 0.5, 'brick', 'Despensa'),
      ingrediente('Pimiento rojo', 1, 'ud', 'Fruta y verdura'),
      ingrediente('Mozzarella rallada', 125, 'g', 'Lácteos y huevos'),
    ],
  },
];
