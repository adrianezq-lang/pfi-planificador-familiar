export type CopiaSeguridadPfi = {
  tipo: 'pfi-backup';
  version: 1;
  creada: string;
  appVersion: string;
  datos: Record<string, string>;
};

const PREFIJO = 'pfi-';

export function crearCopiaSeguridad(): CopiaSeguridadPfi {
  const datos: Record<string, string> = {};
  for (let indice = 0; indice < localStorage.length; indice += 1) {
    const clave = localStorage.key(indice);
    if (!clave || !clave.startsWith(PREFIJO)) continue;
    const valor = localStorage.getItem(clave);
    if (valor !== null) datos[clave] = valor;
  }

  return {
    tipo: 'pfi-backup',
    version: 1,
    creada: new Date().toISOString(),
    appVersion: '1.5.6',
    datos,
  };
}

export function serializarCopiaSeguridad(copia = crearCopiaSeguridad()): string {
  return JSON.stringify(copia, null, 2);
}

export function validarCopiaSeguridad(valor: unknown): CopiaSeguridadPfi {
  if (!valor || typeof valor !== 'object') {
    throw new Error('El archivo no es una copia de seguridad válida de PFI.');
  }

  const copia = valor as Partial<CopiaSeguridadPfi>;
  if (
    copia.tipo !== 'pfi-backup' ||
    copia.version !== 1 ||
    typeof copia.creada !== 'string' ||
    !copia.datos ||
    typeof copia.datos !== 'object' ||
    Array.isArray(copia.datos)
  ) {
    throw new Error('El archivo no tiene el formato de copia de seguridad PFI esperado.');
  }

  const datos: Record<string, string> = {};
  for (const [clave, valorDato] of Object.entries(copia.datos)) {
    if (!clave.startsWith(PREFIJO) || typeof valorDato !== 'string') {
      throw new Error(`La copia contiene un dato no permitido: ${clave}.`);
    }
    datos[clave] = valorDato;
  }

  return {
    tipo: 'pfi-backup',
    version: 1,
    creada: copia.creada,
    appVersion: typeof copia.appVersion === 'string' ? copia.appVersion : 'desconocida',
    datos,
  };
}

export function leerCopiaSeguridad(texto: string): CopiaSeguridadPfi {
  try {
    return validarCopiaSeguridad(JSON.parse(texto));
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('No se ha podido leer la copia de seguridad.');
  }
}

export function restaurarCopiaSeguridad(
  copia: CopiaSeguridadPfi,
  reemplazarTodo = true,
): number {
  const validada = validarCopiaSeguridad(copia);

  if (reemplazarTodo) {
    const clavesActuales: string[] = [];
    for (let indice = 0; indice < localStorage.length; indice += 1) {
      const clave = localStorage.key(indice);
      if (clave?.startsWith(PREFIJO)) clavesActuales.push(clave);
    }
    clavesActuales.forEach((clave) => localStorage.removeItem(clave));
  }

  Object.entries(validada.datos).forEach(([clave, valor]) => {
    localStorage.setItem(clave, valor);
  });

  return Object.keys(validada.datos).length;
}

export function nombreArchivoCopia(fecha = new Date()): string {
  const dia = fecha.toISOString().slice(0, 10);
  return `PFI-copia-${dia}.json`;
}
