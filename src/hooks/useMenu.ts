import { useEffect, useMemo, useState } from 'react';
import {
  CENAS_VIERNES,
  menuMensualInicial,
  type SemanaMenu,
} from '../data/MenuMensual';
import type { DiaMenu } from '../data/Menusemanal';
import {
  normalizarMenu,
  recalcularPreparaciones,
  recalcularPreparacionesPlan,
} from '../services/menu';
import {
  copiarPlanMensual,
  normalizarPlanMensual,
} from '../services/planMensual';
import { registrarMenuSemanal } from '../services/aprendizaje';
import {
  aplicarConfiguracionPostresAlPlan,
  cargarConfiguracionPostres,
  crearConfiguracionPostresDesdeRecetas,
  guardarConfiguracionPostres,
} from '../services/postres';
import { cargarRecetas, esRecetaPostre } from '../services/recetas';

const CLAVE_MENU = 'pfi-menu';
const CLAVE_PLAN_MENSUAL = 'pfi-menu-mensual-v1';
const CLAVE_SEMANA_ACTIVA = 'pfi-semana-activa';
const EVENTO_MENU = 'pfi-menu-actualizado';
const CLAVE_MIGRACION_VIERNES_V095 = 'pfi-migracion-viernes-v095';
const CLAVE_MIGRACION_POSTRES_V0911 = 'pfi-migracion-postres-v0911';
const CLAVE_MIGRACION_POSTRES_V0912 = 'pfi-migracion-postres-v0912';
const CLAVE_FIRMA_POSTRES_V0912 = 'pfi-firma-postres-recetario-v0912';
const CLAVE_MIGRACION_POSTRES_V0913 = 'pfi-migracion-postres-v0913';
const CLAVE_FIRMA_POSTRES_V0913 = 'pfi-firma-postres-recetario-v0913';

function indiceSemanaActual(): number {
  const fecha = new Date();
  return Math.max(0, Math.min(3, Math.floor((fecha.getDate() - 1) / 7)));
}

function migrarViernesV095(plan: SemanaMenu[]): SemanaMenu[] {
  if (localStorage.getItem(CLAVE_MIGRACION_VIERNES_V095) === '1') {
    return plan;
  }

  const migradoBase = plan.map((semana, indiceSemana) => ({
    ...semana,
    menu: semana.menu.map((dia) => {
        if (dia.dia === 'Viernes') {
          return {
            ...dia,
            cena: [...CENAS_VIERNES[indiceSemana % CENAS_VIERNES.length]],
          };
        }
        if (dia.dia === 'Sábado' && dia.cena.includes('Hamburguesas')) {
          return {
            ...dia,
            cena:
              indiceSemana % 2 === 0
                ? ['Pizza jamón y queso', 'Pizza BBQ']
                : ['Pizza BBQ', 'Pizza 4 quesos'],
          };
        }
        return dia;
      }),
  }));
  const migrado = recalcularPreparacionesPlan(migradoBase);

  localStorage.setItem(CLAVE_MIGRACION_VIERNES_V095, '1');
  localStorage.setItem(CLAVE_PLAN_MENSUAL, JSON.stringify(migrado));
  return migrado;
}


function migrarPostresV0911(plan: SemanaMenu[]): SemanaMenu[] {
  if (localStorage.getItem(CLAVE_MIGRACION_POSTRES_V0911) === '1') {
    return plan;
  }

  const migrado = aplicarConfiguracionPostresAlPlan(
    plan,
    cargarConfiguracionPostres(),
  );
  localStorage.setItem(CLAVE_MIGRACION_POSTRES_V0911, '1');
  localStorage.setItem(CLAVE_PLAN_MENSUAL, JSON.stringify(migrado));
  return migrado;
}


