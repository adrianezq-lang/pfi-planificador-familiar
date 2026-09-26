export type ZonaTemporada = 'bizkaia-norte' | 'espana-peninsular';

export type ConfiguracionTemporada = {
  zona: ZonaTemporada;
  avisarAutomaticamente: boolean;
};

export type AlternativaTemporada = {
  ingrediente: string;
  usos: Array<'postre' | 'ensalada' | 'cocinado' | 'salsa'>;
};

export type EvaluacionTemporadaIngrediente = {
  ingrediente: string;
  tieneCalendario: boolean;
  enTemporada: boolean | null;
  mes: number | null;
  mesesHabituales: number[];
  zona: ZonaTemporada;
  zonaEtiqueta: string;
  alternativas: AlternativaTemporada[];
};

type ReglaTemporada = {
  nombres: string[];
  mesesNorte: number[];
  mesesPeninsula?: number[];
  alternativas?: AlternativaTemporada[];
};

const CLAVE_CONFIGURACION = 'pfi-config-temporada-v1';
export const EVENTO_CONFIGURACION_TEMPORADA = 'pfi-config-temporada-actualizada';

export const ETIQUETAS_ZONA_TEMPORADA: Record<ZonaTemporada, string> = {
  'bizkaia-norte': 'Bizkaia y norte peninsular',
  'espana-peninsular': 'España peninsular',
};

const CONFIGURACION_INICIAL: ConfiguracionTemporada = {
  zona: 'bizkaia-norte',
  avisarAutomaticamente: true,
};

const REGLAS: ReglaTemporada[] = [
  {
    nombres: ['Media sandía', 'Sandía'],
    mesesNorte: [6, 7, 8, 9],
    mesesPeninsula: [5, 6, 7, 8, 9],
    alternativas: [
      { ingrediente: 'Manzanas', usos: ['postre'] },
      { ingrediente: 'Peras', usos: ['postre'] },
      { ingrediente: 'Naranjas', usos: ['postre'] },
      { ingrediente: 'Plátanos', usos: ['postre'] },
    ],
  },
  {
    nombres: ['Tomate', 'Tomates'],
    mesesNorte: [6, 7, 8, 9, 10],
    mesesPeninsula: [5, 6, 7, 8, 9, 10],
    alternativas: [
      { ingrediente: 'Tomate triturado', usos: ['salsa', 'cocinado'] },
      { ingrediente: 'Zanahorias', usos: ['ensalada', 'cocinado'] },
    ],
  },
  {
    nombres: ['Pepino', 'Pepinos'],
    mesesNorte: [6, 7, 8, 9],
    mesesPeninsula: [5, 6, 7, 8, 9],
    alternativas: [
      { ingrediente: 'Zanahorias', usos: ['ensalada'] },
    ],
  },
  {
    nombres: ['Pimiento rojo', 'Pimiento tricolor', 'Pimientos'],
    mesesNorte: [7, 8, 9, 10],
    mesesPeninsula: [6, 7, 8, 9, 10, 11],
    alternativas: [
      { ingrediente: 'Calabacín', usos: ['cocinado'] },
      { ingrediente: 'Zanahorias', usos: ['cocinado', 'ensalada'] },
    ],
  },
  {
    nombres: ['Calabacín', 'Calabacines'],
    mesesNorte: [6, 7, 8, 9, 10],
    mesesPeninsula: [5, 6, 7, 8, 9, 10],
    alternativas: [
      { ingrediente: 'Calabaza', usos: ['cocinado'] },
      { ingrediente: 'Menestra de verduras', usos: ['cocinado'] },
    ],
  },
  {
    nombres: ['Berenjena', 'Berenjenas'],
    mesesNorte: [7, 8, 9, 10],
    mesesPeninsula: [6, 7, 8, 9, 10],
    alternativas: [
      { ingrediente: 'Calabacín', usos: ['cocinado'] },
      { ingrediente: 'Calabaza', usos: ['cocinado'] },
    ],
  },
  {
    nombres: ['Calabaza'],
    mesesNorte: [9, 10, 11, 12, 1, 2, 3],
    mesesPeninsula: [9, 10, 11, 12, 1, 2, 3],
    alternativas: [
      { ingrediente: 'Calabacín', usos: ['cocinado'] },
      { ingrediente: 'Menestra de verduras', usos: ['cocinado'] },
    ],
  },
  {
    nombres: ['Judías verdes'],
    mesesNorte: [5, 6, 7, 8, 9, 10],
    mesesPeninsula: [4, 5, 6, 7, 8, 9, 10],
    alternativas: [
      { ingrediente: 'Menestra de verduras', usos: ['cocinado'] },
      { ingrediente: 'Calabacín', usos: ['cocinado'] },
    ],
  },
  {
    nombres: ['Manzanas', 'Manzana'],
    mesesNorte: [8, 9, 10, 11, 12, 1, 2, 3, 4, 5],
    alternativas: [
      { ingrediente: 'Naranjas', usos: ['postre'] },
      { ingrediente: 'Peras', usos: ['postre'] },
      { ingrediente: 'Plátanos', usos: ['postre'] },
    ],
  },
  {
    nombres: ['Peras', 'Pera'],
    mesesNorte: [7, 8, 9, 10, 11, 12, 1, 2, 3, 4],
    alternativas: [
      { ingrediente: 'Manzanas', usos: ['postre'] },
      { ingrediente: 'Naranjas', usos: ['postre'] },
      { ingrediente: 'Plátanos', usos: ['postre'] },
    ],
  },
  {
    nombres: ['Naranjas', 'Naranja'],
    mesesNorte: [11, 12, 1, 2, 3, 4, 5, 6],
    alternativas: [
      { ingrediente: 'Manzanas', usos: ['postre'] },
      { ingrediente: 'Peras', usos: ['postre'] },
      { ingrediente: 'Plátanos', usos: ['postre'] },
    ],
  },
];

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function esZona(valor: unknown): valor is ZonaTemporada {
  return valor === 'bizkaia-norte' || valor === 'espana-peninsular';
}

