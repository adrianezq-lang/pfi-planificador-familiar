import type { ProductoMercadonaCatalogo } from './catalogoMercadona';

export type UnidadEnvaseManual = 'ud' | 'g' | 'kg' | 'ml' | 'l';

export type PrecioManualIngrediente = {
  ingrediente: string;
  precioEnvase: number;
  cantidadEnvase: number;
  unidadEnvase: UnidadEnvaseManual;
  tienda: string;
  seccion: string;
  actualizadoEn: string;
};

const CLAVE_PRECIOS_MANUALES = 'pfi-precios-manuales-ingredientes-v1';

export const EVENTO_PRECIOS_MANUALES_INGREDIENTES =
  'pfi-precios-manuales-ingredientes-actualizados';

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function esUnidad(valor: unknown): valor is UnidadEnvaseManual {
  return valor === 'ud' || valor === 'g' || valor === 'kg' || valor === 'ml' || valor === 'l';
}

function sanear(valor: unknown): PrecioManualIngrediente | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  const item = valor as Record<string, unknown>;
  const ingrediente = typeof item.ingrediente === 'string' ? item.ingrediente.trim() : '';
  const precioEnvase = Number(item.precioEnvase);
  const cantidadEnvase = Number(item.cantidadEnvase);
  const tienda = typeof item.tienda === 'string' ? item.tienda.trim() : '';
  if (
    !ingrediente || !tienda || !Number.isFinite(precioEnvase) || precioEnvase < 0 ||
    !Number.isFinite(cantidadEnvase) || cantidadEnvase <= 0 || !esUnidad(item.unidadEnvase)
  ) return null;

  return {
    ingrediente,
    precioEnvase,
    cantidadEnvase,
    unidadEnvase: item.unidadEnvase,
    tienda,
    seccion: typeof item.seccion === 'string' && item.seccion.trim()
      ? item.seccion.trim()
      : 'Otra tienda',
    actualizadoEn: typeof item.actualizadoEn === 'string' && item.actualizadoEn
      ? item.actualizadoEn
      : new Date().toISOString(),
  };
}

export function cargarPreciosManualesIngredientes(): PrecioManualIngrediente[] {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_PRECIOS_MANUALES) ?? '[]') as unknown;
    if (!Array.isArray(datos)) return [];
    const unicos = new Map<string, PrecioManualIngrediente>();
    datos.forEach((valor) => {
      const precio = sanear(valor);
      if (precio) unicos.set(normalizar(precio.ingrediente), precio);
    });
    return Array.from(unicos.values());
  } catch {
    return [];
  }
}

function guardar(precios: PrecioManualIngrediente[]): void {
  localStorage.setItem(CLAVE_PRECIOS_MANUALES, JSON.stringify(precios));
  window.dispatchEvent(new CustomEvent(EVENTO_PRECIOS_MANUALES_INGREDIENTES));
}

export function obtenerPrecioManualIngrediente(
  ingrediente: string,
): PrecioManualIngrediente | null {
  const clave = normalizar(ingrediente);
  return cargarPreciosManualesIngredientes().find(
    (precio) => normalizar(precio.ingrediente) === clave,
  ) ?? null;
}

export function guardarPrecioManualIngrediente(
  datos: Omit<PrecioManualIngrediente, 'actualizadoEn'>,
): PrecioManualIngrediente {
  const precio = sanear({ ...datos, actualizadoEn: new Date().toISOString() });
  if (!precio) throw new Error('Revisa el precio, el formato y la tienda.');
  const clave = normalizar(precio.ingrediente);
  const restantes = cargarPreciosManualesIngredientes().filter(
    (item) => normalizar(item.ingrediente) !== clave,
  );
  guardar([...restantes, precio]);
  return precio;
}

export function quitarPrecioManualIngrediente(ingrediente: string): void {
  const clave = normalizar(ingrediente);
  const precios = cargarPreciosManualesIngredientes();
  const siguientes = precios.filter((item) => normalizar(item.ingrediente) !== clave);
  if (siguientes.length !== precios.length) guardar(siguientes);
}

export function renombrarPrecioManualIngrediente(
  nombreAnterior: string,
  nombreNuevo: string,
): void {
  const precio = obtenerPrecioManualIngrediente(nombreAnterior);
  if (!precio || !nombreNuevo.trim() || normalizar(nombreAnterior) === normalizar(nombreNuevo)) return;
  const restantes = cargarPreciosManualesIngredientes().filter(
    (item) => normalizar(item.ingrediente) !== normalizar(nombreAnterior),
  );
  guardar([...restantes, { ...precio, ingrediente: nombreNuevo.trim() }]);
}

export function convertirPrecioManualAProducto(
  precio: PrecioManualIngrediente,
): ProductoMercadonaCatalogo {
  return {
    productoId: `manual:${normalizar(precio.ingrediente)}`,
    nombre: precio.ingrediente,
    precio: precio.precioEnvase,
    precioReferencia: null,
    formato: `${precio.cantidadEnvase.toLocaleString('es-ES')} ${precio.unidadEnvase}`,
    unidadesTotales: precio.unidadEnvase === 'ud' ? precio.cantidadEnvase : null,
    tamanoUnidad: precio.cantidadEnvase,
    formatoUnidad: precio.unidadEnvase,
    pesoAproximado: false,
    seccion: precio.seccion,
    subcategoria: 'Precio real indicado',
    imagen: null,
    url: '',
    disponible: true,
    origenPrecio: 'manual',
    tiendaPrecio: precio.tienda,
    actualizadoPrecioEn: precio.actualizadoEn,
  };
}

export function obtenerProductosConPrecioManual(): Record<string, ProductoMercadonaCatalogo> {
  return Object.fromEntries(
    cargarPreciosManualesIngredientes().map((precio) => [
      precio.ingrediente,
      convertirPrecioManualAProducto(precio),
    ]),
  );
}
