import { useEffect, useMemo, useState } from 'react';
import { menuMensualInicial, type SemanaMenu } from '../data/MenuMensual';
import type { DiaMenu } from '../data/Menusemanal';
import { recalcularPreparacionesPlan } from '../services/menu';
import {
  copiarPlanMensual,
  generarPlanMensualInteligente,
  normalizarPlanMensual,
} from '../services/planMensual';

const CLAVE_MENU = 'pfi-menu';
const CLAVE_SEMANA_ACTIVA = 'pfi-semana-activa';
const CLAVE_MES_ACTIVO = 'pfi-mes-activo';
const PREFIJO_PLAN_MES = 'pfi-menu-mes-';
const EVENTO_MENU = 'pfi-menu-actualizado';
const PASTAS_ALTERNATIVAS = [
  'Macarrones boloñesa',
  'Macarrones con chorizo',
  'Carbonara tradicional',
  'Macarrones con roquefort',
] as const;

type MesPlan = { mes: string; semanas: SemanaMenu[] };

function claveMes(fecha = new Date()): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

function esMesDeVerano(mes: string): boolean {
  const numero = Number(mes.split('-')[1]);
  return numero >= 6 && numero <= 8;
}

function contieneEnsaladaDePasta(dia: DiaMenu): boolean {
  return dia.comida.some((plato) => plato === 'Ensalada de pasta');
}

function alternativaPasta(semana: SemanaMenu, indice: number): string {
  const platosSemana = new Set(
    semana.menu.flatMap((dia) => [...dia.comida, ...dia.cena]),
  );
  return (
    PASTAS_ALTERNATIVAS.find(
      (plato, offset) =>
        offset >= indice % PASTAS_ALTERNATIVAS.length &&
        !platosSemana.has(plato),
    ) ??
    PASTAS_ALTERNATIVAS.find((plato) => !platosSemana.has(plato)) ??
    PASTAS_ALTERNATIVAS[indice % PASTAS_ALTERNATIVAS.length]
  );
}

function aplicarPreferenciaEnsaladaPasta(
  mes: string,
  semanas: SemanaMenu[],
): SemanaMenu[] {
  const verano = esMesDeVerano(mes);
  let ensaladasConservadas = 0;
  let huboCambios = false;

  const ajustadas = semanas.map((semana, indiceSemana) => {
    const tieneEnsalada = semana.menu.some(contieneEnsaladaDePasta);

    if (verano && !tieneEnsalada) {
      const diaPreferido = indiceSemana % 2 === 0 ? 'Miércoles' : 'Viernes';
      const menu = semana.menu.map((dia) =>
        dia.dia === diaPreferido
          ? { ...dia, comida: ['Ensalada de pasta'] }
          : { ...dia },
      );
      huboCambios = true;
      return { ...semana, menu };
    }

    if (!verano && tieneEnsalada) {
      const sustituto = alternativaPasta(semana, indiceSemana);
      const menu = semana.menu.map((dia) => {
        if (!contieneEnsaladaDePasta(dia)) return { ...dia };
        if (ensaladasConservadas === 0) {
          ensaladasConservadas += 1;
          return { ...dia };
        }
        huboCambios = true;
        return {
          ...dia,
          comida: dia.comida.map((plato) =>
            plato === 'Ensalada de pasta' ? sustituto : plato,
          ),
        };
      });
      return { ...semana, menu };
    }

    return semana;
  });

  return huboCambios ? recalcularPreparacionesPlan(ajustadas) : semanas;
}

function aplicarVariedadCenasMartes(semanas: SemanaMenu[]): SemanaMenu[] {
  const martesConTortilla = semanas.reduce((total, semana) => {
    const martes = semana.menu.find((dia) => dia.dia === 'Martes');
    return total + Number(martes?.cena.some((plato) => /tortilla/i.test(plato)) === true);
  }, 0);

  if (martesConTortilla < Math.min(3, semanas.length)) return semanas;

  const ajustadas = semanas.map((semana, indiceSemana) => {
    const cenaObjetivo = menuMensualInicial[
      indiceSemana % menuMensualInicial.length
    ]?.menu.find((dia) => dia.dia === 'Martes')?.cena;

    if (!cenaObjetivo) return semana;

    return {
      ...semana,
      menu: semana.menu.map((dia) =>
        dia.dia === 'Martes'
          ? { ...dia, cena: [...cenaObjetivo] }
          : { ...dia },
      ),
    };
  });

  return recalcularPreparacionesPlan(ajustadas);
}

