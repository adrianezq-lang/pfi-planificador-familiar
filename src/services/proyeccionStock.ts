export type ProyeccionStock = {
  compras: number[];
  sobrante: number;
};

export function proyectarComprasEnvases(
  necesidadesExactas: number[],
  stockInicial = 0,
  coberturaMaximaPorEnvase = 1,
): ProyeccionStock {
  let stock = Math.max(0, stockInicial);
  const cobertura = Math.max(1, coberturaMaximaPorEnvase);
  const compras = necesidadesExactas.map((necesidadOriginal) => {
    const necesidad = Math.max(0, necesidadOriginal);
    const deficit = Math.max(0, necesidad - stock);
    const envases = Math.max(
      0,
      Math.ceil(deficit / cobertura - 0.000001),
    );

    // El margen de cobertura solo evita comprar un segundo envase por una
    // diferencia pequeña en productos de peso variable. No se convierte en
    // stock ficticio: el sobrante real sigue calculándose con el tamaño medio
    // publicado del envase.
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
