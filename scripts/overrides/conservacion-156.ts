export type TipoConservacion = 'abierto' | 'congelado' | 'sobra';

export type ItemConservacion = {
  id: string;
  tipo: TipoConservacion;
  nombre: string;
  cantidad: number;
  unidad: string;
  fechaAlta: string;
  fechaLimite?: string;
  notas?: string;
  productoId?: string;
  origen?: string;
};

const CLAVE = 'pfi-conservacion-v156';
export const EVENTO_CONSERVACION = 'pfi:conservacion-actualizada';

function crearId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function diasPorDefecto(tipo: TipoConservacion): number {
  if (tipo === 'sobra') return 3;
  if (tipo === 'abierto') return 5;
  return 90;
}

export function fechaLimiteSugerida(tipo: TipoConservacion, base = new Date()): string {
  const fecha = new Date(base);
  fecha.setDate(fecha.getDate() + diasPorDefecto(tipo));
  return fecha.toISOString();
}

function esTipo(valor: unknown): valor is TipoConservacion {
  return valor === 'abierto' || valor === 'congelado' || valor === 'sobra';
}

function normalizarItem(valor: unknown): ItemConservacion | null {
  if (!valor || typeof valor !== 'object') return null;
  const item = valor as Partial<ItemConservacion>;
  if (
    typeof item.id !== 'string' ||
    !esTipo(item.tipo) ||
    typeof item.nombre !== 'string' ||
    !item.nombre.trim() ||
    typeof item.cantidad !== 'number' ||
    !Number.isFinite(item.cantidad) ||
    item.cantidad <= 0 ||
    typeof item.unidad !== 'string' ||
    !item.unidad.trim() ||
    typeof item.fechaAlta !== 'string'
  ) {
    return null;
  }

  return {
    id: item.id,
    tipo: item.tipo,
    nombre: item.nombre.trim(),
    cantidad: item.cantidad,
    unidad: item.unidad.trim(),
    fechaAlta: item.fechaAlta,
    fechaLimite: typeof item.fechaLimite === 'string' ? item.fechaLimite : undefined,
    notas: typeof item.notas === 'string' && item.notas.trim() ? item.notas.trim() : undefined,
    productoId:
      typeof item.productoId === 'string' && item.productoId.trim()
        ? item.productoId.trim()
        : undefined,
    origen:
      typeof item.origen === 'string' && item.origen.trim()
        ? item.origen.trim()
        : undefined,
  };
}

export function cargarConservacion(): ItemConservacion[] {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return [];
    const datos = JSON.parse(raw) as unknown;
    if (!Array.isArray(datos)) return [];
    return datos
      .map(normalizarItem)
      .filter((item): item is ItemConservacion => item !== null)
      .sort((a, b) => (a.fechaLimite ?? '9999').localeCompare(b.fechaLimite ?? '9999'));
  } catch {
    return [];
  }
}

function guardar(items: ItemConservacion[]): ItemConservacion[] {
  localStorage.setItem(CLAVE, JSON.stringify(items));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_CONSERVACION));
  }
  return items;
}

export function anadirConservacion(
  entrada: Omit<ItemConservacion, 'id' | 'fechaAlta'> & { fechaAlta?: string },
): ItemConservacion {
  const items = cargarConservacion();
  const nuevo: ItemConservacion = {
    id: crearId(),
    tipo: entrada.tipo,
    nombre: entrada.nombre.trim(),
    cantidad: Math.max(0.01, entrada.cantidad),
    unidad: entrada.unidad.trim() || (entrada.tipo === 'sobra' ? 'ración' : 'ud'),
    fechaAlta: entrada.fechaAlta ?? new Date().toISOString(),
    fechaLimite: entrada.fechaLimite ?? fechaLimiteSugerida(entrada.tipo),
    notas: entrada.notas?.trim() || undefined,
    productoId: entrada.productoId?.trim() || undefined,
    origen: entrada.origen?.trim() || undefined,
  };

  const indiceMismoEstado =
    nuevo.productoId && !nuevo.origen
      ? items.findIndex(
          (item) =>
            item.productoId === nuevo.productoId &&
            item.tipo === nuevo.tipo &&
            !item.origen,
        )
      : -1;

  if (indiceMismoEstado >= 0) {
    const existente = items[indiceMismoEstado];
    const combinado: ItemConservacion = {
      ...existente,
      cantidad: Number((existente.cantidad + nuevo.cantidad).toFixed(2)),
      unidad: nuevo.unidad,
      fechaLimite: nuevo.fechaLimite,
      notas: nuevo.notas ?? existente.notas,
    };
    items[indiceMismoEstado] = combinado;
    guardar(items);
    return combinado;
  }

  guardar([nuevo, ...items]);
  return nuevo;
}

