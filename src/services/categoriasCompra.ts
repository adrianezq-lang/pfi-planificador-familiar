import type { LineaCompra } from '../motor/compra';

export const ORDEN_SECCIONES_COMPRA = [
  'Fruta y Verdura',
  'Charcutería y Quesos',
  'Carnicería',
  'Pescadería',
  'Lácteos y Huevos',
  'Panadería',
  'Congelados',
  'Arroz, Pasta y Legumbres',
  'Conservas',
  'Salsas, Aceites y Especias',
  'Desayuno y Dulces',
  'Aperitivos',
  'Bebidas',
  'Platos Preparados',
  'Limpieza y Hogar',
  'Higiene y Cuidado',
  'Bebé',
  'Mascotas',
  'Otros',
];

function normalizarTextoCategoria(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MAPA_SECCIONES_MERCADONA: Record<string, string> = {
  'fruta y verdura': 'Fruta y Verdura',
  'charcuteria y quesos': 'Charcutería y Quesos',
  carne: 'Carnicería',
  'marisco y pescado': 'Pescadería',
  'huevos leche y mantequilla': 'Lácteos y Huevos',
  'postres y yogures': 'Lácteos y Huevos',
  'panaderia y pasteleria': 'Panadería',
  congelados: 'Congelados',
  'arroz legumbres y pasta': 'Arroz, Pasta y Legumbres',
  'conservas caldos y cremas': 'Conservas',
  'aceite especias y salsas': 'Salsas, Aceites y Especias',
  'cereales y galletas': 'Desayuno y Dulces',
  'cacao cafe e infusiones': 'Desayuno y Dulces',
  'azucar caramelos y chocolate': 'Desayuno y Dulces',
  aperitivos: 'Aperitivos',
  'agua y refrescos': 'Bebidas',
  zumos: 'Bebidas',
  bodega: 'Bebidas',
  'pizzas y platos preparados': 'Platos Preparados',
  'limpieza y hogar': 'Limpieza y Hogar',
  'cuidado facial y corporal': 'Higiene y Cuidado',
  'cuidado del cabello': 'Higiene y Cuidado',
  maquillaje: 'Higiene y Cuidado',
  'fitoterapia y parafarmacia': 'Higiene y Cuidado',
  bebe: 'Bebé',
  mascotas: 'Mascotas',
};

function seccionDesdeTextoSeccion(seccion: string): string | undefined {
  const exacta = MAPA_SECCIONES_MERCADONA[seccion];
  if (exacta) return exacta;

  if (/\b(fruta|verdura|hortaliza)\b/.test(seccion)) return 'Fruta y Verdura';
  if (/\b(charcuteria|embutido|queso)\b/.test(seccion)) {
    return 'Charcutería y Quesos';
  }
  if (/\b(carne|carniceria|pollo|pavo|cerdo|ternera)\b/.test(seccion)) {
    return 'Carnicería';
  }
  if (/\b(pescado|pescaderia|marisco)\b/.test(seccion)) return 'Pescadería';
  if (/\b(lacteo|lacteos|huevo|huevos|yogur)\b/.test(seccion)) {
    return 'Lácteos y Huevos';
  }
  if (/\b(pan|panaderia|bolleria)\b/.test(seccion)) return 'Panadería';
  if (/\b(congelado|congelados)\b/.test(seccion)) return 'Congelados';
  if (/\b(arroz|pasta|legumbre|legumbres)\b/.test(seccion)) {
    return 'Arroz, Pasta y Legumbres';
  }
  if (/\b(conserva|conservas|caldo|caldos|crema|cremas)\b/.test(seccion)) {
    return 'Conservas';
  }
  if (/\b(salsa|salsas|especia|especias|aceite)\b/.test(seccion)) {
    return 'Salsas, Aceites y Especias';
  }
  if (/\b(aperitivo|aperitivos)\b/.test(seccion)) return 'Aperitivos';
  if (/\b(bebida|bebidas|refresco|zumo|bodega)\b/.test(seccion)) return 'Bebidas';
  if (/\b(limpieza|hogar)\b/.test(seccion)) return 'Limpieza y Hogar';
  if (/\b(higiene|cuidado|cabello|maquillaje|parafarmacia)\b/.test(seccion)) {
    return 'Higiene y Cuidado';
  }
  if (/\b(bebe)\b/.test(seccion)) return 'Bebé';
  if (/\b(mascota|mascotas)\b/.test(seccion)) return 'Mascotas';

  return undefined;
}

export function obtenerSeccionCompra(linea: LineaCompra): string {
  const seccionProducto = normalizarTextoCategoria(
    linea.producto?.seccion ?? '',
  );
  const seccionIngrediente = normalizarTextoCategoria(
    linea.ingrediente.seccion,
  );

  const porProducto = seccionDesdeTextoSeccion(seccionProducto);
  if (porProducto) return porProducto;

  const porIngrediente = seccionDesdeTextoSeccion(seccionIngrediente);
  if (porIngrediente) return porIngrediente;

  const subcategoria = normalizarTextoCategoria(
    linea.producto?.subcategoria ?? '',
  );
  const nombre = normalizarTextoCategoria(
    `${linea.ingrediente.nombre} ${linea.producto?.nombre ?? ''} ${subcategoria}`,
  );

  if (/\b(jamon|chorizo|mortadela|salchichon|bacon|panceta|fuet|embutido|queso)\b/.test(nombre)) {
    return 'Charcutería y Quesos';
  }
  if (/\b(pollo|pavo|ternera|cerdo|carne|filete|chuleta|costilla|solomillo|hamburguesa|lomo fresco|pechuga)\b/.test(nombre)) {
    return 'Carnicería';
  }
  if (/\b(salmon|bacalao|lubina|dorada|merluza|pescado|marisco|gamba|langostino|almeja|calamar|sepia)\b/.test(nombre)) {
    return 'Pescadería';
  }
  if (/\b(platano|manzana|pera|naranja|sandia|melon|tomate|patata|cebolla|ajo|calabacin|zanahoria|pepino|pimiento|fruta|verdura)\b/.test(nombre)) {
    return 'Fruta y Verdura';
  }
  if (/\b(leche|yogur|huevo|mantequilla|nata)\b/.test(nombre)) {
    return 'Lácteos y Huevos';
  }
  if (/\b(pan|barra|baguette|tortilla de trigo|base de pizza)\b/.test(nombre)) {
    return 'Panadería';
  }
  if (/\b(arroz|pasta|macarron|espagueti|garbanzo|lenteja|alubia)\b/.test(nombre)) {
    return 'Arroz, Pasta y Legumbres';
  }
  if (/\b(atun|conserva|caldo|aceituna|tomate triturado|tomate frito)\b/.test(nombre)) {
    return 'Conservas';
  }
  if (/\b(aceite|salsa|ketchup|mayonesa|barbacoa|pimenton|ajo granulado|sal|pimienta|especia)\b/.test(nombre)) {
    return 'Salsas, Aceites y Especias';
  }
  if (/\b(galleta|cacao|cafe|cereal|nocilla|chocolate|azucar)\b/.test(nombre)) {
    return 'Desayuno y Dulces';
  }
  if (/\b(nacho|patata frita|aperitivo|snack)\b/.test(nombre)) return 'Aperitivos';

  return 'Otros';
}
