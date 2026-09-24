import type { DiaMenu } from '../data/Menusemanal';
import type { SemanaMenu } from '../data/MenuMensual';
import type { Receta } from '../data/Recetas';
import type { ResultadoCompra } from '../motor/compra';
import type { ProductoDespensa } from './despensa';
import type { ResumenAprendizaje } from './aprendizaje';
import {
  obtenerHorarioServicio,
  type PerfilFamiliar,
} from './perfil';
import type {
  DesgloseEconomico,
  ResumenEconomicoMensual,
} from './resumenEconomico';
import { fechaLocalISO } from './fechaSemana';
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
  planMensual: SemanaMenu[];
  semanaActiva: number;
  semanaMenuActiva?: SemanaMenu;
  mesActivo: string;
  compraSemana: ResultadoCompra | null;
  compraPendienteNombres: string[];
  compraPendienteTotal: number;
  compraPendienteCantidad: number;
  compraPendienteSinImporte: number;
  compraMes: ResultadoCompra | null;
  comprasSemanas: ResultadoCompra[];
  resumenEconomico: ResumenEconomicoMensual;
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

function cantidadTexto(
  cantidad: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

function segunCantidad(cantidad: number, singular: string, plural: string): string {
  return cantidad === 1 ? singular : plural;
}

function causasImportePendiente(desglose: DesgloseEconomico): string {
  const causas: string[] = [];
  if (desglose.ingredientesSinProducto.length > 0) {
    causas.push(
      `${cantidadTexto(
        desglose.ingredientesSinProducto.length,
        'asociación de producto',
        'asociaciones de producto',
      )} (${listaCorta(
        desglose.ingredientesSinProducto,
        2,
      )})`,
    );
  }
  if (desglose.productosSinPrecio.length > 0) {
    causas.push(
      `${cantidadTexto(
        desglose.productosSinPrecio.length,
        'producto',
      )} sin precio (${listaCorta(
        desglose.productosSinPrecio,
        2,
      )})`,
    );
  }
  if (desglose.comprasManualesSinPrecio.length > 0) {
    causas.push(
      `${cantidadTexto(
        desglose.comprasManualesSinPrecio.length,
        'compra manual',
        'compras manuales',
      )} sin precio (${listaCorta(
        desglose.comprasManualesSinPrecio,
        2,
      )})`,
    );
  }
  return causas.join(' · ');
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
  return contexto.resumenEconomico.previsionMes;
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

type EscalaPrioridad = 1 | 2 | 3 | 4 | 5;

type PrioridadFamiliar = {
  impacto: EscalaPrioridad;
  urgencia: EscalaPrioridad;
  orden: number;
  texto: string;
  destino: DestinoAsistente;
  ingrediente?: string;
};

type MomentoComida = 'comida' | 'cena';

type EventoPlanFamiliar = {
  instante: Date;
  momento: MomentoComida;
  horario: string;
  dia: DiaMenu;
  platos: string[];
  comensales: number;
  etiqueta: string;
};

type VentanaPlanFamiliar = {
  ahora: Date;
  fin: Date;
  eventos: EventoPlanFamiliar[];
  coberturaCompleta: boolean;
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

function fechaReferenciaLocal(fechaReferencia: Date | string): Date {
  if (fechaReferencia instanceof Date) return new Date(fechaReferencia);
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaReferencia);
  if (soloFecha) {
    return new Date(
      Number(soloFecha[1]),
      Number(soloFecha[2]) - 1,
      Number(soloFecha[3]),
      12,
    );
  }
  return new Date(fechaReferencia);
}

function fechaLocalDesdeIso(
  fechaIso: string,
  hora = 12,
  minutos = 0,
): Date | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaIso);
  if (!partes) return null;
  return new Date(
    Number(partes[1]),
    Number(partes[2]) - 1,
    Number(partes[3]),
    hora,
    minutos,
  );
}

function etiquetaFechaEvento(instante: Date, ahora: Date): string {
  const fecha = fechaLocalISO(instante);
  const hoy = fechaLocalISO(ahora);
  const manana = new Date(ahora);
  manana.setDate(manana.getDate() + 1);
  const dia = `${DIAS[instante.getDay()]} ${instante.getDate()}`;
  if (fecha === hoy) return `Hoy · ${dia}`;
  if (fecha === fechaLocalISO(manana)) return `Mañana · ${dia}`;
  return dia;
}

