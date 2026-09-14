import type { Receta } from '../data/Recetas';

const CLAVE_RECETAS_ELIMINADAS = 'pfi-recetas-eliminadas-v1';

function normalizarNombre(nombre: string): string {
  return nombre
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function cargarClavesEliminadas(): Set<string> {
  try {
    const guardadas = JSON.parse(
      localStorage.getItem(CLAVE_RECETAS_ELIMINADAS) ?? '[]',
    ) as unknown;

    if (!Array.isArray(guardadas)) return new Set();

    return new Set(
      guardadas
        .filter((valor): valor is string => typeof valor === 'string')
        .map(normalizarNombre)
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

function guardarClavesEliminadas(claves: Set<string>): void {
  localStorage.setItem(
    CLAVE_RECETAS_ELIMINADAS,
    JSON.stringify(Array.from(claves).sort()),
  );
}

export function aplicarRecetasEliminadas(recetas: Receta[]): Receta[] {
  const eliminadas = cargarClavesEliminadas();
  if (eliminadas.size === 0) return recetas;

  return recetas.filter(
    (receta) => !eliminadas.has(normalizarNombre(receta.nombre)),
  );
}

export function registrarCambiosRecetasEliminadas(
  recetasAnteriores: Receta[],
  recetasNuevas: Receta[],
): void {
  const eliminadas = cargarClavesEliminadas();
  const nuevas = new Set(
    recetasNuevas.map((receta) => normalizarNombre(receta.nombre)),
  );

  recetasAnteriores.forEach((receta) => {
    const clave = normalizarNombre(receta.nombre);
    if (!nuevas.has(clave)) eliminadas.add(clave);
  });

  recetasNuevas.forEach((receta) => {
    eliminadas.delete(normalizarNombre(receta.nombre));
  });

  guardarClavesEliminadas(eliminadas);
}

export function limpiarRecetasEliminadas(): void {
  localStorage.removeItem(CLAVE_RECETAS_ELIMINADAS);
}
