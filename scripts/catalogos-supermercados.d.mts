export type ProductoCatalogoServidor = Record<string, unknown>;

export function buscarCatalogo(
  tiendaId: string,
  consulta: string,
  limite?: number,
): Promise<ProductoCatalogoServidor[]>;

export function actualizarProductosCatalogo(
  items: unknown,
  concurrencia?: number,
): Promise<Record<string, unknown>[]>;

export function extraerFormatoCatalogo(
  nombre: string,
  alPeso?: boolean,
): { cantidad: number; unidad: string; modoVenta: string };

export function extraerProductosEroski(
  pagina: string,
  limite?: number,
): ProductoCatalogoServidor[];

export function extraerProductosCarrefour(
  datos: unknown,
  limite?: number,
): ProductoCatalogoServidor[];