export function actualizarConservacion(
  id: string,
  cambios: Partial<
    Pick<
      ItemConservacion,
      'tipo' | 'nombre' | 'cantidad' | 'unidad' | 'fechaLimite' | 'notas' | 'productoId' | 'origen'
    >
  >,
): ItemConservacion[] {
  return guardar(
    cargarConservacion().map((item) =>
      item.id === id
        ? {
            ...item,
            ...cambios,
            nombre: cambios.nombre?.trim() || item.nombre,
            cantidad:
              typeof cambios.cantidad === 'number' && cambios.cantidad > 0
                ? cambios.cantidad
                : item.cantidad,
            unidad: cambios.unidad?.trim() || item.unidad,
          }
        : item,
    ),
  );
}

export function eliminarConservacion(id: string): ItemConservacion[] {
  return guardar(cargarConservacion().filter((item) => item.id !== id));
}

export function consumirConservacion(id: string, cantidad?: number): ItemConservacion[] {
  const items = cargarConservacion();
  const actual = items.find((item) => item.id === id);
  if (!actual) return items;

  const consumir = cantidad === undefined ? actual.cantidad : Math.max(0, cantidad);
  if (consumir >= actual.cantidad - 0.0001) {
    return guardar(items.filter((item) => item.id !== id));
  }

  return guardar(
    items.map((item) =>
      item.id === id
        ? { ...item, cantidad: Number((item.cantidad - consumir).toFixed(2)) }
        : item,
    ),
  );
}

export function conservacionPorTipo(tipo: TipoConservacion): ItemConservacion[] {
  return cargarConservacion().filter((item) => item.tipo === tipo);
}

export function cantidadClasificadaProducto(productoId: string): number {
  return cargarConservacion()
    .filter(
      (item) =>
        item.productoId === productoId &&
        (item.tipo === 'abierto' || item.tipo === 'congelado'),
    )
    .reduce((total, item) => total + item.cantidad, 0);
}

export function registrarSobraDesdeMenu({
  origen,
  nombre,
  cantidad,
  notas,
}: {
  origen: string;
  nombre: string;
  cantidad: number;
  notas?: string;
}): ItemConservacion {
  const items = cargarConservacion();
  const existente = items.find((item) => item.tipo === 'sobra' && item.origen === origen);
  if (existente) {
    const actualizada: ItemConservacion = {
      ...existente,
      nombre: nombre.trim() || existente.nombre,
      cantidad: Math.max(0.5, cantidad),
      unidad: 'ración',
      fechaLimite: fechaLimiteSugerida('sobra'),
      notas: notas?.trim() || existente.notas,
    };
    guardar(items.map((item) => (item.id === existente.id ? actualizada : item)));
    return actualizada;
  }

  return anadirConservacion({
    tipo: 'sobra',
    nombre,
    cantidad: Math.max(0.5, cantidad),
    unidad: 'ración',
    origen,
    notas,
  });
}

export function obtenerSobraPorOrigen(origen: string): ItemConservacion | null {
  return (
    cargarConservacion().find((item) => item.tipo === 'sobra' && item.origen === origen) ?? null
  );
}

export function eliminarSobraOrigen(origen: string): ItemConservacion[] {
  const items = cargarConservacion();
  if (!items.some((item) => item.tipo === 'sobra' && item.origen === origen)) return items;
  return guardar(items.filter((item) => !(item.tipo === 'sobra' && item.origen === origen)));
}

export function diasHastaCaducidad(item: ItemConservacion): number | null {
  if (!item.fechaLimite) return null;
  const ms = new Date(item.fechaLimite).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export function estaCaducado(item: ItemConservacion): boolean {
  const dias = diasHastaCaducidad(item);
  return dias !== null && dias < 0;
}

export function cantidadConservada(
  nombre: string,
  unidad: string,
  tipos: TipoConservacion[] = ['abierto', 'congelado'],
): number {
  const n = normalizar(nombre);
  const u = normalizar(unidad);
  return cargarConservacion()
    .filter(
      (item) =>
        !item.productoId &&
        tipos.includes(item.tipo) &&
        !estaCaducado(item) &&
        normalizar(item.nombre) === n &&
        normalizar(item.unidad) === u,
    )
    .reduce((total, item) => total + item.cantidad, 0);
}

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
