export type ProyeccionStock = {
  compras: number[];
  sobrante: number;
};

export function proyectarComprasEnvases(
  necesidadesExactas: number[],
  stockInicial = 0,
): ProyeccionStock {
  let stock = Math.max(0, stockInicial);
  const compras = necesidadesExactas.map((necesidadOriginal) => {
    const necesidad = Math.max(0, necesidadOriginal);
    const envases = Math.max(0, Math.ceil(necesidad - stock - 0.000001));
    stock = Math.max(0, stock + envases - necesidad);
    return envases;
  });
  return { compras, sobrante: stock };
}

const SECCIONES_FRESCAS = new Set(['Fruta y Verdura', 'Carnicería', 'Pescadería']);

export function correspondeACompraSemanal(
  seccion: string,
  descripcionOriginal: string,
): boolean {
  const descripcion = descripcionOriginal
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/\b(tomate (triturado|frito|para pizza)|ajo (en polvo|granulado)|embutido|jamon|chorizo|mortadela|salchichon|bacon|fuet)\b/.test(descripcion)) {
    return false;
  }
  if (seccion === 'Charcutería y Quesos') return false;
  if (SECCIONES_FRESCAS.has(seccion)) return true;
  if (seccion !== 'Congelados' && seccion !== 'Otros') return false;
  return /\b(fruta|verdura|hortaliza|tomate|patata|cebolla|ajo|calabacin|zanahoria|pepino|pimiento|pollo|pavo|ternera|cerdo|carne|filete|chuleta|costilla|salmon|bacalao|lubina|dorada|pescado|marisco|gamba|langostino|almeja|calamar|sepia)\b/.test(descripcion);
}
