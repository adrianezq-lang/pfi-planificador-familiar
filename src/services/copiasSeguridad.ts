const CLAVE_COPIAS_AUTOMATICAS = 'pfi-copias-automaticas-v1';
const VERSION_FORMATO = 3;
const VERSION_APP = '0.9.19';
const MAX_COPIAS_AUTOMATICAS = 8;
const LIMITE_IMPORTACION_BYTES = 5_000_000;

export const EVENTO_COPIAS_SEGURIDAD = 'pfi-copias-seguridad-actualizadas';

const CLAVES_INTERNAS = new Set([
  CLAVE_COPIAS_AUTOMATICAS,
]);

export type DatosCopiaPFI = Record<string, string>;

export type ResumenCopiaPFI = {
  clavesGuardadas: number;
  asociaciones: number;
  recetas: number;
  productosDespensa: number;
  semanasMenu: number;
  movimientosInventario: number;
};

export type CopiaSeguridadPFI = {
  formato: 'pfi-copia-seguridad';
  versionFormato: number;
  versionApp: string;
  creadaEn: string;
  origen: string;
  datos: DatosCopiaPFI;
  resumen: ResumenCopiaPFI;
  integridad: {
    algoritmo: string;
    huella: string;
  };
};

type CopiaAutomaticaGuardada = {
  id: string;
  creadaEn: string;
  motivo: string;
  datos: DatosCopiaPFI;
  resumen: ResumenCopiaPFI;
  huella: string;
};

export type CopiaAutomaticaResumen = Omit<CopiaAutomaticaGuardada, 'datos'>;

export type EstadoSaludDatos = {
  nivel: 'correcto' | 'atencion' | 'vacio';
  titulo: string;
  detalle: string;
  resumen: ResumenCopiaPFI;
  copiasAutomaticas: number;
  ultimaCopia: string | null;
  clavesInvalidas: string[];
  avisos: string[];
};

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function emitirActualizacion(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENTO_COPIAS_SEGURIDAD));
}

function leerJson(valor: string | undefined): unknown {
  if (valor === undefined) return null;
  try {
    return JSON.parse(valor) as unknown;
  } catch {
    return null;
  }
}

function contarArray(datos: DatosCopiaPFI, clave: string): number {
  const valor = leerJson(datos[clave]);
  return Array.isArray(valor) ? valor.length : 0;
}

function contarObjeto(datos: DatosCopiaPFI, claves: string[]): number {
  return claves.reduce((maximo, clave) => {
    const valor = leerJson(datos[clave]);
    return Math.max(maximo, esObjeto(valor) ? Object.keys(valor).length : 0);
  }, 0);
}

function contarSemanas(datos: DatosCopiaPFI): number {
  let maximo = 0;

  Object.entries(datos).forEach(([clave, valor]) => {
    if (!clave.startsWith('pfi-menu-mes-')) return;
    const plan = leerJson(valor);
    if (esObjeto(plan) && Array.isArray(plan.semanas)) {
      maximo = Math.max(maximo, plan.semanas.length);
    }
  });

  const legado = leerJson(datos['pfi-menu-mensual-v1']);
  if (Array.isArray(legado)) maximo = Math.max(maximo, legado.length);
  if (esObjeto(legado) && Array.isArray(legado.semanas)) {
    maximo = Math.max(maximo, legado.semanas.length);
  }

  return maximo;
}

function resumirDatos(datos: DatosCopiaPFI): ResumenCopiaPFI {
  return {
    clavesGuardadas: Object.keys(datos).length,
    asociaciones: contarObjeto(datos, [
      'pfi-asociaciones-ingredientes-mercadona',
      'pfi-asociaciones-ingredientes-mercadona-copia',
      'pfi-asociaciones-ingredientes',
      'pfi-asociaciones-mercadona',
    ]),
    recetas: contarArray(datos, 'pfi-recetas'),
    productosDespensa: contarArray(datos, 'pfi-despensa-productos'),
    semanasMenu: contarSemanas(datos),
    movimientosInventario: contarArray(datos, 'pfi-inventario-movimientos'),
  };
}

