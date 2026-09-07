import type { SemanaMenu } from '../data/MenuMensual.ts';
import type { DiaMenu } from '../data/Menusemanal.ts';

const PASTAS_DE_ROTACION = [
  'Macarrones boloñesa',
  'Macarrones con chorizo',
  'Carbonara tradicional',
  'Macarrones con roquefort',
  'Macarrones con atún',
  'Espaguetis con tomate y atún',
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

function esEnsaladaPasta(plato: string): boolean {
  return normalizar(plato).startsWith('ensalada de pasta');
}

const LEGUMBRES_DE_OLLA_DOS_DIAS = new Set([
  'lentejas',
  'cocido de garbanzos',
  'alubias rojas',
  'alubias blancas con almejas',
  'garbanzos guisados con verduras',
]);

export function esLegumbreDeOlla(plato: string): boolean {
  return LEGUMBRES_DE_OLLA_DOS_DIAS.has(normalizar(plato));
}

function contieneLegumbreDeOlla(dia: DiaMenu | undefined): boolean {
  return dia?.comida.some(esLegumbreDeOlla) === true;
}

function listasIguales(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((plato, indice) => plato === b[indice]);
}

/**
 * Evita repetir exactamente la misma pasta dentro de una semana o en dos
 * semanas consecutivas. Las ensaladas de pasta se gestionan aparte porque la
 * regla familiar exige una cada semana y cada variante ya tiene nombre propio.
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
          permitirEnsaladaSemanal && esEnsaladaPasta(plato);
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

/** Evita repetir el plato puntual de garbanzos fritos el jueves. */
export function aplicarReglaGarbanzosFritos(semanas: SemanaMenu[]): SemanaMenu[] {
  let huboCambios = false;

  const resultado = semanas.map((semana) => {
    const lunes = semana.menu.find((dia) => normalizar(dia.dia) === 'lunes');
    const jueves = semana.menu.find((dia) => normalizar(dia.dia) === 'jueves');
    const lunesTieneFritos = lunes?.comida.some((plato) => normalizar(plato) === 'garbanzos fritos') === true;
    const juevesTieneFritos = jueves?.comida.some((plato) => normalizar(plato) === 'garbanzos fritos') === true;

    if (!lunesTieneFritos || !juevesTieneFritos) return semana;

    huboCambios = true;
    return {
      ...semana,
      menu: semana.menu.map((dia) =>
        normalizar(dia.dia) === 'jueves'
          ? { ...dia, comida: ['Lentejas con arroz y verduras'] }
          : { ...dia, comida: [...dia.comida], cena: [...dia.cena] },
      ),
    };
  });

  return huboCambios ? resultado : semanas;
}

/**
 * Solo las legumbres marcadas como olla de dos días se repiten el jueves.
 * Garbanzos fritos y otras legumbres puntuales nunca se copian automáticamente.
 */
export function aplicarRepeticionLegumbres(semanas: SemanaMenu[]): SemanaMenu[] {
  let huboCambios = false;

  const ajustadas = semanas.map((semana) => {
    const lunes = semana.menu.find((dia) => dia.dia === 'Lunes');
    if (!contieneLegumbreDeOlla(lunes) || !lunes) return semana;

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
 * plato dentro de ESA semana es sobrante y no vuelve a añadir ingredientes.
 *
 * Importante: la compra mensual pasa varias semanas concatenadas. Por eso el
 * registro de ollas se reinicia cada lunes. La misma receta de legumbres dos o
 * tres semanas después es una preparación nueva y debe volver a comprarse.
 *
 * Solo deduplicamos el plato de legumbre cocinada. Los acompañamientos que se
 * repiten como platos independientes (por ejemplo Arroz blanco con garbanzos)
 * siguen contando cada día porque sí se consumen dos raciones distintas.
 */
export function listarPlatosParaCompra(
  menu: DiaMenu[],
  esLegumbreCocinada: (plato: string) => boolean,
): string[] {
  let legumbresContadasSemana = new Set<string>();
  const platos: string[] = [];

  menu.forEach((dia, indice) => {
    if (indice > 0 && normalizar(dia.dia) === 'lunes') {
      legumbresContadasSemana = new Set<string>();
    }

    [...dia.comida, ...dia.cena].forEach((plato) => {
      if (!esLegumbreCocinada(plato)) {
        platos.push(plato);
        return;
      }

      const clave = normalizar(plato);
      if (legumbresContadasSemana.has(clave)) return;

      legumbresContadasSemana.add(clave);
      platos.push(plato);
    });
  });

  return platos;
}
