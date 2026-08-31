import { useEffect, useMemo, useState } from 'react';
import { menuMensualInicial, type SemanaMenu } from '../data/MenuMensual';
import type { DiaMenu } from '../data/Menusemanal';
import { normalizarMenu, recalcularPreparaciones, recalcularPreparacionesPlan } from '../services/menu';
import { copiarPlanMensual, normalizarPlanMensual } from '../services/planMensual';

const CLAVE_MENU = 'pfi-menu';
const CLAVE_PLAN_MENSUAL = 'pfi-menu-mensual-v2';
const CLAVE_SEMANA_ACTIVA = 'pfi-semana-activa';
const CLAVE_MES_ACTIVO = 'pfi-mes-activo';
const EVENTO_MENU = 'pfi-menu-actualizado';

type MesPlan = { mes: string; semanas: SemanaMenu[] };

function claveMes(fecha = new Date()): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
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
    const diasHastaDomingo = 7 - inicio.getDay();
    fin.setDate(Math.min(ultimo.getDate(), inicio.getDate() + diasHastaDomingo));
    const plantilla = base[indice % base.length] ?? base[0];
    resultado.push({
      ...plantilla,
      id: `${mes}-semana-${indice + 1}`,
      nombre: `${inicio.getDate()}–${fin.getDate()} ${new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(inicio)}`,
      inicio: inicio.toISOString().slice(0, 10),
      fin: fin.toISOString().slice(0, 10),
      excluida: false,
      menu: plantilla.menu.map((dia) => ({ ...dia })),
    });
    cursor = new Date(fin);
    cursor.setDate(cursor.getDate() + 1);
    indice += 1;
  }
  return resultado;
}

function cargarPlan(): MesPlan {
  const mes = localStorage.getItem(CLAVE_MES_ACTIVO) || claveMes();
  try {
    const guardado = localStorage.getItem(CLAVE_PLAN_MENSUAL);
    if (guardado) {
      const parsed = JSON.parse(guardado) as MesPlan;
      if (parsed.mes === mes && Array.isArray(parsed.semanas) && parsed.semanas.length > 0) return parsed;
    }
  } catch { /* restauramos plantilla */ }
  const semanas = semanasDelMes(mes, copiarPlanMensual(menuMensualInicial));
  return { mes, semanas };
}

function guardarPlanLocal(plan: MesPlan, indice: number): void {
  localStorage.setItem(CLAVE_PLAN_MENSUAL, JSON.stringify(plan));
  localStorage.setItem(CLAVE_SEMANA_ACTIVA, String(indice));
  localStorage.setItem(CLAVE_MES_ACTIVO, plan.mes);
  localStorage.setItem(CLAVE_MENU, JSON.stringify(plan.semanas[indice]?.menu ?? []));
  window.dispatchEvent(new CustomEvent(EVENTO_MENU));
}

export function useMenu() {
  const inicial = cargarPlan();
  const [mesPlan, setMesPlan] = useState<MesPlan>(inicial);
  const [semanaActiva, setSemanaActiva] = useState(() => Number(localStorage.getItem(CLAVE_SEMANA_ACTIVA) || 0));

  const planMensual = mesPlan.semanas;
  const menu = useMemo(() => planMensual[semanaActiva]?.menu ?? [], [planMensual, semanaActiva]);

  useEffect(() => {
    localStorage.setItem(CLAVE_MENU, JSON.stringify(menu));
  }, [menu]);

  function cambiarMes(desplazamiento: number): void {
    const [anio, mes] = mesPlan.mes.split('-').map(Number);
    const fecha = new Date(anio, mes - 1 + desplazamiento, 1);
    const nuevoMes = claveMes(fecha);
    const nuevoPlan: MesPlan = { mes: nuevoMes, semanas: semanasDelMes(nuevoMes, menuMensualInicial) };
    setMesPlan(nuevoPlan);
    setSemanaActiva(0);
    guardarPlanLocal(nuevoPlan, 0);
  }

  function seleccionarSemana(indice: number): void {
    const seguro = Math.max(0, Math.min(indice, planMensual.length - 1));
    setSemanaActiva(seguro);
    guardarPlanLocal(mesPlan, seguro);
  }

  function excluirSemana(indice: number, excluida = true): void {
    const semanas = planMensual.map((semana, i) => i === indice ? { ...semana, excluida } : semana);
    const nuevoPlan = { ...mesPlan, semanas };
    setMesPlan(nuevoPlan);
    guardarPlanLocal(nuevoPlan, semanaActiva);
  }

  function guardar(nuevoMenu: DiaMenu[]): void {
    const semanas = recalcularPreparacionesPlan(planMensual.map((semana, i) => i === semanaActiva ? { ...semana, menu: nuevoMenu } : semana));
    const nuevoPlan = { ...mesPlan, semanas };
    setMesPlan(nuevoPlan);
    guardarPlanLocal(nuevoPlan, semanaActiva);
  }

  function guardarPlan(nuevoPlan: SemanaMenu[], indice = 0): void {
    const semanas = normalizarPlanMensual(nuevoPlan);
    const plan = { mes: mesPlan.mes, semanas };
    setMesPlan(plan);
    setSemanaActiva(Math.max(0, Math.min(indice, semanas.length - 1)));
    guardarPlanLocal(plan, indice);
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
  };
}
