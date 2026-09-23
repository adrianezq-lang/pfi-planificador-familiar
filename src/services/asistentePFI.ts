import type { DiaMenu } from '../data/Menusemanal';
import type { SemanaMenu } from '../data/MenuMensual';
import type { Receta } from '../data/Recetas';
import type { ResultadoCompra } from '../motor/compra';
import type { ProductoDespensa } from './despensa';
import type { ResumenAprendizaje } from './aprendizaje';
import type { PerfilFamiliar } from './perfil';
import { cargarAsociacionesIngredientes } from './asociacionesIngredientes';
import { esRecetaPostre } from './recetas';
import {
  etiquetaReferenciaTemporal,
  resolverReferenciasTemporales,
} from './referenciasTemporales';

export type DestinoAsistente =
  | 'menu'
  | 'compra'
  | 'despensa'
  | 'recetas'
  | 'perfil'
  | 'catalogo';

export type RespuestaAsistentePFI = {
  titulo: string;
  resumen: string;
  puntos: string[];
  accion?: {
    etiqueta: string;
    destino: DestinoAsistente;
    ingrediente?: string;
  };
  tono?: 'normal' | 'positivo' | 'atencion';
};

export type ContextoAsistentePFI = {
  menuSemana: DiaMenu[];
  menuMes: DiaMenu[];
  menusSemanas: DiaMenu[][];
  semanaActiva: number;
  semanaMenuActiva?: SemanaMenu;
  mesActivo: string;
  compraSemana: ResultadoCompra | null;
  compraPendienteNombres: string[];
  compraPendienteTotal: number;
  compraPendienteCantidad: number;
  compraMes: ResultadoCompra | null;
  comprasSemanas: ResultadoCompra[];
  despensa: ProductoDespensa[];
  recetas: Receta[];
  aprendizaje: ResumenAprendizaje;
  perfil: PerfilFamiliar;
};

export type ResumenProactivoAsistente = {
  hoy: string;
  compra: string;
  despensa: string;
  presupuesto: string;
  alertas: string[];
};

const DIAS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const;

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function euros(valor: number): string {
  return valor.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
}

function listaCorta(valores: string[], maximo = 4): string {
  const limpios = valores.map((valor) => valor.trim()).filter(Boolean);
  if (limpios.length <= maximo) return limpios.join(', ');
  return `${limpios.slice(0, maximo).join(', ')} y ${limpios.length - maximo} más`;
}

function buscarDiaMenu(menu: DiaMenu[], nombre: string): DiaMenu | undefined {
  return menu.find((dia) => normalizar(dia.dia) === normalizar(nombre));
}

function diaActual(
  contexto: ContextoAsistentePFI,
  fechaReferencia: Date | string = new Date(),
): DiaMenu | undefined {
  if (contexto.semanaMenuActiva) {
    const resolucion = resolverReferenciasTemporales(
      'hoy',
      contexto.semanaMenuActiva,
      fechaReferencia,
    );
    const referencia = resolucion.referencias[0];
    if (resolucion.error || !referencia) return undefined;
    return buscarDiaMenu(contexto.menuSemana, referencia.dia);
  }

  const fecha =
    typeof fechaReferencia === 'string'
      ? new Date(
          /^\d{4}-\d{2}-\d{2}$/.test(fechaReferencia)
            ? `${fechaReferencia}T12:00:00`
            : fechaReferencia,
        )
      : new Date(fechaReferencia);
  const nombre = DIAS[fecha.getDay()];
  return buscarDiaMenu(contexto.menuSemana, nombre);
}

function platosSemana(menu: DiaMenu[]): string[] {
  return menu.flatMap((dia) => [...dia.comida, ...dia.cena]);
}

function productosReposicion(despensa: ProductoDespensa[]): ProductoDespensa[] {
  return despensa
    .filter(
      (producto) =>
        producto.frecuencia !== 'manual' &&
        producto.stockMinimo > 0 &&
        producto.stockActual < producto.stockMinimo,
    )
    .sort((a, b) => {
      const proporcionA = a.stockMinimo > 0 ? a.stockActual / a.stockMinimo : 1;
      const proporcionB = b.stockMinimo > 0 ? b.stockActual / b.stockMinimo : 1;
      return proporcionA - proporcionB;
    });
}

function previsionMes(contexto: ContextoAsistentePFI): number {
  const semanal = contexto.comprasSemanas.reduce(
    (total, compra) => total + compra.total,
    0,
  );
  return semanal + (contexto.compraMes?.total ?? 0);
}

