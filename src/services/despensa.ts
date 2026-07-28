import type { Receta } from '../data/Recetas.ts';
import {
  cargarCatalogoMercadona,
  type ProductoMercadonaCatalogo,
} from './catalogoMercadona.ts';
import { cargarAsociacionesIngredientes } from './asociacionesIngredientes.ts';
import {
  movimientosProducto,
  obtenerStockActual,
  registrarAjusteStock,
} from './inventario.ts';

export type FrecuenciaDespensa =
  | 'semanal'
  | 'mensual'
  | 'cuando-falte'
  | 'manual';

export type TipoProductoDespensa =
  | 'despensa'
  | 'perecedero';

export type ProductoDespensa = {
  id: string;
  productoId: string;
  nombre: string;
  imagen: string | null;
  formato: string;
  precio: number | null;
  stockActual: number;
  stockObjetivo: number;
  unidad: string;
  frecuencia: FrecuenciaDespensa;
  tipo: TipoProductoDespensa;
  umbralAviso: number;
  actualizado: string;
};

const CLAVE_DESPENSA =
  'pfi-despensa-productos';
export const EVENTO_DESPENSA =
  'pfi:despensa-actualizada';

function crearId(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function emitirCambio(): void {
  window.dispatchEvent(
    new Event(EVENTO_DESPENSA),
  );
}

function normalizarProductoGuardado(
  producto: Partial<ProductoDespensa>,
): ProductoDespensa | null {
  if (
    typeof producto.id !== 'string' ||
    typeof producto.productoId !== 'string' ||
    typeof producto.nombre !== 'string'
  ) {
    return null;
  }

  return {
    id: producto.id,
    productoId: producto.productoId,
    nombre: producto.nombre,
    imagen:
      typeof producto.imagen === 'string'
        ? producto.imagen
        : null,
    formato:
      typeof producto.formato === 'string'
        ? producto.formato
        : 'Envase',
    precio:
      typeof producto.precio === 'number'
        ? producto.precio
        : null,
    stockActual:
      typeof producto.stockActual === 'number'
        ? Math.max(0, producto.stockActual)
        : 0,
    stockObjetivo:
      typeof producto.stockObjetivo === 'number'
        ? Math.max(0, producto.stockObjetivo)
        : 0,
    unidad:
      typeof producto.unidad === 'string'
        ? producto.unidad
        : 'envase',
    frecuencia:
      producto.frecuencia === 'semanal' ||
      producto.frecuencia === 'mensual' ||
      producto.frecuencia === 'cuando-falte' ||
      producto.frecuencia === 'manual'
        ? producto.frecuencia
        : 'manual',
    tipo:
      producto.tipo === 'perecedero'
        ? 'perecedero'
        : 'despensa',
    umbralAviso:
      typeof producto.umbralAviso === 'number'
        ? Math.max(0, producto.umbralAviso)
        : 0,
    actualizado:
      typeof producto.actualizado === 'string'
        ? producto.actualizado
        : new Date().toISOString(),
  };
}

function cargarDatosGuardados(): ProductoDespensa[] {
  try {
    const guardado = localStorage.getItem(
      CLAVE_DESPENSA,
    );

    if (!guardado) {
      return [];
    }

    const datos = JSON.parse(guardado) as unknown;

    if (!Array.isArray(datos)) {
      return [];
    }

    return datos
      .map((producto) =>
        normalizarProductoGuardado(
          producto as Partial<ProductoDespensa>,
        ),
      )
      .filter(
        (
          producto,
        ): producto is ProductoDespensa =>
          producto !== null,
      );
  } catch {
    return [];
  }
}

function migrarStockAntiguo(
  productos: ProductoDespensa[],
): void {
  productos.forEach((producto) => {
    if (
      producto.stockActual > 0 &&
      movimientosProducto(producto.productoId).length === 0
    ) {
      registrarAjusteStock(
        producto.productoId,
        producto.stockActual,
        'Migración del stock de la versión anterior',
      );
    }
  });
}

export function cargarDespensa(): ProductoDespensa[] {
  const productos = cargarDatosGuardados();
  migrarStockAntiguo(productos);

  return productos.map((producto) => ({
    ...producto,
    stockActual: Math.max(
      0,
      obtenerStockActual(producto.productoId),
    ),
  }));
}

export function guardarDespensa(
  productos: ProductoDespensa[],
): void {
  const sinStockCalculado = productos.map(
    (producto) => ({
      ...producto,
      stockActual: Math.max(
        0,
        obtenerStockActual(producto.productoId),
      ),
    }),
  );

  localStorage.setItem(
    CLAVE_DESPENSA,
    JSON.stringify(sinStockCalculado),
  );
  emitirCambio();
}

export function añadirProductoDespensa(
  producto: Omit<
    ProductoDespensa,
    'id' | 'actualizado'
  >,
): ProductoDespensa[] {
  const productos = cargarDespensa();
  const actualizado = new Date().toISOString();
  const existente = productos.find(
    (elemento) =>
      elemento.productoId === producto.productoId,
  );

  if (
    producto.stockActual > 0 &&
    movimientosProducto(producto.productoId).length === 0
  ) {
    registrarAjusteStock(
      producto.productoId,
      producto.stockActual,
      'Stock inicial',
    );
  }

  const nuevosProductos = existente
    ? productos.map((elemento) =>
        elemento.productoId === producto.productoId
          ? {
              ...elemento,
              ...producto,
              stockActual: Math.max(
                0,
                obtenerStockActual(producto.productoId),
              ),
              actualizado,
            }
          : elemento,
      )
    : [
        ...productos,
        {
          ...producto,
          id: crearId(),
          stockActual: Math.max(
            0,
            obtenerStockActual(producto.productoId),
          ),
          actualizado,
        },
      ];

  guardarDespensa(nuevosProductos);
  return cargarDespensa();
}

function datosProductoDespensaDesdeCatalogo(
  producto: ProductoMercadonaCatalogo,
): Omit<ProductoDespensa, 'id' | 'actualizado'> {
  const seccion = producto.seccion.toLocaleLowerCase('es');
  const esPerecedero = [
    'fruta',
    'verdura',
    'carnicer',
    'pescader',
    'panader',
    'charcuter',
  ].some((termino) => seccion.includes(termino));

  return {
    productoId: producto.productoId,
    nombre: producto.nombre,
    imagen: producto.imagen,
    formato: producto.formato,
    precio: producto.precio,
    stockActual: 0,
    stockObjetivo: esPerecedero ? 0 : 1,
    unidad: 'envase',
    frecuencia: esPerecedero
      ? 'semanal'
      : 'cuando-falte',
    tipo: esPerecedero
      ? 'perecedero'
      : 'despensa',
    umbralAviso: 0,
  };
}

export function crearProductosDespensaDesdeCatalogo(
  productosCatalogo: ProductoMercadonaCatalogo[],
): ProductoDespensa[] {
  const productos = cargarDespensa();
  const idsExistentes = new Set(
    productos.map((producto) => producto.productoId),
  );
  const actualizado = new Date().toISOString();
  const nuevos = productosCatalogo
    .filter((producto) => !idsExistentes.has(producto.productoId))
    .map((producto) => ({
      ...datosProductoDespensaDesdeCatalogo(producto),
      id: crearId(),
      actualizado,
    }));

  if (nuevos.length === 0) return productos;

  guardarDespensa([...productos, ...nuevos]);
  return cargarDespensa();
}

export function crearProductoDespensaDesdeCatalogo(
  producto: ProductoMercadonaCatalogo,
): ProductoDespensa[] {
  return crearProductosDespensaDesdeCatalogo([producto]);
}



export async function sincronizarProductosRecetasConDespensa(
  recetas: Receta[],
): Promise<number> {
  const asociaciones = cargarAsociacionesIngredientes();
  const idsNecesarios = new Set(
    recetas.flatMap((receta) =>
      receta.ingredientes
        .map((ingrediente) => asociaciones[ingrediente.nombre])
        .filter((productoId): productoId is string => Boolean(productoId)),
    ),
  );

  if (idsNecesarios.size === 0) return 0;

  const existentes = new Set(
    cargarDespensa().map((producto) => producto.productoId),
  );
  const idsPendientes = Array.from(idsNecesarios).filter(
    (productoId) => !existentes.has(productoId),
  );

  if (idsPendientes.length === 0) return 0;

  const catalogo = await cargarCatalogoMercadona();
  const productosPorId = new Map(
    catalogo.productos.map((producto) => [producto.productoId, producto]),
  );

  const productosNuevos = idsPendientes
    .map((productoId) => productosPorId.get(productoId))
    .filter(
      (producto): producto is ProductoMercadonaCatalogo => Boolean(producto),
    );

  crearProductosDespensaDesdeCatalogo(productosNuevos);
  return productosNuevos.length;
}

export function actualizarProductoDespensa(
  id: string,
  cambios: Partial<
    Omit<ProductoDespensa, 'id' | 'productoId'>
  >,
): ProductoDespensa[] {
  const productos = cargarDespensa();
  const producto = productos.find(
    (elemento) => elemento.id === id,
  );

  if (!producto) {
    return productos;
  }

  if (
    typeof cambios.stockActual === 'number' &&
    cambios.stockActual !== producto.stockActual
  ) {
    registrarAjusteStock(
      producto.productoId,
      cambios.stockActual,
    );
  }

  const nuevosProductos = productos.map(
    (elemento) =>
      elemento.id === id
        ? {
            ...elemento,
            ...cambios,
            stockActual: Math.max(
              0,
              obtenerStockActual(elemento.productoId),
            ),
            actualizado: new Date().toISOString(),
          }
        : elemento,
  );

  guardarDespensa(nuevosProductos);
  return cargarDespensa();
}

export function actualizarStockProductoDespensa(
  productoId: string,
  stockActual: number,
): ProductoDespensa[] {
  registrarAjusteStock(
    productoId,
    stockActual,
  );

  const productos = cargarDespensa();
  guardarDespensa(productos);
  return cargarDespensa();
}

export function eliminarProductoDespensa(
  id: string,
): ProductoDespensa[] {
  const nuevosProductos = cargarDespensa().filter(
    (producto) => producto.id !== id,
  );

  guardarDespensa(nuevosProductos);
  return nuevosProductos;
}

export function buscarProductoDespensa(
  productoId: string,
): ProductoDespensa | undefined {
  return cargarDespensa().find(
    (producto) => producto.productoId === productoId,
  );
}

export function productoEstaEnDespensa(
  productoId: string,
): boolean {
  return Boolean(buscarProductoDespensa(productoId));
}

export function calcularReposicion(
  producto: ProductoDespensa,
): number {
  if (
    producto.tipo === 'perecedero' ||
    producto.frecuencia === 'manual'
  ) {
    return 0;
  }

  return Math.max(
    0,
    producto.stockObjetivo - producto.stockActual,
  );
}

export function necesitaReposicion(
  producto: ProductoDespensa,
): boolean {
  if (
    producto.tipo === 'perecedero' ||
    producto.frecuencia === 'manual'
  ) {
    return false;
  }

  return (
    producto.stockActual <= producto.umbralAviso &&
    calcularReposicion(producto) > 0
  );
}

export function calcularCosteReposicion(
  producto: ProductoDespensa,
): number | null {
  if (
    producto.precio === null ||
    producto.tipo === 'perecedero'
  ) {
    return null;
  }

  return calcularReposicion(producto) * producto.precio;
}
