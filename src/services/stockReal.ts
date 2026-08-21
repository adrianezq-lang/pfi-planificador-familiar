import type { ProductoMercadonaCatalogo } from './catalogoMercadona';

export type ConfiguracionStockReal = {
  unidadContenido: string;
  contenidoPorEnvase: number;
  conversionAproximada: boolean;
};

export type ProductoConStockReal = {
  nombre: string;
  formato: string;
  stockActual: number;
  stockObjetivo: number;
  umbralAviso: number;
  unidadContenido?: string | null;
  contenidoPorEnvase?: number | null;
  conversionStockAproximada?: boolean;
};

type DatosFormato = Pick<ProductoMercadonaCatalogo, 'nombre' | 'formato'> &
  Partial<
    Pick<
      ProductoMercadonaCatalogo,
      'unidadesTotales' | 'tamanoUnidad' | 'formatoUnidad'
    >
  >;

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function numero(texto: string): number {
  return Number(texto.replace(',', '.'));
}

function aBase(cantidad: number, unidad: string): { cantidad: number; unidad: 'g' | 'ml' } | null {
  const u = normalizar(unidad);
  if (u === 'g') return { cantidad, unidad: 'g' };
  if (u === 'kg') return { cantidad: cantidad * 1000, unidad: 'g' };
  if (u === 'ml') return { cantidad, unidad: 'ml' };
  if (u === 'cl') return { cantidad: cantidad * 10, unidad: 'ml' };
  if (u === 'l') return { cantidad: cantidad * 1000, unidad: 'ml' };
  return null;
}

function contenidoPesoVolumen(formato: string): { cantidad: number; unidad: 'g' | 'ml' } | null {
  const texto = normalizar(formato);
  const multiplicador = texto.match(
    /(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l)\b/,
  );
  if (multiplicador) {
    const veces = numero(multiplicador[1]);
    const cantidad = numero(multiplicador[2]);
    const base = aBase(cantidad, multiplicador[3]);
    return base ? { cantidad: veces * base.cantidad, unidad: base.unidad } : null;
  }

  const simple = texto.match(/(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l)\b/);
  if (!simple) return null;
  return aBase(numero(simple[1]), simple[2]);
}

function unidadesDesdeFormato(formato: string): number | null {
  const texto = normalizar(formato);
  const coincidencia = texto.match(/(\d+)\s*(?:ud|uds|unidades|unidad)\b/);
  if (coincidencia) return numero(coincidencia[1]);
  const pack = texto.match(/(?:pack|paq(?:uete)?)\s*[-x]?\s*(?:de\s*)?(\d+)/);
  return pack ? numero(pack[1]) : null;
}

export function inferirConfiguracionStockReal(
  producto: DatosFormato,
): ConfiguracionStockReal {
  const nombre = normalizar(producto.nombre);
  const formato = normalizar(producto.formato);

  // Regla ya usada por PFI en Compra: una malla de ajo se aproxima a 3 cabezas.
  if (nombre.includes('ajo') && formato.includes('malla')) {
    return {
      unidadContenido: 'cabeza',
      contenidoPorEnvase: 3,
      conversionAproximada: true,
    };
  }

  const unidades =
    (typeof producto.unidadesTotales === 'number' && producto.unidadesTotales > 1
      ? producto.unidadesTotales
      : null) ?? unidadesDesdeFormato(producto.formato);

  if (nombre.includes('huevo') && unidades && unidades > 1) {
    return {
      unidadContenido: 'huevo',
      contenidoPorEnvase: unidades,
      conversionAproximada: false,
    };
  }

  const pesoVolumen = contenidoPesoVolumen(producto.formato);
  if (pesoVolumen && pesoVolumen.cantidad > 0) {
    return {
      unidadContenido: pesoVolumen.unidad,
      contenidoPorEnvase: pesoVolumen.cantidad,
      conversionAproximada: false,
    };
  }

  if (
    typeof producto.tamanoUnidad === 'number' &&
    producto.tamanoUnidad > 0 &&
    producto.formatoUnidad
  ) {
    const base = aBase(producto.tamanoUnidad, producto.formatoUnidad);
    if (base && base.cantidad > 0) {
      return {
        unidadContenido: base.unidad,
        contenidoPorEnvase: base.cantidad,
        conversionAproximada: false,
      };
    }
  }

  if (unidades && unidades > 1) {
    const unidadContenido = nombre.includes('atun') ? 'lata' : 'ud';
    return {
      unidadContenido,
      contenidoPorEnvase: unidades,
      conversionAproximada: false,
    };
  }

  return {
    unidadContenido: 'envase',
    contenidoPorEnvase: 1,
    conversionAproximada: false,
  };
}