function platosQuePuedeCocinar(
  contexto: ContextoAsistentePFI,
): Array<{ nombre: string; cobertura: number; faltan: string[] }> {
  const asociaciones = cargarAsociacionesIngredientes();
  const stockPorProducto = new Map(
    contexto.despensa.map((producto) => [
      producto.productoId,
      producto.stockActual,
    ]),
  );

  return contexto.recetas
    .filter((receta) => !esRecetaPostre(receta))
    .map((receta) => {
      const ingredientesConProducto = receta.ingredientes
        .map((ingrediente) => ({
          nombre: ingrediente.nombre,
          productoId: asociaciones[ingrediente.nombre],
        }))
        .filter(
          (
            ingrediente,
          ): ingrediente is { nombre: string; productoId: string } =>
            typeof ingrediente.productoId === 'string' &&
            ingrediente.productoId.length > 0,
        );

      if (ingredientesConProducto.length === 0) {
        return { nombre: receta.nombre, cobertura: 0, faltan: [] };
      }

      const disponibles = ingredientesConProducto.filter(
        (ingrediente) => (stockPorProducto.get(ingrediente.productoId) ?? 0) > 0,
      );
      const faltan = ingredientesConProducto
        .filter(
          (ingrediente) =>
            (stockPorProducto.get(ingrediente.productoId) ?? 0) <= 0,
        )
        .map((ingrediente) => ingrediente.nombre);

      return {
        nombre: receta.nombre,
        cobertura: disponibles.length / ingredientesConProducto.length,
        faltan,
      };
    })
    .filter((resultado) => resultado.cobertura > 0)
    .sort(
      (a, b) =>
        b.cobertura - a.cobertura ||
        a.faltan.length - b.faltan.length ||
        a.nombre.localeCompare(b.nombre, 'es'),
    )
    .slice(0, 5);
}

function revisionSemana(contexto: ContextoAsistentePFI): string[] {
  const platos = platosSemana(contexto.menuSemana);
  const normalizados = platos.map(normalizar);
  const contar = (patron: RegExp) =>
    normalizados.filter((plato) => patron.test(plato)).length;

  const legumbres = contar(/lentej|garbanz|alubia/);
  const pescado = contar(/salmon|lubina|dorada|bacalao|atun|pescad/);
  const ensaladaPasta = normalizados.some((plato) =>
    plato.startsWith('ensalada de pasta'),
  );
  const viernes = contexto.menuSemana.find(
    (dia) => normalizar(dia.dia) === 'viernes',
  );
  const pizzaViernes = Boolean(
    viernes?.cena.some((plato) => normalizar(plato).includes('pizza')),
  );

  return [
    `${legumbres} comida${legumbres === 1 ? '' : 's'} con legumbres esta semana.`,
    `${pescado} comida${pescado === 1 ? '' : 's'} con pescado o atún.`,
    ensaladaPasta
      ? 'La ensalada de pasta semanal está incluida.'
      : 'No veo la ensalada de pasta semanal.',
    pizzaViernes
      ? 'La pizza del viernes está respetada.'
      : 'El viernes no aparece pizza en la cena.',
  ];
}

function preparacionesSemana(menu: DiaMenu[]): string[] {
  const preparaciones = menu
    .map((dia) => dia.preparar?.trim())
    .filter((valor): valor is string => Boolean(valor))
    .filter((valor) => normalizar(valor) !== 'nada');

  return Array.from(new Set(preparaciones));
}


type PrioridadFamiliar = {
  nivel: 1 | 2 | 3;
  texto: string;
  destino: DestinoAsistente;
  ingrediente?: string;
};

function totalComensales(configuracion: {
  adultos: number;
  ninos: boolean[];
  bebes: number;
}): number {
  return (
    configuracion.adultos +
    configuracion.ninos.filter(Boolean).length +
    configuracion.bebes
  );
}

function comensalesDelDia(
  contexto: ContextoAsistentePFI,
  dia: string,
): { comida: number; cena: number } {
  const finDeSemana =
    normalizar(dia) === 'sabado' || normalizar(dia) === 'domingo';
  const comida = finDeSemana
    ? contexto.perfil.comensales.comidaFinSemana
    : contexto.perfil.comensales.comidaLaborable;

  return {
    comida: totalComensales(comida),
    cena: totalComensales(contexto.perfil.comensales.cena),
  };
}

function planDiaRelativo(
  contexto: ContextoAsistentePFI,
  literal: 'hoy' | 'manana',
  fechaReferencia: Date | string,
): {
  etiqueta: string;
  dia: DiaMenu;
  comensales: { comida: number; cena: number };
} | null {
  if (!contexto.semanaMenuActiva) return null;
  const referencia = resolverReferenciasTemporales(
    literal,
    contexto.semanaMenuActiva,
    fechaReferencia,
  );
  if (referencia.error || referencia.referencias.length !== 1) return null;

  const ref = referencia.referencias[0];
  const dia = buscarDiaMenu(contexto.menuSemana, ref.dia);
  if (!dia) return null;

  return {
    etiqueta: etiquetaReferenciaTemporal(ref),
    dia,
    comensales: comensalesDelDia(contexto, ref.dia),
  };
}

