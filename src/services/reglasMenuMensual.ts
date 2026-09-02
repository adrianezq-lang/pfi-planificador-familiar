import type { SemanaMenu } from '../data/MenuMensual.ts';
import type { DiaMenu } from '../data/Menusemanal.ts';

const PASTAS_DE_ROTACION = [
  'Macarrones boloñesa',
  'Macarrones con chorizo',
  'Carbonara tradicional',
  'Macarrones con roquefort',
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

function esPasta(plato: string): boolean {
  return /\b(pasta|macarrones?|carbonara|espaguetis?|tallarines?|lasanas?|canelones?)\b/.test(
    normalizar(plato),
  );
}

function contieneLegumbres(dia: DiaMenu | undefined): boolean {
  if (!dia) return false;
  return dia.comida.some((plato) =>
    /\b(lenteja|garbanzo|alubia|cocido)\b/.test(normalizar(plato)),
  );
}

function listasIguales(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((plato, indice) => plato === b[indice]);
}

/**
 * Evita repetir exactamente la misma pasta dentro de una semana o en dos
 * semanas consecutivas, aunque cambie el día en el que aparece.
 */
export function aplicarVariedadPastas(
  semanas: SemanaMenu[],
  permitirEnsaladaSemanal = false,
): SemanaMenu[] {
  let pastasSemanaAnterior = new Set<string>();
  let huboCambios = false;

  const ajustadas = semanas.map((semana, indiceSemana) => {
    const pastasEstaSemana = new Set<string>();
    let indiceHuecoPasta = 0;

    const ajustarPlatos = (platos: string[]): string[] =>
      platos.map((plato) => {
        if (!esPasta(plato)) return plato;

        const claveActual = normalizar(plato);
        const esEnsaladaSemanal =
          permitirEnsaladaSemanal && claveActual === 'ensalada de pasta';
        const repetida =
          pastasEstaSemana.has(claveActual) ||
          (!esEnsaladaSemanal && pastasSemanaAnterior.has(claveActual));

        if (!repetida) {
          pastasEstaSemana.add(claveActual);
          indiceHuecoPasta += 1;
          return plato;
        }

        const desplazamiento =
          (indiceSemana + indiceHuecoPasta) % PASTAS_DE_ROTACION.length;
        const candidatas = [
          ...PASTAS_DE_ROTACION.slice(desplazamiento),
          ...PASTAS_DE_ROTACION.slice(0, desplazamiento),
        ];
        const sustituta = candidatas.find((candidata) => {
          const clave = normalizar(candidata);
          return !pastasSemanaAnterior.has(clave) && !pastasEstaSemana.has(clave);
        }) ?? candidatas.find((candidata) => !pastasEstaSemana.has(normalizar(candidata)));

        indiceHuecoPasta += 1;
        if (!sustituta) {
          pastasEstaSemana.add(claveActual);
          return plato;
        }

        huboCambios = huboCambios || sustituta !== plato;
        pastasEstaSemana.add(normalizar(sustituta));
        return sustituta;
      });

    const menu = semana.menu.map((dia) => ({
      ...dia,
      comida: ajustarPlatos(dia.comida),
      cena: ajustarPlatos(dia.cena),
    }));

    pastasSemanaAnterior = pastasEstaSemana;
    return { ...semana, menu };
  });

  return huboCambios ? ajustadas : semanas;
}

/**
 * Las legumbres del lunes se cocinan como una preparación grande y se repiten
 * el jueves de esa misma semana.
 */
export function aplicarRepeticionLegumbres(semanas: SemanaMenu[]): SemanaMenu[] {
  let huboCambios = false;

  const ajustadas = semanas.map((semana) => {
    const lunes = semana.menu.find((dia) => dia.dia === 'Lunes');
    if (!contieneLegumbres(lunes) || !lunes) return semana;

    const jueves = semana.menu.find((dia) => dia.dia === 'Jueves');
    if (!jueves || listasIguales(jueves.comida, lunes.comida)) return semana;

    huboCambios = true;
    return {
      ...semana,
      menu: semana.menu.map((dia) =>
        dia.dia === 'Jueves'
          ? { ...dia, comida: [...lunes.comida] }
          : { ...dia, comida: [...dia.comida], cena: [...dia.cena] },
      ),
    };
  });

  return huboCambios ? ajustadas : semanas;
}

/**
 * Las recetas de legumbres del recetario ya representan la olla grande que se
 * prepara el lunes para comer lunes y jueves. La segunda aparición del mismo
 * plato es sobrante: no debe volver a añadir otra receta completa a la compra.
 *
 * Solo deduplicamos el plato de legumbre cocinada. Los acompañamientos que se
 * repiten como platos independientes (por ejemplo Arroz blanco con garbanzos)
 * siguen contando cada día porque sí se consumen dos raciones distintas.
 */
export function listarPlatosParaCompra(
  menu: DiaMenu[],
  esLegumbreCocinada: (plato: string) => boolean,
): string[] {
  const legumbresContadas = new Set<string>();
  const platos: string[] = [];

  menu.forEach((dia) => {
    [...dia.comida, ...dia.cena].forEach((plato) => {
      if (!esLegumbreCocinada(plato)) {
        platos.push(plato);
        return;
      }

      const clave = normalizar(plato);
      if (legumbresContadas.has(clave)) return;

      legumbresContadas.add(clave);
      platos.push(plato);
    });
  });

  return platos;
}
