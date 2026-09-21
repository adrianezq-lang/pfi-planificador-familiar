import type { DiaMenu } from '../data/Menusemanal';
import type { Receta } from '../data/Recetas';
import type { UnidadProductoManual } from './productosManualesCompra';

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
    .replace(/\s+/g, ' ')
    .trim();
}

const ETIQUETAS_DIA: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

function capitalizarDia(dia: string): string {
  return ETIQUETAS_DIA[dia] ?? (dia.charAt(0).toUpperCase() + dia.slice(1));
}

function diaMencionado(consulta: string): string | null {
  const dia = DIAS.find((valor) =>
    new RegExp(`\\b${valor}\\b`).test(consulta),
  );
  return dia ? capitalizarDia(dia) : null;
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
  if (/\b(cena|cenar|cenamos|por la noche)\b/.test(consulta)) return 'cena';
  if (/\b(comida|comer|comemos|mediodia|almuerzo)\b/.test(consulta)) return 'comida';
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
): ResultadoDeteccionAccion | null {
  const pareceCambio =
    /\b(cambia|cambiame|sustituye|reemplaza|pon|ponme|mete)\b/.test(consulta);
  if (!pareceCambio) return null;

  const dia = diaMencionado(consulta);
  if (!dia) return null;
  if (!nombreDiaExiste(menu, dia)) {
    return { aclaracion: `No encuentro ${dia} en la semana activa.` };
  }

  let momento = detectarMomento(consulta);
  const conPor = original.match(/\b(?:por|a)\s+(.+)$/i);
  const conPon = original.match(/\b(?:pon|ponme|mete)\s+(.+?)\s+(?:el\s+)?(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\b/i);
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

function extraerFueraCasa(consulta: string, menu: DiaMenu[]): ResultadoDeteccionAccion | null {
  const dia = diaMencionado(consulta);
  if (!dia || !nombreDiaExiste(menu, dia)) return null;

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
): ResultadoDeteccionAccion | null {
  const consulta = normalizar(pregunta);

  return (
    extraerFinDeSemana(consulta) ??
    extraerFueraCasa(consulta, menuEditable) ??
    extraerCompra(pregunta, consulta) ??
    extraerCambioMenu(pregunta, consulta, menuEditable, recetas)
  );
}
