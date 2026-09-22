import type { DiaMenu } from '../data/Menusemanal';
import type { SemanaMenu } from '../data/MenuMensual';
import type { Receta } from '../data/Recetas';
import { fechasSemana, indiceDiaSemana } from './excepcionesCalendario';
import type { UnidadProductoManual } from './productosManualesCompra';
import {
  resolverReferenciasTemporales,
  type ReferenciaTemporalDia,
} from './referenciasTemporales';

export type MomentoAccionMenu = 'comida' | 'cena';

export type AccionAsistente =
  | {
      tipo: 'cambiar-menu';
      dia: string;
      momento: MomentoAccionMenu;
      platoNuevo: string;
      platosAnteriores: string[];
    }
  | {
      tipo: 'copiar-menu';
      diaDestino: string;
      diaOrigen: string;
      momentoDestino: MomentoAccionMenu;
      momentoOrigen: MomentoAccionMenu;
      platosAnteriores: string[];
      platosNuevos: string[];
      etiquetaDestino: string;
      etiquetaOrigen: string;
    }
  | {
      tipo: 'mover-menu';
      diaDestino: string;
      diaOrigen: string;
      momentoDestino: MomentoAccionMenu;
      momentoOrigen: MomentoAccionMenu;
      platosDestinoAntes: string[];
      platosOrigenAntes: string[];
      etiquetaDestino: string;
      etiquetaOrigen: string;
    }
  | {
      tipo: 'intercambiar-menu';
      diaDestino: string;
      diaOrigen: string;
      momentoDestino: MomentoAccionMenu;
      momentoOrigen: MomentoAccionMenu;
      platosDestinoAntes: string[];
      platosOrigenAntes: string[];
      etiquetaDestino: string;
      etiquetaOrigen: string;
    }
  | {
      tipo: 'restaurar-menu';
      menuAntes: DiaMenu[];
      menuDespues: DiaMenu[];
      descripcion: string;
    }
  | {
      tipo: 'anadir-compra';
      nombre: string;
      cantidad: number;
      unidad: UnidadProductoManual;
      tienda: string;
    }
  | {
      tipo: 'fin-semana-sin-ninos';
      sinNinos: boolean;
    }
  | {
      tipo: 'excepcion-dia';
      dia: string;
      excepcion: 'sinComida' | 'sinCena' | 'noEnCasa';
      activa: boolean;
    };

export type PropuestaAccionAsistente = {
  titulo: string;
  resumen: string;
  cambios: string[];
  accion: AccionAsistente;
  confirmar: string;
};

export type ResultadoDeteccionAccion = {
  propuesta?: PropuestaAccionAsistente;
  aclaracion?: string;
};

const DIAS = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const;

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

type ReferenciaDia = ReferenciaTemporalDia;

function resolverReferenciasDia(
  consulta: string,
  semana?: SemanaMenu,
  fechaReferencia: Date | string = new Date(),
): { referencias: ReferenciaDia[]; error?: string } {
  return resolverReferenciasTemporales(
    consulta,
    semana,
    fechaReferencia,
  );
}

function fechaDeDiaEnSemana(
  semana: SemanaMenu | undefined,
  dia: string,
): string | null {
  if (!semana) return null;
  const objetivo = DIAS.indexOf(normalizar(dia) as (typeof DIAS)[number]);
  if (objetivo < 0) return null;
  return (
    fechasSemana(semana).find((fecha) => indiceDiaSemana(fecha) === objetivo) ??
    null
  );
}

function etiquetaDia(
  referencia: ReferenciaDia,
  semana?: SemanaMenu,
): string {
  const fecha = fechaDeDiaEnSemana(semana, referencia.dia);
  const numero = referencia.numero ?? (fecha ? Number(fecha.slice(-2)) : undefined);
  return numero ? `${referencia.dia} ${numero}` : referencia.dia;
}

function validarReferenciaFecha(
  referencia: ReferenciaDia,
  semana?: SemanaMenu,
): string | null {
  if (!semana || referencia.numero === undefined) return null;
  const fecha = fechaDeDiaEnSemana(semana, referencia.dia);
  if (!fecha) return null;
  const real = Number(fecha.slice(-2));
  if (real === referencia.numero) return null;
  return `En la semana activa, el ${referencia.dia.toLocaleLowerCase('es')} es ${real}, no ${referencia.numero}. No haré el cambio hasta que confirmes la fecha correcta.`;
}

function detectarMomentoCerca(
  consulta: string,
  indiceDia: number,
  fallback: MomentoAccionMenu | null,
): MomentoAccionMenu | null {
  const inicio = Math.max(0, indiceDia - 40);
  const fin = Math.min(consulta.length, indiceDia + 28);
  const fragmento = consulta.slice(inicio, fin);
  const patron = /\b(comida|comidas|comer|almuerzo|almuerzos|cena|cenas|cenar)\b/g;
  let coincidencia: RegExpExecArray | null;
  let mejor: { momento: MomentoAccionMenu; distancia: number } | null = null;

  while ((coincidencia = patron.exec(fragmento)) !== null) {
    const posicion = inicio + coincidencia.index;
    const distancia = Math.abs(posicion - indiceDia);
    const momento: MomentoAccionMenu =
      /^(cena|cenas|cenar)$/.test(coincidencia[1]) ? 'cena' : 'comida';
    if (!mejor || distancia < mejor.distancia) {
      mejor = { momento, distancia };
    }
  }

  return mejor?.momento ?? fallback;
}

type OperacionEntreDias = 'copiar' | 'mover' | 'intercambiar';