function datosOrdenados(datos: DatosCopiaPFI): DatosCopiaPFI {
  return Object.fromEntries(
    Object.entries(datos).sort(([claveA], [claveB]) =>
      claveA < claveB ? -1 : claveA > claveB ? 1 : 0,
    ),
  );
}

function calcularHuella(datos: DatosCopiaPFI): string {
  const texto = JSON.stringify(datosOrdenados(datos));
  let hash = 0x811c9dc5;

  for (let indice = 0; indice < texto.length; indice += 1) {
    hash ^= texto.charCodeAt(indice);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizarDatos(valor: unknown): DatosCopiaPFI {
  if (!esObjeto(valor)) return {};

  return Object.fromEntries(
    Object.entries(valor).flatMap(([clave, dato]) => {
      if (
        !clave.startsWith('pfi-') ||
        CLAVES_INTERNAS.has(clave) ||
        typeof dato !== 'string'
      ) {
        return [];
      }
      return [[clave, dato]];
    }),
  );
}

function mesDesdeFecha(fecha: string): string {
  const coincidencia = /^(\d{4})-(\d{2})/.exec(fecha);
  return coincidencia ? `${coincidencia[1]}-${coincidencia[2]}` : '';
}

function migrarPlanMensualAnterior(
  datosOriginales: DatosCopiaPFI,
  creadaEn: string,
): DatosCopiaPFI {
  const datos = { ...datosOriginales };
  const yaTieneMesActual = Object.keys(datos).some((clave) =>
    clave.startsWith('pfi-menu-mes-'),
  );
  if (yaTieneMesActual) return datosOrdenados(datos);

  const legado = leerJson(datos['pfi-menu-mensual-v1']);
  const semanas = Array.isArray(legado)
    ? legado
    : esObjeto(legado) && Array.isArray(legado.semanas)
      ? legado.semanas
      : [];
  const mes = mesDesdeFecha(creadaEn);
  if (semanas.length === 0 || !mes) return datosOrdenados(datos);

  datos[`pfi-menu-mes-${mes}`] = JSON.stringify({ mes, semanas });
  datos['pfi-mes-activo'] = mes;
  return datosOrdenados(datos);
}

export function recopilarDatosPFI(): DatosCopiaPFI {
  const datos: DatosCopiaPFI = {};

  try {
    for (let indice = 0; indice < localStorage.length; indice += 1) {
      const clave = localStorage.key(indice);
      if (!clave || !clave.startsWith('pfi-') || CLAVES_INTERNAS.has(clave)) {
        continue;
      }
      const valor = localStorage.getItem(clave);
      if (valor !== null) datos[clave] = valor;
    }
  } catch {
    return {};
  }

  return datosOrdenados(datos);
}

function leerCopiasGuardadas(): CopiaAutomaticaGuardada[] {
  try {
    const valor = leerJson(localStorage.getItem(CLAVE_COPIAS_AUTOMATICAS) ?? undefined);
    if (!Array.isArray(valor)) return [];

    return valor.flatMap((entrada) => {
      if (!esObjeto(entrada)) return [];
      const datos = normalizarDatos(entrada.datos);
      if (Object.keys(datos).length === 0) return [];

      const creadaEn = typeof entrada.creadaEn === 'string'
        ? entrada.creadaEn
        : new Date().toISOString();
      const huella = calcularHuella(datos);

      return [{
        id: typeof entrada.id === 'string' ? entrada.id : `${creadaEn}-${huella}`,
        creadaEn,
        motivo: typeof entrada.motivo === 'string' ? entrada.motivo : 'copia automática',
        datos,
        resumen: resumirDatos(datos),
        huella,
      }];
    });
  } catch {
    return [];
  }
}

function guardarCopiasGuardadas(
  copias: CopiaAutomaticaGuardada[],
): CopiaAutomaticaGuardada[] {
  const candidatas = copias.slice(0, MAX_COPIAS_AUTOMATICAS);

  while (candidatas.length > 0) {
    try {
      localStorage.setItem(CLAVE_COPIAS_AUTOMATICAS, JSON.stringify(candidatas));
      return candidatas;
    } catch {
      candidatas.pop();
    }
  }

  return [];
}

export function obtenerCopiasAutomaticas(): CopiaAutomaticaResumen[] {
  return leerCopiasGuardadas().map(({ datos: _datos, ...resumen }) => resumen);
}

export function crearCopiaAutomaticaSiNecesaria(
  motivo = 'apertura de PFI',
): CopiaAutomaticaResumen | null {
  const datos = recopilarDatosPFI();
  if (Object.keys(datos).length === 0) return null;

  const huella = calcularHuella(datos);
  const existentes = leerCopiasGuardadas();
  if (existentes[0]?.huella === huella) return null;

  const creadaEn = new Date().toISOString();
  const copia: CopiaAutomaticaGuardada = {
    id: `${Date.now()}-${huella}`,
    creadaEn,
    motivo,
    datos,
    resumen: resumirDatos(datos),
    huella,
  };
  const guardadas = guardarCopiasGuardadas([copia, ...existentes]);
  if (!guardadas.some((guardada) => guardada.id === copia.id)) return null;

  emitirActualizacion();
  const { datos: _datos, ...resumen } = copia;
  return resumen;
}

function protegerEstadoActual(motivo: string): void {
  const datos = recopilarDatosPFI();
  if (Object.keys(datos).length === 0) return;

  crearCopiaAutomaticaSiNecesaria(motivo);
  const huella = calcularHuella(datos);
  if (!leerCopiasGuardadas().some((copia) => copia.huella === huella)) {
    throw new Error(
      'No se ha podido proteger el estado actual. La restauración se ha cancelado sin cambiar tus datos.',
    );
  }
}

function aplicarDatos(datos: DatosCopiaPFI): void {
  Object.entries(datos).forEach(([clave, valor]) => {
    localStorage.setItem(clave, valor);
  });
  emitirActualizacion();
}

export function restaurarCopiaAutomatica(id: string): ResumenCopiaPFI {
  const copia = leerCopiasGuardadas().find((candidata) => candidata.id === id);
  if (!copia) throw new Error('Esa copia automática ya no está disponible.');

  protegerEstadoActual('antes de restaurar una copia automática');
  aplicarDatos(copia.datos);
  return copia.resumen;
}

export function crearCopiaCompleta(): CopiaSeguridadPFI {
  const datos = recopilarDatosPFI();
  if (Object.keys(datos).length === 0) {
    throw new Error('Todavía no hay datos de PFI para guardar.');
  }

  return {
    formato: 'pfi-copia-seguridad',
    versionFormato: VERSION_FORMATO,
    versionApp: VERSION_APP,
    creadaEn: new Date().toISOString(),
    origen: typeof window === 'undefined' ? 'PFI' : window.location.origin,
    datos,
    resumen: resumirDatos(datos),
    integridad: {
      algoritmo: 'fnv1a-32-pfi-v3',
      huella: calcularHuella(datos),
    },
  };
}

export function descargarCopiaCompleta(): void {
  const copia = crearCopiaCompleta();
  crearCopiaAutomaticaSiNecesaria('copia completa descargada');
  const blob = new Blob([JSON.stringify(copia, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  const fecha = copia.creadaEn.slice(0, 16).replace('T', '_').replace(':', '-');
  enlace.href = url;
  enlace.download = `PFI-copia-completa-${fecha}.json`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

export function analizarCopiaCompleta(texto: string): CopiaSeguridadPFI {
  if (texto.length > LIMITE_IMPORTACION_BYTES) {
    throw new Error('La copia es demasiado grande para ser un archivo de PFI válido.');
  }

  let valor: unknown;
  try {
    valor = JSON.parse(texto) as unknown;
  } catch {
    throw new Error('El archivo no contiene un JSON válido.');
  }

  if (!esObjeto(valor) || valor.formato !== 'pfi-copia-seguridad') {
    throw new Error('El archivo no es una copia completa de PFI.');
  }

  const datosOriginales = normalizarDatos(valor.datos);
  if (Object.keys(datosOriginales).length === 0) {
    throw new Error('La copia no contiene datos de PFI recuperables.');
  }

  const versionFormato = typeof valor.versionFormato === 'number'
    ? valor.versionFormato
    : 1;
  const integridad = esObjeto(valor.integridad) ? valor.integridad : {};
  const huellaCalculada = calcularHuella(datosOriginales);

  if (versionFormato >= VERSION_FORMATO) {
    if (
      integridad.algoritmo !== 'fnv1a-32-pfi-v3' ||
      integridad.huella !== huellaCalculada
    ) {
      throw new Error('La copia está incompleta o ha sido modificada. No se aplicará.');
    }
  }

  const creadaEn = typeof valor.creadaEn === 'string'
    ? valor.creadaEn
    : new Date().toISOString();
  const datos = migrarPlanMensualAnterior(datosOriginales, creadaEn);

  return {
    formato: 'pfi-copia-seguridad',
    versionFormato,
    versionApp: typeof valor.versionApp === 'string' ? valor.versionApp : 'versión anterior',
    creadaEn,
    origen: typeof valor.origen === 'string' ? valor.origen : 'PFI',
    datos,
    resumen: resumirDatos(datos),
    integridad: {
      algoritmo: versionFormato >= VERSION_FORMATO
        ? 'fnv1a-32-pfi-v3'
        : 'formato anterior compatible',
      huella: calcularHuella(datos),
    },
  };
}

export function aplicarCopiaCompleta(copia: CopiaSeguridadPFI): ResumenCopiaPFI {
  const datos = normalizarDatos(copia.datos);
  if (Object.keys(datos).length === 0) {
    throw new Error('La copia no contiene datos que se puedan restaurar.');
  }

  protegerEstadoActual('antes de importar una copia completa');
  aplicarDatos(datos);
  return resumirDatos(datos);
}

function clavesJsonInvalidas(datos: DatosCopiaPFI): string[] {
  const claves = Object.keys(datos).filter((clave) =>
    clave === 'pfi-recetas' ||
    clave === 'pfi-despensa-productos' ||
    clave === 'pfi-inventario-movimientos' ||
    clave === 'pfi-asociaciones-ingredientes-mercadona' ||
    clave === 'pfi-menu-mensual-v1' ||
    clave.startsWith('pfi-menu-mes-'),
  );

  return claves.filter((clave) => leerJson(datos[clave]) === null);
}

export function obtenerEstadoSaludDatos(): EstadoSaludDatos {
  const datos = recopilarDatosPFI();
  const resumen = resumirDatos(datos);
  const copias = leerCopiasGuardadas();
  const clavesInvalidas = clavesJsonInvalidas(datos);
  const avisos: string[] = [];

  if (resumen.clavesGuardadas === 0) avisos.push('Todavía no hay datos locales de PFI.');
  if (resumen.recetas === 0) avisos.push('No se ha encontrado un recetario guardado.');
  if (resumen.asociaciones === 0) avisos.push('No se han encontrado asociaciones de productos.');
  if (resumen.semanasMenu === 0) avisos.push('No se ha encontrado un plan mensual guardado.');
  if (clavesInvalidas.length > 0) avisos.push('Hay datos guardados que no contienen un JSON válido.');
  if (resumen.clavesGuardadas > 0 && copias.length === 0) {
    avisos.push('Aún no existe una copia automática de este estado.');
  }

  const nivel: EstadoSaludDatos['nivel'] = resumen.clavesGuardadas === 0
    ? 'vacio'
    : avisos.length === 0
      ? 'correcto'
      : 'atencion';

  return {
    nivel,
    titulo: nivel === 'correcto'
      ? 'Datos protegidos'
      : nivel === 'vacio'
        ? 'PFI todavía está vacío'
        : 'Conviene revisar los datos',
    detalle: nivel === 'correcto'
      ? 'Recetario, menú y asociaciones tienen una copia automática disponible.'
      : avisos[0] ?? 'Revisa el resumen antes de continuar.',
    resumen,
    copiasAutomaticas: copias.length,
    ultimaCopia: copias[0]?.creadaEn ?? null,
    clavesInvalidas,
    avisos,
  };
}