function prioridadesFamiliares(
  contexto: ContextoAsistentePFI,
  fechaReferencia: Date | string,
): PrioridadFamiliar[] {
  const prioridades: PrioridadFamiliar[] = [];
  const compra = contexto.compraSemana;
  const prevision = previsionMes(contexto);
  const presupuesto = contexto.perfil.presupuesto;
  const reposicion = productosReposicion(contexto.despensa);
  const hoy = planDiaRelativo(contexto, 'hoy', fechaReferencia);
  const manana = planDiaRelativo(contexto, 'manana', fechaReferencia);

  if (presupuesto > 0 && prevision > presupuesto) {
    prioridades.push({
      nivel: 1,
      texto: `La previsión mensual supera el objetivo en ${euros(
        prevision - presupuesto,
      )}.`,
      destino: 'compra',
    });
  }

  if (compra && compra.productosSinSeleccionar.length > 0) {
    prioridades.push({
      nivel: 1,
      texto: `${compra.productosSinSeleccionar.length} ingrediente(s) no tienen producto asociado (${listaCorta(compra.productosSinSeleccionar, 2)}); la compra puede quedar incompleta.`,
      destino: 'recetas',
      ingrediente: compra.productosSinSeleccionar[0],
    });
  }

  if ((compra?.productosSinPrecio.length ?? 0) > 0) {
    prioridades.push({
      nivel: 2,
      texto: `${compra?.productosSinPrecio.length ?? 0} producto(s) no tienen precio y el presupuesto está subestimado.`,
      destino: 'compra',
    });
  }

  if ((compra?.productosEstimados.length ?? 0) > 0) {
    prioridades.push({
      nivel: 2,
      texto: `${compra?.productosEstimados.length ?? 0} producto(s) usan una cantidad estimada; conviene revisarlos si buscas una compra muy precisa.`,
      destino: 'compra',
    });
  }

  for (const plan of [hoy, manana]) {
    if (!plan) continue;
    if (plan.dia.comida.length === 0) {
      prioridades.push({
        nivel: 1,
        texto: `${plan.etiqueta}: la comida está sin plan en el menú efectivo.`,
        destino: 'menu',
      });
    }
    if (plan.dia.cena.length === 0) {
      prioridades.push({
        nivel: 1,
        texto: `${plan.etiqueta}: la cena está sin plan en el menú efectivo.`,
        destino: 'menu',
      });
    }
  }

  if (contexto.compraPendienteCantidad > 0) {
    prioridades.push({
      nivel: 2,
      texto: `Quedan ${contexto.compraPendienteCantidad} producto(s) pendientes de la compra semanal por unos ${euros(
        contexto.compraPendienteTotal,
      )}.`,
      destino: 'compra',
    });
  }

  if (reposicion.length > 0) {
    prioridades.push({
      nivel: 2,
      texto: `${reposicion.length} producto(s) están por debajo del stock mínimo configurado.`,
      destino: 'despensa',
    });
  }

  const preparaciones48h = [hoy, manana]
    .flatMap((plan) => (plan?.dia.preparar?.trim() ? [plan.dia.preparar.trim()] : []))
    .filter((valor) => normalizar(valor) !== 'nada');

  if (preparaciones48h.length > 0) {
    prioridades.push({
      nivel: 3,
      texto: `Puedes adelantar: ${listaCorta(
        Array.from(new Set(preparaciones48h)),
        3,
      )}.`,
      destino: 'menu',
    });
  }

  return prioridades
    .sort((a, b) => a.nivel - b.nivel)
    .filter(
      (prioridad, indice, todas) =>
        todas.findIndex((otra) => otra.texto === prioridad.texto) === indice,
    );
}

function textoPlanDia(plan: {
  etiqueta: string;
  dia: DiaMenu;
  comensales: { comida: number; cena: number };
}): string {
  const comida = plan.dia.comida.join(' + ') || 'sin plan';
  const cena = plan.dia.cena.join(' + ') || 'sin plan';
  return `${plan.etiqueta}: ${comida} para comer (${plan.comensales.comida}) · ${cena} para cenar (${plan.comensales.cena}).`;
}