export function configuracionStockReal(
  producto: ProductoConStockReal,
): ConfiguracionStockReal {
  const guardadaValida =
    typeof producto.unidadContenido === 'string' &&
    producto.unidadContenido.trim() &&
    typeof producto.contenidoPorEnvase === 'number' &&
    Number.isFinite(producto.contenidoPorEnvase) &&
    producto.contenidoPorEnvase > 0;

  if (guardadaValida) {
    return {
      unidadContenido: producto.unidadContenido!.trim(),
      contenidoPorEnvase: producto.contenidoPorEnvase!,
      conversionAproximada: producto.conversionStockAproximada === true,
    };
  }

  return inferirConfiguracionStockReal(producto);
}

export function cantidadRealDesdeEnvases(
  envases: number,
  configuracion: ConfiguracionStockReal,
): number {
  return Math.max(0, envases) * configuracion.contenidoPorEnvase;
}

export function envasesDesdeCantidadReal(
  cantidad: number,
  configuracion: ConfiguracionStockReal,
): number {
  if (!Number.isFinite(cantidad) || cantidad <= 0) return 0;
  return cantidad / configuracion.contenidoPorEnvase;
}

export function pasoCantidadStock(configuracion: ConfiguracionStockReal): number {
  const unidad = normalizar(configuracion.unidadContenido);
  if (unidad === 'g') return 50;
  if (unidad === 'ml') return 100;
  if (unidad === 'envase') return 0.25;
  return 1;
}

export function formatearNumeroStock(valor: number): string {
  return valor.toLocaleString('es-ES', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

export function etiquetaUnidadStock(unidad: string, cantidad: number): string {
  const u = normalizar(unidad);
  const plural = Math.abs(cantidad - 1) > 0.0001;
  const etiquetas: Record<string, [string, string]> = {
    envase: ['envase', 'envases'],
    huevo: ['huevo', 'huevos'],
    cabeza: ['cabeza', 'cabezas'],
    diente: ['diente', 'dientes'],
    lata: ['lata', 'latas'],
    racion: ['ración', 'raciones'],
    ud: ['ud', 'ud'],
    g: ['g', 'g'],
    ml: ['ml', 'ml'],
  };
  const etiqueta = etiquetas[u];
  return etiqueta ? (plural ? etiqueta[1] : etiqueta[0]) : unidad;
}

export function describirCantidadStock(
  producto: ProductoConStockReal,
  envases: number,
): { cantidad: number; unidad: string; texto: string; equivalenteEnvases: string } {
  const config = configuracionStockReal(producto);
  const cantidad = cantidadRealDesdeEnvases(envases, config);
  const unidad = etiquetaUnidadStock(config.unidadContenido, cantidad);
  return {
    cantidad,
    unidad,
    texto: `${formatearNumeroStock(cantidad)} ${unidad}`,
    equivalenteEnvases: `${formatearNumeroStock(envases)} ${etiquetaUnidadStock('envase', envases)}`,
  };
}

export const UNIDADES_STOCK_SUGERIDAS = [
  'envase',
  'huevo',
  'cabeza',
  'diente',
  'lata',
  'ud',
  'g',
  'ml',
] as const;
