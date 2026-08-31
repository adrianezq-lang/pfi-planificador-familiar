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
  huevosOCremas: /(tortilla|huevo|crema)/,
  carneRoja: /(lomo|ternera|hamburguesa|chorizo|perrito)/,
};
const FIJOS = new Set(['Comemos fuera', 'Cola Cao y galletas', 'Hamburguesas', 'Perritos calientes', 'Kebab']);
const PLANTILLAS = menuMensualInicial;

function normalizar(texto: string): string {
  return texto.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
function coincideGrupo(platos: string[], grupo: RegExp): boolean { return platos.some((plato) => grupo.test(normalizar(plato))); }
function cuentaMomentos(menu: DiaMenu[], grupo: RegExp): number { return menu.reduce((total, dia) => total + Number(coincideGrupo(dia.comida, grupo)) + Number(coincideGrupo(dia.cena, grupo)), 0); }

export function copiarPlanMensual(plan: SemanaMenu[]): SemanaMenu[] {
  return recalcularPreparacionesPlan(plan.map((semana, indice) => ({ ...semana, id: semana.id || `semana-${indice + 1}`, nombre: semana.nombre || `Semana ${indice + 1}`, menu: copiarMenu(semana.menu) })));
}

export function normalizarPlanMensual(valor: unknown): SemanaMenu[] {
  if (!Array.isArray(valor)) return copiarPlanMensual(menuMensualInicial);
  const semanas = valor.filter((semana): semana is Record<string, unknown> => typeof semana === 'object' && semana !== null).slice(0, 5).map((semana, indice) => {
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
  if (huevosOCremas < 1) { puntuacion -= 8; avisos.push('Falta una cena ligera con crema o huevo'); }
  if (carneRoja > 4) { puntuacion -= (carneRoja - 4) * 6; avisos.push('Hay demasiadas comidas de carne'); }
  if (platosUnicos < 12) { puntuacion -= (12 - platosUnicos) * 3; avisos.push('Se pueden variar más los platos'); }
  return { puntuacion: Math.max(0, Math.min(100, Math.round(puntuacion))), legumbres, pescado, aves, huevosOCremas, carneRoja, platosUnicos, avisos };
}

function grupoPrincipal(platos: string[]): keyof typeof GRUPOS | 'otro' { const entrada = Object.entries(GRUPOS).find(([, patron]) => coincideGrupo(platos, patron)); return (entrada?.[0] as keyof typeof GRUPOS | undefined) ?? 'otro'; }
function puedeUsarSugerencia(sugerencia: string[], base: string[], disponibles: Set<string>, usados: Map<string, number>): boolean {
  if (!sugerencia.length || !sugerencia.every((plato) => disponibles.has(plato) || FIJOS.has(plato))) return false;
  const grupoBase = grupoPrincipal(base), grupoSugerencia = grupoPrincipal(sugerencia);
  return (grupoBase === 'otro' || grupoSugerencia === grupoBase) && sugerencia.every((plato) => (usados.get(plato) ?? 0) < 2);
}
function aprenderEnHueco(dia: string, momento: MomentoMenu, base: string[], disponibles: Set<string>, usados: Map<string, number>): string[] {
  const sugerencia = obtenerSugerenciasMenu(dia, momento, base, 5).find((opcion) => opcion.confianza !== 'inicial' && puedeUsarSugerencia(opcion.platos, base, disponibles, usados));
  return sugerencia ? [...sugerencia.platos] : [...base];
}
function registrarUso(platos: string[], usados: Map<string, number>): void { platos.forEach((plato) => usados.set(plato, (usados.get(plato) ?? 0) + 1)); }

export function generarPlanMensualInteligente(recetasDisponibles: string[], fecha = new Date()): SemanaMenu[] {
  const disponibles = new Set(recetasDisponibles), desplazamiento = fecha.getMonth() % PLANTILLAS.length;
  const plantillasRotadas = PLANTILLAS.map((_, indice) => PLANTILLAS[(indice + desplazamiento) % PLANTILLAS.length]);
  const usados = new Map<string, number>();
  return recalcularPreparacionesPlan(plantillasRotadas.map((plantilla, indiceSemana) => {
    const menu = copiarMenu(plantilla.menu).map((dia) => {
      const comida = aprenderEnHueco(dia.dia, 'comida', dia.comida, disponibles, usados); registrarUso(comida, usados);
      const esViernes = normalizar(dia.dia) === 'viernes', opcionViernes = CENAS_VIERNES[(indiceSemana + fecha.getMonth()) % CENAS_VIERNES.length];
      const cenaViernes = opcionViernes.filter((plato) => disponibles.has(plato) || FIJOS.has(plato));
      const cena = esViernes ? (cenaViernes.length ? [...cenaViernes] : [...dia.cena]) : aprenderEnHueco(dia.dia, 'cena', dia.cena, disponibles, usados); registrarUso(cena, usados);
      return { ...dia, comida, cena };
    });
    return { id: `semana-${indiceSemana + 1}`, nombre: `Semana ${indiceSemana + 1}`, inicio: '', fin: '', excluida: false, menu };
  }));
}