function respuestaPlanFamiliar(
  contexto: ContextoAsistentePFI,
  fechaReferencia: Date | string,
): RespuestaAsistentePFI {
  const hoy = planDiaRelativo(contexto, 'hoy', fechaReferencia);
  const manana = planDiaRelativo(contexto, 'manana', fechaReferencia);
  const prioridades = prioridadesFamiliares(contexto, fechaReferencia);
  const puntos: string[] = [];

  if (hoy) puntos.push(textoPlanDia(hoy));
  if (manana) puntos.push(textoPlanDia(manana));
  if (!hoy || !manana) {
    puntos.push(hoy
      ? 'Mañana queda fuera de la semana seleccionada; elige la semana siguiente para completar el plan de 48 h.'
      : 'La semana seleccionada no contiene hoy; elige la semana actual para planificar las próximas 48 h.');
  }

  const preparaciones = [hoy, manana]
    .flatMap((plan) => (plan?.dia.preparar?.trim() ? [plan.dia.preparar.trim()] : []))
    .filter((valor) => normalizar(valor) !== 'nada');

  if (preparaciones.length > 0) {
    puntos.push(
      `Adelanta si puedes: ${listaCorta(
        Array.from(new Set(preparaciones)),
        3,
      )}.`,
    );
  }

  if (contexto.compraPendienteCantidad > 0) {
    puntos.push(
      `Compra pendiente: ${contexto.compraPendienteCantidad} producto(s), unos ${euros(
        contexto.compraPendienteTotal,
      )}.`,
    );
  } else {
    puntos.push('La compra semanal no tiene productos pendientes registrados.');
  }

  if (prioridades.length > 0) {
    puntos.push(`Prioridad principal: ${prioridades[0].texto}`);
  } else {
    puntos.push('No veo incidencias importantes en menú, compra, stock o presupuesto.');
  }

  const destino = prioridades[0]?.destino ?? 'menu';
  return {
    titulo: 'Copiloto familiar · próximas 48 h',
    resumen: hoy && manana
      ? 'He cruzado menú, comensales, compra, despensa, preparación y presupuesto para darte un plan corto y accionable.'
      : 'El menú seleccionado no cubre las próximas 48 h completas; los avisos de compra y presupuesto corresponden a esa semana.',
    puntos: puntos.slice(0, 6),
    accion: {
      etiqueta:
        destino === 'compra'
          ? 'Revisar Compra'
          : destino === 'despensa'
            ? 'Revisar Despensa'
            : destino === 'recetas'
              ? 'Asociar ingrediente'
               : 'Abrir Menú',
      destino,
      ingrediente: prioridades[0]?.ingrediente,
    },
    tono: prioridades.some((prioridad) => prioridad.nivel === 1)
      ? 'atencion'
      : 'normal',
  };
}

function respuestaChequeoIntegral(
  contexto: ContextoAsistentePFI,
  fechaReferencia: Date | string,
): RespuestaAsistentePFI {
  const prioridades = prioridadesFamiliares(contexto, fechaReferencia);
  const compra = contexto.compraSemana;
  const cubiertas = compra?.lineasCubiertas?.length ?? 0;

  if (prioridades.length === 0) {
    return {
      titulo: 'Chequeo familiar · todo estable',
      resumen:
        'No veo problemas importantes en las áreas que PFI puede comprobar ahora mismo.',
      puntos: [
        planDiaRelativo(contexto, 'hoy', fechaReferencia) &&
        planDiaRelativo(contexto, 'manana', fechaReferencia)
          ? 'El menú de las próximas 48 horas tiene comida y cena planificadas.'
          : 'La semana seleccionada no cubre hoy y mañana completos; revisa la semana apropiada para comprobar las próximas 48 h.',
        'No hay avisos de stock mínimo, asociaciones o precios pendientes.',
        cubiertas > 0
          ? `${cubiertas} línea(s) de compra ya están cubiertas por stock y no hace falta recomprarlas.`
          : 'La compra calculada no muestra incidencias relevantes.',
      ],
      accion: { etiqueta: 'Ver Menú', destino: 'menu' },
      tono: 'positivo',
    };
  }

  const primera = prioridades[0];
  return {
    titulo: 'Chequeo familiar · prioridades',
    resumen: `He encontrado ${prioridades.length} punto(s) que merece la pena revisar, ordenados por impacto.`,
    puntos: prioridades.slice(0, 6).map((prioridad, indice) =>
      `${indice + 1}. ${prioridad.texto}`,
    ),
    accion: {
      etiqueta:
        primera.destino === 'recetas'
          ? 'Asociar ingrediente'
          : primera.destino === 'compra'
            ? 'Revisar Compra'
            : primera.destino === 'despensa'
              ? 'Revisar Despensa'
              : 'Abrir Menú',
      destino: primera.destino,
      ingrediente: primera.ingrediente,
    },
    tono: prioridades.some((prioridad) => prioridad.nivel === 1)
      ? 'atencion'
      : 'normal',
  };
}

