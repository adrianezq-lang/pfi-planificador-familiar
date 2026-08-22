export type ProductoPoliticaCompra = {
  nombre?: string;
  frecuencia?: string;
  tipo?: string;
};

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const PATRONES_MENSUALES = [
  /\bleche\b/,
  /\barroz\b/,
  /\bpasta\b/,
  /macarron/,
  /espaguet/,
  /lentej/,
  /garbanz/,
  /alub/,
  /atun/,
  /tomate frito/,
  /tomate triturado/,
  /aceite/,
  /vinagre/,
  /\bsal\b/,
  /mayonesa/,
  /ketchup/,
  /mostaza/,
  /barbacoa|\bbbq\b/,
  /pimenton/,
  /ajo (?:en polvo|granulado)/,
  /pan rallado/,
  /harina/,
  /azucar/,
  /cacao soluble|cola ?cao/,
  /galleta/,
  /aceituna/,
] as const;

const PATRONES_SEMANALES = [
  /huevo/,
  /yogur/,
] as const;

export function esCompraMensualDespensa(
  producto: ProductoPoliticaCompra | null | undefined,
  nombreAlternativo = '',
): boolean {
  const texto = normalizar(`${producto?.nombre ?? ''} ${nombreAlternativo}`);

  // Huevos y yogures se reponen semanalmente aunque estén controlados en Despensa.
  if (PATRONES_SEMANALES.some((patron) => patron.test(texto))) return false;

  // La leche es una excepción expresa: se compra toda al principio de mes.
  if (/\bleche\b/.test(texto)) return true;

  // Cualquier producto marcado manualmente como mensual siempre respeta esa decisión.
  if (producto?.frecuencia === 'mensual') return true;

  return PATRONES_MENSUALES.some((patron) => patron.test(texto));
}

export function esSemanaCompraMensual(semanaActiva: number): boolean {
  return semanaActiva === 0;
}
