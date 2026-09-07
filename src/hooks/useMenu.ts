import { useEffect, useMemo, useState } from 'react';
import { menuMensualInicial, type SemanaMenu } from '../data/MenuMensual';
import type { DiaMenu } from '../data/Menusemanal';
import { recalcularPreparacionesPlan } from '../services/menu';
import {
  crearConfiguracionPostresDesdeRecetas,
  aplicarConfiguracionPostresAlPlan,
} from '../services/postres';
import { cargarRecetas, EVENTO_RECETAS } from '../services/recetas';
import {
  aplicarReglaGarbanzosFritos,
  aplicarRepeticionLegumbres,
  aplicarVariedadPastas,
} from '../services/reglasMenuMensual';
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
  'Macarrones con atún',
  'Espaguetis con tomate y atún',
] as const;
const ENSALADAS_PASTA = [
  'Ensalada de pasta',
  'Ensalada de pasta con pollo',
  'Ensalada de pasta con huevo',
  'Ensalada de pasta mediterránea',
  'Ensalada de pasta con pavo',
  'Ensalada de pasta con atún y huevo',
] as const;

type MesPlan = { mes: string; semanas: SemanaMenu[] };

function claveMes(fecha = new Date()): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

function esEnsaladaDePasta(plato: string): boolean {
  return plato.trim().toLocaleLowerCase('es').startsWith('ensalada de pasta');
}

function contieneEnsaladaDePasta(dia: DiaMenu): boolean {
  return dia.comida.some(esEnsaladaDePasta);
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

/**
 * Regla familiar: una ensalada de pasta cada semana durante todo el año,
 * cambiando la receta entre semanas. También sanea planes antiguos de verano
 * que pudieron acumular la misma ensalada varias veces.
 */
function aplicarPreferenciaEnsaladaPasta(
  _mes: string,
  semanas: SemanaMenu[],
): SemanaMenu[] {
  const usadas = new Set<string>();
  let huboCambios = false;

  const ajustadas = semanas.map((semana, indiceSemana) => {
    const existentes = semana.menu
      .flatMap((dia) => dia.comida)
      .filter(esEnsaladaDePasta);
    const objetivo =
      existentes.find((plato) => !usadas.has(plato)) ??
      ENSALADAS_PASTA.find((plato) => !usadas.has(plato)) ??
      ENSALADAS_PASTA[indiceSemana % ENSALADAS_PASTA.length];
    const sustitutoExtra = alternativaPasta(semana, indiceSemana);
    let colocada = false;

    usadas.add(objetivo);

    const menu = semana.menu.map((dia) => {
      if (!contieneEnsaladaDePasta(dia)) {
        if (existentes.length === 0 && dia.dia === 'Miércoles') {
          huboCambios = true;
          colocada = true;
          return { ...dia, comida: [objetivo] };
        }
        return { ...dia };
      }

      if (!colocada) {
        colocada = true;
        const comida = dia.comida.map((plato) =>
          esEnsaladaDePasta(plato) ? objetivo : plato,
        );
        if (JSON.stringify(comida) !== JSON.stringify(dia.comida)) huboCambios = true;
        return { ...dia, comida };
      }

      huboCambios = true;
      return {
        ...dia,
        comida: dia.comida.map((plato) =>
          esEnsaladaDePasta(plato) ? sustitutoExtra : plato,
        ),
      };
    });

    return { ...semana, menu };
  });

  return huboCambios ? recalcularPreparacionesPlan(ajustadas) : semanas;
}

function aplicarPostresDelRecetario(semanas: SemanaMenu[]): SemanaMenu[] {
  const configuracion = crearConfiguracionPostresDesdeRecetas(cargarRecetas());
  return aplicarConfiguracionPostresAlPlan(
    semanas,
    configuracion,
    { respetarEdicionesManuales: true },
  );
}

function aplicarReglasMensuales(
  mes: string,
  semanas: SemanaMenu[],
): SemanaMenu[] {
  const estacionales = aplicarPreferenciaEnsaladaPasta(mes, semanas);
  const conPastasVariadas = aplicarVariedadPastas(estacionales, true);
  const sinGarbanzosFritosRepetidos = aplicarReglaGarbanzosFritos(conPastasVariadas);
  const conLegumbresRepetidas = aplicarRepeticionLegumbres(sinGarbanzosFritosRepetidos);
  const preparadas = recalcularPreparacionesPlan(conLegumbresRepetidas);
  return aplicarPostresDelRecetario(preparadas);
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

  return aplicarReglasMensuales(
    mes,
    recalcularPreparacionesPlan(resultado),
  );
}

function firmaServicio(platos: string[]): string {
  return platos
    .map((plato) =>
      plato
        .toLocaleLowerCase('es')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim(),
    )
    .join(' + ');
}

function planNecesitaPatron(semanas: SemanaMenu[]): boolean {
  if (semanas.length < 3) return false;

  const usos = new Map<string, Set<number>>();
  let tieneVainas = false;
  let tieneVerdurasHorno = false;
  let tieneCalabacinPlancha = false;

  semanas.forEach((semana, indiceSemana) => {
    const lunes = semana.menu.find((dia) => dia.dia === 'Lunes');
    const firmaLegumbreLunes = firmaServicio(lunes?.comida ?? []);

    semana.menu.forEach((dia) => {
      ([['comida', dia.comida], ['cena', dia.cena]] as const).forEach(
        ([momento, platos]) => {
          const firma = firmaServicio(platos);
          if (!firma) return;

          tieneVainas = tieneVainas || firma.includes('vainas');
          tieneVerdurasHorno = tieneVerdurasHorno || firma.includes('verduras al horno');
          tieneCalabacinPlancha =
            tieneCalabacinPlancha || firma.includes('calabacin a la plancha');

          if (firma === 'comemos fuera' || firma === 'cola cao y galletas') return;
          if (dia.dia === 'Viernes' && momento === 'cena' && firma.includes('pizza')) return;
          if (
            dia.dia === 'Jueves' &&
            momento === 'comida' &&
            firma === firmaLegumbreLunes
          ) {
            return;
          }

          const semanasUso = usos.get(firma) ?? new Set<number>();
          semanasUso.add(indiceSemana);
          usos.set(firma, semanasUso);
        },
      );
    });
  });

  const hayServicioRepetido = Array.from(usos.values()).some(
    (semanasUso) => semanasUso.size > 1,
  );

  return (
    hayServicioRepetido ||
    !tieneVainas ||
    !tieneVerdurasHorno ||
    !tieneCalabacinPlancha
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
        const martesVariados = aplicarVariedadCenasMartes(normalizadas);
        const conPatron = migrarPlanAlPatron(mes, martesVariados);
        const semanas = aplicarReglasMensuales(mes, conPatron);
        const plan = { mes, semanas };

        if (JSON.stringify(semanas) !== JSON.stringify(normalizadas)) {
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

  useEffect(() => {
    const actualizarPostres = () => {
      setMesPlan((planActual) => ({
        ...planActual,
        semanas: aplicarPostresDelRecetario(planActual.semanas),
      }));
    };

    window.addEventListener(EVENTO_RECETAS, actualizarPostres);
    return () => window.removeEventListener(EVENTO_RECETAS, actualizarPostres);
  }, []);

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