function detectarOperacionEntreDias(consulta: string): OperacionEntreDias | null {
  if (
    /\b(intercambia|intercambiame|permuta|permutame)\b/.test(consulta) ||
    /\bcambia(?:me)?\b.*\bentre si\b/.test(consulta)
  ) {
    return 'intercambiar';
  }
  if (/\b(mueve|mueveme|pasa|pasame|traslada|trasladame)\b/.test(consulta)) {
    return 'mover';
  }
  if (
    /\b(copia|copiame|pon|ponme|usa|haz|cambia|cambiame|sustituye|reemplaza)\b/.test(consulta) ||
    /\b(lo mismo que|igual que)\b/.test(consulta)
  ) {
    return 'copiar';
  }
  return null;
}

function orientarReferencias(
  consulta: string,
  referencias: ReferenciaDia[],
  operacion: OperacionEntreDias,
): { destino: ReferenciaDia; origen: ReferenciaDia } | { aclaracion: string } {
  const primero = referencias[0];
  const segundo = referencias[1];

  if (operacion === 'intercambiar') {
    return { destino: primero, origen: segundo };
  }

  const antesPrimero = consulta.slice(0, primero.indiceTexto);
  const entre = consulta.slice(primero.indiceTexto, segundo.indiceTexto);
  const contextoPrimero = consulta.slice(
    Math.max(0, primero.indiceTexto - 34),
    primero.indiceTexto,
  );

  const primeroEsDestinoExplicito =
    /\b(?:al|a|en|para)\s+(?:el|la)?\s*$/.test(antesPrimero) ||
    /\b(lo mismo que|igual que|por|con)\b/.test(entre) ||
    /\b(tenga|quiero|queremos)\b/.test(entre);

  if (primeroEsDestinoExplicito) {
    return { destino: primero, origen: segundo };
  }

  if (operacion === 'mover') {
    return { destino: segundo, origen: primero };
  }

  const primeroEsOrigenExplicito =
    /\b(?:al|a|en|para)\b/.test(entre) ||
    (
      /\b(comida|comidas|cena|cenas|almuerzo)\s+del?\s*$/.test(contextoPrimero) &&
      /\b(copia|copiame|pon|ponme|usa)\b/.test(antesPrimero)
    );

  if (primeroEsOrigenExplicito) {
    return { destino: segundo, origen: primero };
  }

  return {
    aclaracion: `No quiero adivinar el sentido del cambio. ¿Quieres copiar ${etiquetaDia(primero).toLocaleLowerCase('es')} en ${etiquetaDia(segundo).toLocaleLowerCase('es')} o al revés?`,
  };
}

function mismosPlatos(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((plato, indice) => plato === b[indice]);
}