function semanasDelMes(mes: string, base: SemanaMenu[]): SemanaMenu[] {
  const [anio, mesNumero] = mes.split('-').map(Number);
  const primero = new Date(anio, mesNumero - 1, 1);
  const ultimo = new Date(anio, mesNumero, 0);
  const resultado: SemanaMenu[] = [];
  let cursor = new Date(primero);
  let indice = 0;

  while (cursor <= ultimo) {
    const inicio = new Date(cursor);
    const fin = new Date(cursor);
    const diasHastaDomingo = (7 - inicio.getDay()) % 7;
    fin.setDate(
      Math.min(ultimo.getDate(), inicio.getDate() + diasHastaDomingo),
    );

    const plantilla =
      base[indice % Math.max(1, base.length)] ?? menuMensualInicial[0];

    resultado.push({
      ...plantilla,
      id: `${mes}-semana-${indice + 1}`,
      nombre: `${inicio.getDate()}–${fin.getDate()} ${new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(inicio)}`,
      inicio: `${anio}-${String(mesNumero).padStart(2, '0')}-${String(inicio.getDate()).padStart(2, '0')}`,
      fin: `${anio}-${String(mesNumero).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`,
      excluida: false,
      menu: plantilla.menu.map((dia) => ({ ...dia })),
    });

    cursor = new Date(fin);
    cursor.setDate(cursor.getDate() + 1);
    indice += 1;
  }

  return aplicarPreferenciaEnsaladaPasta(
    mes,
    recalcularPreparacionesPlan(resultado),
  );
}

function contienePlato(dia: DiaMenu | undefined, plato: string): boolean {
  return Boolean(
    dia && [...dia.comida, ...dia.cena].some((nombre) => nombre === plato),
  );
}

function textoPlatos(dia: DiaMenu | undefined): string {
  return dia ? [...dia.comida, ...dia.cena].join(' ').toLocaleLowerCase('es') : '';
}

function planNecesitaPatron(semanas: SemanaMenu[]): boolean {
  if (semanas.length < 3) return false;

  let miercolesFajitas = 0;
  let martesLubina = 0;
  let juevesGarbanzos = 0;
  let lunesFueraDeLegumbre = 0;
  let viernesFueraDePasta = 0;

  semanas.forEach((semana) => {
    const lunes = semana.menu.find((dia) => dia.dia === 'Lunes');
    const martes = semana.menu.find((dia) => dia.dia === 'Martes');
    const miercoles = semana.menu.find((dia) => dia.dia === 'Miércoles');
    const jueves = semana.menu.find((dia) => dia.dia === 'Jueves');
    const viernes = semana.menu.find((dia) => dia.dia === 'Viernes');

    if (contienePlato(miercoles, 'Fajitas')) miercolesFajitas += 1;
    if (contienePlato(martes, 'Lubina')) martesLubina += 1;
    if (contienePlato(jueves, 'Garbanzos fritos')) juevesGarbanzos += 1;

    const textoLunes = textoPlatos(lunes);
    if (!/(lenteja|garbanzo|alubia)/.test(textoLunes)) lunesFueraDeLegumbre += 1;

    const textoViernes = textoPlatos(viernes);
    if (!/(pasta|macarron|carbonara)/.test(textoViernes)) viernesFueraDePasta += 1;
  });

  const limiteRepeticion = Math.min(3, semanas.length);
  return (
    miercolesFajitas >= limiteRepeticion ||
    martesLubina >= limiteRepeticion ||
    juevesGarbanzos >= limiteRepeticion ||
    lunesFueraDeLegumbre >= 2 ||
    viernesFueraDePasta >= 2
  );
}

function migrarPlanAlPatron(mes: string, semanas: SemanaMenu[]): SemanaMenu[] {
  if (!planNecesitaPatron(semanas)) return semanas;

  const nuevo = semanasDelMes(
    mes,
    copiarPlanMensual(menuMensualInicial),
  );

  return nuevo.map((semana, indice) => ({
    ...semana,
    excluida: semanas[indice]?.excluida === true,
  }));
}

function cargarMes(mes: string): MesPlan {
  try {
    const guardado = localStorage.getItem(`${PREFIJO_PLAN_MES}${mes}`);
    if (guardado) {
      const parsed = JSON.parse(guardado) as MesPlan;
      if (
        parsed.mes === mes &&
        Array.isArray(parsed.semanas) &&
        parsed.semanas.length > 0
      ) {
        const normalizadas = normalizarPlanMensual(parsed.semanas);
        const estacionales = aplicarPreferenciaEnsaladaPasta(mes, normalizadas);
        const martesVariados = aplicarVariedadCenasMartes(estacionales);
        const semanas = migrarPlanAlPatron(mes, martesVariados);
        const plan = { mes, semanas };

        if (semanas !== normalizadas) {
          localStorage.setItem(
            `${PREFIJO_PLAN_MES}${mes}`,
            JSON.stringify(plan),
          );
        }

        return plan;
      }
    }
  } catch {
    // usar plantilla actual
  }

  return {
    mes,
    semanas: semanasDelMes(mes, copiarPlanMensual(menuMensualInicial)),
  };
}

