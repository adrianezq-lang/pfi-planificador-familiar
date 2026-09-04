import type { SemanaMenu } from '../data/MenuMensual';
import type { Receta } from '../data/Recetas';
import type { DiaMenu, MomentoPostre, PostreMenu } from '../data/Menusemanal';

export type ConfiguracionPostres = {
  /** Compatibilidad con configuraciones de v0.9.10-v0.9.12. */
  recetas?: string[];
  comida?: string[];
  cena?: string[];
};

export type OpcionesAplicacionPostres = {
  respetarEdicionesManuales?: boolean;
};

type ConfiguracionPostresNormalizada = {
  comida: string[];
  cena: string[];
};

const CLAVE_CONFIG_POSTRES = 'pfi-config-postres-v0913';
const CLAVES_CONFIG_ANTERIORES = [
  'pfi-config-postres-v0910',
  'pfi-config-postres-v099',
] as const;

export const CONFIGURACION_POSTRES_INICIAL: ConfiguracionPostres = {
  comida: [],
  cena: [],
};

function normalizarTexto(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function limpiarNombres(valores: unknown): string[] {
  if (!Array.isArray(valores)) return [];

  return Array.from(
    new Set(
      valores
        .filter((valor): valor is string => typeof valor === 'string')
        .map((valor) => valor.trim())
        .filter(Boolean),
    ),
  );
}

function pareceYogur(nombre: string): boolean {
  return normalizarTexto(nombre).includes('yogur');
}

function normalizarConfiguracion(valor: unknown): ConfiguracionPostresNormalizada {
  if (!valor || typeof valor !== 'object') return { comida: [], cena: [] };

  const candidato = valor as ConfiguracionPostres & {
    frutas?: unknown;
    yogur?: unknown;
  };
  const comida = limpiarNombres(candidato.comida);
  const cena = limpiarNombres(candidato.cena);
  if (comida.length > 0 || cena.length > 0) return { comida, cena };

  const recetas = limpiarNombres(candidato.recetas);
  if (recetas.length > 0) {
    return {
      comida: recetas.filter((nombre) => !pareceYogur(nombre)),
      cena: recetas.filter(pareceYogur),
    };
  }

  const frutas = limpiarNombres(candidato.frutas);
  const yogur =
    typeof candidato.yogur === 'string' && candidato.yogur.trim()
      ? [candidato.yogur.trim()]
      : [];

  return { comida: frutas, cena: yogur };
}

function contieneFruta(receta: Receta): boolean {
  const texto = normalizarTexto(
    [
      receta.nombre,
      receta.categoria,
      ...receta.ingredientes.flatMap((ingrediente) => [
        ingrediente.nombre,
        ingrediente.seccion,
      ]),
    ].join(' '),
  );
  const frutas = [
    'fruta',
    'sandia',
    'melon',
    'platano',
    'banana',
    'manzana',
    'pera',
    'naranja',
    'mandarina',
    'kiwi',
    'fresa',
    'frambuesa',
    'arandano',
    'uva',
    'melocoton',
    'nectarina',
    'ciruela',
    'pina',
    'mango',
  ];

  return frutas.some((fruta) => texto.includes(fruta));
}

function contieneYogur(receta: Receta): boolean {
  const texto = normalizarTexto(
    [receta.nombre, ...receta.ingredientes.map((ingrediente) => ingrediente.nombre)].join(' '),
  );
  return texto.includes('yogur');
}

/**
 * Solo vuelca automáticamente postres del recetario:
 * fruta en la comida y yogur en la cena. Otros postres siguen disponibles
 * para escogerlos manualmente, pero no rompen el patrón automático.
 */
export function crearConfiguracionPostresDesdeRecetas(
  recetas: Receta[],
): ConfiguracionPostresNormalizada {
  const postres = recetas.filter(
    (receta) => receta.tipo === 'postre' || normalizarTexto(receta.categoria).includes('postre'),
  );
  const frutas = postres.filter(contieneFruta);
  const frutasEspecificas = frutas.filter(
    (receta) => normalizarTexto(receta.nombre) !== 'fruta variada',
  );

  return {
    comida: (frutasEspecificas.length > 0 ? frutasEspecificas : frutas)
      .map((receta) => receta.nombre),
    cena: postres.filter(contieneYogur).map((receta) => receta.nombre),
  };
}

export function cargarConfiguracionPostres(): ConfiguracionPostresNormalizada {
  try {
    const actual = localStorage.getItem(CLAVE_CONFIG_POSTRES);
    if (actual) return normalizarConfiguracion(JSON.parse(actual) as unknown);

    for (const clave of CLAVES_CONFIG_ANTERIORES) {
      const anterior = localStorage.getItem(clave);
      if (!anterior) continue;
      const migrada = normalizarConfiguracion(JSON.parse(anterior) as unknown);
      localStorage.setItem(CLAVE_CONFIG_POSTRES, JSON.stringify(migrada));
      return migrada;
    }
  } catch {
    // Se usará una configuración vacía y segura.
  }

  return { comida: [], cena: [] };
}

export function guardarConfiguracionPostres(
  configuracion: ConfiguracionPostres,
): ConfiguracionPostresNormalizada {
  const normalizada = normalizarConfiguracion(configuracion);
  localStorage.setItem(CLAVE_CONFIG_POSTRES, JSON.stringify(normalizada));
  return normalizada;
}

function tipoLegacy(nombreReceta: string, momento: MomentoPostre): PostreMenu {
  const normalizado = normalizarTexto(nombreReceta);
  if (normalizado.includes('sin postre')) return 'Sin postre';
  if (normalizado.includes('yogur')) return 'Yogur';
  return momento === 'cena' ? 'Yogur' : 'Fruta';
}

function esEdicionManual(dia: DiaMenu, momento: MomentoPostre): boolean {
  return momento === 'comida'
    ? dia.postreComidaManual === true
    : dia.postreCenaManual === true;
}

function aplicarPostre(
  dia: DiaMenu,
  momento: MomentoPostre,
  receta: string,
  opciones: OpcionesAplicacionPostres,
): DiaMenu {
  if (
    opciones.respetarEdicionesManuales === true &&
    esEdicionManual(dia, momento)
  ) {
    return dia;
  }

  const tipo = tipoLegacy(receta, momento);

  if (momento === 'comida') {
    return {
      ...dia,
      postreComida: tipo,
      postreComidaReceta: receta,
      detallePostreComida: receta,
      cantidadPostreComida: tipo === 'Sin postre' ? 0 : 1,
      postreComidaManual: false,
    };
  }

  return {
    ...dia,
    postreCena: tipo,
    postreCenaReceta: receta,
    detallePostreCena: receta,
    cantidadPostreCena: tipo === 'Sin postre' ? 0 : 1,
    postreCenaManual: false,
  };
}

export function aplicarConfiguracionPostresAlPlan(
  plan: SemanaMenu[],
  configuracion: ConfiguracionPostres,
  opciones: OpcionesAplicacionPostres = {},
): SemanaMenu[] {
  const config = guardarConfiguracionPostres(configuracion);

  return plan.map((semana) => {
    let indiceComida = 0;
    let indiceCena = 0;

    return {
      ...semana,
      menu: semana.menu.map((diaOriginal) => {
        let dia = { ...diaOriginal };

        if (diaOriginal.dia === 'Domingo') {
          dia = aplicarPostre(dia, 'comida', 'Sin postre', opciones);
          dia = aplicarPostre(dia, 'cena', 'Sin postre', opciones);
          return dia;
        }

        const postreComida = config.comida.length > 0
          ? config.comida[indiceComida++ % config.comida.length]
          : 'Sin postre';
        const postreCena = config.cena.length > 0
          ? config.cena[indiceCena++ % config.cena.length]
          : 'Sin postre';

        dia = aplicarPostre(dia, 'comida', postreComida, opciones);
        dia = aplicarPostre(dia, 'cena', postreCena, opciones);
        return dia;
      }),
    };
  });
}

export function renombrarRecetaPostreConfigurada(
  nombreAnterior: string,
  nombreNuevo: string,
): void {
  const configuracion = cargarConfiguracionPostres();
  guardarConfiguracionPostres({
    comida: configuracion.comida.map((nombre) =>
      nombre === nombreAnterior ? nombreNuevo : nombre,
    ),
    cena: configuracion.cena.map((nombre) =>
      nombre === nombreAnterior ? nombreNuevo : nombre,
    ),
  });
}

export function quitarRecetaPostreConfigurada(nombreReceta: string): void {
  const configuracion = cargarConfiguracionPostres();
  guardarConfiguracionPostres({
    comida: configuracion.comida.filter((nombre) => nombre !== nombreReceta),
    cena: configuracion.cena.filter((nombre) => nombre !== nombreReceta),
  });
}