function extraerCopiaEntreDias(
  consulta: string,
  menu: DiaMenu[],
  semana?: SemanaMenu,
  fechaReferencia: Date | string = new Date(),
): ResultadoDeteccionAccion | null {
  const operacion = detectarOperacionEntreDias(consulta);
  if (!operacion) return null;

  const resolucionReferencias = resolverReferenciasDia(
    consulta,
    semana,
    fechaReferencia,
  );
  if (resolucionReferencias.error) {
    return { aclaracion: resolucionReferencias.error };
  }
  const referencias = resolucionReferencias.referencias;
  if (referencias.length < 2) return null;
  if (referencias.length > 2) {
    return {
      aclaracion: 'Veo más de dos días en la orden. Indícame solo el origen y el destino para evitar cambiar el día equivocado.',
    };
  }

  const orientacion = orientarReferencias(consulta, referencias, operacion);
  if ('aclaracion' in orientacion) return { aclaracion: orientacion.aclaracion };

  const { destino, origen } = orientacion;
  const errorDestino = validarReferenciaFecha(destino, semana);
  if (errorDestino) return { aclaracion: errorDestino };
  const errorOrigen = validarReferenciaFecha(origen, semana);
  if (errorOrigen) return { aclaracion: errorOrigen };

  if (!nombreDiaExiste(menu, destino.dia) || !nombreDiaExiste(menu, origen.dia)) {
    return {
      aclaracion: 'Uno de los días indicados no está disponible en la semana activa.',
    };
  }

  const momentoGeneral = detectarMomento(consulta);
  const momentoDestino = detectarMomentoCerca(
    consulta,
    destino.indiceTexto,
    momentoGeneral,
  );
  const momentoOrigen = detectarMomentoCerca(
    consulta,
    origen.indiceTexto,
    momentoGeneral,
  );

  if (!momentoDestino || !momentoOrigen) {
    return {
      aclaracion: `¿Quieres ${operacion === 'copiar' ? 'copiar' : operacion === 'mover' ? 'mover' : 'intercambiar'} la comida o la cena entre esos días? No haré el cambio hasta saberlo.`,
    };
  }

  if (
    normalizar(destino.dia) === normalizar(origen.dia) &&
    momentoDestino === momentoOrigen
  ) {
    return {
      aclaracion: 'El origen y el destino son el mismo hueco del menú, así que no hay nada que cambiar.',
    };
  }

  const diaDestino = buscarDia(menu, destino.dia);
  const diaOrigen = buscarDia(menu, origen.dia);
  if (!diaDestino || !diaOrigen) return null;

  const destinoAntes =
    momentoDestino === 'comida' ? diaDestino.comida : diaDestino.cena;
  const origenAntes =
    momentoOrigen === 'comida' ? diaOrigen.comida : diaOrigen.cena;

  if ((operacion === 'copiar' || operacion === 'mover') && origenAntes.length === 0) {
    return {
      aclaracion: `La ${momentoOrigen} del ${etiquetaDia(origen, semana).toLocaleLowerCase('es')} está vacía. No hay nada que ${operacion === 'copiar' ? 'copiar' : 'mover'}.`,
    };
  }

  if (
    (operacion === 'copiar' || operacion === 'intercambiar') &&
    mismosPlatos(destinoAntes, origenAntes)
  ) {
    return {
      aclaracion: 'Esos dos huecos ya tienen exactamente los mismos platos. No hace falta aplicar ningún cambio.',
    };
  }

  const etiquetaDestinoTexto = etiquetaDia(destino, semana);
  const etiquetaOrigenTexto = etiquetaDia(origen, semana);
  const nombreMomentoDestino = momentoDestino === 'comida' ? 'Comida' : 'Cena';
  const nombreMomentoOrigen = momentoOrigen === 'comida' ? 'Comida' : 'Cena';

  if (operacion === 'mover') {
    return {
      propuesta: {
        titulo: `Mover ${momentoOrigen} de ${etiquetaOrigenTexto.toLocaleLowerCase('es')}`,
        resumen: `Voy a mover ${origenAntes.join(' + ')} de ${etiquetaOrigenTexto} a ${etiquetaDestinoTexto}. El origen quedará vacío.`,
        cambios: [
          `Destino: ${etiquetaDestinoTexto} · ${nombreMomentoDestino}`,
          `Antes en destino: ${destinoAntes.join(' + ') || 'Sin plan'}`,
          `Origen: ${etiquetaOrigenTexto} · ${nombreMomentoOrigen} · ${origenAntes.join(' + ')}`,
          `Después en destino: ${origenAntes.join(' + ')}`,
          'Después en origen: Sin plan',
          'La lista de la compra se recalculará con el nuevo menú.',
        ],
        accion: {
          tipo: 'mover-menu',
          diaDestino: destino.dia,
          diaOrigen: origen.dia,
          momentoDestino,
          momentoOrigen,
          platosDestinoAntes: [...destinoAntes],
          platosOrigenAntes: [...origenAntes],
          etiquetaDestino: etiquetaDestinoTexto,
          etiquetaOrigen: etiquetaOrigenTexto,
        },
        confirmar: 'Confirmar movimiento',
      },
    };
  }

  if (operacion === 'intercambiar') {
    return {
      propuesta: {
        titulo: `Intercambiar ${etiquetaDestinoTexto} y ${etiquetaOrigenTexto}`,
        resumen: `Voy a intercambiar la ${momentoDestino} de ${etiquetaDestinoTexto} con la ${momentoOrigen} de ${etiquetaOrigenTexto}.`,
        cambios: [
          `${etiquetaDestinoTexto} · ${nombreMomentoDestino}: ${destinoAntes.join(' + ') || 'Sin plan'} → ${origenAntes.join(' + ') || 'Sin plan'}`,
          `${etiquetaOrigenTexto} · ${nombreMomentoOrigen}: ${origenAntes.join(' + ') || 'Sin plan'} → ${destinoAntes.join(' + ') || 'Sin plan'}`,
          'Ningún plato se pierde: solo cambian de sitio.',
          'La lista de la compra se recalculará con el nuevo menú.',
        ],
        accion: {
          tipo: 'intercambiar-menu',
          diaDestino: destino.dia,
          diaOrigen: origen.dia,
          momentoDestino,
          momentoOrigen,
          platosDestinoAntes: [...destinoAntes],
          platosOrigenAntes: [...origenAntes],
          etiquetaDestino: etiquetaDestinoTexto,
          etiquetaOrigen: etiquetaOrigenTexto,
        },
        confirmar: 'Confirmar intercambio',
      },
    };
  }

  return {
    propuesta: {
      titulo: `Copiar ${momentoOrigen} de ${etiquetaOrigenTexto.toLocaleLowerCase('es')}`,
      resumen: `Voy a poner en ${etiquetaDestinoTexto} la ${momentoOrigen} de ${etiquetaOrigenTexto}: ${origenAntes.join(' + ')}.`,
      cambios: [
        `Destino: ${etiquetaDestinoTexto} · ${nombreMomentoDestino}`,
        `Antes: ${destinoAntes.join(' + ') || 'Sin plan'}`,
        `Origen: ${etiquetaOrigenTexto} · ${nombreMomentoOrigen}`,
        `Después: ${origenAntes.join(' + ')}`,
        'El día de origen se mantiene igual.',
        'La lista de la compra se recalculará con el cambio.',
      ],
      accion: {
        tipo: 'copiar-menu',
        diaDestino: destino.dia,
        diaOrigen: origen.dia,
        momentoDestino,
        momentoOrigen,
        platosAnteriores: [...destinoAntes],
        platosNuevos: [...origenAntes],
        etiquetaDestino: etiquetaDestinoTexto,
        etiquetaOrigen: etiquetaOrigenTexto,
      },
      confirmar: 'Confirmar cambio',
    },
  };
}

function nombreDiaExiste(menu: DiaMenu[], dia: string): boolean {
  const clave = normalizar(dia);
  return menu.some((item) => normalizar(item.dia) === clave);
}

function buscarDia(menu: DiaMenu[], dia: string): DiaMenu | undefined {
  const clave = normalizar(dia);
  return menu.find((item) => normalizar(item.dia) === clave);
}

function detectarMomento(consulta: string): MomentoAccionMenu | null {
  if (/\b(cena|cenas|cenar|cenamos|por la noche)\b/.test(consulta)) return 'cena';
  if (/\b(comida|comidas|comer|comemos|mediodia|almuerzo|almuerzos)\b/.test(consulta)) return 'comida';
  return null;
}

