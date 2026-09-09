import type { DiaMenu } from '../data/Menusemanal';
import { CENAS_VIERNES, menuMensualInicial, type SemanaMenu } from '../data/MenuMensual';
import { obtenerSugerenciasMenu, type MomentoMenu } from './aprendizaje';
import { copiarMenu, normalizarMenu, recalcularPreparacionesPlan } from './menu';

export type ResumenEquilibrio = {
  puntuacion: number;
  legumbres: number;
  pescado: number;
  aves: number;
  huevosOCremas: number;
  carneRoja: number;
  platosUnicos: number;
  avisos: string[];
};

const GRUPOS = {
  legumbres: /(lenteja|garbanzo|alubia)/,
  pescado: /(salm[oó]n|lubina|dorada|bacalao|almeja)/,
  aves: /(pollo|pavo|fajita|kebab)/,
  huevosOCremas: /(tortilla|huevo|crema|vaina|verdura|calabac[ií]n)/,
  carneRoja: /(lomo|ternera|hamburguesa|chorizo|perrito|alb[oó]ndiga)/,
};
const FIJOS = new Set(['Comemos fuera', 'Cola Cao y galletas']);
const PLANTILLAS = menuMensualInicial;

function normalizar(texto: string): string {
  return texto.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
function esExentoDeVariedad(plato: string, dia: string, momento: MomentoMenu): boolean {
  return FIJOS.has(plato) || (
    normalizar(dia) === 'viernes' &&
    momento === 'cena' &&
    normalizar(plato).includes('pizza')
  );
}
function coincideGrupo(platos: string[], grupo: RegExp): boolean { return platos.some((plato) => grupo.test(normalizar(plato))); }
function cuentaMomentos(menu: DiaMenu[], grupo: RegExp): number { return menu.reduce((total, dia) => total + Number(coincideGrupo(dia.comida, grupo)) + Number(coincideGrupo(dia.cena, grupo)), 0); }

export function copiarPlanMensual(plan: SemanaMenu[]): SemanaMenu[] {
  return recalcularPreparacionesPlan(plan.map((semana, indice) => ({ ...semana, id: semana.id || `semana-${indice + 1}`, nombre: semana.nombre || `Semana ${indice + 1}`, menu: copiarMenu(semana.menu) })));
}

export function normalizarPlanMensual(valor: unknown): SemanaMenu[] {
  if (!Array.isArray(valor)) return copiarPlanMensual(menuMensualInicial);
  const semanas = valor.filter((semana): semana is Record<string, unknown> => typeof semana === 'object' && semana !== null).slice(0, 6).map((semana, indice) => {
    const alternativa = PLANTILLAS[indice % PLANTILLAS.length]?.menu ?? PLANTILLAS[0].menu;
    return {
      id: typeof semana.id === 'string' && semana.id.trim() ? semana.id.trim() : `semana-${indice + 1}`,
      nombre: typeof semana.nombre === 'string' && semana.nombre.trim() ? semana.nombre.trim() : `Semana ${indice + 1}`,
      inicio: typeof semana.inicio === 'string' ? semana.inicio : '',
      fin: typeof semana.fin === 'string' ? semana.fin : '',
      excluida: semana.excluida === true,
      menu: normalizarMenu(semana.menu, alternativa),
    };
  });
  return recalcularPreparacionesPlan(semanas);
}

export function calcularEquilibrioSemana(menu: DiaMenu[]): ResumenEquilibrio {
  const legumbres = cuentaMomentos(menu, GRUPOS.legumbres), pescado = cuentaMomentos(menu, GRUPOS.pescado), aves = cuentaMomentos(menu, GRUPOS.aves), huevosOCremas = cuentaMomentos(menu, GRUPOS.huevosOCremas), carneRoja = cuentaMomentos(menu, GRUPOS.carneRoja);
  const platosUnicos = new Set(menu.flatMap((dia) => [...dia.comida, ...dia.cena]).filter((plato) => !FIJOS.has(plato))).size;
  const avisos: string[] = []; let puntuacion = 100;
  if (legumbres < 2) { puntuacion -= (2 - legumbres) * 14; avisos.push('Falta una comida de legumbres'); }
  if (pescado < 2) { puntuacion -= (2 - pescado) * 14; avisos.push('Falta una comida de pescado'); }
  if (aves < 1) { puntuacion -= 10; avisos.push('Falta una comida de pollo o pavo'); }
  if (huevosOCremas < 1) { puntuacion -= 8; avisos.push('Falta una cena ligera con crema, verdura o huevo'); }
  if (carneRoja > 4) { puntuacion -= (carneRoja - 4) * 6; avisos.push('Hay demasiadas comidas de carne'); }
  if (platosUnicos < 12) { puntuacion -= (12 - platosUnicos) * 3; avisos.push('Se pueden variar más los platos'); }
  return { puntuacion: Math.max(0, Math.min(100, Math.round(puntuacion))), legumbres, pescado, aves, huevosOCremas, carneRoja, platosUnicos, avisos };
}

function grupoPrincipal(platos: string[]): keyof typeof GRUPOS | 'otro' { const entrada = Object.entries(GRUPOS).find(([, patron]) => coincideGrupo(platos, patron)); return (entrada?.[0] as keyof typeof GRUPOS | undefined) ?? 'otro'; }
function puedeUsarSugerencia(
  sugerencia: string[],
  base: string[],
  dia: string,
  momento: MomentoMenu,
  disponibles: Set<string>,
  usados: Map<string, number>,
  reservados: Map<string, number>,
): boolean {
  if (!sugerencia.length || !sugerencia.every((plato) => disponibles.has(plato) || FIJOS.has(plato))) return false;
  const grupoBase = grupoPrincipal(base), grupoSugerencia = grupoPrincipal(sugerencia);
  const platosBase = new Set(base.map(normalizar));
  return (grupoBase === 'otro' || grupoSugerencia === grupoBase) && sugerencia.every((plato) => {
    if (esExentoDeVariedad(plato, dia, momento)) return true;
    const clave = normalizar(plato);
    return (
      (usados.get(clave) ?? 0) < 1 &&
      ((reservados.get(clave) ?? 0) < 1 || platosBase.has(clave))
    );
  });
}
function aprenderEnHueco(
  dia: string,
  momento: MomentoMenu,
  base: string[],
  disponibles: Set<string>,
  usados: Map<string, number>,
  reservados: Map<string, number>,
): string[] {
  if (base.every((plato) => FIJOS.has(plato))) return [...base];
  const sugerencia = obtenerSugerenciasMenu(dia, momento, base, 5).find(
    (opcion) => opcion.confianza !== 'inicial' && puedeUsarSugerencia(
      opcion.platos,
      base,
      dia,
      momento,
      disponibles,
      usados,
      reservados,
    ),
  );
  return sugerencia ? [...sugerencia.platos] : [...base];
}
function registrarUso(
  platos: string[],
  dia: string,
  momento: MomentoMenu,
  usados: Map<string, number>,
): void {
  platos.forEach((plato) => {
    if (esExentoDeVariedad(plato, dia, momento)) return;
    const clave = normalizar(plato);
    usados.set(clave, (usados.get(clave) ?? 0) + 1);
  });
}
function crearReservas(plan: SemanaMenu[]): Map<string, number> {
  const reservas = new Map<string, number>();
  plan.forEach((semana) => semana.menu.forEach((dia) => {
    ([['comida', dia.comida], ['cena', dia.cena]] as const).forEach(([momento, platos]) => {
      platos.forEach((plato) => {
        if (esExentoDeVariedad(plato, dia.dia, momento)) return;
        const clave = normalizar(plato);
        reservas.set(clave, (reservas.get(clave) ?? 0) + 1);
      });
    });
  }));
  return reservas;
}
function retirarReservas(
  platos: string[],
  dia: string,
  momento: MomentoMenu,
  reservas: Map<string, number>,
): void {
  platos.forEach((plato) => {
    if (esExentoDeVariedad(plato, dia, momento)) return;
    const clave = normalizar(plato);
    const restantes = (reservas.get(clave) ?? 0) - 1;
    if (restantes > 0) reservas.set(clave, restantes);
    else reservas.delete(clave);
  });
}
function mismoServicio(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((plato, indice) => normalizar(plato) === normalizar(b[indice] ?? ''));
}

export function generarPlanMensualInteligente(recetasDisponibles: string[], fecha = new Date()): SemanaMenu[] {
  const disponibles = new Set(recetasDisponibles), desplazamiento = fecha.getMonth() % PLANTILLAS.length;
  const plantillasRotadas = PLANTILLAS.map((_, indice) => PLANTILLAS[(indice + desplazamiento) % PLANTILLAS.length]);
  const usados = new Map<string, number>();
  const reservados = crearReservas(plantillasRotadas);
  return recalcularPreparacionesPlan(plantillasRotadas.map((plantilla, indiceSemana) => {
    const comidaLunes = plantilla.menu.find((dia) => normalizar(dia.dia) === 'lunes')?.comida ?? [];
    const menu = copiarMenu(plantilla.menu).map((dia) => {
      retirarReservas(dia.comida, dia.dia, 'comida', reservados);
      const esBatchJueves = normalizar(dia.dia) === 'jueves' && mismoServicio(dia.comida, comidaLunes);
      const comida = esBatchJueves
        ? [...dia.comida]
        : aprenderEnHueco(dia.dia, 'comida', dia.comida, disponibles, usados, reservados);
      registrarUso(comida, dia.dia, 'comida', usados);
      const esViernes = normalizar(dia.dia) === 'viernes', opcionViernes = CENAS_VIERNES[(indiceSemana + fecha.getMonth()) % CENAS_VIERNES.length];
      retirarReservas(dia.cena, dia.dia, 'cena', reservados);
      const cenaViernes = opcionViernes.filter((plato) => disponibles.has(plato) || FIJOS.has(plato));
      const cena = esViernes
        ? (cenaViernes.length ? [...cenaViernes] : [...dia.cena])
        : aprenderEnHueco(dia.dia, 'cena', dia.cena, disponibles, usados, reservados);
      registrarUso(cena, dia.dia, 'cena', usados);
      return { ...dia, comida, cena };
    });
    return { id: `semana-${indiceSemana + 1}`, nombre: `Semana ${indiceSemana + 1}`, inicio: '', fin: '', excluida: false, menu };
  }));
}