function respuestaAhorroInteligente(
  contexto: ContextoAsistentePFI,
): RespuestaAsistentePFI {
  const compra = contexto.compraSemana;
  const prevision = previsionMes(contexto);
  const presupuesto = contexto.perfil.presupuesto;
  const diferencia = presupuesto - prevision;
  const cubiertas = compra?.lineasCubiertas?.length ?? 0;
  const puntos: string[] = [];

  if (presupuesto > 0 && prevision > 0) {
    puntos.push(
      diferencia >= 0
        ? `La previsión está ${euros(diferencia)} por debajo del objetivo mensual.`
        : `La previsión está ${euros(Math.abs(diferencia))} por encima del objetivo mensual.`,
    );
  }

  if (cubiertas > 0) {
    puntos.push(
      `${cubiertas} línea(s) ya están cubiertas por el stock registrado: no las vuelvas a comprar salvo que ajustes existencias.`,
    );
  }

  if ((compra?.productosSinSeleccionar.length ?? 0) > 0) {
    puntos.push(
      `Primero resuelve ${compra?.productosSinSeleccionar.length ?? 0} ingrediente(s) sin producto: comparar o recortar gasto antes de eso puede ser engañoso.`,
    );
  }

  if ((compra?.productosSinPrecio.length ?? 0) > 0) {
    puntos.push(
      `Hay ${compra?.productosSinPrecio.length ?? 0} producto(s) sin precio; el gasto real puede ser mayor que la previsión.`,
    );
  }

  if ((compra?.productosEstimados.length ?? 0) > 0) {
    puntos.push(
      `Revisa ${compra?.productosEstimados.length ?? 0} cantidad(es) estimadas para evitar comprar envases de más.`,
    );
  }

  if (contexto.compraPendienteCantidad > 0) {
    puntos.push(
      `Antes de añadir extras, la compra pendiente ya suma unos ${euros(
        contexto.compraPendienteTotal,
      )}.`,
    );
  }

  if (puntos.length === 0) {
    puntos.push(
      'No veo ahora mismo un ahorro claro basado en los datos registrados sin cambiar el menú.',
    );
    puntos.push(
      'La mejor forma de afinar más es mantener precios y stock actualizados para que PFI detecte duplicados y formatos innecesarios.',
    );
  }

  return {
    titulo: 'Ahorro inteligente',
    resumen:
      'No voy a proponerte recortes genéricos: he mirado dónde puede escaparse dinero dentro de tu PFI.',
    puntos: puntos.slice(0, 6),
    accion: { etiqueta: 'Revisar Compra', destino: 'compra' },
    tono: diferencia < 0 ? 'atencion' : 'normal',
  };
}

export function obtenerResumenProactivo(
  contexto: ContextoAsistentePFI,
  fechaReferencia: Date | string = new Date(),
): ResumenProactivoAsistente {
  const hoy = diaActual(contexto, fechaReferencia);
  const reposicion = productosReposicion(contexto.despensa);
  const compra = contexto.compraSemana;
  const prevision = previsionMes(contexto);
  const prioridades = prioridadesFamiliares(
    contexto,
    fechaReferencia,
  );
  const alertas = prioridades.slice(0, 4).map((prioridad) => prioridad.texto);

  return {
    hoy: hoy
      ? `Comida: ${hoy.comida.join(' + ')} · Cena: ${hoy.cena.join(' + ')}`
      : 'Hoy no está en la semana seleccionada; revisa la semana actual.',
    compra: compra
      ? `${contexto.compraPendienteCantidad} pendientes · ${euros(contexto.compraPendienteTotal)}`
      : 'Calculando la compra actual…',
    despensa:
      reposicion.length === 0
        ? 'No hay avisos de stock mínimo.'
        : `${reposicion.length} producto(s) necesitan reposición.`,
    presupuesto:
      prevision > 0
        ? `${euros(prevision)} previstos este mes · objetivo ${euros(
            contexto.perfil.presupuesto,
          )}`
        : `Objetivo mensual: ${euros(contexto.perfil.presupuesto)}`,
    alertas,
  };
}