function limpiarObjetivoMenu(texto: string): string {
  return texto
    .replace(/\b(el|la|los|las)\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/gi, ' ')
    .replace(/\b(para|en)\s+(la\s+)?(comida|cena)\b/gi, ' ')
    .replace(/\b(para\s+)?(comer|cenar)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function puntuacionReceta(nombre: string, objetivo: string): number {
  const n = normalizar(nombre);
  const o = normalizar(objetivo);
  if (!o) return -1;
  if (n === o) return 100;
  if (n.startsWith(o)) return 80;
  if (n.includes(o)) return 70;
  const tokens = o.split(' ').filter((token) => token.length >= 3);
  const coincidencias = tokens.filter((token) => n.includes(token)).length;
  return coincidencias === 0 ? -1 : coincidencias * 10 - Math.abs(n.length - o.length) / 100;
}

function resolverReceta(
  objetivo: string,
  recetas: Receta[],
): { nombre?: string; ambiguas?: string[] } {
  const candidatas = recetas
    .filter((receta) => receta.tipo !== 'postre')
    .map((receta) => ({
      nombre: receta.nombre,
      puntuacion: puntuacionReceta(receta.nombre, objetivo),
    }))
    .filter((item) => item.puntuacion >= 0)
    .sort((a, b) => b.puntuacion - a.puntuacion || a.nombre.localeCompare(b.nombre, 'es'));

  if (candidatas.length === 0) return {};

  const mejor = candidatas[0];
  const cercanas = candidatas.filter(
    (item) => item.puntuacion >= mejor.puntuacion - 3,
  );
  if (cercanas.length > 1 && mejor.puntuacion < 80) {
    return { ambiguas: cercanas.slice(0, 4).map((item) => item.nombre) };
  }
  return { nombre: mejor.nombre };
}

function extraerCambioMenu(
  original: string,
  consulta: string,
  menu: DiaMenu[],
  recetas: Receta[],
  semana?: SemanaMenu,
  fechaReferencia: Date | string = new Date(),
): ResultadoDeteccionAccion | null {
  const pareceCambio =
    /\b(cambia|cambiame|sustituye|reemplaza|pon|ponme|mete)\b/.test(consulta);
  if (!pareceCambio) return null;

  const resolucionReferencias = resolverReferenciasDia(
    consulta,
    semana,
    fechaReferencia,
  );
  if (resolucionReferencias.error) {
    return { aclaracion: resolucionReferencias.error };
  }
  if (resolucionReferencias.referencias.length === 0) return null;
  if (resolucionReferencias.referencias.length > 1) {
    return {
      aclaracion:
        'Veo más de un día en la orden. Para cambiar un plato concreto dime un único día de destino.',
    };
  }
  const dia = resolucionReferencias.referencias[0].dia;
  if (!nombreDiaExiste(menu, dia)) {
    return { aclaracion: `No encuentro ${dia} en la semana activa.` };
  }

  let momento = detectarMomento(consulta);
  const conPor = original.match(/\b(?:por|a)\s+(.+)$/i);
  const conPon = original.match(
    /\b(?:pon|ponme|mete)\s+(.+?)\s+(?:(?:el\s+)?(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)(?:\s+\d{1,2})?|(?:para\s+)?(?:hoy|mañana|manana|pasado\s+mañana|pasado\s+manana|ayer|anteayer)|(?:el|día|dia)\s+\d{1,2})\b/i,
  );
  let objetivo = conPor?.[1]?.trim() ?? conPon?.[1]?.trim() ?? '';

  objetivo = limpiarObjetivoMenu(objetivo);
  if (!objetivo) {
    return {
      aclaracion: `Dime qué plato quieres poner el ${dia.toLocaleLowerCase('es')}.`,
    };
  }

  if (!momento) {
    // En órdenes breves del tipo "pon salmón el sábado", la propuesta usa comida,
    // pero siempre queda visible antes de confirmar y puede cancelarse.
    momento = 'comida';
  }

  const resuelta = resolverReceta(objetivo, recetas);
  if (resuelta.ambiguas?.length) {
    return {
      aclaracion: `He encontrado varias recetas parecidas: ${resuelta.ambiguas.join(', ')}. Dime cuál quieres.`,
    };
  }
  if (!resuelta.nombre) {
    return {
      aclaracion: `No encuentro una receta que encaje con “${objetivo}”. Puedes crearla primero en Recetas o decirme otro plato.`,
    };
  }

  const diaMenu = buscarDia(menu, dia);
  if (!diaMenu) return null;
  const anteriores = momento === 'comida' ? diaMenu.comida : diaMenu.cena;

  return {
    propuesta: {
      titulo: `Cambiar ${momento} del ${dia.toLocaleLowerCase('es')}`,
      resumen: `Voy a sustituir ${anteriores.join(' + ') || 'el plan actual'} por ${resuelta.nombre}.`,
      cambios: [
        `Día: ${dia}`,
        `Momento: ${momento === 'comida' ? 'Comida' : 'Cena'}`,
        `Antes: ${anteriores.join(' + ') || 'Sin plan'}`,
        `Después: ${resuelta.nombre}`,
        'La lista de la compra se recalculará con el nuevo menú.',
      ],
      accion: {
        tipo: 'cambiar-menu',
        dia,
        momento,
        platoNuevo: resuelta.nombre,
        platosAnteriores: [...anteriores],
      },
      confirmar: 'Confirmar cambio',
    },
  };
}


export type IntencionPropuestaPendiente =
  | 'confirmar'
  | 'cancelar'
  | 'deshacer'
  | null;

export function detectarIntencionPropuestaPendiente(
  pregunta: string,
): IntencionPropuestaPendiente {
  const consulta = normalizar(pregunta);

  if (
    /^(?:si|si hazlo|si confirma|hazlo|confirma|confirmar|adelante|aplicalo|aplica el cambio)$/.test(
      consulta,
    )
  ) {
    return 'confirmar';
  }

  if (
    /^(?:no|cancela|cancelalo|cancelar|dejalo|olvidalo|no lo hagas)$/.test(
      consulta,
    )
  ) {
    return 'cancelar';
  }

  if (
    /^(?:deshazlo|deshacer|deshaz el ultimo cambio|vuelve atras|volver atras|restaura el menu anterior)$/.test(
      consulta,
    )
  ) {
    return 'deshacer';
  }

  return null;
}

function clonarMenu(menu: DiaMenu[]): DiaMenu[] {
  return menu.map((dia) => ({
    ...dia,
    comida: [...dia.comida],
    cena: [...dia.cena],
  }));
}

export function crearPropuestaDeshacerMenu(
  menuAntes: DiaMenu[],
  menuDespues: DiaMenu[],
  descripcion: string,
): PropuestaAccionAsistente {
  return {
    titulo: 'Deshacer último cambio de menú',
    resumen: `Voy a deshacer ${descripcion} y restaurar el menú tal como estaba antes.`,
    cambios: [
      `Cambio a deshacer: ${descripcion}`,
      'Primero comprobaré que el menú no haya cambiado desde entonces.',
      'La lista de la compra se recalculará con el menú restaurado.',
    ],
    accion: {
      tipo: 'restaurar-menu',
      menuAntes: clonarMenu(menuAntes),
      menuDespues: clonarMenu(menuDespues),
      descripcion,
    },
    confirmar: 'Confirmar deshacer',
  };
}

export function ajustarPropuestaPendiente(
  pregunta: string,
  propuesta: PropuestaAccionAsistente,
  menu: DiaMenu[],
  semana?: SemanaMenu,
  fechaReferencia: Date | string = new Date(),
): ResultadoDeteccionAccion | null {
  const consulta = normalizar(pregunta);
  const pareceAjuste =
    /\b(mejor|prefiero|cambialo|cambiala|ponlo|ponla|que sea|en vez de)\b/.test(
      consulta,
    );

  if (!pareceAjuste) return null;

  const accion = propuesta.accion;
  if (
    accion.tipo !== 'cambiar-menu' &&
    accion.tipo !== 'copiar-menu' &&
    accion.tipo !== 'mover-menu' &&
    accion.tipo !== 'intercambiar-menu'
  ) {
    return null;
  }

  const resolucionReferencias = resolverReferenciasDia(
    consulta,
    semana,
    fechaReferencia,
  );
  if (resolucionReferencias.error) {
    return { aclaracion: resolucionReferencias.error };
  }
  const referencias = resolucionReferencias.referencias;
  if (referencias.length > 1) {
    return {
      aclaracion:
        'Para retocar una propuesta pendiente indícame solo el nuevo día de destino. Si quieres cambiar origen y destino, dame la orden completa.',
    };
  }

  const referenciaDestino = referencias[0];
  const momentoPedido = detectarMomento(consulta);
  if (!referenciaDestino && !momentoPedido) return null;

  if (accion.tipo === 'intercambiar-menu') {
    return {
      aclaracion:
        'En un intercambio no quiero adivinar cuál de los dos lados quieres cambiar. Dime de nuevo los dos días y si hablamos de comida o cena.',
    };
  }

  const diaActual =
    accion.tipo === 'cambiar-menu' ? accion.dia : accion.diaDestino;
  const momentoActual =
    accion.tipo === 'cambiar-menu' ? accion.momento : accion.momentoDestino;

  const diaNuevo = referenciaDestino?.dia ?? diaActual;
  const momentoNuevo = momentoPedido ?? momentoActual;

  if (referenciaDestino) {
    const errorFecha = validarReferenciaFecha(referenciaDestino, semana);
    if (errorFecha) return { aclaracion: errorFecha };
  }

  if (!nombreDiaExiste(menu, diaNuevo)) {
    return { aclaracion: `No encuentro ${diaNuevo} en la semana activa.` };
  }

  if (
    normalizar(diaNuevo) === normalizar(diaActual) &&
    momentoNuevo === momentoActual
  ) {
    return {
      aclaracion:
        'La propuesta ya usa ese día y ese momento. Dime qué parte quieres cambiar.',
    };
  }

  const diaDestino = buscarDia(menu, diaNuevo);
  if (!diaDestino) return null;
  const destinoAntes =
    momentoNuevo === 'comida' ? diaDestino.comida : diaDestino.cena;
  const refDestino: ReferenciaDia =
    referenciaDestino ?? { dia: diaNuevo, indiceTexto: 0 };
  const etiquetaDestinoTexto = etiquetaDia(refDestino, semana);
  const nombreMomentoDestino = momentoNuevo === 'comida' ? 'Comida' : 'Cena';

  if (accion.tipo === 'cambiar-menu') {
    return {
      propuesta: {
        titulo: `Cambiar ${momentoNuevo} del ${etiquetaDestinoTexto.toLocaleLowerCase('es')}`,
        resumen: `Mantengo ${accion.platoNuevo}, pero lo pondré en la ${momentoNuevo} de ${etiquetaDestinoTexto}.`,
        cambios: [
          `Nuevo destino: ${etiquetaDestinoTexto} · ${nombreMomentoDestino}`,
          `Antes: ${destinoAntes.join(' + ') || 'Sin plan'}`,
          `Después: ${accion.platoNuevo}`,
          'La lista de la compra se recalculará con el cambio.',
        ],
        accion: {
          tipo: 'cambiar-menu',
          dia: diaNuevo,
          momento: momentoNuevo,
          platoNuevo: accion.platoNuevo,
          platosAnteriores: [...destinoAntes],
        },
        confirmar: 'Confirmar cambio',
      },
    };
  }

  const diaOrigen = buscarDia(menu, accion.diaOrigen);
  if (!diaOrigen) {
    return { aclaracion: `Ya no encuentro ${accion.diaOrigen} en la semana activa.` };
  }
  const origenAntes =
    accion.momentoOrigen === 'comida' ? diaOrigen.comida : diaOrigen.cena;

  if (origenAntes.length === 0) {
    return {
      aclaracion: `La ${accion.momentoOrigen} de ${accion.diaOrigen.toLocaleLowerCase('es')} está vacía. Ya no hay nada que usar como origen.`,
    };
  }

  if (
    normalizar(diaNuevo) === normalizar(accion.diaOrigen) &&
    momentoNuevo === accion.momentoOrigen
  ) {
    return {
      aclaracion:
        'El nuevo destino coincide con el origen. Elige otro día o cambia comida/cena.',
    };
  }

  const etiquetaOrigenTexto = etiquetaDia(
    { dia: accion.diaOrigen, indiceTexto: 0 },
    semana,
  );
  const nombreMomentoOrigen =
    accion.momentoOrigen === 'comida' ? 'Comida' : 'Cena';

  if (accion.tipo === 'copiar-menu') {
    if (mismosPlatos(destinoAntes, origenAntes)) {
      return {
        aclaracion:
          'Ese destino ya tiene exactamente lo mismo que el origen. No hace falta aplicar el cambio.',
      };
    }

    return {
      propuesta: {
        titulo: `Copiar ${accion.momentoOrigen} de ${etiquetaOrigenTexto.toLocaleLowerCase('es')}`,
        resumen: `Mantengo el origen en ${etiquetaOrigenTexto}, pero copiaré ${origenAntes.join(' + ')} en la ${momentoNuevo} de ${etiquetaDestinoTexto}.`,
        cambios: [
          `Destino: ${etiquetaDestinoTexto} · ${nombreMomentoDestino}`,
          `Antes: ${destinoAntes.join(' + ') || 'Sin plan'}`,
          `Origen: ${etiquetaOrigenTexto} · ${nombreMomentoOrigen}`,
          `Después: ${origenAntes.join(' + ')}`,
          'El origen se mantiene igual.',
          'La lista de la compra se recalculará con el cambio.',
        ],
        accion: {
          tipo: 'copiar-menu',
          diaDestino: diaNuevo,
          diaOrigen: accion.diaOrigen,
          momentoDestino: momentoNuevo,
          momentoOrigen: accion.momentoOrigen,
          platosAnteriores: [...destinoAntes],
          platosNuevos: [...origenAntes],
          etiquetaDestino: etiquetaDestinoTexto,
          etiquetaOrigen: etiquetaOrigenTexto,
        },
        confirmar: 'Confirmar cambio',
      },
    };
  }

  return {
    propuesta: {
      titulo: `Mover ${accion.momentoOrigen} de ${etiquetaOrigenTexto.toLocaleLowerCase('es')}`,
      resumen: `Mantengo el origen en ${etiquetaOrigenTexto}, pero moveré ${origenAntes.join(' + ')} a la ${momentoNuevo} de ${etiquetaDestinoTexto}.`,
      cambios: [
        `Destino: ${etiquetaDestinoTexto} · ${nombreMomentoDestino}`,
        `Antes en destino: ${destinoAntes.join(' + ') || 'Sin plan'}`,
        `Origen: ${etiquetaOrigenTexto} · ${nombreMomentoOrigen} · ${origenAntes.join(' + ')}`,
        `Después en destino: ${origenAntes.join(' + ')}`,
        'Después en origen: Sin plan',
        'La lista de la compra se recalculará con el cambio.',
      ],
      accion: {
        tipo: 'mover-menu',
        diaDestino: diaNuevo,
        diaOrigen: accion.diaOrigen,
        momentoDestino: momentoNuevo,
        momentoOrigen: accion.momentoOrigen,
        platosDestinoAntes: [...destinoAntes],
        platosOrigenAntes: [...origenAntes],
        etiquetaDestino: etiquetaDestinoTexto,
        etiquetaOrigen: etiquetaOrigenTexto,
      },
      confirmar: 'Confirmar movimiento',
    },
  };
}

export function crearPropuestaRepetirUltimaAccion(
  pregunta: string,
  propuestaAnterior: PropuestaAccionAsistente,
  menu: DiaMenu[],
  semana?: SemanaMenu,
  fechaReferencia: Date | string = new Date(),
): ResultadoDeteccionAccion | null {
  const consulta = normalizar(pregunta);
  const pideRepetir =
    /\b(?:haz|pon|repite|repetir)\b.*\b(?:lo mismo|igual)\b/.test(consulta) ||
    /\b(?:lo mismo|igual)\b.*\b(?:tambien|otro|otra)\b/.test(consulta);
  if (!pideRepetir) return null;

  const resolucion = resolverReferenciasDia(
    consulta,
    semana,
    fechaReferencia,
  );
  if (resolucion.error) return { aclaracion: resolucion.error };
  if (resolucion.referencias.length !== 1) {
    return {
      aclaracion:
        'Dime un único día para repetir el último cambio, por ejemplo “haz lo mismo también el viernes”.',
    };
  }

  const destino = resolucion.referencias[0];
  if (!nombreDiaExiste(menu, destino.dia)) {
    return {
      aclaracion: `No encuentro ${destino.dia} en la semana activa.`,
    };
  }

  const momentoPedido = detectarMomento(consulta);
  const accion = propuestaAnterior.accion;

  if (accion.tipo === 'cambiar-menu') {
    const momento = momentoPedido ?? accion.momento;
    const diaDestino = buscarDia(menu, destino.dia);
    if (!diaDestino) return null;
    const anteriores =
      momento === 'comida' ? diaDestino.comida : diaDestino.cena;

    if (
      normalizar(destino.dia) === normalizar(accion.dia) &&
      momento === accion.momento
    ) {
      return {
        aclaracion:
          'Ese es el mismo hueco del último cambio. Dime otro día o cambia comida/cena.',
      };
    }

    return {
      propuesta: {
        titulo: `Repetir cambio en ${etiquetaDia(destino, semana)}`,
        resumen: `Voy a poner también ${accion.platoNuevo} en la ${momento} de ${etiquetaDia(destino, semana)}.`,
        cambios: [
          `Destino: ${etiquetaDia(destino, semana)} · ${momento === 'comida' ? 'Comida' : 'Cena'}`,
          `Antes: ${anteriores.join(' + ') || 'Sin plan'}`,
          `Después: ${accion.platoNuevo}`,
          'La lista de la compra se recalculará con el cambio.',
        ],
        accion: {
          tipo: 'cambiar-menu',
          dia: destino.dia,
          momento,
          platoNuevo: accion.platoNuevo,
          platosAnteriores: [...anteriores],
        },
        confirmar: 'Confirmar cambio',
      },
    };
  }

  if (accion.tipo === 'copiar-menu') {
    const momentoDestino = momentoPedido ?? accion.momentoDestino;
    const origen = buscarDia(menu, accion.diaOrigen);
    const diaDestino = buscarDia(menu, destino.dia);
    if (!origen || !diaDestino) return null;

    const origenActual =
      accion.momentoOrigen === 'comida' ? origen.comida : origen.cena;
    if (!mismosPlatos(origenActual, accion.platosNuevos)) {
      return {
        aclaracion:
          'El origen del último cambio ya no tiene el mismo contenido. Prefiero que me indiques de nuevo qué quieres copiar.',
      };
    }

    const anteriores =
      momentoDestino === 'comida' ? diaDestino.comida : diaDestino.cena;
    if (
      normalizar(destino.dia) === normalizar(accion.diaOrigen) &&
      momentoDestino === accion.momentoOrigen
    ) {
      return {
        aclaracion:
          'Ese destino coincide con el origen. Dime otro día o cambia comida/cena.',
      };
    }

    return {
      propuesta: {
        titulo: `Repetir copia en ${etiquetaDia(destino, semana)}`,
        resumen: `Voy a copiar también ${origenActual.join(' + ')} en la ${momentoDestino} de ${etiquetaDia(destino, semana)}.`,
        cambios: [
          `Destino: ${etiquetaDia(destino, semana)} · ${momentoDestino === 'comida' ? 'Comida' : 'Cena'}`,
          `Antes: ${anteriores.join(' + ') || 'Sin plan'}`,
          `Origen: ${accion.etiquetaOrigen} · ${accion.momentoOrigen === 'comida' ? 'Comida' : 'Cena'}`,
          `Después: ${origenActual.join(' + ')}`,
          'El origen se mantiene igual.',
        ],
        accion: {
          tipo: 'copiar-menu',
          diaDestino: destino.dia,
          diaOrigen: accion.diaOrigen,
          momentoDestino,
          momentoOrigen: accion.momentoOrigen,
          platosAnteriores: [...anteriores],
          platosNuevos: [...origenActual],
          etiquetaDestino: etiquetaDia(destino, semana),
          etiquetaOrigen: accion.etiquetaOrigen,
        },
        confirmar: 'Confirmar cambio',
      },
    };
  }

  if (accion.tipo === 'excepcion-dia') {
    return {
      propuesta: {
        titulo: `Repetir excepción en ${etiquetaDia(destino, semana)}`,
        resumen:
          accion.excepcion === 'noEnCasa'
            ? `Marcaré también ${etiquetaDia(destino, semana)} como fuera de casa.`
            : accion.excepcion === 'sinComida'
              ? `Quitaré también la comida de ${etiquetaDia(destino, semana)} del cálculo.`
              : `Quitaré también la cena de ${etiquetaDia(destino, semana)} del cálculo.`,
        cambios: [
          'Repite exactamente la última excepción familiar en otro día.',
          'La compra y las cantidades se recalcularán después de confirmar.',
        ],
        accion: {
          tipo: 'excepcion-dia',
          dia: destino.dia,
          excepcion: accion.excepcion,
          activa: accion.activa,
        },
        confirmar: 'Confirmar',
      },
    };
  }

  if (accion.tipo === 'mover-menu' || accion.tipo === 'intercambiar-menu') {
    return {
      aclaracion:
        'El último cambio movía o intercambiaba dos huecos. Para repetirlo sin perder platos, dime de nuevo el origen y el destino completos.',
    };
  }

  return {
    aclaracion:
      'El último cambio no se puede repetir de forma segura con “lo mismo”. Dime la acción completa.',
  };
}

function unidadCompra(texto: string): UnidadProductoManual {
  const n = normalizar(texto);
  if (/\b(kg|kilo|kilos|kilogramo|kilogramos)\b/.test(n)) return 'kg';
  if (/\b(g|gramo|gramos)\b/.test(n)) return 'g';
  if (/\b(l|litro|litros)\b/.test(n)) return 'l';
  if (/\b(ml|mililitro|mililitros)\b/.test(n)) return 'ml';
  if (/\b(paquete|paquetes)\b/.test(n)) return 'paquete';
  if (/\b(envase|envases|bote|botes|botella|botellas)\b/.test(n)) return 'envase';
  return 'ud';
}

function extraerCompra(original: string, consulta: string): ResultadoDeteccionAccion | null {
  if (!/\b(anade|anademe|agrega|agregame|mete|meteme|apunta)\b/.test(consulta)) {
    return null;
  }
  if (!/\b(compra|lista|supermercado)\b/.test(consulta)) return null;

  const match = original.match(
    /\b(?:añade|anade|añádeme|anademe|agrega|agrégame|agregame|mete|méteme|meteme|apunta)\s+(.+?)(?:\s+(?:a|en)\s+(?:la\s+)?(?:compra|lista|supermercado))?\s*$/i,
  );
  if (!match) return null;

  let bloque = match[1].trim();
  const cantidadMatch = bloque.match(/^([0-9]+(?:[.,][0-9]+)?)\s*(kg|kilos?|kilogramos?|g|gramos?|l|litros?|ml|mililitros?|ud|uds|unidades?|paquetes?|envases?|botes?|botellas?)?\s+(?:de\s+)?(.+)$/i);
  let cantidad = 1;
  let unidad: UnidadProductoManual = 'ud';
  let nombre = bloque;

  if (cantidadMatch) {
    cantidad = Number(cantidadMatch[1].replace(',', '.'));
    unidad = unidadCompra(cantidadMatch[2] ?? '');
    nombre = cantidadMatch[3].trim();
  }

  nombre = nombre
    .replace(/\s+(?:a|en)\s+(?:la\s+)?(?:compra|lista|supermercado)\s*$/i, '')
    .trim();

  if (!nombre || !Number.isFinite(cantidad) || cantidad <= 0) {
    return { aclaracion: 'Dime qué producto y cantidad quieres añadir a la compra.' };
  }

  return {
    propuesta: {
      titulo: 'Añadir a la compra',
      resumen: `Añadiré ${cantidad.toLocaleString('es-ES')} ${unidad} de ${nombre} a la compra semanal.`,
      cambios: [
        `Producto: ${nombre}`,
        `Cantidad: ${cantidad.toLocaleString('es-ES')} ${unidad}`,
        'Tienda: Mercadona',
        'Se añadirá como producto manual y podrás marcarlo igual que el resto.',
      ],
      accion: {
        tipo: 'anadir-compra',
        nombre,
        cantidad,
        unidad,
        tienda: 'Mercadona',
      },
      confirmar: 'Añadir a Compra',
    },
  };
}

function extraerFinDeSemana(consulta: string): ResultadoDeteccionAccion | null {
  if (!/\b(finde|fin de semana|sabado y domingo)\b/.test(consulta)) return null;
  if (!/\b(ninos|nino|nina|ninas|peques)\b/.test(consulta)) return null;

  const sinNinos =
    /\b(no estan|no estaran|sin ninos|sin los ninos|se van|no vienen|no comen|no cenan)\b/.test(consulta);
  const conNinos =
    /\b(si estan|estaran|con ninos|con los ninos|vienen|se quedan)\b/.test(consulta);

  if (!sinNinos && !conNinos) {
    return {
      aclaracion: '¿Quieres marcar este fin de semana con niños o sin niños?',
    };
  }

  return {
    propuesta: {
      titulo: sinNinos ? 'Fin de semana sin niños' : 'Fin de semana con niños',
      resumen: sinNinos
        ? 'Ajustaré sábado y domingo para que las cantidades no cuenten a los niños.'
        : 'Volveré a incluir a los niños en las cantidades de sábado y domingo.',
      cambios: [
        'Afecta al sábado y domingo de la semana activa.',
        'No cambia los platos del menú.',
        'Sí recalcula cantidades y compra para esos días.',
      ],
      accion: {
        tipo: 'fin-semana-sin-ninos',
        sinNinos,
      },
      confirmar: sinNinos ? 'Confirmar fin de semana' : 'Volver a incluir niños',
    },
  };
}

function extraerFueraCasa(
  consulta: string,
  menu: DiaMenu[],
  semana?: SemanaMenu,
  fechaReferencia: Date | string = new Date(),
): ResultadoDeteccionAccion | null {
  const resolucionReferencias = resolverReferenciasDia(
    consulta,
    semana,
    fechaReferencia,
  );
  if (resolucionReferencias.error) {
    return { aclaracion: resolucionReferencias.error };
  }
  if (resolucionReferencias.referencias.length === 0) return null;
  if (resolucionReferencias.referencias.length > 1) {
    return {
      aclaracion:
        'Para marcar una comida o cena fuera dime un único día.',
    };
  }
  const dia = resolucionReferencias.referencias[0].dia;
  if (!nombreDiaExiste(menu, dia)) return null;

  if (/\b(no estamos|fuera todo el dia|todo el dia fuera)\b/.test(consulta)) {
    return {
      propuesta: {
        titulo: `${dia}: fuera de casa`,
        resumen: 'Marcaré el día completo como fuera de casa.',
        cambios: [
          'Se excluirán comida y cena de ese día.',
          'La compra y las cantidades dejarán de contar ese día.',
        ],
        accion: { tipo: 'excepcion-dia', dia, excepcion: 'noEnCasa', activa: true },
        confirmar: 'Confirmar',
      },
    };
  }

  if (/\b(comemos fuera|comer fuera|sin comida)\b/.test(consulta)) {
    return {
      propuesta: {
        titulo: `${dia}: comida fuera`,
        resumen: 'Quitaré la comida de ese día del cálculo.',
        cambios: [
          'La cena se mantiene.',
          'La lista de la compra se recalculará sin esa comida.',
        ],
        accion: { tipo: 'excepcion-dia', dia, excepcion: 'sinComida', activa: true },
        confirmar: 'Confirmar comida fuera',
      },
    };
  }

  if (/\b(cenamos fuera|cenar fuera|sin cena)\b/.test(consulta)) {
    return {
      propuesta: {
        titulo: `${dia}: cena fuera`,
        resumen: 'Quitaré la cena de ese día del cálculo.',
        cambios: [
          'La comida se mantiene.',
          'La lista de la compra se recalculará sin esa cena.',
        ],
        accion: { tipo: 'excepcion-dia', dia, excepcion: 'sinCena', activa: true },
        confirmar: 'Confirmar cena fuera',
      },
    };
  }

  return null;
}

export function detectarAccionAsistente(
  pregunta: string,
  menuEditable: DiaMenu[],
  recetas: Receta[],
  semanaActiva?: SemanaMenu,
  fechaReferencia: Date | string = new Date(),
): ResultadoDeteccionAccion | null {
  const consulta = normalizar(pregunta);

  return (
    extraerCopiaEntreDias(
      consulta,
      menuEditable,
      semanaActiva,
      fechaReferencia,
    ) ??
    extraerFinDeSemana(consulta) ??
    extraerFueraCasa(
      consulta,
      menuEditable,
      semanaActiva,
      fechaReferencia,
    ) ??
    extraerCompra(pregunta, consulta) ??
    extraerCambioMenu(
      pregunta,
      consulta,
      menuEditable,
      recetas,
      semanaActiva,
      fechaReferencia,
    )
  );
}