function mesDesdeEntrada(mesOFecha: string | Date): number | null {
  if (mesOFecha instanceof Date) {
    return Number.isNaN(mesOFecha.getTime()) ? null : mesOFecha.getMonth() + 1;
  }
  const coincidencia = /^\d{4}-(0[1-9]|1[0-2])(?:-\d{2})?/.exec(mesOFecha);
  return coincidencia ? Number(coincidencia[1]) : null;
}

function reglaPara(ingrediente: string): ReglaTemporada | null {
  const clave = normalizar(ingrediente);
  return REGLAS.find((regla) =>
    regla.nombres.some((nombre) => normalizar(nombre) === clave),
  ) ?? null;
}

function mesesPara(regla: ReglaTemporada, zona: ZonaTemporada): number[] {
  return zona === 'espana-peninsular'
    ? [...(regla.mesesPeninsula ?? regla.mesesNorte)]
    : [...regla.mesesNorte];
}

export function cargarConfiguracionTemporada(): ConfiguracionTemporada {
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE_CONFIGURACION) ?? '{}') as Record<string, unknown>;
    return {
      zona: esZona(valor.zona) ? valor.zona : CONFIGURACION_INICIAL.zona,
      avisarAutomaticamente:
        typeof valor.avisarAutomaticamente === 'boolean'
          ? valor.avisarAutomaticamente
          : CONFIGURACION_INICIAL.avisarAutomaticamente,
    };
  } catch {
    return { ...CONFIGURACION_INICIAL };
  }
}

export function guardarConfiguracionTemporada(
  configuracion: ConfiguracionTemporada,
): ConfiguracionTemporada {
  const normalizada = {
    zona: esZona(configuracion.zona) ? configuracion.zona : CONFIGURACION_INICIAL.zona,
    avisarAutomaticamente: configuracion.avisarAutomaticamente !== false,
  } satisfies ConfiguracionTemporada;
  localStorage.setItem(CLAVE_CONFIGURACION, JSON.stringify(normalizada));
  window.dispatchEvent(new CustomEvent(EVENTO_CONFIGURACION_TEMPORADA));
  return normalizada;
}

export function evaluarTemporadaIngrediente(
  ingrediente: string,
  mesOFecha: string | Date,
  configuracion = cargarConfiguracionTemporada(),
): EvaluacionTemporadaIngrediente {
  const regla = reglaPara(ingrediente);
  const mes = mesDesdeEntrada(mesOFecha);
  const mesesHabituales = regla ? mesesPara(regla, configuracion.zona) : [];
  const alternativas = (regla?.alternativas ?? []).filter((alternativa) => {
    const reglaAlternativa = reglaPara(alternativa.ingrediente);
    return !reglaAlternativa || mes === null || mesesPara(reglaAlternativa, configuracion.zona).includes(mes);
  });

  return {
    ingrediente,
    tieneCalendario: Boolean(regla),
    enTemporada: regla && mes !== null ? mesesHabituales.includes(mes) : null,
    mes,
    mesesHabituales,
    zona: configuracion.zona,
    zonaEtiqueta: ETIQUETAS_ZONA_TEMPORADA[configuracion.zona],
    alternativas,
  };
}

export function nombreMes(numero: number): string {
  return new Intl.DateTimeFormat('es-ES', { month: 'short' })
    .format(new Date(2026, Math.max(0, Math.min(11, numero - 1)), 1))
    .replace('.', '');
}

export function describirMesesTemporada(meses: number[]): string {
  return meses.map(nombreMes).join(', ');
}
