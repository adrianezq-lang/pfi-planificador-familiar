import type { DiaMenu } from '../data/Menusemanal';
import {
  alternarComidaFuera,
  cargarExcepcionesSemana,
  guardarExcepcionesSemana,
  limpiarExcepcionesSemana,
  type MomentoExcepcion,
} from './excepcionesSemana';
import { anadirConservacion, type TipoConservacion } from './conservacion';

export type ResultadoAsistentePfi = {
  entendido: boolean;
  respuesta: string;
  menu?: DiaMenu[];
};

const DIAS: Array<[string, string]> = [
  ['lunes', 'Lunes'],
  ['martes', 'Martes'],
  ['miercoles', 'Miércoles'],
  ['jueves', 'Jueves'],
  ['viernes', 'Viernes'],
  ['sabado', 'Sábado'],
  ['domingo', 'Domingo'],
];

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectarDia(texto: string): string | null {
  return DIAS.find(([clave]) => texto.includes(clave))?.[1] ?? null;
}

function detectarMomento(texto: string): MomentoExcepcion | null {
  if (/\b(comida|comemos|mediodia)\b/.test(texto)) return 'comida';
  if (/\b(cena|cenamos|noche)\b/.test(texto)) return 'cena';
  return null;
}

function extraerCantidad(texto: string): number {
  const numero = texto.match(/\b(\d+(?:[.,]\d+)?)\b/);
  return numero ? Math.max(0.01, Number(numero[1].replace(',', '.'))) : 1;
}

function extraerNombreConservacion(textoOriginal: string, tipo: TipoConservacion): string {
  const patrones: Record<TipoConservacion, RegExp[]> = {
    sobra: [
      /(?:sobra|sobras)(?:\s+de)?\s+(.+)$/i,
      /(?:he guardado|guarda)\s+(.+?)\s+como\s+sobra/i,
    ],
    congelado: [
      /(?:he congelado|congela|congelado)(?:\s+\d+(?:[.,]\d+)?)?(?:\s+raciones?|\s+uds?|\s+unidades?)?(?:\s+de)?\s+(.+)$/i,
    ],
    abierto: [
      /(?:he abierto|marca como abierto|abierto)(?:\s+\d+(?:[.,]\d+)?)?(?:\s+de)?\s+(.+)$/i,
    ],
  };

  for (const patron of patrones[tipo]) {
    const coincidencia = textoOriginal.match(patron);
    if (coincidencia?.[1]) {
      return coincidencia[1]
        .replace(/\s+(?:y|con)\s+(?:fecha|caduca).*$/i, '')
        .trim();
    }
  }
  return '';
}

function cambiarPlato(
  menu: DiaMenu[],
  dia: string,
  momento: MomentoExcepcion,
  nuevoPlato: string,
): DiaMenu[] {
  return menu.map((entrada) =>
    entrada.dia === dia ? { ...entrada, [momento]: [nuevoPlato] } : entrada,
  );
}