function migrarPostresV0912(plan: SemanaMenu[]): SemanaMenu[] {
  if (localStorage.getItem(CLAVE_MIGRACION_POSTRES_V0912) === '1') {
    return plan;
  }

  const nombresPostres = cargarRecetas()
    .filter(esRecetaPostre)
    .map((receta) => receta.nombre);
  const configuracion = nombresPostres.length > 0
    ? guardarConfiguracionPostres({ recetas: nombresPostres })
    : cargarConfiguracionPostres();
  const nombresPermitidos = new Set(nombresPostres);
  const planConExcepciones = plan.map((semana) => ({
    ...semana,
    menu: semana.menu.map((dia, indiceDia) => {
      const recetaComida = dia.postreComidaReceta ?? '';
      const recetaCena = dia.postreCenaReceta ?? '';
      const domingo = dia.dia === 'Domingo';
      const diaBase = indiceDia % 2 === 0 && !domingo;
      const excepcionComida = domingo
        ? recetaComida !== 'Sin postre'
        : diaBase
          ? recetaComida !== 'Fruta variada'
          : !nombresPermitidos.has(recetaComida);
      const excepcionCena = domingo
        ? recetaCena !== 'Sin postre'
        : diaBase
          ? recetaCena !== 'Yogur natural'
          : !nombresPermitidos.has(recetaCena);

      return {
        ...dia,
        postreComidaManual:
          dia.postreComidaManual === true || excepcionComida,
        postreCenaManual:
          dia.postreCenaManual === true || excepcionCena,
      };
    }),
  }));
  const migrado = aplicarConfiguracionPostresAlPlan(
    planConExcepciones,
    configuracion,
    { respetarEdicionesManuales: true },
  );

  localStorage.setItem(CLAVE_MIGRACION_POSTRES_V0912, '1');
  localStorage.setItem(CLAVE_FIRMA_POSTRES_V0912, JSON.stringify(nombresPostres));
  localStorage.setItem(CLAVE_PLAN_MENSUAL, JSON.stringify(migrado));
  return migrado;
}


function migrarPostresV0913(plan: SemanaMenu[]): SemanaMenu[] {
  if (localStorage.getItem(CLAVE_MIGRACION_POSTRES_V0913) === '1') {
    return plan;
  }

  const recetasPostre = cargarRecetas().filter(esRecetaPostre);
  const nombresPostres = recetasPostre.map((receta) => receta.nombre);
  const configuracion = crearConfiguracionPostresDesdeRecetas(recetasPostre);
  const permitidos = new Set([...nombresPostres, 'Sin postre']);
  const planBase = plan.map((semana) => ({
    ...semana,
    menu: semana.menu.map((dia) => ({
      ...dia,
      postreComidaManual:
        dia.dia === 'Domingo' &&
        dia.postreComidaManual === true &&
        permitidos.has(dia.postreComidaReceta ?? ''),
      postreCenaManual:
        dia.dia === 'Domingo' &&
        dia.postreCenaManual === true &&
        permitidos.has(dia.postreCenaReceta ?? ''),
    })),
  }));
  const migrado = aplicarConfiguracionPostresAlPlan(
    planBase,
    configuracion,
    { respetarEdicionesManuales: true },
  );

  guardarConfiguracionPostres(configuracion);
  localStorage.setItem(CLAVE_MIGRACION_POSTRES_V0913, '1');
  localStorage.setItem(
    CLAVE_FIRMA_POSTRES_V0913,
    JSON.stringify({ nombresPostres, configuracion }),
  );
  localStorage.setItem(CLAVE_PLAN_MENSUAL, JSON.stringify(migrado));
  return migrado;
}

