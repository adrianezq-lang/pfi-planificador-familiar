import type { SemanaMenu } from '../data/MenuMensual';
import { fechasSemana, indiceDiaSemana } from './excepcionesCalendario';

const DIAS = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const;

const ETIQUETAS_DIA: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

export type ReferenciaTemporalDia = {
  dia: string;
  numero?: number;
  fecha?: string;
  indiceTexto: number;
  texto: string;
  tipo: 'dia' | 'relativa' | 'fecha';
};

export type ResultadoReferenciasTemporales = {
  referencias: ReferenciaTemporalDia[];
  error?: string;
};

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:]+/g, ' ')
    .replace(/([a-zñ])(\d{1,2})\b/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function capitalizarDia(dia: string): string {
  return ETIQUETAS_DIA[dia] ?? (dia.charAt(0).toUpperCase() + dia.slice(1));
}

function isoLocal(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function fechaBase(fechaReferencia: Date | string): Date {
  if (typeof fechaReferencia === 'string') {
    const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaReferencia)
      ? `${fechaReferencia}T12:00:00`
      : fechaReferencia;
    const fecha = new Date(soloFecha);
    if (!Number.isNaN(fecha.getTime())) return fecha;
    return new Date();
  }
  return new Date(fechaReferencia);
}

function referenciaDesdeFecha(
  fechaIso: string,
  indiceTexto: number,
  texto: string,
  tipo: ReferenciaTemporalDia['tipo'],
): ReferenciaTemporalDia {
  const indice = indiceDiaSemana(fechaIso);
  return {
    dia: capitalizarDia(DIAS[indice]),
    numero: Number(fechaIso.slice(-2)),
    fecha: fechaIso,
    indiceTexto,
    texto,
    tipo,
  };
}

function rangoSemana(semana: SemanaMenu): string {
  const fechas = fechasSemana(semana);
  if (fechas.length === 0) return 'la semana activa';
  const primera = Number(fechas[0].slice(-2));
  const ultima = Number(fechas[fechas.length - 1].slice(-2));
  return primera === ultima
    ? `el día ${primera}`
    : `los días ${primera}–${ultima}`;
}

export function resolverReferenciasTemporales(
  texto: string,
  semana?: SemanaMenu,
  fechaReferencia: Date | string = new Date(),
): ResultadoReferenciasTemporales {
  const consulta = normalizar(texto);
  const referencias: ReferenciaTemporalDia[] = [];
  const fechasActivas = semana ? fechasSemana(semana) : [];

  const patronDia =
    /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b(?:\s+(\d{1,2}))?/g;
  let coincidenciaDia: RegExpExecArray | null;
  while ((coincidenciaDia = patronDia.exec(consulta)) !== null) {
    const dia = capitalizarDia(coincidenciaDia[1]);
    const numero = coincidenciaDia[2]
      ? Number(coincidenciaDia[2])
      : undefined;
    const fecha = semana
      ? fechasActivas.find(
          (fechaIso) =>
            indiceDiaSemana(fechaIso) ===
            DIAS.indexOf(coincidenciaDia![1] as (typeof DIAS)[number]),
        )
      : undefined;

    if (semana && !fecha) {
      return {
        referencias: [],
        error: `${dia} no está dentro de la semana activa (${rangoSemana(semana)}).`,
      };
    }

    if (
      semana &&
      fecha &&
      numero !== undefined &&
      Number(fecha.slice(-2)) !== numero
    ) {
      return {
        referencias: [],
        error: `En la semana activa, el ${dia.toLocaleLowerCase('es')} es ${Number(fecha.slice(-2))}, no ${numero}.`,
      };
    }

    referencias.push({
      dia,
      numero,
      fecha,
      indiceTexto: coincidenciaDia.index,
      texto: coincidenciaDia[0],
      tipo: 'dia',
    });
  }

  const offsets: Record<string, number> = {
    anteayer: -2,
    ayer: -1,
    hoy: 0,
    manana: 1,
    'pasado manana': 2,
  };
  const patronRelativo = /\b(pasado manana|anteayer|manana|ayer|hoy)\b/g;
  let coincidenciaRelativa: RegExpExecArray | null;
  const base = fechaBase(fechaReferencia);
  base.setHours(12, 0, 0, 0);

  while ((coincidenciaRelativa = patronRelativo.exec(consulta)) !== null) {
    const literal = coincidenciaRelativa[1];
    const objetivo = new Date(base);
    objetivo.setDate(objetivo.getDate() + offsets[literal]);
    const fechaIso = isoLocal(objetivo);

    if (semana && !fechasActivas.includes(fechaIso)) {
      const ref = referenciaDesdeFecha(
        fechaIso,
        coincidenciaRelativa.index,
        literal,
        'relativa',
      );
      return {
        referencias: [],
        error: `“${literal}” corresponde a ${ref.dia.toLocaleLowerCase('es')} ${ref.numero}, que queda fuera de la semana activa (${rangoSemana(semana)}). Cambia de semana o dime un día de la semana activa.`,
      };
    }

    referencias.push(
      referenciaDesdeFecha(
        fechaIso,
        coincidenciaRelativa.index,
        literal,
        'relativa',
      ),
    );
  }

  const patronNumero = /\b(?:el|dia)\s+(\d{1,2})\b/g;
  let coincidenciaNumero: RegExpExecArray | null;
  while ((coincidenciaNumero = patronNumero.exec(consulta)) !== null) {
    const numero = Number(coincidenciaNumero[1]);

    if (!semana || fechasActivas.length === 0) {
      return {
        referencias: [],
        error:
          'Para entender una fecha como “el 24” necesito que la semana activa tenga fechas asignadas.',
      };
    }

    const fecha = fechasActivas.find(
      (fechaIso) => Number(fechaIso.slice(-2)) === numero,
    );
    if (!fecha) {
      return {
        referencias: [],
        error: `El día ${numero} no está dentro de la semana activa (${rangoSemana(semana)}).`,
      };
    }

    referencias.push(
      referenciaDesdeFecha(
        fecha,
        coincidenciaNumero.index,
        coincidenciaNumero[0],
        'fecha',
      ),
    );
  }

  const unicas = new Map<string, ReferenciaTemporalDia>();
  referencias
    .sort((a, b) => a.indiceTexto - b.indiceTexto)
    .forEach((referencia) => {
      const clave =
        referencia.fecha ??
        `${normalizar(referencia.dia)}-${referencia.numero ?? ''}`;
      if (!unicas.has(clave)) unicas.set(clave, referencia);
    });

  return {
    referencias: [...unicas.values()].sort(
      (a, b) => a.indiceTexto - b.indiceTexto,
    ),
  };
}

export function etiquetaReferenciaTemporal(
  referencia: ReferenciaTemporalDia,
): string {
  return referencia.numero
    ? `${referencia.dia} ${referencia.numero}`
    : referencia.dia;
}