export function procesarComandoAsistentePfi(
  textoOriginal: string,
  menu: DiaMenu[],
  semanaActiva = 0,
): ResultadoAsistentePfi {
  const texto = normalizar(textoOriginal);
  if (!texto) {
    return { entendido: false, respuesta: 'Escribe el cambio que quieres hacer.' };
  }

  if (
    texto.includes('borra las excepciones') ||
    texto.includes('quita las excepciones') ||
    texto.includes('semana normal')
  ) {
    limpiarExcepcionesSemana(semanaActiva);
    return { entendido: true, respuesta: 'He dejado esta semana sin excepciones.' };
  }

  if (
    (texto.includes('no estan los ninos') ||
      texto.includes('sin los ninos') ||
      texto.includes('solo adultos')) &&
    !texto.includes('ya estan')
  ) {
    const actual = cargarExcepcionesSemana(semanaActiva);
    guardarExcepcionesSemana({ ...actual, soloAdultos: true }, semanaActiva);
    return {
      entendido: true,
      respuesta: 'He puesto esta semana en modo solo adultos. Compra recalculará las cantidades sin cambiar el perfil familiar.',
    };
  }

  if (
    texto.includes('ya estan los ninos') ||
    texto.includes('vuelven los ninos') ||
    texto.includes('con los ninos')
  ) {
    const actual = cargarExcepcionesSemana(semanaActiva);
    guardarExcepcionesSemana({ ...actual, soloAdultos: false }, semanaActiva);
    return { entendido: true, respuesta: 'He vuelto a incluir a los niños esta semana.' };
  }

  if (
    texto.includes('no comemos en casa esta semana') ||
    texto.includes('no cenamos ni comemos en casa esta semana') ||
    texto.includes('toda la semana fuera')
  ) {
    const actual = cargarExcepcionesSemana(semanaActiva);
    guardarExcepcionesSemana({ ...actual, fueraTodaSemana: true }, semanaActiva);
    return {
      entendido: true,
      respuesta: 'He marcado todas las comidas y cenas de esta semana como fuera de casa. La reposición de despensa seguirá separada.',
    };
  }

  if (
    texto.includes('volvemos a comer en casa') ||
    texto.includes('comemos en casa esta semana')
  ) {
    const actual = cargarExcepcionesSemana(semanaActiva);
    guardarExcepcionesSemana({ ...actual, fueraTodaSemana: false }, semanaActiva);
    return { entendido: true, respuesta: 'He quitado la excepción de toda la semana fuera.' };
  }

  const dia = detectarDia(texto);
  const momento = detectarMomento(texto);
  if (
    dia &&
    momento &&
    (texto.includes('fuera') || texto.includes('no comemos') || texto.includes('no cenamos'))
  ) {
    const actual = cargarExcepcionesSemana(semanaActiva);
    const yaFuera = actual.comidasFuera[dia]?.[momento] === true;
    if (!yaFuera) alternarComidaFuera(dia, momento, semanaActiva);
    return { entendido: true, respuesta: `He marcado ${momento === 'comida' ? 'la comida' : 'la cena'} del ${dia.toLocaleLowerCase('es')} como fuera de casa.` };
  }

  const cambio = textoOriginal.match(
    /cambia\s+(?:la\s+)?(comida|cena)\s+(?:del?\s+)?(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+(?:por|a)\s+(.+)$/i,
  );
  if (cambio) {
    const momentoCambio = normalizar(cambio[1]) as MomentoExcepcion;
    const diaCambio = detectarDia(normalizar(cambio[2]));
    const plato = cambio[3].trim();
    if (diaCambio && plato) {
      return {
        entendido: true,
        respuesta: `He cambiado la ${momentoCambio} del ${diaCambio.toLocaleLowerCase('es')} por ${plato}.`,
        menu: cambiarPlato(menu, diaCambio, momentoCambio, plato),
      };
    }
  }

  const tipoConservacion: TipoConservacion | null = texto.includes('congel')
    ? 'congelado'
    : texto.includes('sobra')
      ? 'sobra'
      : texto.includes('abiert')
        ? 'abierto'
        : null;

  if (tipoConservacion) {
    const nombre = extraerNombreConservacion(textoOriginal, tipoConservacion);
    if (nombre) {
      const cantidad = extraerCantidad(texto);
      const unidad = tipoConservacion === 'sobra' ? 'ración' : 'ud';
      anadirConservacion({ tipo: tipoConservacion, nombre, cantidad, unidad });
      return {
        entendido: true,
        respuesta: `He guardado ${cantidad.toLocaleString('es-ES')} ${unidad}${cantidad === 1 ? '' : 'es'} de ${nombre} como ${tipoConservacion}.`,
      };
    }
  }

  return {
    entendido: false,
    respuesta:
      'No he podido aplicar ese cambio todavía. Prueba, por ejemplo: “esta semana no están los niños”, “el martes cenamos fuera”, “cambia la cena del jueves por tortilla francesa” o “he congelado 2 raciones de lentejas”.',
  };
}
