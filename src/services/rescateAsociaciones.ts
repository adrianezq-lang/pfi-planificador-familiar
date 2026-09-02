import {
  guardarAsociacionesIngredientes,
  type AsociacionesIngredientes,
} from './asociacionesIngredientes';

const CLAVE_ACTUAL = 'pfi-asociaciones-ingredientes-mercadona';
const CLAVE_COPIA = 'pfi-asociaciones-ingredientes-mercadona-copia';
const CLAVES_ANTERIORES = [
  'pfi-asociaciones-ingredientes',
  'pfi-asociaciones-mercadona',
] as const;
const CLAVE_HISTORIAL = 'pfi-asociaciones-ingredientes-mercadona-historial-v2';
const MAX_COPIAS = 20;

type CopiaAsociaciones = {
  fecha: string;
  origen: string;
  asociaciones: AsociacionesIngredientes;
};

export type EstadoCopiasAsociaciones = {
  actuales: number;
  copia: number;
  antiguas: number;
  historial: number;
  mejor: number;
};

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function normalizarAsociaciones(valor: unknown): AsociacionesIngredientes {
  let candidato = valor;

  if (typeof candidato === 'string') {
    try {
      candidato = JSON.parse(candidato) as unknown;
    } catch {
      return {};
    }
  }

  if (!esObjeto(candidato)) return {};

  return Object.fromEntries(
    Object.entries(candidato)
      .filter(([ingrediente, productoId]) =>
        ingrediente.trim().length > 0 &&
        typeof productoId === 'string' &&
        productoId.trim().length > 0,
      )
      .map(([ingrediente, productoId]) => [ingrediente, String(productoId)]),
  );
}

function leerClave(clave: string): AsociacionesIngredientes {
  try {
    return normalizarAsociaciones(localStorage.getItem(clave));
  } catch {
    return {};
  }
}

function leerHistorial(): CopiaAsociaciones[] {
  try {
    const guardado = localStorage.getItem(CLAVE_HISTORIAL);
    if (!guardado) return [];
    const datos = JSON.parse(guardado) as unknown;
    if (!Array.isArray(datos)) return [];

    return datos.flatMap((entrada) => {
      if (!esObjeto(entrada)) return [];
      const asociaciones = normalizarAsociaciones(entrada.asociaciones);
      if (Object.keys(asociaciones).length === 0) return [];
      return [{
        fecha: typeof entrada.fecha === 'string' ? entrada.fecha : new Date().toISOString(),
        origen: typeof entrada.origen === 'string' ? entrada.origen : 'historial',
        asociaciones,
      }];
    });
  } catch {
    return [];
  }
}

function guardarHistorial(historial: CopiaAsociaciones[]): void {
  localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(historial.slice(0, MAX_COPIAS)));
}

function firma(asociaciones: AsociacionesIngredientes): string {
  return JSON.stringify(
    Object.entries(asociaciones).sort(([a], [b]) => a.localeCompare(b, 'es')),
  );
}

function guardarSnapshot(
  asociaciones: AsociacionesIngredientes,
  origen: string,
): void {
  if (Object.keys(asociaciones).length === 0) return;

  const historial = leerHistorial();
  const identificador = firma(asociaciones);
  if (historial.some((entrada) => firma(entrada.asociaciones) === identificador)) return;

  guardarHistorial([
    {
      fecha: new Date().toISOString(),
      origen,
      asociaciones,
    },
    ...historial,
  ]);
}

function recopilarCandidatas(): CopiaAsociaciones[] {
  const candidatas: CopiaAsociaciones[] = [
    {
      fecha: new Date().toISOString(),
      origen: 'actual',
      asociaciones: leerClave(CLAVE_ACTUAL),
    },
    {
      fecha: new Date().toISOString(),
      origen: 'copia anterior',
      asociaciones: leerClave(CLAVE_COPIA),
    },
    ...CLAVES_ANTERIORES.map((clave) => ({
      fecha: new Date().toISOString(),
      origen: clave,
      asociaciones: leerClave(clave),
    })),
    ...leerHistorial(),
  ];

  return candidatas.filter(
    (candidata) => Object.keys(candidata.asociaciones).length > 0,
  );
}

export function preservarCopiasAsociacionesExistentes(): void {
  recopilarCandidatas().forEach((candidata) =>
    guardarSnapshot(candidata.asociaciones, candidata.origen),
  );
}