function guardarMes(plan: MesPlan, indice: number): void {
  localStorage.setItem(
    `${PREFIJO_PLAN_MES}${plan.mes}`,
    JSON.stringify(plan),
  );
  localStorage.setItem(CLAVE_MES_ACTIVO, plan.mes);
  localStorage.setItem(CLAVE_SEMANA_ACTIVA, String(indice));
  localStorage.setItem(
    CLAVE_MENU,
    JSON.stringify(
      plan.semanas[indice]?.excluida
        ? []
        : plan.semanas[indice]?.menu ?? [],
    ),
  );
  window.dispatchEvent(new CustomEvent(EVENTO_MENU));
}

export function useMenu() {
  const [mesPlan, setMesPlan] = useState<MesPlan>(() =>
    cargarMes(localStorage.getItem(CLAVE_MES_ACTIVO) || claveMes()),
  );
  const [semanaActiva, setSemanaActiva] = useState(() =>
    Number(localStorage.getItem(CLAVE_SEMANA_ACTIVA) || 0),
  );
  const planMensual = mesPlan.semanas;
  const semana = planMensual[semanaActiva];
  const menu = useMemo(
    () => (semana?.excluida ? [] : semana?.menu ?? []),
    [semana],
  );

  useEffect(() => {
    guardarMes(mesPlan, semanaActiva);
  }, [mesPlan, semanaActiva]);

  function cambiarMes(desplazamiento: number): void {
    const [anio, mes] = mesPlan.mes.split('-').map(Number);
    const nuevoMes = claveMes(
      new Date(anio, mes - 1 + desplazamiento, 1),
    );
    const nuevoPlan = cargarMes(nuevoMes);
    setMesPlan(nuevoPlan);
    setSemanaActiva(0);
    guardarMes(nuevoPlan, 0);
  }

  function generarNuevoMes(): void {
    const recetasDisponibles = Array.from(
      new Set(
        menuMensualInicial.flatMap((semana) =>
          semana.menu.flatMap((dia) => [...dia.comida, ...dia.cena]),
        ),
      ),
    );
    const nuevoPlanBase = generarPlanMensualInteligente(
      recetasDisponibles,
      new Date(`${mesPlan.mes}-01T12:00:00`),
    );
    const semanas = semanasDelMes(mesPlan.mes, nuevoPlanBase);
    const nuevoPlan = { mes: mesPlan.mes, semanas };
    setMesPlan(nuevoPlan);
    setSemanaActiva(0);
    guardarMes(nuevoPlan, 0);
  }

  function reiniciarMes(): void {
    const nuevoPlan = {
      mes: mesPlan.mes,
      semanas: semanasDelMes(
        mesPlan.mes,
        copiarPlanMensual(menuMensualInicial),
      ),
    };
    setMesPlan(nuevoPlan);
    setSemanaActiva(0);
    guardarMes(nuevoPlan, 0);
  }

  function seleccionarSemana(indice: number): void {
    const seguro = Math.max(0, Math.min(indice, planMensual.length - 1));
    setSemanaActiva(seguro);
    guardarMes(mesPlan, seguro);
  }

  function excluirSemana(indice: number, excluida = true): void {
    const semanas = planMensual.map((s, i) =>
      i === indice ? { ...s, excluida } : s,
    );
    const nuevoPlan = { ...mesPlan, semanas };
    setMesPlan(nuevoPlan);
    guardarMes(nuevoPlan, semanaActiva);
  }

  function guardar(nuevoMenu: DiaMenu[]): void {
    const semanas = recalcularPreparacionesPlan(
      planMensual.map((s, i) =>
        i === semanaActiva
          ? { ...s, menu: nuevoMenu, excluida: false }
          : s,
      ),
    );
    const nuevoPlan = { ...mesPlan, semanas };
    setMesPlan(nuevoPlan);
    guardarMes(nuevoPlan, semanaActiva);
  }

  function guardarPlan(nuevoPlan: SemanaMenu[], indice = 0): void {
    const semanas = normalizarPlanMensual(nuevoPlan);
    const plan = { mes: mesPlan.mes, semanas };
    const seguro = Math.max(0, Math.min(indice, semanas.length - 1));
    setMesPlan(plan);
    setSemanaActiva(seguro);
    guardarMes(plan, seguro);
  }

  return {
    menu,
    guardar,
    planMensual,
    guardarPlan,
    semanaActiva,
    seleccionarSemana,
    mesActivo: mesPlan.mes,
    cambiarMes,
    excluirSemana,
    generarNuevoMes,
    reiniciarMes,
  };
}
