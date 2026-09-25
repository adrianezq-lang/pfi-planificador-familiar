export type MotivoNoDisponibilidadIngrediente =
  | 'temporada'
  | 'zona'
  | 'otro';

export type EstadoDisponibilidadIngrediente = {
  ingrediente: string;
  motivo: MotivoNoDisponibilidadIngrediente;
  nota: string;
  deshabilitadoEn: string;
};

const CLAVE_DISPONIBILIDAD = 'pfi-ingredientes-no-disponibles-v1';

export const EVENTO_DISPONIBILIDAD_INGREDIENTES =
  'pfi-disponibilidad-ingredientes-actualizada';

export const ETIQUETAS_NO_DISPONIBILIDAD: Record<
  MotivoNoDisponibilidadIngrediente,
  string
> = {
  temporada: 'Fuera de temporada',
  zona: 'No disponible en mi zona o tienda',
  otro: 'No disponible temporalmente',
};

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function esMotivoValido(valor: unknown): valor is MotivoNoDisponibilidadIngrediente {
  return valor === 'temporada' || valor === 'zona' || valor === 'otro';
}

function sanearEstado(valor: unknown): EstadoDisponibilidadIngrediente | null {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  const registro = valor as Record<string, unknown>;
  const ingrediente = typeof registro.ingrediente === 'string'
    ? registro.ingrediente.trim()
    : '';
  if (!ingrediente || !esMotivoValido(registro.motivo)) return null;

  return {
    ingrediente,
    motivo: registro.motivo,
    nota: typeof registro.nota === 'string' ? registro.nota.trim() : '',
    deshabilitadoEn:
      typeof registro.deshabilitadoEn === 'string' && registro.deshabilitadoEn
        ? registro.deshabilitadoEn
        : new Date().toISOString(),
  };
}

export function cargarIngredientesNoDisponibles(): EstadoDisponibilidadIngrediente[] {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_DISPONIBILIDAD) ?? '[]') as unknown;
    if (!Array.isArray(datos)) return [];
    const unicos = new Map<string, EstadoDisponibilidadIngrediente>();
    datos.forEach((valor) => {
      const estado = sanearEstado(valor);
      if (estado) unicos.set(normalizar(estado.ingrediente), estado);
    });
    return Array.from(unicos.values());
  } catch {
    return [];
  }
}

function guardar(estados: EstadoDisponibilidadIngrediente[]): void {
  localStorage.setItem(CLAVE_DISPONIBILIDAD, JSON.stringify(estados));
  window.dispatchEvent(new CustomEvent(EVENTO_DISPONIBILIDAD_INGREDIENTES));
}

export function obtenerEstadoDisponibilidadIngrediente(
  ingrediente: string,
): EstadoDisponibilidadIngrediente | null {
  const clave = normalizar(ingrediente);
  return cargarIngredientesNoDisponibles().find(
    (estado) => normalizar(estado.ingrediente) === clave,
  ) ?? null;
}

export function ingredienteEstaDisponible(ingrediente: string): boolean {
  return obtenerEstadoDisponibilidadIngrediente(ingrediente) === null;
}

export function marcarIngredienteNoDisponible(
  ingrediente: string,
  motivo: MotivoNoDisponibilidadIngrediente,
  nota = '',
): EstadoDisponibilidadIngrediente {
  const nombre = ingrediente.trim();
  if (!nombre) throw new Error('El ingrediente es obligatorio.');
  const clave = normalizar(nombre);
  const estados = cargarIngredientesNoDisponibles().filter(
    (estado) => normalizar(estado.ingrediente) !== clave,
  );
  const estado: EstadoDisponibilidadIngrediente = {
    ingrediente: nombre,
    motivo,
    nota: nota.trim(),
    deshabilitadoEn: new Date().toISOString(),
  };
  guardar([...estados, estado]);
  return estado;
}

export function reactivarIngrediente(ingrediente: string): void {
  const clave = normalizar(ingrediente);
  const estados = cargarIngredientesNoDisponibles();
  const siguientes = estados.filter(
    (estado) => normalizar(estado.ingrediente) !== clave,
  );
  if (siguientes.length !== estados.length) guardar(siguientes);
}

export function renombrarDisponibilidadIngrediente(
  nombreAnterior: string,
  nombreNuevo: string,
): void {
  const estado = obtenerEstadoDisponibilidadIngrediente(nombreAnterior);
  if (!estado || !nombreNuevo.trim() || normalizar(nombreAnterior) === normalizar(nombreNuevo)) {
    return;
  }
  const estados = cargarIngredientesNoDisponibles().filter(
    (item) => normalizar(item.ingrediente) !== normalizar(nombreAnterior),
  );
  guardar([...estados, { ...estado, ingrediente: nombreNuevo.trim() }]);
}