export function obtenerEstadoCopiasAsociaciones(): EstadoCopiasAsociaciones {
  const actuales = Object.keys(leerClave(CLAVE_ACTUAL)).length;
  const copia = Object.keys(leerClave(CLAVE_COPIA)).length;
  const antiguas = CLAVES_ANTERIORES.reduce(
    (maximo, clave) => Math.max(maximo, Object.keys(leerClave(clave)).length),
    0,
  );
  const historial = leerHistorial().reduce(
    (maximo, entrada) => Math.max(maximo, Object.keys(entrada.asociaciones).length),
    0,
  );

  return {
    actuales,
    copia,
    antiguas,
    historial,
    mejor: Math.max(actuales, copia, antiguas, historial),
  };
}

export function restaurarMejorCopiaAsociaciones(): number {
  preservarCopiasAsociacionesExistentes();
  const candidatas = recopilarCandidatas().sort(
    (a, b) => Object.keys(b.asociaciones).length - Object.keys(a.asociaciones).length,
  );

  if (candidatas.length === 0) return 0;

  const recuperadas: AsociacionesIngredientes = {};
  candidatas.forEach((candidata) => {
    Object.entries(candidata.asociaciones).forEach(([ingrediente, productoId]) => {
      if (!recuperadas[ingrediente]) recuperadas[ingrediente] = productoId;
    });
  });

  guardarSnapshot(recuperadas, 'restauración combinada');
  guardarAsociacionesIngredientes(recuperadas);
  return Object.keys(recuperadas).length;
}

function extraerAsociacionesDesdeObjeto(
  valor: unknown,
  profundidad = 0,
): AsociacionesIngredientes[] {
  if (profundidad > 5) return [];

  if (typeof valor === 'string') {
    try {
      return extraerAsociacionesDesdeObjeto(JSON.parse(valor) as unknown, profundidad + 1);
    } catch {
      return [];
    }
  }

  if (!esObjeto(valor)) return [];

  const encontradas: AsociacionesIngredientes[] = [];
  const clavesConocidas = [CLAVE_ACTUAL, CLAVE_COPIA, ...CLAVES_ANTERIORES];

  clavesConocidas.forEach((clave) => {
    if (clave in valor) {
      const asociaciones = normalizarAsociaciones(valor[clave]);
      if (Object.keys(asociaciones).length > 0) encontradas.push(asociaciones);
    }
  });

  if ('asociaciones' in valor) {
    const asociaciones = normalizarAsociaciones(valor.asociaciones);
    if (Object.keys(asociaciones).length > 0) encontradas.push(asociaciones);
  }

  const pareceRegistroDirecto =
    Object.keys(valor).length > 0 &&
    !Object.keys(valor).some((clave) => clave.startsWith('pfi-')) &&
    Object.values(valor).every((dato) => typeof dato === 'string');

  if (pareceRegistroDirecto) {
    const asociaciones = normalizarAsociaciones(valor);
    if (Object.keys(asociaciones).length > 0) encontradas.push(asociaciones);
  }

  ['localStorage', 'datos', 'data', 'backup', 'copia', 'contenido'].forEach((clave) => {
    if (clave in valor) {
      encontradas.push(...extraerAsociacionesDesdeObjeto(valor[clave], profundidad + 1));
    }
  });

  return encontradas;
}

export function importarCopiaAsociaciones(texto: string): number {
  let datos: unknown;
  try {
    datos = JSON.parse(texto) as unknown;
  } catch {
    throw new Error('El archivo no contiene un JSON válido.');
  }

  const candidatas = extraerAsociacionesDesdeObjeto(datos)
    .filter((asociaciones) => Object.keys(asociaciones).length > 0)
    .sort((a, b) => Object.keys(b).length - Object.keys(a).length);

  if (candidatas.length === 0) {
    throw new Error('No he encontrado asociaciones de ingredientes en esa copia.');
  }

  preservarCopiasAsociacionesExistentes();
  const recuperadas: AsociacionesIngredientes = {};
  candidatas.forEach((asociaciones) => {
    Object.entries(asociaciones).forEach(([ingrediente, productoId]) => {
      if (!recuperadas[ingrediente]) recuperadas[ingrediente] = productoId;
    });
  });

  guardarSnapshot(recuperadas, 'copia importada');
  guardarAsociacionesIngredientes(recuperadas);
  return Object.keys(recuperadas).length;
}

export function descargarCopiaAsociaciones(): void {
  preservarCopiasAsociacionesExistentes();
  const contenido = {
    tipo: 'pfi-asociaciones',
    version: 2,
    creado: new Date().toISOString(),
    asociaciones: leerClave(CLAVE_ACTUAL),
    historial: leerHistorial(),
  };
  const blob = new Blob([JSON.stringify(contenido, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `pfi-asociaciones-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