function cargarPlan(): SemanaMenu[] {
  try {
    const guardado = localStorage.getItem(CLAVE_PLAN_MENSUAL);
    if (guardado) {
      const plan = migrarPostresV0913(
        migrarPostresV0912(
          migrarPostresV0911(
            migrarViernesV095(
              normalizarPlanMensual(JSON.parse(guardado) as unknown),
            ),
          ),
        ),
      );
      localStorage.setItem(CLAVE_PLAN_MENSUAL, JSON.stringify(plan));
      return plan;
    }

    let plan = copiarPlanMensual(menuMensualInicial);
    const menuAnterior = localStorage.getItem(CLAVE_MENU);

    if (menuAnterior) {
      try {
        plan[0] = {
          ...plan[0],
          menu: recalcularPreparaciones(
            normalizarMenu(JSON.parse(menuAnterior) as unknown, plan[0].menu),
          ),
        };
      } catch {
        // Conservamos el plan mensual inicial si el menú anterior no es válido.
      }
    }

    plan = migrarPostresV0913(
      migrarPostresV0912(
        migrarPostresV0911(migrarViernesV095(plan)),
      ),
    );
    localStorage.setItem(CLAVE_PLAN_MENSUAL, JSON.stringify(plan));
    return plan;
  } catch {
    return copiarPlanMensual(menuMensualInicial);
  }
}

function cargarIndiceSemana(): number {
  try {
    const guardado = Number(localStorage.getItem(CLAVE_SEMANA_ACTIVA));
    return Number.isInteger(guardado) && guardado >= 0 && guardado <= 3
      ? guardado
      : indiceSemanaActual();
  } catch {
    return 0;
  }
}

function guardarCompatibilidad(menu: DiaMenu[]): void {
  localStorage.setItem(CLAVE_MENU, JSON.stringify(menu));
}

export function useMenu() {
  const [planMensual, setPlanMensual] = useState<SemanaMenu[]>(cargarPlan);
  const [semanaActiva, setSemanaActiva] = useState(cargarIndiceSemana);

  const menu = useMemo(
    () => planMensual[semanaActiva]?.menu ?? planMensual[0]?.menu ?? [],
    [planMensual, semanaActiva],
  );

  useEffect(() => {
    guardarCompatibilidad(menu);
  }, [menu]);

  useEffect(() => {
    const actualizar = () => {
      setPlanMensual(cargarPlan());
      setSemanaActiva(cargarIndiceSemana());
    };

    window.addEventListener(EVENTO_MENU, actualizar);
    return () => window.removeEventListener(EVENTO_MENU, actualizar);
  }, []);

  function persistir(plan: SemanaMenu[], indice: number): void {
    const normalizado = normalizarPlanMensual(plan);
    const indiceSeguro = Math.max(0, Math.min(indice, normalizado.length - 1));
    const menuActivo = normalizado[indiceSeguro]?.menu ?? [];

    setPlanMensual(normalizado);
    setSemanaActiva(indiceSeguro);
    localStorage.setItem(CLAVE_PLAN_MENSUAL, JSON.stringify(normalizado));
    localStorage.setItem(CLAVE_SEMANA_ACTIVA, String(indiceSeguro));
    guardarCompatibilidad(menuActivo);
    window.dispatchEvent(new CustomEvent(EVENTO_MENU));
  }

  function guardar(nuevoMenu: DiaMenu[]): void {
    const planActualizado = recalcularPreparacionesPlan(
      planMensual.map((semana, indice) =>
        indice === semanaActiva
          ? { ...semana, menu: nuevoMenu }
          : semana,
      ),
    );

    persistir(planActualizado, semanaActiva);
    registrarMenuSemanal(planActualizado[semanaActiva]?.menu ?? nuevoMenu);
  }

  function guardarPlan(nuevoPlan: SemanaMenu[], indice = 0): void {
    persistir(nuevoPlan, indice);
    normalizarPlanMensual(nuevoPlan).forEach((semana) =>
      registrarMenuSemanal(semana.menu),
    );
  }

  function seleccionarSemana(indice: number): void {
    const indiceSeguro = Math.max(0, Math.min(indice, planMensual.length - 1));
    setSemanaActiva(indiceSeguro);
    localStorage.setItem(CLAVE_SEMANA_ACTIVA, String(indiceSeguro));
    guardarCompatibilidad(planMensual[indiceSeguro]?.menu ?? []);
    window.dispatchEvent(new CustomEvent(EVENTO_MENU));
  }

  return {
    menu,
    guardar,
    planMensual,
    guardarPlan,
    semanaActiva,
    seleccionarSemana,
  };
}
