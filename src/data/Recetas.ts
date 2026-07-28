export type Ingrediente = {
  nombre: string;
  cantidad: number;
  unidad: string;
  seccion: string;
  ajusteAutomatico?: boolean;
};

export type TipoReceta = 'plato' | 'postre';

export type Receta = {
  nombre: string;
  categoria: string;
  tipo?: TipoReceta;
  ingredientes: Ingrediente[];
};

export const recetas: Receta[] = [
  {
    nombre: 'Lentejas',
    categoria: 'Legumbres',
    ingredientes: [
      {
        nombre: 'Lentejas secas',
        cantidad: 500,
        unidad: 'g',
        seccion: 'Despensa',
      },
      {
        nombre: 'Zanahorias',
        cantidad: 3,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Cebolla',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Tomate',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Pimiento rojo',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
    ],
  },

  {
    nombre: 'Lomo + ensalada',
    categoria: 'Carne',
    ingredientes: [
      {
        nombre: 'Lomo',
        cantidad: 4,
        unidad: 'raciones',
        seccion: 'Carnicería',
      },
      {
        nombre: 'Tomate',
        cantidad: 0.5,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Pepino',
        cantidad: 0.5,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Atún',
        cantidad: 1,
        unidad: 'lata',
        seccion: 'Despensa',
      },
      {
        nombre: 'Aceitunas',
        cantidad: 1,
        unidad: 'ración',
        seccion: 'Despensa',
      },
    ],
  },

  {
    nombre: 'Pollo al horno + patatas',
    categoria: 'Pollo',
    ingredientes: [
      {
        nombre: 'Pollo entero',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Carnicería',
      },
      {
        nombre: 'Patatas',
        cantidad: 1,
        unidad: 'kg',
        seccion: 'Fruta y verdura',
      },
    ],
  },

  {
    nombre: 'Crema de calabacín + tortilla francesa',
    categoria: 'Cremas',
    ingredientes: [
      {
        nombre: 'Calabacín',
        cantidad: 3,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Patatas',
        cantidad: 2,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Zanahorias',
        cantidad: 2,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Cebolla',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Tomate',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Huevos',
        cantidad: 7,
        unidad: 'ud',
        seccion: 'Lácteos y huevos',
      },
    ],
  },

  {
    nombre: 'Crema de verduras + tortilla de patata',
    categoria: 'Cremas',
    ingredientes: [
      {
        nombre: 'Calabacín',
        cantidad: 2,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Zanahorias',
        cantidad: 3,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Cebolla',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Tomate',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Patatas',
        cantidad: 2,
        unidad: 'kg',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Huevos',
        cantidad: 10,
        unidad: 'ud',
        seccion: 'Lácteos y huevos',
      },
    ],
  },

  {
    nombre: 'Crema de calabaza + tortilla francesa',
    categoria: 'Cremas',
    ingredientes: [
      {
        nombre: 'Calabaza',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Calabacín',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Zanahorias',
        cantidad: 2,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Cebolla',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Tomate',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Huevos',
        cantidad: 7,
        unidad: 'ud',
        seccion: 'Lácteos y huevos',
      },
    ],
  },

  {
    nombre: 'Ensalada de pasta',
    categoria: 'Pasta',
    ingredientes: [
      {
        nombre: 'Pasta corta',
        cantidad: 500,
        unidad: 'g',
        seccion: 'Despensa',
      },
      {
        nombre: 'Atún',
        cantidad: 3,
        unidad: 'lata',
        seccion: 'Despensa',
      },
      {
        nombre: 'Huevos',
        cantidad: 4,
        unidad: 'ud',
        seccion: 'Lácteos y huevos',
      },
      {
        nombre: 'Tomate',
        cantidad: 0.5,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Pepino',
        cantidad: 0.5,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Aceitunas',
        cantidad: 1,
        unidad: 'ración',
        seccion: 'Despensa',
      },
      {
        nombre: 'Mayonesa',
        cantidad: 1,
        unidad: 'revisar',
        seccion: 'Salsas',
      },
      {
        nombre: 'Ketchup',
        cantidad: 1,
        unidad: 'revisar',
        seccion: 'Salsas',
      },
    ],
  },

  {
    nombre: 'Fajitas + nachos + guacamole',
    categoria: 'Pollo',
    ingredientes: [
      {
        nombre: 'Pechugas de pollo',
        cantidad: 2,
        unidad: 'ud',
        seccion: 'Carnicería',
      },
      {
        nombre: 'Pimiento tricolor',
        cantidad: 1,
        unidad: 'bandeja',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Tortillas de trigo',
        cantidad: 1,
        unidad: 'paquete',
        seccion: 'Despensa',
      },
      {
        nombre: 'Nachos',
        cantidad: 1,
        unidad: 'bolsa',
        seccion: 'Despensa',
      },
      {
        nombre: 'Guacamole',
        cantidad: 1,
        unidad: 'tarrina',
        seccion: 'Salsas',
      },
      {
        nombre: 'Salsa BBQ',
        cantidad: 1,
        unidad: 'revisar',
        seccion: 'Salsas',
      },
    ],
  },

  {
    nombre: 'Garbanzos fritos + arroz',
    categoria: 'Legumbres',
    ingredientes: [
      {
        nombre: 'Garbanzos cocidos',
        cantidad: 2,
        unidad: 'bote',
        seccion: 'Despensa',
      },
      {
        nombre: 'Arroz',
        cantidad: 1.5,
        unidad: 'vaso pequeño',
        seccion: 'Despensa',
      },
      {
        nombre: 'Ajo',
        cantidad: 0.5,
        unidad: 'cabeza',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Ajo en polvo',
        cantidad: 1,
        unidad: 'revisar',
        seccion: 'Especias',
      },
      {
        nombre: 'Pimentón dulce',
        cantidad: 1,
        unidad: 'revisar',
        seccion: 'Especias',
      },
      {
        nombre: 'Pimentón picante',
        cantidad: 1,
        unidad: 'revisar',
        seccion: 'Especias',
      },
    ],
  },

  {
    nombre: 'Cocido de garbanzos',
    categoria: 'Legumbres',
    ingredientes: [
      {
        nombre: 'Garbanzos secos',
        cantidad: 500,
        unidad: 'g',
        seccion: 'Despensa',
      },
      {
        nombre: 'Morcillo',
        cantidad: 500,
        unidad: 'g',
        seccion: 'Carnicería',
      },
      {
        nombre: 'Pollo',
        cantidad: 2,
        unidad: 'muslos',
        seccion: 'Carnicería',
      },
      {
        nombre: 'Chorizo',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Charcutería',
      },
      {
        nombre: 'Zanahorias',
        cantidad: 3,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Cebolla',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Tomate',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
    ],
  },

  {
    nombre: 'Alubias blancas con almejas',
    categoria: 'Legumbres',
    ingredientes: [
      {
        nombre: 'Alubias blancas secas',
        cantidad: 500,
        unidad: 'g',
        seccion: 'Despensa',
      },
      {
        nombre: 'Almejas',
        cantidad: 500,
        unidad: 'g',
        seccion: 'Pescadería',
      },
      {
        nombre: 'Cebolla',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Tomate',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Zanahorias',
        cantidad: 3,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Ajo',
        cantidad: 3,
        unidad: 'dientes',
        seccion: 'Fruta y verdura',
      },
    ],
  },

  {
    nombre: 'Alubias rojas',
    categoria: 'Legumbres',
    ingredientes: [
      {
        nombre: 'Alubias rojas secas',
        cantidad: 500,
        unidad: 'g',
        seccion: 'Despensa',
      },
      {
        nombre: 'Chorizo',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Charcutería',
      },
      {
        nombre: 'Zanahorias',
        cantidad: 3,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Cebolla',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Tomate',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
    ],
  },

  {
    nombre: 'Filete de ternera + patatas',
    categoria: 'Carne',
    ingredientes: [
      {
        nombre: 'Filetes de ternera',
        cantidad: 4,
        unidad: 'raciones',
        seccion: 'Carnicería',
      },
      {
        nombre: 'Patatas',
        cantidad: 1,
        unidad: 'kg',
        seccion: 'Fruta y verdura',
      },
    ],
  },

  {
    nombre: 'Pechugas de pavo + ensalada',
    categoria: 'Carne',
    ingredientes: [
      {
        nombre: 'Pechugas de pavo fileteadas',
        cantidad: 4,
        unidad: 'raciones',
        seccion: 'Carnicería',
      },
      {
        nombre: 'Tomate',
        cantidad: 0.5,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Pepino',
        cantidad: 0.5,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Atún',
        cantidad: 1,
        unidad: 'lata',
        seccion: 'Despensa',
      },
      {
        nombre: 'Aceitunas',
        cantidad: 1,
        unidad: 'ración',
        seccion: 'Despensa',
      },
    ],
  },

  {
    nombre: 'Pechugas de pavo + patatas',
    categoria: 'Carne',
    ingredientes: [
      {
        nombre: 'Pechugas de pavo fileteadas',
        cantidad: 4,
        unidad: 'raciones',
        seccion: 'Carnicería',
      },
      {
        nombre: 'Patatas',
        cantidad: 1,
        unidad: 'kg',
        seccion: 'Fruta y verdura',
      },
    ],
  },

  {
    nombre: 'Pechugas de pollo + arroz',
    categoria: 'Pollo',
    ingredientes: [
      {
        nombre: 'Pechugas de pollo',
        cantidad: 2,
        unidad: 'ud',
        seccion: 'Carnicería',
      },
      {
        nombre: 'Arroz',
        cantidad: 1.5,
        unidad: 'vaso pequeño',
        seccion: 'Despensa',
      },
    ],
  },

  {
    nombre: 'Arroz con pollo',
    categoria: 'Arroz',
    ingredientes: [
      {
        nombre: 'Arroz',
        cantidad: 1.5,
        unidad: 'vaso grande',
        seccion: 'Despensa',
      },
      {
        nombre: 'Pollo',
        cantidad: 4,
        unidad: 'raciones',
        seccion: 'Carnicería',
      },
      {
        nombre: 'Zanahorias',
        cantidad: 2,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Cebolla',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Tomate',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
    ],
  },

  {
    nombre: 'Arroz con huevo y tomate',
    categoria: 'Arroz',
    ingredientes: [
      {
        nombre: 'Arroz',
        cantidad: 1.5,
        unidad: 'vaso grande',
        seccion: 'Despensa',
      },
      {
        nombre: 'Huevos',
        cantidad: 4,
        unidad: 'ud',
        seccion: 'Lácteos y huevos',
      },
      {
        nombre: 'Tomate frito',
        cantidad: 1,
        unidad: 'brick',
        seccion: 'Despensa',
      },
    ],
  },

  {
    nombre: 'Macarrones boloñesa',
    categoria: 'Pasta',
    ingredientes: [
      {
        nombre: 'Pasta corta',
        cantidad: 500,
        unidad: 'g',
        seccion: 'Despensa',
      },
      {
        nombre: 'Carne picada',
        cantidad: 600,
        unidad: 'g',
        seccion: 'Carnicería',
      },
      {
        nombre: 'Tomate triturado',
        cantidad: 1,
        unidad: 'bote grande',
        seccion: 'Despensa',
      },
      {
        nombre: 'Queso rallado',
        cantidad: 1,
        unidad: 'bolsa',
        seccion: 'Lácteos y huevos',
      },
    ],
  },

  {
    nombre: 'Macarrones con chorizo',
    categoria: 'Pasta',
    ingredientes: [
      {
        nombre: 'Pasta corta',
        cantidad: 500,
        unidad: 'g',
        seccion: 'Despensa',
      },
      {
        nombre: 'Chorizo',
        cantidad: 1,
        unidad: 'sarta',
        seccion: 'Charcutería',
      },
      {
        nombre: 'Tomate frito',
        cantidad: 1.5,
        unidad: 'brick',
        seccion: 'Despensa',
      },
      {
        nombre: 'Huevos',
        cantidad: 4,
        unidad: 'ud',
        seccion: 'Lácteos y huevos',
      },
    ],
  },

  {
    nombre: 'Carbonara tradicional',
    categoria: 'Pasta',
    ingredientes: [
      {
        nombre: 'Espaguetis',
        cantidad: 500,
        unidad: 'g',
        seccion: 'Despensa',
      },
      {
        nombre: 'Huevos',
        cantidad: 4,
        unidad: 'ud',
        seccion: 'Lácteos y huevos',
      },
      {
        nombre: 'Bacon',
        cantidad: 1,
        unidad: 'barqueta',
        seccion: 'Charcutería',
      },
      {
        nombre: 'Queso curado',
        cantidad: 1,
        unidad: 'cuña',
        seccion: 'Lácteos y huevos',
      },
    ],
  },

  {
    nombre: 'Macarrones con roquefort',
    categoria: 'Pasta',
    ingredientes: [
      {
        nombre: 'Pasta corta',
        cantidad: 500,
        unidad: 'g',
        seccion: 'Despensa',
      },
      {
        nombre: 'Nata para cocinar',
        cantidad: 1,
        unidad: 'brick',
        seccion: 'Lácteos y huevos',
      },
      {
        nombre: 'Queso roquefort',
        cantidad: 1,
        unidad: 'cuña',
        seccion: 'Lácteos y huevos',
      },
    ],
  },

  {
    nombre: 'Pizza jamón y queso + BBQ',
    categoria: 'Pizza',
    ingredientes: [
      {
        nombre: 'Bases de pizza',
        cantidad: 2,
        unidad: 'ud',
        seccion: 'Panadería',
      },
      {
        nombre: 'Tomate para pizza',
        cantidad: 1,
        unidad: 'bote',
        seccion: 'Salsas',
      },
      {
        nombre: 'Mozzarella rallada',
        cantidad: 1,
        unidad: 'bolsa',
        seccion: 'Lácteos y huevos',
      },
      {
        nombre: 'Queso rallado',
        cantidad: 1,
        unidad: 'bolsa',
        seccion: 'Lácteos y huevos',
      },
      {
        nombre: 'Jamón cocido',
        cantidad: 1,
        unidad: 'paquete',
        seccion: 'Charcutería',
      },
      {
        nombre: 'Bacon',
        cantidad: 1,
        unidad: 'barqueta',
        seccion: 'Charcutería',
      },
      {
        nombre: 'Carne picada',
        cantidad: 150,
        unidad: 'g',
        seccion: 'Carnicería',
      },
      {
        nombre: 'Salsa BBQ',
        cantidad: 1,
        unidad: 'revisar',
        seccion: 'Salsas',
      },
    ],
  },

  {
    nombre: 'Pizza BBQ + cuatro quesos',
    categoria: 'Pizza',
    ingredientes: [
      {
        nombre: 'Bases de pizza',
        cantidad: 2,
        unidad: 'ud',
        seccion: 'Panadería',
      },
      {
        nombre: 'Tomate para pizza',
        cantidad: 1,
        unidad: 'bote',
        seccion: 'Salsas',
      },
      {
        nombre: 'Mozzarella rallada',
        cantidad: 1,
        unidad: 'bolsa',
        seccion: 'Lácteos y huevos',
      },
      {
        nombre: 'Queso rallado',
        cantidad: 1,
        unidad: 'bolsa',
        seccion: 'Lácteos y huevos',
      },
      {
        nombre: 'Mezcla cuatro quesos',
        cantidad: 1,
        unidad: 'bolsa',
        seccion: 'Lácteos y huevos',
      },
      {
        nombre: 'Queso roquefort',
        cantidad: 1,
        unidad: 'cuña',
        seccion: 'Lácteos y huevos',
      },
      {
        nombre: 'Bacon',
        cantidad: 1,
        unidad: 'barqueta',
        seccion: 'Charcutería',
      },
      {
        nombre: 'Carne picada',
        cantidad: 150,
        unidad: 'g',
        seccion: 'Carnicería',
      },
      {
        nombre: 'Salsa BBQ',
        cantidad: 1,
        unidad: 'revisar',
        seccion: 'Salsas',
      },
    ],
  },

  {
    nombre: 'Salmón + arroz',
    categoria: 'Pescado',
    ingredientes: [
      {
        nombre: 'Salmón',
        cantidad: 0.5,
        unidad: 'pieza',
        seccion: 'Pescadería',
      },
      {
        nombre: 'Arroz',
        cantidad: 1.5,
        unidad: 'vaso pequeño',
        seccion: 'Despensa',
      },
    ],
  },

  {
    nombre: 'Salmón + patatas',
    categoria: 'Pescado',
    ingredientes: [
      {
        nombre: 'Salmón',
        cantidad: 0.5,
        unidad: 'pieza',
        seccion: 'Pescadería',
      },
      {
        nombre: 'Patatas',
        cantidad: 1,
        unidad: 'kg',
        seccion: 'Fruta y verdura',
      },
    ],
  },

  {
    nombre: 'Lubina + patatas',
    categoria: 'Pescado',
    ingredientes: [
      {
        nombre: 'Lubina',
        cantidad: 4,
        unidad: 'raciones',
        seccion: 'Pescadería',
      },
      {
        nombre: 'Patatas',
        cantidad: 1,
        unidad: 'kg',
        seccion: 'Fruta y verdura',
      },
    ],
  },

  {
    nombre: 'Dorada + patatas',
    categoria: 'Pescado',
    ingredientes: [
      {
        nombre: 'Dorada',
        cantidad: 4,
        unidad: 'raciones',
        seccion: 'Pescadería',
      },
      {
        nombre: 'Patatas',
        cantidad: 1,
        unidad: 'kg',
        seccion: 'Fruta y verdura',
      },
    ],
  },

  {
    nombre: 'Bacalao + patatas',
    categoria: 'Pescado',
    ingredientes: [
      {
        nombre: 'Bacalao',
        cantidad: 4,
        unidad: 'raciones',
        seccion: 'Pescadería',
      },
      {
        nombre: 'Patatas',
        cantidad: 1,
        unidad: 'kg',
        seccion: 'Fruta y verdura',
      },
    ],
  },

  {
    nombre: 'Hamburguesas',
    categoria: 'Carne',
    ingredientes: [
      {
        nombre: 'Hamburguesas',
        cantidad: 4,
        unidad: 'ud',
        seccion: 'Carnicería',
      },
      {
        nombre: 'Pan de hamburguesa',
        cantidad: 4,
        unidad: 'ud',
        seccion: 'Panadería',
      },
      {
        nombre: 'Bacon',
        cantidad: 1,
        unidad: 'paquete',
        seccion: 'Charcutería',
      },
      {
        nombre: 'Queso en lonchas',
        cantidad: 4,
        unidad: 'lonchas',
        seccion: 'Lácteos y huevos',
      },
      {
        nombre: 'Tomate',
        cantidad: 0.5,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
    ],
  },

  {
    nombre: 'Perritos calientes',
    categoria: 'Carne',
    ingredientes: [
      {
        nombre: 'Salchichas',
        cantidad: 4,
        unidad: 'ud',
        seccion: 'Charcutería',
      },
      {
        nombre: 'Pan de perrito',
        cantidad: 4,
        unidad: 'ud',
        seccion: 'Panadería',
      },
      {
        nombre: 'Queso en lonchas',
        cantidad: 4,
        unidad: 'lonchas',
        seccion: 'Lácteos y huevos',
      },
      {
        nombre: 'Ketchup',
        cantidad: 1,
        unidad: 'revisar',
        seccion: 'Salsas',
      },
      {
        nombre: 'Mostaza',
        cantidad: 1,
        unidad: 'revisar',
        seccion: 'Salsas',
      },
    ],
  },

  {
    nombre: 'Kebab',
    categoria: 'Pollo',
    ingredientes: [
      {
        nombre: 'Pechugas de pollo',
        cantidad: 650,
        unidad: 'g',
        seccion: 'Carnicería',
      },
      {
        nombre: 'Tortillas de trigo',
        cantidad: 4,
        unidad: 'ud',
        seccion: 'Panadería',
      },
      {
        nombre: 'Tomate',
        cantidad: 2,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Salsa yogur',
        cantidad: 1,
        unidad: 'revisar',
        seccion: 'Salsas',
      },
      {
        nombre: 'Especias kebab',
        cantidad: 1,
        unidad: 'revisar',
        seccion: 'Despensa',
      },
    ],
  },

  {
    nombre: 'Tortilla de patata',
    categoria: 'Huevos',
    ingredientes: [
      {
        nombre: 'Patatas',
        cantidad: 2,
        unidad: 'kg',
        seccion: 'Fruta y verdura',
      },
      {
        nombre: 'Huevos',
        cantidad: 10,
        unidad: 'ud',
        seccion: 'Lácteos y huevos',
      },
    ],
  },

  {
    nombre: 'Sandía',
    categoria: 'Postres',
    tipo: 'postre',
    ingredientes: [
      {
        nombre: 'Media sandía',
        cantidad: 0.25,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
      },
    ],
  },

  {
    nombre: 'Plátano',
    categoria: 'Postres',
    tipo: 'postre',
    ingredientes: [
      {
        nombre: 'Plátanos',
        cantidad: 4,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
        ajusteAutomatico: true,
      },
    ],
  },

  {
    nombre: 'Manzana',
    categoria: 'Postres',
    tipo: 'postre',
    ingredientes: [
      {
        nombre: 'Manzanas',
        cantidad: 4,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
        ajusteAutomatico: true,
      },
    ],
  },

  {
    nombre: 'Pera',
    categoria: 'Postres',
    tipo: 'postre',
    ingredientes: [
      {
        nombre: 'Peras',
        cantidad: 4,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
        ajusteAutomatico: true,
      },
    ],
  },

  {
    nombre: 'Naranja',
    categoria: 'Postres',
    tipo: 'postre',
    ingredientes: [
      {
        nombre: 'Naranjas',
        cantidad: 4,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
        ajusteAutomatico: true,
      },
    ],
  },

  {
    nombre: 'Fruta variada',
    categoria: 'Postres',
    tipo: 'postre',
    ingredientes: [
      {
        nombre: 'Fruta variada',
        cantidad: 4,
        unidad: 'ud',
        seccion: 'Fruta y verdura',
        ajusteAutomatico: true,
      },
    ],
  },

  {
    nombre: 'Yogur natural',
    categoria: 'Postres',
    tipo: 'postre',
    ingredientes: [
      {
        nombre: 'Yogures naturales',
        cantidad: 4,
        unidad: 'ud',
        seccion: 'Lácteos y huevos',
        ajusteAutomatico: true,
      },
    ],
  },

];