export function responderAsistente(
  pregunta: string,
  contexto: ContextoAsistentePFI,
  fechaReferencia: Date | string = new Date(),
): RespuestaAsistentePFI {
  const consulta = normalizar(pregunta);
  const hoy = diaActual(contexto, fechaReferencia);
  const compra = contexto.compraSemana;
  const reposicion = productosReposicion(contexto.despensa);
  const presupuestoPrevisto = previsionMes(contexto);
  const preparaciones = preparacionesSemana(contexto.menuSemana);

  if (
    /\b(organizame|organiza mi dia|plan familiar|planificame|proximas 48|48 horas|ponme al dia|que deberia hacer|que tengo que hacer hoy|prioridades de hoy)\b/.test(
      consulta,
    )
  ) {
    return respuestaPlanFamiliar(contexto, fechaReferencia);
  }

  if (
    /\b(revisa todo|revision completa|chequeo completo|audita|que problemas ves|dime prioridades|prioridades familiares)\b/.test(
      consulta,
    )
  ) {
    return respuestaChequeoIntegral(contexto, fechaReferencia);
  }

  if (
    /\b(ahorrar|ahorro inteligente|como ahorro|como puedo ahorrar|reducir gasto|abaratar|optimiza la compra|optimizar compra)\b/.test(
      consulta,
    )
  ) {
    return respuestaAhorroInteligente(contexto);
  }

  const referenciaTemporal = resolverReferenciasTemporales(
    consulta,
    contexto.semanaMenuActiva,
    fechaReferencia,
  );
  const mencionaReferenciaTemporal =
    referenciaTemporal.referencias.length > 0 ||
    /\b(hoy|manana|pasado manana|ayer|anteayer)\b/.test(consulta) ||
    /\b(?:el|dia)\s+\d{1,2}\b/.test(consulta);

  if (mencionaReferenciaTemporal && referenciaTemporal.error) {
    return {
      titulo: 'Esa fecha queda fuera de la semana activa',
      resumen: referenciaTemporal.error,
      puntos: [
        'No voy a mezclar días de otra semana con el menú que tienes abierto.',
      ],
      accion: { etiqueta: 'Abrir Menú', destino: 'menu' },
      tono: 'atencion',
    };
  }

  if (referenciaTemporal.referencias.length === 1) {
    const referencia = referenciaTemporal.referencias[0];
    const dia = buscarDiaMenu(contexto.menuSemana, referencia.dia);
    if (!dia) {
      return {
        titulo: `No encuentro ${referencia.dia}`,
        resumen:
          'La referencia de fecha es válida, pero ese día no aparece en el menú activo.',
        puntos: ['Revisa la semana seleccionada antes de continuar.'],
        accion: { etiqueta: 'Abrir Menú', destino: 'menu' },
        tono: 'atencion',
      };
    }

    const pideCena = /\b(cena|cenar|cenamos|noche)\b/.test(consulta);
    const pideComida = /\b(comida|comer|comemos|almuerzo|mediodia)\b/.test(
      consulta,
    );
    const etiqueta = etiquetaReferenciaTemporal(referencia);

    if (pideCena && !pideComida) {
      return {
        titulo: `Cena · ${etiqueta}`,
        resumen: `Para cenar tienes ${dia.cena.join(' + ') || 'sin plan'}.`,
        puntos: [
          `Postre: ${dia.postreCenaReceta ?? dia.postreCena}.`,
          dia.preparar
            ? `Preparación marcada: ${dia.preparar}.`
            : 'No hay preparación adelantada marcada para ese día.',
        ],
        accion: { etiqueta: 'Ver en Menú', destino: 'menu' },
      };
    }

    if (pideComida && !pideCena) {
      return {
        titulo: `Comida · ${etiqueta}`,
        resumen: `Para comer tienes ${dia.comida.join(' + ') || 'sin plan'}.`,
        puntos: [
          `Postre: ${dia.postreComidaReceta ?? dia.postreComida}.`,
          dia.preparar
            ? `Preparación marcada: ${dia.preparar}.`
            : 'No hay preparación adelantada marcada para ese día.',
        ],
        accion: { etiqueta: 'Ver en Menú', destino: 'menu' },
      };
    }

    return {
      titulo: `Plan · ${etiqueta}`,
      resumen: `Comida: ${dia.comida.join(' + ') || 'sin plan'} · Cena: ${dia.cena.join(' + ') || 'sin plan'}.`,
      puntos: [
        `Postre comida: ${dia.postreComidaReceta ?? dia.postreComida}.`,
        `Postre cena: ${dia.postreCenaReceta ?? dia.postreCena}.`,
        dia.preparar
          ? `Preparación marcada: ${dia.preparar}.`
          : 'No hay preparación adelantada marcada para ese día.',
      ],
      accion: { etiqueta: 'Ver en Menú', destino: 'menu' },
    };
  }

  if (/hoy|comida|cena|cenar|comer/.test(consulta)) {
    if (!hoy) {
      return {
        titulo: 'No encuentro el día de hoy',
        resumen: 'El menú activo no contiene un día que coincida con la fecha actual.',
        puntos: ['Puedes revisar la semana activa y elegir el día correcto.'],
        accion: { etiqueta: 'Abrir Menú', destino: 'menu' },
        tono: 'atencion',
      };
    }

    return {
      titulo: `Plan de hoy · ${hoy.dia}`,
      resumen: `Tienes ${hoy.comida.join(' + ')} para comer y ${hoy.cena.join(
        ' + ',
      )} para cenar.`,
      puntos: [
        hoy.preparar
          ? `Para adelantar: ${hoy.preparar}.`
          : 'No hay una preparación adelantada marcada para hoy.',
        `Postre comida: ${hoy.postreComidaReceta ?? hoy.postreComida}.`,
        `Postre cena: ${hoy.postreCenaReceta ?? hoy.postreCena}.`,
      ],
      accion: { etiqueta: 'Ver el día en Menú', destino: 'menu' },
    };
  }

  if (/compr|falta|lista|supermercado|mercadona/.test(consulta)) {
    if (!compra) {
      return {
        titulo: 'Estoy calculando la compra',
        resumen: 'Todavía no tengo listo el cálculo de esta semana.',
        puntos: ['En unos segundos podré darte productos, total y avisos de datos.'],
        accion: { etiqueta: 'Abrir Compra', destino: 'compra' },
      };
    }

    const nombres = contexto.compraPendienteNombres;
    return {
      titulo: 'Compra de esta semana',
      resumen: contexto.compraPendienteCantidad === 0
        ? 'No veo productos pendientes de compra en esta semana.'
        : `Quedan ${contexto.compraPendienteCantidad} productos por unos ${euros(
            contexto.compraPendienteTotal,
          )}.`,
      puntos: [
        nombres.length > 0
          ? `Lo principal: ${listaCorta(nombres)}.`
          : 'No hay productos automáticos pendientes.',
        compra.productosSinSeleccionar.length > 0
          ? `${compra.productosSinSeleccionar.length} ingrediente(s) necesitan elegir producto.`
          : 'Todos los ingredientes tienen producto seleccionado.',
        compra.productosSinPrecio.length > 0
          ? `${compra.productosSinPrecio.length} producto(s) no tienen precio y no entran en el total.`
          : 'Los productos seleccionados tienen precio.',
      ],
      accion: { etiqueta: 'Ir a Compra', destino: 'compra' },
      tono:
        compra.productosSinSeleccionar.length + compra.productosSinPrecio.length >
        0
          ? 'atencion'
          : 'positivo',
    };
  }

  if (/presupuesto|gasto|dinero|ahorro|cuanto.*mes|coste.*mes/.test(consulta)) {
    const diferencia = contexto.perfil.presupuesto - presupuestoPrevisto;
    return {
      titulo: 'Previsión de gasto',
      resumen:
        presupuestoPrevisto > 0
          ? `PFI estima ${euros(presupuestoPrevisto)} para el mes frente a un objetivo de ${euros(
              contexto.perfil.presupuesto,
            )}.`
          : `Tu objetivo mensual configurado es ${euros(
              contexto.perfil.presupuesto,
            )}.`,
      puntos:
        presupuestoPrevisto > 0
          ? [
              diferencia >= 0
                ? `Ahora mismo estás ${euros(diferencia)} por debajo del objetivo previsto.`
                : `La previsión supera el objetivo en ${euros(Math.abs(diferencia))}.`,
              'La previsión combina la compra mensual y las compras semanales calculadas.',
              'Los productos sin precio pueden hacer que el total real sea algo mayor.',
            ]
          : ['Necesito que termine el cálculo de compra para comparar la previsión completa.'],
      accion: { etiqueta: 'Revisar Compra', destino: 'compra' },
      tono: diferencia >= 0 ? 'positivo' : 'atencion',
    };
  }

  if (/despensa|stock|reponer|reposicion|queda|tenemos/.test(consulta)) {
    return {
      titulo: 'Estado de la despensa',
      resumen:
        reposicion.length === 0
          ? 'No veo productos por debajo del stock mínimo configurado.'
          : `Hay ${reposicion.length} producto(s) que conviene reponer.`,
      puntos:
        reposicion.length === 0
          ? [
              `Tienes ${contexto.despensa.length} productos controlados en la despensa.`,
              'PFI seguirá descontando el stock cuando registres las compras.',
            ]
          : reposicion.slice(0, 5).map(
              (producto) =>
                `${producto.nombre}: ${producto.stockActual.toLocaleString(
                  'es-ES',
                )} de ${producto.stockMinimo.toLocaleString('es-ES')} ${producto.unidad}.`,
            ),
      accion: { etiqueta: 'Abrir Despensa', destino: 'despensa' },
      tono: reposicion.length > 0 ? 'atencion' : 'positivo',
    };
  }

  if (/cocinar|puedo hacer|que hago|con lo que tengo|receta/.test(consulta)) {
    const opciones = platosQuePuedeCocinar(contexto);
    if (opciones.length === 0) {
      return {
        titulo: 'Necesito más stock registrado',
        resumen:
          'No tengo suficiente información de despensa asociada a recetas para proponerte platos con confianza.',
        puntos: [
          'Añade o revisa el stock de los productos que sueles tener en casa.',
          'Cuantas más asociaciones de ingredientes estén completas, mejores serán estas propuestas.',
        ],
        accion: { etiqueta: 'Revisar Despensa', destino: 'despensa' },
        tono: 'atencion',
      };
    }

    return {
      titulo: 'Recetas cercanas a lo que tienes',
      resumen:
        'He comparado tus recetas con el stock registrado. Estas son las opciones con mejor cobertura.',
      puntos: opciones.slice(0, 4).map((opcion) => {
        const porcentaje = Math.round(opcion.cobertura * 100);
        return opcion.faltan.length === 0
          ? `${opcion.nombre}: cobertura registrada del ${porcentaje}%.`
          : `${opcion.nombre}: ${porcentaje}% · faltaría revisar ${listaCorta(
              opcion.faltan,
              2,
            )}.`;
      }),
      accion: { etiqueta: 'Ver Recetas', destino: 'recetas' },
    };
  }

  if (/adelantar|preparar|batch|cocinar antes|organizar semana/.test(consulta)) {
    return {
      titulo: 'Preparación semanal',
      resumen:
        preparaciones.length > 0
          ? `Hay ${preparaciones.length} preparación(es) que PFI ya tiene marcadas para adelantar.`
          : 'Esta semana no tiene preparaciones adelantadas definidas.',
      puntos:
        preparaciones.length > 0
          ? preparaciones.slice(0, 6).map((preparacion) => preparaciónTexto(preparacion))
          : ['Puedes añadir preparaciones desde Menú para que el asistente las tenga en cuenta.'],
      accion: { etiqueta: 'Ver preparación en Menú', destino: 'menu' },
    };
  }

  if (/revisa.*semana|equilibr|variedad|menu.*bien|como.*semana/.test(consulta)) {
    return {
      titulo: 'Revisión de la semana',
      resumen: 'He comprobado algunas reglas importantes del menú familiar.',
      puntos: revisionSemana(contexto),
      accion: { etiqueta: 'Abrir Menú', destino: 'menu' },
    };
  }

  if (/aprend|gusto|preferencia|valoracion|conoces/.test(consulta)) {
    const totalAjustes =
      contexto.aprendizaje.ajustesPorciones + contexto.aprendizaje.ajustesRecetas;
    return {
      titulo: 'Lo que PFI está aprendiendo',
      resumen: `Tengo ${contexto.aprendizaje.valoraciones} valoración(es) y ${contexto.aprendizaje.eleccionesMenu} elección(es) registradas.`,
      puntos: [
        `${contexto.aprendizaje.combinacionesMenu} combinaciones de menú conocidas.`,
        `${totalAjustes} ajuste(s) de cantidades aprendidos.`,
        'Valorar comidas como Gustó, Sobró, Faltó o No gustó mejora las siguientes propuestas.',
      ],
      accion: { etiqueta: 'Ir al Menú', destino: 'menu' },
    };
  }

  if (/precio|sin precio|dato|asociacion|producto.*elegir/.test(consulta)) {
    const sinProducto = compra?.productosSinSeleccionar.length ?? 0;
    const sinPrecio = compra?.productosSinPrecio.length ?? 0;
    return {
      titulo: 'Calidad de los datos',
      resumen:
        sinProducto + sinPrecio === 0
          ? 'La compra semanal no tiene avisos de producto o precio.'
          : 'Hay datos pendientes que pueden afectar a la precisión de la compra.',
      puntos: [
        `${sinProducto} ingrediente(s) sin producto seleccionado.`,
        `${sinPrecio} producto(s) sin precio.`,
        'Resolver estos avisos mejora tanto el presupuesto como las recomendaciones del asistente.',
      ],
      accion: {
        etiqueta: sinProducto > 0 ? 'Asociar ingrediente' : 'Abrir Compra',
        destino: sinProducto > 0 ? 'recetas' : 'compra',
        ingrediente: sinProducto > 0 ? compra?.productosSinSeleccionar[0] : undefined,
      },
      tono: sinProducto + sinPrecio > 0 ? 'atencion' : 'positivo',
    };
  }

  return {
    titulo: 'Puedo ayudarte con PFI',
    resumen:
      'Puedo cruzar el menú, la compra, la despensa, el presupuesto, tus recetas y el aprendizaje de la familia.',
    puntos: [
      'Prueba: “¿Qué toca hoy?” o “¿Qué tengo que comprar?”.',
      'También: “¿Cómo voy de presupuesto?” o “¿Qué puedo cocinar con lo que tengo?”.',
      'Puedo revisar la semana, el stock, los datos de Mercadona y lo que PFI está aprendiendo.',
    ],
  };
}

function preparaciónTexto(preparacion: string): string {
  return `Adelantar: ${preparacion}.`;
}
