import {
  añadirProductoDespensa,
  type ProductoDespensa,
} from './despensa.ts';
import { registrarCompra } from './inventario.ts';
import type { PeriodoCompra } from './registroCompra.ts';

export type UnidadProductoManual =
  | 'ud'
  | 'envase'
  | 'paquete'
  | 'kg'
  | 'g'
  | 'l'
  | 'ml';

export type ProductoManualCompra = {
  id: string;
  periodoId: string;
  nombre: string;
  cantidad: number;
  unidad: UnidadProductoManual;
  tienda: string;
  precioTotal: number | null;
  comprado: boolean;
  guardadoEnDespensa: boolean;
  creadoEn: string;
};

export type NuevoProductoManualCompra = Pick<
  ProductoManualCompra,
  'periodoId' | 'nombre' | 'cantidad' | 'unidad' | 'tienda' | 'precioTotal'
>;

const CLAVE_PRODUCTOS_MANUALES = 'pfi-compra-manual-v1';
const UNIDADES: UnidadProductoManual[] = [
  'ud',
  'envase',
  'paquete',
  'kg',
  'g',
  'l',
  'ml',
];

function crearId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function textoLimpio(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
}

function numeroPositivo(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0
    ? valor
    : null;
}

function esUnidad(valor: unknown): valor is UnidadProductoManual {
  return UNIDADES.includes(valor as UnidadProductoManual);
}

function normalizarProducto(valor: unknown): ProductoManualCompra | null {
  if (!valor || typeof valor !== 'object') return null;
  const producto = valor as Partial<ProductoManualCompra>;
  const cantidad = numeroPositivo(producto.cantidad);
  const nombre = textoLimpio(producto.nombre);
  const periodoId = textoLimpio(producto.periodoId);

  if (
    typeof producto.id !== 'string' ||
    !periodoId ||
    !nombre ||
    cantidad === null ||
    !esUnidad(producto.unidad)
  ) {
    return null;
  }

  const precio = producto.precioTotal;

  return {
    id: producto.id,
    periodoId,
    nombre,
    cantidad,
    unidad: producto.unidad,
    tienda: textoLimpio(producto.tienda) || 'Otra tienda',
    precioTotal:
      typeof precio === 'number' && Number.isFinite(precio) && precio >= 0
        ? precio
        : null,
    comprado: producto.comprado === true,
    guardadoEnDespensa: producto.guardadoEnDespensa === true,
    creadoEn:
      typeof producto.creadoEn === 'string'
        ? producto.creadoEn
        : new Date().toISOString(),
  };
}

export function crearPeriodoIdCompraManual(
  periodo: PeriodoCompra,
  mes: string,
  semanaActiva: number,
): string {
  return periodo === 'semana'
    ? `${mes}-semana-${semanaActiva + 1}`
    : `${mes}-mes`;
}

export function cargarProductosManualesCompra(): ProductoManualCompra[] {
  try {
    const valor = JSON.parse(
      localStorage.getItem(CLAVE_PRODUCTOS_MANUALES) ?? '[]',
    ) as unknown;

    if (!Array.isArray(valor)) return [];

    return valor
      .map(normalizarProducto)
      .filter(
        (producto): producto is ProductoManualCompra => producto !== null,
      );
  } catch {
    return [];
  }
}

function guardarProductosManualesCompra(
  productos: ProductoManualCompra[],
): ProductoManualCompra[] {
  localStorage.setItem(CLAVE_PRODUCTOS_MANUALES, JSON.stringify(productos));
  return productos;
}

export function añadirProductoManualCompra(
  nuevo: NuevoProductoManualCompra,
): ProductoManualCompra[] {
  const nombre = textoLimpio(nuevo.nombre);
  const cantidad = numeroPositivo(nuevo.cantidad);

  if (!nombre || cantidad === null || !esUnidad(nuevo.unidad)) {
    throw new Error('Revisa el nombre y la cantidad.');
  }

  const precioTotal = nuevo.precioTotal;
  if (
    precioTotal !== null &&
    (!Number.isFinite(precioTotal) || precioTotal < 0)
  ) {
    throw new Error('El precio no es válido.');
  }

  const producto: ProductoManualCompra = {
    id: crearId(),
    periodoId: nuevo.periodoId,
    nombre,
    cantidad,
    unidad: nuevo.unidad,
    tienda: textoLimpio(nuevo.tienda) || 'Otra tienda',
    precioTotal,
    comprado: false,
    guardadoEnDespensa: false,
    creadoEn: new Date().toISOString(),
  };

  return guardarProductosManualesCompra([
    ...cargarProductosManualesCompra(),
    producto,
  ]);
}

export function marcarProductoManualCompra(
  id: string,
  comprado: boolean,
): ProductoManualCompra[] {
  const productos = cargarProductosManualesCompra().map((producto) =>
    producto.id === id && !producto.guardadoEnDespensa
      ? { ...producto, comprado }
      : producto,
  );
  return guardarProductosManualesCompra(productos);
}

export function marcarTodosProductosManualesCompra(
  periodoId: string,
): ProductoManualCompra[] {
  const productos = cargarProductosManualesCompra().map((producto) =>
    producto.periodoId === periodoId && !producto.guardadoEnDespensa
      ? { ...producto, comprado: true }
      : producto,
  );
  return guardarProductosManualesCompra(productos);
}

export function eliminarProductoManualCompra(
  id: string,
): ProductoManualCompra[] {
  return guardarProductosManualesCompra(
    cargarProductosManualesCompra().filter((producto) => producto.id !== id),
  );
}

function claveTexto(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function datosDespensa(
  producto: ProductoManualCompra,
): Omit<ProductoDespensa, 'id' | 'actualizado'> {
  const tiendaId = `manual:${claveTexto(producto.tienda) || 'otra-tienda'}`;
  const precioUnidad = producto.precioTotal === null
    ? null
    : producto.precioTotal / producto.cantidad;

  return {
    productoId: `manual:${claveTexto(producto.nombre)}:${producto.unidad}`,
    nombre: producto.nombre,
    imagen: null,
    formato: producto.unidad,
    precio: precioUnidad,
    stockActual: 0,
    stockEsAproximado: false,
    stockMinimo: 0,
    unidad: producto.unidad,
    frecuencia: 'manual',
    tipo: 'despensa',
    ultimaCompraTiendaId: tiendaId,
    ultimaCompraTienda: producto.tienda,
    ultimoProductoComprado: producto.nombre,
    ultimoPrecioCompra: precioUnidad,
    ultimaCompraEn: new Date().toISOString(),
  };
}

export function registrarProductosManualesEnDespensa(
  periodoId: string,
  observaciones: string,
): { productos: ProductoManualCompra[]; registrados: number } {
  const actuales = cargarProductosManualesCompra();
  const pendientes = actuales.filter(
    (producto) =>
      producto.periodoId === periodoId &&
      producto.comprado &&
      !producto.guardadoEnDespensa,
  );

  pendientes.forEach((producto) => {
    const datos = datosDespensa(producto);
    añadirProductoDespensa(datos);
    registrarCompra(
      datos.productoId,
      producto.cantidad,
      `${observaciones} · ${producto.tienda}`,
    );
  });

  const idsRegistrados = new Set(pendientes.map((producto) => producto.id));
  const productos = actuales.map((producto) =>
    idsRegistrados.has(producto.id)
      ? { ...producto, guardadoEnDespensa: true }
      : producto,
  );

  return {
    productos: guardarProductosManualesCompra(productos),
    registrados: pendientes.length,
  };
}