function crearVentanaPlanFamiliar(
  contexto: ContextoAsistentePFI,
  fechaReferencia: Date | string,
): VentanaPlanFamiliar {
  const ahora = fechaReferenciaLocal(fechaReferencia);
  const fin = new Date(ahora.getTime() + 48 * 60 * 60 * 1000);
  const eventos: EventoPlanFamiliar[] = [];

  contexto.planMensual.forEach((semana, indiceSemana) => {
    const inicio = fechaLocalDesdeIso(semana.inicio);
    const finSemana = fechaLocalDesdeIso(semana.fin);
    if (!inicio || !finSemana) return;
    const menu = contexto.menusSemanas[indiceSemana] ?? semana.menu;

    for (
      const fecha = new Date(inicio);
      fecha <= finSemana;
      fecha.setDate(fecha.getDate() + 1)
    ) {
      const fechaIso = fechaLocalISO(fecha);
      const nombreDia = DIAS[fecha.getDay()];
      const dia = buscarDiaMenu(menu, nombreDia);
      if (!dia) continue;
      const comensales = comensalesDelDia(contexto, nombreDia);

      (['comida', 'cena'] as const).forEach((momento) => {
        const horario = obtenerHorarioServicio(contexto.perfil, momento);
        const instante = fechaLocalDesdeIso(
          fechaIso,
          horario.hora,
          horario.minutos,
        );
        if (!instante || instante < ahora || instante > fin) return;
        eventos.push({
          instante,
          momento,
          horario: horario.texto,
          dia,
          platos: momento === 'comida' ? dia.comida : dia.cena,
          comensales:
            momento === 'comida' ? comensales.comida : comensales.cena,
          etiqueta: etiquetaFechaEvento(instante, ahora),
        });
      });
    }
  });

  const fechasNecesarias = new Set<string>();
  const cursor = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
    12,
  );
  const ultimoDia = new Date(
    fin.getFullYear(),
    fin.getMonth(),
    fin.getDate(),
    12,
  );
  while (cursor <= ultimoDia) {
    fechasNecesarias.add(fechaLocalISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  const coberturaCompleta = Array.from(fechasNecesarias).every((fecha) =>
    contexto.planMensual.some(
      (semana) => semana.inicio <= fecha && fecha <= semana.fin,
    ),
  );

  return {
    ahora,
    fin,
    eventos: eventos.sort(
      (a, b) => a.instante.getTime() - b.instante.getTime(),
    ),
    coberturaCompleta,
  };
}

function horasHasta(instante: Date, ahora: Date): number {
  return Math.max(0, (instante.getTime() - ahora.getTime()) / 3_600_000);
}

function urgenciaPorHoras(horas: number): EscalaPrioridad {
  if (horas <= 8) return 5;
  if (horas <= 24) return 4;
  if (horas <= 48) return 3;
  return 1;
}

function prioridadesFamiliares(
  contexto: ContextoAsistentePFI,
  fechaReferencia: Date | string,
): PrioridadFamiliar[] {
  const prioridades: PrioridadFamiliar[] = [];
  const compra = contexto.compraSemana;
  const prevision = previsionMes(contexto);
  const precision = contexto.resumenEconomico.prevision;
  const presupuesto = contexto.perfil.presupuesto;
  const reposicion = productosReposicion(contexto.despensa);
  const ventana = crearVentanaPlanFamiliar(contexto, fechaReferencia);
  const primerEvento = ventana.eventos[0];
  const urgenciaCompra = primerEvento
    ? urgenciaPorHoras(horasHasta(primerEvento.instante, ventana.ahora))
    : 2;
  let orden = 0;

  if (contexto.compraPendienteCantidad > 0) {
    const ingredienteSinAsociar = compra?.productosSinSeleccionar[0];
    const textoPendiente = contexto.compraPendienteSinImporte > 0
      ? `${segunCantidad(contexto.compraPendienteCantidad, 'Queda', 'Quedan')} ${cantidadTexto(contexto.compraPendienteCantidad, 'producto')} ${segunCantidad(contexto.compraPendienteCantidad, 'pendiente', 'pendientes')}: ${euros(
          contexto.compraPendienteTotal,
        )} de subtotal conocido y ${cantidadTexto(contexto.compraPendienteSinImporte, 'importe')} sin valorar.`
      : `${segunCantidad(contexto.compraPendienteCantidad, 'Queda', 'Quedan')} ${cantidadTexto(contexto.compraPendienteCantidad, 'producto')} ${segunCantidad(contexto.compraPendienteCantidad, 'pendiente', 'pendientes')} de la compra semanal por ${euros(
          contexto.compraPendienteTotal,
        )}.`;
    prioridades.push({
      impacto: 5,
      urgencia: urgenciaCompra,
      orden: orden++,
      texto: `${textoPendiente}${
        ingredienteSinAsociar
          ? ` Empieza asociando ${ingredienteSinAsociar} al producto exacto.`
          : ''
      }`,
      destino: ingredienteSinAsociar ? 'recetas' : 'compra',
      ingrediente: ingredienteSinAsociar,
    });
  }

  ventana.eventos
    .filter((evento) => evento.platos.length === 0)
    .forEach((evento) => {
      prioridades.push({
        impacto: 5,
        urgencia: urgenciaPorHoras(
          horasHasta(evento.instante, ventana.ahora),
        ),
        orden: orden++,
        texto: `${evento.etiqueta}: la ${evento.momento} está sin plan en el menú efectivo.`,
        destino: 'menu',
      });
    });

  if (presupuesto > 0 && prevision > presupuesto) {
    const causasPendientes = causasImportePendiente(precision);
    prioridades.push({
      impacto: 5,
      urgencia: 2,
      orden: orden++,
      texto: `${precision.partidasSinImporte > 0 ? 'El subtotal conocido' : 'La previsión mensual'} supera el objetivo en ${euros(
        prevision - presupuesto,
      )}${precision.partidasSinImporte > 0 ? ` y aún faltan ${cantidadTexto(precision.partidasSinImporte, 'partida')} sin importe${causasPendientes ? ` por ${causasPendientes}` : ''}.` : '.'}`,
      destino: 'compra',
    });
  } else if (precision.partidasSinImporte > 0) {
    const causasPendientes = causasImportePendiente(precision);
    prioridades.push({
      impacto: 4,
      urgencia: 2,
      orden: orden++,
      texto: `La previsión mensual solo es un mínimo conocido de ${euros(prevision)}: faltan ${cantidadTexto(precision.partidasSinImporte, 'partida')} sin importe${causasPendientes ? ` por ${causasPendientes}` : ''}, así que el saldo aún no es real.`,
      destino: 'compra',
    });
  }

  if (compra && compra.productosSinSeleccionar.length > 0) {
    prioridades.push({
      impacto: 4,
      urgencia: urgenciaCompra,
      orden: orden++,
      texto: `Hay ${cantidadTexto(compra.productosSinSeleccionar.length, 'ingrediente')} sin producto asociado (${listaCorta(compra.productosSinSeleccionar, 2)}); la compra puede quedar incompleta.`,
      destino: 'recetas',
      ingrediente: compra.productosSinSeleccionar[0],
    });
  }

  if ((compra?.productosSinPrecio.length ?? 0) > 0) {
    prioridades.push({
      impacto: 4,
      urgencia: 2,
      orden: orden++,
      texto: `Hay ${cantidadTexto(compra?.productosSinPrecio.length ?? 0, 'producto')} sin precio y el presupuesto está subestimado.`,
      destino: 'compra',
    });
  }

  if ((compra?.productosEstimados.length ?? 0) > 0) {
    prioridades.push({
      impacto: 2,
      urgencia: 1,
      orden: orden++,
      texto: `Hay ${cantidadTexto(compra?.productosEstimados.length ?? 0, 'producto')} con una cantidad estimada; conviene revisar ${segunCantidad(compra?.productosEstimados.length ?? 0, 'ese cálculo', 'esos cálculos')} si buscas una compra muy precisa.`,
      destino: 'compra',
    });
  }

  if (reposicion.length > 0) {
    prioridades.push({
      impacto: 3,
      urgencia: 3,
      orden: orden++,
      texto: `Hay ${cantidadTexto(reposicion.length, 'producto')} por debajo del stock mínimo configurado.`,
      destino: 'despensa',
    });
  }

  const preparaciones48h = ventana.eventos
    .flatMap((evento) =>
      evento.dia.preparar?.trim() ? [evento.dia.preparar.trim()] : [],
    )
    .filter((valor) => normalizar(valor) !== 'nada');

  if (preparaciones48h.length > 0) {
    prioridades.push({
      impacto: 2,
      urgencia: primerEvento ? urgenciaCompra : 1,
      orden: orden++,
      texto: `Puedes adelantar: ${listaCorta(
        Array.from(new Set(preparaciones48h)),
        3,
      )}.`,
      destino: 'menu',
    });
  }

  return prioridades
    .sort(
      (a, b) =>
        b.impacto - a.impacto ||
        b.urgencia - a.urgencia ||
        a.orden - b.orden,
    )
    .filter(
      (prioridad, indice, todas) =>
        todas.findIndex((otra) => otra.texto === prioridad.texto) === indice,
    );
}

function textoEventoPlan(evento: EventoPlanFamiliar): string {
  return `${evento.etiqueta} · ${evento.momento} ${evento.horario}: ${evento.platos.join(' + ') || 'sin plan'} (${evento.comensales} comensales).`;
}

function respuestaPlanFamiliar(
  contexto: ContextoAsistentePFI,
  fechaReferencia: Date | string,
): RespuestaAsistentePFI {
  const ventana = crearVentanaPlanFamiliar(contexto, fechaReferencia);
  const prioridades = prioridadesFamiliares(contexto, fechaReferencia);
  const puntos = ventana.eventos.slice(0, 5).map(textoEventoPlan);

  if (ventana.eventos.length === 0) {
    puntos.push(
      'No encuentro servicios de comida futuros dentro del plan mensual abierto.',
    );
  }

  if (!ventana.coberturaCompleta) {
    puntos.push(
      'El mes abierto no cubre las 48 horas completas; falta cargar el tramo que cruza el límite del mes.',
    );
  }

  if (prioridades.length > 0) {
    puntos.push(`Prioridad principal: ${prioridades[0].texto}`);
  } else {
    puntos.push('No veo incidencias importantes en menú, compra, stock o presupuesto.');
  }

  const preparaciones = ventana.eventos
    .flatMap((evento) =>
      evento.dia.preparar?.trim() ? [evento.dia.preparar.trim()] : [],
    )
    .filter((valor) => normalizar(valor) !== 'nada');

  if (preparaciones.length > 0) {
    puntos.push(
      `Adelanta si puedes: ${listaCorta(
        Array.from(new Set(preparaciones)),
        3,
      )}.`,
    );
  }

  const destino = prioridades[0]?.destino ?? 'menu';
  return {
    titulo: 'Copiloto familiar · próximas 48 h',
    resumen: ventana.coberturaCompleta
      ? `Ventana móvil desde ahora hasta ${ventana.fin.toLocaleString('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}; las comidas ya pasadas quedan fuera.`
      : 'La ventana empieza ahora y excluye comidas pasadas, pero el plan mensual abierto no llega hasta el final de las 48 horas.',
    puntos: puntos.slice(0, 7),
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
    tono: prioridades.some((prioridad) => prioridad.impacto >= 4)
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
  const ventana = crearVentanaPlanFamiliar(contexto, fechaReferencia);
  const cubiertasReales =
    compra?.lineasCubiertas?.filter(
      (linea) => linea.origenCobertura === 'stock-real',
    ).length ?? 0;
  const cubiertasProyectadas =
    compra?.lineasCubiertas?.filter(
      (linea) => linea.origenCobertura !== 'stock-real',
    ).length ?? 0;
  const textoCobertura = cubiertasReales > 0 && cubiertasProyectadas > 0
    ? `${cantidadTexto(cubiertasReales, 'línea')} ${segunCantidad(cubiertasReales, 'está cubierta', 'están cubiertas')} por stock físico y ${cantidadTexto(cubiertasProyectadas, 'línea')} ${segunCantidad(cubiertasProyectadas, 'depende', 'dependen')} de sobrantes proyectados de compras anteriores.`
    : cubiertasReales > 0
      ? `${cantidadTexto(cubiertasReales, 'línea')} ${segunCantidad(cubiertasReales, 'está cubierta', 'están cubiertas')} por existencias físicas registradas.`
      : cubiertasProyectadas > 0
        ? `${cantidadTexto(cubiertasProyectadas, 'línea')} ${segunCantidad(cubiertasProyectadas, 'depende', 'dependen')} de sobrantes proyectados de compras anteriores; todavía no ${segunCantidad(cubiertasProyectadas, 'es', 'son')} stock real.`
        : 'La compra calculada no muestra coberturas por existencias.';

  if (prioridades.length === 0) {
    return {
      titulo: 'Chequeo familiar · todo estable',
      resumen:
        'No veo problemas importantes en las áreas que PFI puede comprobar ahora mismo.',
      puntos: [
        ventana.coberturaCompleta &&
        ventana.eventos.length > 0 &&
        ventana.eventos.every((evento) => evento.platos.length > 0)
          ? 'Todos los servicios que quedan en la ventana móvil de 48 horas están planificados.'
          : 'El plan mensual abierto no permite comprobar completas las próximas 48 horas.',
        'No hay avisos de stock mínimo, asociaciones o precios pendientes.',
        textoCobertura,
      ],
      accion: { etiqueta: 'Ver Menú', destino: 'menu' },
      tono: 'positivo',
    };
  }

  const primera = prioridades[0];
  return {
    titulo: 'Chequeo familiar · prioridades',
    resumen: `He encontrado ${cantidadTexto(prioridades.length, 'punto')} que ${segunCantidad(prioridades.length, 'merece', 'merecen')} la pena revisar, ${segunCantidad(prioridades.length, 'ordenado', 'ordenados')} por impacto y, a igualdad, por urgencia.`,
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
    tono: prioridades.some((prioridad) => prioridad.impacto >= 4)
      ? 'atencion'
      : 'normal',
  };
}

function respuestaAhorroInteligente(
  contexto: ContextoAsistentePFI,
): RespuestaAsistentePFI {
  const compra = contexto.compraSemana;
  const prevision = previsionMes(contexto);
  const precision = contexto.resumenEconomico.prevision;
  const presupuesto = contexto.perfil.presupuesto;
  const diferencia = presupuesto - prevision;
  const cubiertasReales =
    compra?.lineasCubiertas?.filter(
      (linea) => linea.origenCobertura === 'stock-real',
    ).length ?? 0;
  const cubiertasProyectadas =
    compra?.lineasCubiertas?.filter(
      (linea) => linea.origenCobertura !== 'stock-real',
    ).length ?? 0;
  const puntos: string[] = [];

  if (presupuesto > 0 && prevision > 0) {
    if (precision.partidasSinImporte > 0) {
      const causasPendientes = causasImportePendiente(precision);
      puntos.push(
        diferencia >= 0
          ? `El gasto conocido es como mínimo ${euros(prevision)}. El margen sería como máximo ${euros(diferencia)}, pero faltan ${cantidadTexto(precision.partidasSinImporte, 'partida')} sin importe${causasPendientes ? ` por ${causasPendientes}` : ''}: todavía no hay un saldo real.`
          : `El gasto conocido ya supera el objetivo en al menos ${euros(Math.abs(diferencia))}, y todavía faltan ${cantidadTexto(precision.partidasSinImporte, 'partida')} sin importe${causasPendientes ? ` por ${causasPendientes}` : ''}.`,
      );
    } else if (precision.cantidadesEstimadas > 0) {
      puntos.push(
        diferencia >= 0
          ? `La previsión estimada deja ${euros(diferencia)} de margen, con ${cantidadTexto(precision.cantidadesEstimadas, 'cantidad', 'cantidades')} todavía ${segunCantidad(precision.cantidadesEstimadas, 'estimada', 'estimadas')}.`
          : `La previsión estimada supera el objetivo en ${euros(Math.abs(diferencia))}, con ${cantidadTexto(precision.cantidadesEstimadas, 'cantidad', 'cantidades')} por confirmar.`,
      );
    } else {
      puntos.push(
        diferencia >= 0
          ? `La previsión completa está ${euros(diferencia)} por debajo del objetivo mensual.`
          : `La previsión completa está ${euros(Math.abs(diferencia))} por encima del objetivo mensual.`,
      );
    }
  }

  if (cubiertasReales > 0) {
    puntos.push(
      `${cantidadTexto(cubiertasReales, 'línea')} ${segunCantidad(cubiertasReales, 'está cubierta', 'están cubiertas')} por existencias físicas registradas; esta cobertura sí es verificable en Despensa.`,
    );
  }

  if (cubiertasProyectadas > 0) {
    puntos.push(
      `${cantidadTexto(cubiertasProyectadas, 'línea')} ${segunCantidad(cubiertasProyectadas, 'depende', 'dependen')} de sobrantes proyectados: solo ${segunCantidad(cubiertasProyectadas, 'quedaría cubierta', 'quedarían cubiertas')} si compras antes y sobra lo previsto. No ${segunCantidad(cubiertasProyectadas, 'la cuento', 'las cuento')} como ahorro ni como stock real.`,
    );
  }

  if ((compra?.productosSinSeleccionar.length ?? 0) > 0) {
    puntos.push(
      `Primero resuelve ${cantidadTexto(compra?.productosSinSeleccionar.length ?? 0, 'ingrediente')} sin producto: comparar o recortar gasto antes de eso puede ser engañoso.`,
    );
  }

  if ((compra?.productosSinPrecio.length ?? 0) > 0) {
    puntos.push(
      `Hay ${cantidadTexto(compra?.productosSinPrecio.length ?? 0, 'producto')} sin precio; el gasto real puede ser mayor que la previsión.`,
    );
  }

  if ((compra?.productosEstimados.length ?? 0) > 0) {
    puntos.push(
      `Revisa ${cantidadTexto(compra?.productosEstimados.length ?? 0, 'cantidad', 'cantidades')} ${segunCantidad(compra?.productosEstimados.length ?? 0, 'estimada', 'estimadas')} para evitar comprar envases de más.`,
    );
  }

  if (contexto.compraPendienteCantidad > 0) {
    puntos.push(
      contexto.compraPendienteSinImporte > 0
        ? `La compra pendiente suma al menos ${euros(contexto.compraPendienteTotal)} y aún tiene ${cantidadTexto(contexto.compraPendienteSinImporte, 'importe')} sin valorar.`
        : `La compra pendiente suma ${euros(contexto.compraPendienteTotal)} con todos sus importes informados.`,
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
    resumen: precision.partidasSinImporte > 0
      ? 'No puedo afirmar un ahorro neto todavía: separo el subtotal conocido, los importes pendientes y el stock meramente proyectado.'
      : precision.cantidadesEstimadas > 0
        ? 'El margen es una estimación trazable, no un ahorro cerrado, porque aún hay cantidades aproximadas.'
        : 'He cruzado importes completos y stock físico para mostrar un margen trazable, sin convertir proyecciones en ahorro.',
    puntos: puntos.slice(0, 6),
    accion: { etiqueta: 'Revisar Compra', destino: 'compra' },
    tono:
      diferencia < 0 || precision.partidasSinImporte > 0
        ? 'atencion'
        : 'normal',
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
  const precision = contexto.resumenEconomico.prevision;
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
      ? contexto.compraPendienteSinImporte > 0
        ? `${contexto.compraPendienteCantidad} pendientes · ${euros(contexto.compraPendienteTotal)} mínimo + ${contexto.compraPendienteSinImporte} sin importe`
        : `${contexto.compraPendienteCantidad} pendientes · ${euros(contexto.compraPendienteTotal)}`
      : 'Calculando la compra actual…',
    despensa:
      reposicion.length === 0
        ? 'No hay avisos de stock mínimo.'
        : `${cantidadTexto(reposicion.length, 'producto')} ${segunCantidad(reposicion.length, 'necesita', 'necesitan')} reposición.`,
    presupuesto:
      prevision > 0 || precision.partidasSinImporte > 0
        ? precision.partidasSinImporte > 0
          ? `${euros(prevision)} mínimo conocido · ${cantidadTexto(precision.partidasSinImporte, 'partida')} sin importe${causasImportePendiente(precision) ? ` · ${causasImportePendiente(precision)}` : ''} · objetivo ${euros(
            contexto.perfil.presupuesto,
          )}`
          : `${euros(prevision)} ${precision.cantidadesEstimadas > 0 ? 'estimados' : 'previstos'} este mes · objetivo ${euros(
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
  const precisionMes = contexto.resumenEconomico.prevision;
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
        : contexto.compraPendienteSinImporte > 0
          ? `Quedan ${contexto.compraPendienteCantidad} productos: el subtotal conocido es ${euros(
              contexto.compraPendienteTotal,
            )} y faltan ${cantidadTexto(contexto.compraPendienteSinImporte, 'importe')}.`
          : `Quedan ${contexto.compraPendienteCantidad} productos por ${euros(
              contexto.compraPendienteTotal,
            )}.`,
      puntos: [
        nombres.length > 0
          ? `Lo principal: ${listaCorta(nombres)}.`
          : 'No hay productos automáticos pendientes.',
        compra.productosSinSeleccionar.length > 0
          ? `${cantidadTexto(compra.productosSinSeleccionar.length, 'ingrediente')} ${segunCantidad(compra.productosSinSeleccionar.length, 'necesita', 'necesitan')} elegir producto.`
          : 'Todos los ingredientes tienen producto seleccionado.',
        compra.productosSinPrecio.length > 0
          ? `${cantidadTexto(compra.productosSinPrecio.length, 'producto')} no ${segunCantidad(compra.productosSinPrecio.length, 'tiene', 'tienen')} precio y no ${segunCantidad(compra.productosSinPrecio.length, 'entra', 'entran')} en el total.`
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
    const hayImportesPendientes = precisionMes.partidasSinImporte > 0;
    const hayEstimaciones = precisionMes.cantidadesEstimadas > 0;
    return {
      titulo: 'Previsión de gasto',
      resumen:
        presupuestoPrevisto > 0 || hayImportesPendientes
          ? hayImportesPendientes
            ? `PFI conoce un mínimo de ${euros(presupuestoPrevisto)} para el mes frente a un objetivo de ${euros(
                contexto.perfil.presupuesto,
              )}; faltan ${cantidadTexto(precisionMes.partidasSinImporte, 'partida')} sin importe${causasImportePendiente(precisionMes) ? ` por ${causasImportePendiente(precisionMes)}` : ''}.`
            : `PFI ${hayEstimaciones ? 'estima' : 'calcula'} ${euros(presupuestoPrevisto)} para el mes frente a un objetivo de ${euros(
                contexto.perfil.presupuesto,
              )}.`
          : `Tu objetivo mensual configurado es ${euros(
              contexto.perfil.presupuesto,
            )}.`,
      puntos:
        presupuestoPrevisto > 0 || hayImportesPendientes
          ? [
              hayImportesPendientes
                ? diferencia >= 0
                  ? `El margen máximo provisional es ${euros(diferencia)}; no es un saldo disponible todavía.`
                  : `El subtotal conocido ya supera el objetivo en al menos ${euros(Math.abs(diferencia))}.`
                : diferencia >= 0
                  ? `${hayEstimaciones ? 'El margen estimado es' : 'Te quedan'} ${euros(diferencia)} frente al objetivo.`
                  : `${hayEstimaciones ? 'La estimación' : 'La previsión'} supera el objetivo en ${euros(Math.abs(diferencia))}.`,
              'La previsión combina la compra mensual, las semanas y los productos añadidos manualmente.',
              hayImportesPendientes
                ? 'Completa los importes pendientes antes de interpretar esa diferencia como ahorro.'
                : hayEstimaciones
                  ? `${cantidadTexto(precisionMes.cantidadesEstimadas, 'cantidad', 'cantidades')} ${segunCantidad(precisionMes.cantidadesEstimadas, 'sigue', 'siguen')} siendo ${segunCantidad(precisionMes.cantidadesEstimadas, 'aproximada', 'aproximadas')}.`
                  : 'Todos los importes y cantidades del cálculo están informados.',
            ]
          : ['Necesito que termine el cálculo de compra para comparar la previsión completa.'],
      accion: { etiqueta: 'Revisar Compra', destino: 'compra' },
      tono:
        diferencia >= 0 && !hayImportesPendientes
          ? 'positivo'
          : 'atencion',
    };
  }

  if (/despensa|stock|reponer|reposicion|queda|tenemos/.test(consulta)) {
    return {
      titulo: 'Estado de la despensa',
      resumen:
        reposicion.length === 0
          ? 'No veo productos por debajo del stock mínimo configurado.'
          : `Hay ${cantidadTexto(reposicion.length, 'producto')} que conviene reponer.`,
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
          ? `Hay ${cantidadTexto(preparaciones.length, 'preparación', 'preparaciones')} que PFI ya tiene ${segunCantidad(preparaciones.length, 'marcada', 'marcadas')} para adelantar.`
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
      resumen: `Tengo ${cantidadTexto(contexto.aprendizaje.valoraciones, 'valoración', 'valoraciones')} y ${cantidadTexto(contexto.aprendizaje.eleccionesMenu, 'elección', 'elecciones')} registradas.`,
      puntos: [
        `${contexto.aprendizaje.combinacionesMenu} combinaciones de menú conocidas.`,
        `${cantidadTexto(totalAjustes, 'ajuste')} de cantidades ${segunCantidad(totalAjustes, 'aprendido', 'aprendidos')}.`,
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
        `${cantidadTexto(sinProducto, 'ingrediente')} sin producto seleccionado.`,
        `${cantidadTexto(sinPrecio, 'producto')} sin precio.`,
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
