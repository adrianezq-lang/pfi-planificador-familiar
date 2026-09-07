from pathlib import Path
import json
import re

VERSION = '0.9.23'


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    if new in text:
        return
    if old not in text:
        raise RuntimeError(f'No se encontró el bloque esperado en {path}: {old[:80]!r}')
    write(path, text.replace(old, new, 1))


# ---------------------------------------------------------------------------
# 1. Receta base: kebab con pan de pita, nunca con tortilla de trigo.
# ---------------------------------------------------------------------------
path = 'src/data/Recetas.ts'
text = read(path)
kebab_start = text.find("    nombre: 'Kebab',")
if kebab_start < 0:
    raise RuntimeError('No se encontró la receta Kebab')
kebab_end = text.find("\n  },\n\n  {", kebab_start)
if kebab_end < 0:
    raise RuntimeError('No se encontró el final de la receta Kebab')
kebab = text[kebab_start:kebab_end]
if "nombre: 'Pan de pita'" not in kebab:
    if "nombre: 'Tortillas de trigo'" not in kebab:
        raise RuntimeError('Kebab no contiene ni tortilla ni pita')
    kebab = kebab.replace("nombre: 'Tortillas de trigo'", "nombre: 'Pan de pita'", 1)
    text = text[:kebab_start] + kebab + text[kebab_end:]
    write(path, text)


# ---------------------------------------------------------------------------
# 2. Nuevo recetario v0.9.23.
# ---------------------------------------------------------------------------
recetas_v0923 = r"""import type { Receta } from './Recetas';

/**
 * Ampliación de recetas de v0.9.23. Todas respetan las preferencias familiares:
 * sin maíz, champiñones, brócoli ni merluza y sin cebolla visible.
 */
export const recetasVariedadV0923: Receta[] = [
  {
    nombre: 'Lentejas con arroz y verduras',
    categoria: 'Legumbres',
    ingredientes: [
      { nombre: 'Lentejas secas', cantidad: 250, unidad: 'g', seccion: 'Despensa' },
      { nombre: 'Arroz', cantidad: 1, unidad: 'vaso pequeño', seccion: 'Despensa' },
      { nombre: 'Zanahorias', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Calabacín', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Tomate', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Ajo', cantidad: 2, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Ternera con zanahoria y patatas',
    categoria: 'Carne',
    ingredientes: [
      { nombre: 'Filetes de ternera', cantidad: 4, unidad: 'raciones', seccion: 'Carnicería' },
      { nombre: 'Patatas', cantidad: 1, unidad: 'kg', seccion: 'Fruta y verdura' },
      { nombre: 'Zanahorias', cantidad: 4, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Ajo', cantidad: 2, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Pavo al ajillo con verduras',
    categoria: 'Carne',
    ingredientes: [
      { nombre: 'Pechugas de pavo fileteadas', cantidad: 4, unidad: 'raciones', seccion: 'Carnicería' },
      { nombre: 'Calabacín', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Zanahorias', cantidad: 3, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Ajo', cantidad: 4, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Pollo al limón con patatas',
    categoria: 'Pollo',
    ingredientes: [
      { nombre: 'Pechugas de pollo', cantidad: 700, unidad: 'g', seccion: 'Carnicería' },
      { nombre: 'Patatas', cantidad: 1, unidad: 'kg', seccion: 'Fruta y verdura' },
      { nombre: 'Limón', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Ajo', cantidad: 4, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Bacalao con tomate y pimiento rojo',
    categoria: 'Pescado',
    ingredientes: [
      { nombre: 'Bacalao', cantidad: 4, unidad: 'raciones', seccion: 'Pescadería' },
      { nombre: 'Tomate', cantidad: 3, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Pimiento rojo', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Ajo', cantidad: 3, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Tortilla de calabacín',
    categoria: 'Huevos',
    ingredientes: [
      { nombre: 'Huevos', cantidad: 8, unidad: 'ud', seccion: 'Lácteos y huevos', ajusteAutomatico: true },
      { nombre: 'Calabacín', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Patatas', cantidad: 0.5, unidad: 'kg', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Vainas con tomate y huevo',
    categoria: 'Verduras',
    ingredientes: [
      { nombre: 'Judías verdes', cantidad: 0.8, unidad: 'kg', seccion: 'Congelados' },
      { nombre: 'Tomate', cantidad: 3, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Huevos', cantidad: 4, unidad: 'ud', seccion: 'Lácteos y huevos', ajusteAutomatico: true },
      { nombre: 'Ajo', cantidad: 2, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Lomo con calabacín y patatas',
    categoria: 'Carne',
    ingredientes: [
      { nombre: 'Lomo', cantidad: 4, unidad: 'raciones', seccion: 'Carnicería' },
      { nombre: 'Calabacín', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Patatas', cantidad: 0.8, unidad: 'kg', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Arroz salteado con pollo y verduras',
    categoria: 'Arroz',
    ingredientes: [
      { nombre: 'Arroz', cantidad: 1.5, unidad: 'vaso pequeño', seccion: 'Despensa' },
      { nombre: 'Pechugas de pollo', cantidad: 600, unidad: 'g', seccion: 'Carnicería' },
      { nombre: 'Zanahorias', cantidad: 3, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Calabacín', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Pimiento rojo', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Dorada al horno con verduras',
    categoria: 'Pescado',
    ingredientes: [
      { nombre: 'Dorada', cantidad: 4, unidad: 'raciones', seccion: 'Pescadería' },
      { nombre: 'Calabacín', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Zanahorias', cantidad: 3, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Tomate', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Pimiento rojo', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
    ],
  },
];
"""
write('src/data/RecetasV0923.ts', recetas_v0923)


# ---------------------------------------------------------------------------
# 3. Menú: garbanzos fritos solo el lunes y varias recetas nuevas en rotación.
# ---------------------------------------------------------------------------
path = 'src/data/MenuMensual.ts'
text = read(path)
replacements = {
    "dia('Jueves', ['Garbanzos fritos', 'Arroz blanco'], ['Pollo al ajillo'], 'Fruta', 'Yogur')":
        "dia('Jueves', ['Lentejas con arroz y verduras'], ['Ternera con zanahoria y patatas'], 'Fruta', 'Yogur')",
    "dia('Lunes', ['Alubias blancas con almejas'], ['Pechugas de pollo', 'Ensalada'], 'Fruta', 'Yogur')":
        "dia('Lunes', ['Alubias blancas con almejas'], ['Pavo al ajillo con verduras'], 'Fruta', 'Yogur')",
    "dia('Martes', ['Bacalao', 'Verduras al horno'], ['Vainas salteadas con jamón'], 'Fruta', 'Yogur')":
        "dia('Martes', ['Bacalao con tomate y pimiento rojo'], ['Vainas salteadas con jamón'], 'Fruta', 'Yogur')",
    "dia('Miércoles', ['Ensalada de pasta con atún y huevo'], ['Pollo al ajillo', 'Patatas'], 'Yogur', 'Fruta')":
        "dia('Miércoles', ['Ensalada de pasta con atún y huevo'], ['Pollo al limón con patatas'], 'Yogur', 'Fruta')",
}
for old, new in replacements.items():
    if old in text:
        text = text.replace(old, new, 1)
    elif new not in text:
        raise RuntimeError(f'No se encontró el plato a sustituir: {old}')
text = text.replace(
    ' * - Lunes: legumbres; la misma olla se termina el jueves.\n',
    ' * - Lunes: legumbres; las ollas grandes se terminan el jueves, salvo los garbanzos fritos.\n',
)
write(path, text)


# ---------------------------------------------------------------------------
# 4. Reglas: distinguir explícitamente olla de dos días de legumbre puntual.
# ---------------------------------------------------------------------------
path = 'src/services/reglasMenuMensual.ts'
text = read(path)
text = re.sub(
    r"function contieneLegumbres\(dia: DiaMenu \| undefined\): boolean \{.*?\n\}\n",
    """const LEGUMBRES_DE_OLLA_DOS_DIAS = new Set([\n  'lentejas',\n  'cocido de garbanzos',\n  'alubias rojas',\n  'alubias blancas con almejas',\n  'garbanzos guisados con verduras',\n]);\n\nexport function esLegumbreDeOlla(plato: string): boolean {\n  return LEGUMBRES_DE_OLLA_DOS_DIAS.has(normalizar(plato));\n}\n\nfunction contieneLegumbreDeOlla(dia: DiaMenu | undefined): boolean {\n  return dia?.comida.some(esLegumbreDeOlla) === true;\n}\n""",
    text,
    count=1,
    flags=re.S,
)
text = text.replace(
    "    if (!contieneLegumbres(lunes) || !lunes) return semana;",
    "    if (!contieneLegumbreDeOlla(lunes) || !lunes) return semana;",
)
text = text.replace(
    " * Las legumbres del lunes se cocinan como una preparación grande y se repiten\n * el jueves de esa misma semana.\n",
    " * Solo las legumbres marcadas como olla de dos días se repiten el jueves.\n * Garbanzos fritos y otras legumbres puntuales nunca se copian automáticamente.\n",
)
# Añadir regla explícita para limpiar plantillas/planes antiguos.
marker = "/**\n * Solo las legumbres marcadas como olla de dos días se repiten el jueves."
if 'aplicarReglaGarbanzosFritos' not in text:
    pos = text.find(marker)
    if pos < 0:
        raise RuntimeError('No se encontró el punto para insertar la regla de garbanzos fritos')
    rule = """/** Evita repetir el plato puntual de garbanzos fritos el jueves. */\nexport function aplicarReglaGarbanzosFritos(semanas: SemanaMenu[]): SemanaMenu[] {\n  let huboCambios = false;\n\n  const resultado = semanas.map((semana) => {\n    const lunes = semana.menu.find((dia) => normalizar(dia.dia) === 'lunes');\n    const jueves = semana.menu.find((dia) => normalizar(dia.dia) === 'jueves');\n    const lunesTieneFritos = lunes?.comida.some((plato) => normalizar(plato) === 'garbanzos fritos') === true;\n    const juevesTieneFritos = jueves?.comida.some((plato) => normalizar(plato) === 'garbanzos fritos') === true;\n\n    if (!lunesTieneFritos || !juevesTieneFritos) return semana;\n\n    huboCambios = true;\n    return {\n      ...semana,\n      menu: semana.menu.map((dia) =>\n        normalizar(dia.dia) === 'jueves'\n          ? { ...dia, comida: ['Lentejas con arroz y verduras'] }\n          : { ...dia, comida: [...dia.comida], cena: [...dia.cena] },\n      ),\n    };\n  });\n\n  return huboCambios ? resultado : semanas;\n}\n\n"""
    text = text[:pos] + rule + text[pos:]
write(path, text)


# ---------------------------------------------------------------------------
# 5. useMenu aplica siempre la regla puntual antes del batch cooking.
# ---------------------------------------------------------------------------
path = 'src/hooks/useMenu.ts'
text = read(path)
text = text.replace(
    "  aplicarRepeticionLegumbres,\n  aplicarVariedadPastas,\n",
    "  aplicarReglaGarbanzosFritos,\n  aplicarRepeticionLegumbres,\n  aplicarVariedadPastas,\n",
)
text = text.replace(
    "  const conPastasVariadas = aplicarVariedadPastas(estacionales, true);\n  const conLegumbresRepetidas = aplicarRepeticionLegumbres(conPastasVariadas);",
    "  const conPastasVariadas = aplicarVariedadPastas(estacionales, true);\n  const sinGarbanzosFritosRepetidos = aplicarReglaGarbanzosFritos(conPastasVariadas);\n  const conLegumbresRepetidas = aplicarRepeticionLegumbres(sinGarbanzosFritosRepetidos);",
)
write(path, text)


# ---------------------------------------------------------------------------
# 6. Compra: deduplicar solo verdaderas ollas, no toda la categoría Legumbres.
# ---------------------------------------------------------------------------
path = 'src/services/listaCompra.ts'
text = read(path)
text = text.replace(
    "import { listarPlatosParaCompra } from './reglasMenuMensual';",
    "import { esLegumbreDeOlla, listarPlatosParaCompra } from './reglasMenuMensual';",
)
text = text.replace(
    "  'alubias rojas',\n]);",
    "  'alubias rojas',\n  'garbanzos guisados con verduras',\n]);",
    1,
)
old_pred = """  const recetasBase = cargarRecetas();\n  const esLegumbreCocinada = (nombre: string): boolean => {\n    const receta = recetasBase.find((candidata) => candidata.nombre === nombre);\n    return receta?.categoria.toLocaleLowerCase('es') === 'legumbres';\n  };"""
new_pred = """  const recetasBase = cargarRecetas();"""
if old_pred in text:
    text = text.replace(old_pred, new_pred, 1)
elif 'const esLegumbreCocinada' in text:
    raise RuntimeError('No se pudo sustituir el predicado de legumbres en listaCompra')
text = text.replace(
    "      esLegumbreCocinada,\n    );",
    "      esLegumbreDeOlla,\n    );",
)
write(path, text)


# ---------------------------------------------------------------------------
# 7. Asociaciones robustas: pita y limón con SKU real del catálogo 48950.
# ---------------------------------------------------------------------------
path = 'src/services/asociacionesIngredientes.ts'
text = read(path)
if "  Limón: '3210'," not in text:
    text = text.replace("  Leche: '10380',\n", "  Leche: '10380',\n  Limón: '3210',\n", 1)
if "  'Pan de pita': '14378'," not in text:
    text = text.replace("  'Pan de perrito': '82332',\n", "  'Pan de perrito': '82332',\n  'Pan de pita': '14378',\n", 1)
write(path, text)


# ---------------------------------------------------------------------------
# 8. Migración v0.9.23: corrige kebab guardado y repone recetas modernas tras
#    restaurar/importar el recetario, sin pisar ediciones existentes.
# ---------------------------------------------------------------------------
migracion = r"""import { recetasVariedadV0922 } from '../data/RecetasV0922';
import { recetasVariedadV0923 } from '../data/RecetasV0923';
import {
  asociarProductoAIngrediente,
  obtenerProductoIdAsociado,
} from './asociacionesIngredientes';
import { cargarPerfil } from './perfil';
import { ajustarRecetasAlPerfil } from './porciones';
import {
  cargarRecetas,
  EVENTO_RECETAS,
  guardarRecetas,
} from './recetas';

let aplicando = false;
let instalado = false;

function normalizar(texto: string): string {
  return texto.trim().toLocaleLowerCase('es');
}

/** Mantiene las recetas modernas y corrige el kebab histórico. */
export function aplicarMigracionV0923(): void {
  if (aplicando) return;
  aplicando = true;

  try {
    const actuales = cargarRecetas();
    let cambiadas = false;

    const reparadas = actuales.map((receta) => {
      if (normalizar(receta.nombre) !== 'kebab') return receta;

      let recetaCambiada = false;
      const ingredientes = receta.ingredientes.map((ingrediente) => {
        if (normalizar(ingrediente.nombre) !== 'tortillas de trigo') return ingrediente;
        recetaCambiada = true;
        return { ...ingrediente, nombre: 'Pan de pita', seccion: 'Panadería' };
      });

      if (!recetaCambiada) return receta;
      cambiadas = true;
      return { ...receta, ingredientes };
    });

    const nombres = new Set(reparadas.map((receta) => normalizar(receta.nombre)));
    const faltantes = [...recetasVariedadV0922, ...recetasVariedadV0923]
      .filter((receta) => !nombres.has(normalizar(receta.nombre)));

    if (faltantes.length > 0) {
      cambiadas = true;
      const ajustadas = ajustarRecetasAlPerfil(faltantes, cargarPerfil(), true);
      reparadas.push(...ajustadas);
    }

    if (cambiadas) guardarRecetas(reparadas);

    const pita = obtenerProductoIdAsociado('Pan de pita');
    if (!pita || pita === '80859') {
      asociarProductoAIngrediente('Pan de pita', '14378');
    }
    if (!obtenerProductoIdAsociado('Limón')) {
      asociarProductoAIngrediente('Limón', '3210');
    }
  } finally {
    aplicando = false;
  }
}

/**
 * Se instala una vez. El listener permite que «restaurar recetas» o importar
 * una copia antigua no deje fuera las recetas modernas ni recupere el kebab
 * con tortillas hasta la siguiente recarga.
 */
export function instalarMigracionV0923(): void {
  aplicarMigracionV0923();
  if (instalado) return;
  instalado = true;
  window.addEventListener(EVENTO_RECETAS, aplicarMigracionV0923);
}
"""
write('src/services/migracionV0923.ts', migracion)

path = 'src/main.tsx'
text = read(path)
if "./services/migracionV0923.ts" not in text:
    text = text.replace(
        "import { aplicarMigracionVariedadV0922 } from './services/migracionV0922.ts'\n",
        "import { aplicarMigracionVariedadV0922 } from './services/migracionV0922.ts'\nimport { instalarMigracionV0923 } from './services/migracionV0923.ts'\n",
        1,
    )
text = text.replace(
    "aplicarMigracionVariedadV0922()\ninstalarNormalizacionPeriodicidadDespensa()",
    "aplicarMigracionVariedadV0922()\ninstalarMigracionV0923()\ninstalarNormalizacionPeriodicidadDespensa()",
    1,
)
write(path, text)


# ---------------------------------------------------------------------------
# 9. Objetivos exactos Mercadona.
# ---------------------------------------------------------------------------
path = 'scripts/productos-objetivo.json'
productos = json.loads(read(path))
por_nombre = {item['ingrediente']: item for item in productos}
por_nombre['Pan de pita'] = {
    'ingrediente': 'Pan de pita',
    'buscar': 'pan de pita Mission',
    'productoId': '14378',
}
por_nombre['Limón'] = {
    'ingrediente': 'Limón',
    'buscar': 'limón pieza',
    'productoId': '3210',
}
# Conservar orden previo y añadir nuevos al final.
existentes = [item['ingrediente'] for item in productos]
resultado = [por_nombre[nombre] for nombre in existentes]
for nombre in ['Pan de pita', 'Limón']:
    if nombre not in existentes:
        resultado.append(por_nombre[nombre])
write(path, json.dumps(resultado, ensure_ascii=False, indent=2) + '\n')


# ---------------------------------------------------------------------------
# 10. Test de reglas: olla explícita y garbanzos fritos puntuales.
# ---------------------------------------------------------------------------
reglas_test = r"""import { menuMensualInicial } from '../src/data/MenuMensual.ts';
import {
  aplicarReglaGarbanzosFritos,
  aplicarRepeticionLegumbres,
  aplicarVariedadPastas,
  esLegumbreDeOlla,
  listarPlatosParaCompra,
} from '../src/services/reglasMenuMensual.ts';

const normalizar = (texto) => texto
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

const esPasta = (plato) =>
  /\b(pasta|macarrones?|carbonara|espaguetis?|tallarines?|lasanas?|canelones?)\b/.test(normalizar(plato));

const plan = aplicarVariedadPastas(
  aplicarRepeticionLegumbres(
    aplicarReglaGarbanzosFritos(structuredClone(menuMensualInicial)),
  ),
  true,
);
let pastasSemanaAnterior = new Set();

plan.forEach((semana, indice) => {
  const lunes = semana.menu.find((dia) => dia.dia === 'Lunes');
  const jueves = semana.menu.find((dia) => dia.dia === 'Jueves');
  const lunesEsOlla = lunes?.comida.some(esLegumbreDeOlla) === true;
  const lunesTieneFritos = lunes?.comida.includes('Garbanzos fritos') === true;

  if (lunesEsOlla && JSON.stringify(lunes?.comida) !== JSON.stringify(jueves?.comida)) {
    throw new Error(`La semana ${indice + 1} no reutiliza el jueves la olla del lunes.`);
  }
  if (lunesTieneFritos && jueves?.comida.includes('Garbanzos fritos')) {
    throw new Error(`La semana ${indice + 1} repite indebidamente garbanzos fritos el jueves.`);
  }

  const pastas = semana.menu
    .flatMap((dia) => [...dia.comida, ...dia.cena])
    .filter(esPasta)
    .map(normalizar);
  if (new Set(pastas).size !== pastas.length) {
    throw new Error(`La semana ${indice + 1} repite una pasta.`);
  }
  if (pastas.some((pasta) => pastasSemanaAnterior.has(pasta))) {
    throw new Error(`Las semanas ${indice} y ${indice + 1} repiten una pasta.`);
  }
  pastasSemanaAnterior = new Set(pastas);
});

const compraLentejas = listarPlatosParaCompra(plan[0].menu, esLegumbreDeOlla);
if (compraLentejas.filter((plato) => plato === 'Lentejas').length !== 1) {
  throw new Error('La olla de lentejas debe entrar una sola vez en la compra semanal.');
}

const repeticionManualFritos = structuredClone(plan[3].menu);
for (const dia of repeticionManualFritos) {
  if (dia.dia === 'Jueves') dia.comida = ['Garbanzos fritos', 'Arroz blanco'];
}
const compraFritos = listarPlatosParaCompra(repeticionManualFritos, esLegumbreDeOlla);
if (compraFritos.filter((plato) => plato === 'Garbanzos fritos').length !== 2) {
  throw new Error('Garbanzos fritos repetidos manualmente deben contar dos consumos, no una olla.');
}

const repeticionEntreSemanas = structuredClone(plan.slice(0, 2));
for (const dia of repeticionEntreSemanas[1].menu) {
  if (dia.dia === 'Lunes' || dia.dia === 'Jueves') dia.comida = ['Lentejas'];
}
const compraRepetida = listarPlatosParaCompra(
  repeticionEntreSemanas.flatMap((semana) => semana.menu),
  esLegumbreDeOlla,
);
if (compraRepetida.filter((plato) => plato === 'Lentejas').length !== 2) {
  throw new Error('Una olla nueva en otra semana debe volver a entrar en la compra mensual.');
}

const verano = structuredClone(menuMensualInicial);
verano.forEach((semana) => {
  const miercoles = semana.menu.find((dia) => dia.dia === 'Miércoles');
  if (miercoles) miercoles.comida = ['Ensalada de pasta'];
});
const veranoAjustado = aplicarVariedadPastas(verano, true);
if (veranoAjustado.some((semana) =>
  semana.menu.flatMap((dia) => dia.comida).filter((plato) => plato === 'Ensalada de pasta').length !== 1
)) {
  throw new Error('La regla de variedad ha eliminado la ensalada semanal de verano.');
}

console.log('✓ solo las ollas reales del lunes se reutilizan el jueves');
console.log('✓ los garbanzos fritos no se repiten automáticamente');
console.log('✓ si se añaden manualmente dos veces, la compra cuenta ambos consumos');
console.log('✓ cada semana nueva vuelve a comprar su propia olla');
console.log('✓ no se repite la misma pasta en semanas consecutivas');
console.log('✓ la ensalada de pasta semanal se conserva');
"""
write('scripts/probar-reglas-menu.mjs', reglas_test)


# ---------------------------------------------------------------------------
# 11. Coherencia v0.9.23: pita/tortilla, recetas, menú, migración y compra.
# ---------------------------------------------------------------------------
coherencia_test = r"""import { createServer } from 'vite';

class StorageMock {
  data = new Map();
  get length() { return this.data.size; }
  getItem(clave) { return this.data.get(clave) ?? null; }
  setItem(clave, valor) { this.data.set(clave, String(valor)); }
  removeItem(clave) { this.data.delete(clave); }
  key(indice) { return [...this.data.keys()][indice] ?? null; }
}

const listeners = new Map();
globalThis.localStorage = new StorageMock();
globalThis.window = {
  addEventListener(tipo, fn) {
    const lista = listeners.get(tipo) ?? [];
    lista.push(fn);
    listeners.set(tipo, lista);
  },
  removeEventListener() {},
  dispatchEvent(evento) {
    for (const fn of listeners.get(evento.type) ?? []) fn(evento);
    return true;
  },
};
globalThis.CustomEvent = class {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.Event = class { constructor(type) { this.type = type; } };

const vite = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
const { normalizarPerfil } = await vite.ssrLoadModule('/src/services/perfil.ts');
const { aplicarMigracionVariedadV0922 } = await vite.ssrLoadModule('/src/services/migracionV0922.ts');
const { aplicarMigracionV0923, instalarMigracionV0923 } = await vite.ssrLoadModule('/src/services/migracionV0923.ts');
const { cargarRecetas, restaurarRecetasOriginales } = await vite.ssrLoadModule('/src/services/recetas.ts');
const { menuMensualInicial } = await vite.ssrLoadModule('/src/data/MenuMensual.ts');
const { generarListaCompra } = await vite.ssrLoadModule('/src/services/listaCompra.ts');
const {
  aplicarReglaGarbanzosFritos,
  aplicarRepeticionLegumbres,
  esLegumbreDeOlla,
  listarPlatosParaCompra,
} = await vite.ssrLoadModule('/src/services/reglasMenuMensual.ts');
const { obtenerProductoIdAsociado } = await vite.ssrLoadModule('/src/services/asociacionesIngredientes.ts');

localStorage.setItem('pfi-perfil', JSON.stringify(normalizarPerfil({
  nombre: 'Familia PFI', adultos: 2, ninos: 2, edadesNinos: [12, 6], bebes: 1,
  bebesComenMenu: false, supermercado: 'Mercadona', presupuesto: 1000,
})));

aplicarMigracionVariedadV0922();
instalarMigracionV0923();
aplicarMigracionV0923();

let recetas = cargarRecetas();
let kebab = recetas.find((receta) => receta.nombre === 'Kebab');
let fajitas = recetas.find((receta) => receta.nombre === 'Fajitas');
if (!kebab?.ingredientes.some((i) => i.nombre === 'Pan de pita' && i.cantidad === 4)) {
  throw new Error(`Kebab no usa 4 panes de pita: ${JSON.stringify(kebab)}`);
}
if (kebab.ingredientes.some((i) => i.nombre === 'Tortillas de trigo')) {
  throw new Error('Kebab todavía contiene tortillas de trigo.');
}
if (!fajitas?.ingredientes.some((i) => i.nombre === 'Tortillas de trigo' && i.cantidad === 6)) {
  throw new Error(`Fajitas no conservan 6 tortillas: ${JSON.stringify(fajitas)}`);
}
if (fajitas.ingredientes.some((i) => i.nombre === 'Pan de pita')) {
  throw new Error('Fajitas no deben usar pan de pita.');
}

for (const nombre of [
  'Lentejas con arroz y verduras', 'Ternera con zanahoria y patatas',
  'Pavo al ajillo con verduras', 'Pollo al limón con patatas',
  'Bacalao con tomate y pimiento rojo', 'Tortilla de calabacín',
  'Vainas con tomate y huevo', 'Lomo con calabacín y patatas',
  'Arroz salteado con pollo y verduras', 'Dorada al horno con verduras',
]) {
  if (!recetas.some((receta) => receta.nombre === nombre)) throw new Error(`Falta receta v0.9.23: ${nombre}`);
}

if (obtenerProductoIdAsociado('Pan de pita') !== '14378') throw new Error('Pan de pita no apunta al SKU 14378.');
if (obtenerProductoIdAsociado('Limón') !== '3210') throw new Error('Limón no apunta al SKU 3210.');

const plan = aplicarRepeticionLegumbres(aplicarReglaGarbanzosFritos(structuredClone(menuMensualInicial)));
const semanaFritos = plan.find((semana) =>
  semana.menu.find((dia) => dia.dia === 'Lunes')?.comida.includes('Garbanzos fritos'),
);
const juevesFritos = semanaFritos?.menu.find((dia) => dia.dia === 'Jueves');
if (!semanaFritos || juevesFritos?.comida.includes('Garbanzos fritos')) {
  throw new Error('La semana de garbanzos fritos sigue repitiéndolos el jueves.');
}
if (!juevesFritos?.comida.includes('Lentejas con arroz y verduras')) {
  throw new Error('El jueves de la semana de garbanzos fritos no tiene la segunda legumbre distinta.');
}

for (const semana of plan) {
  const lunes = semana.menu.find((dia) => dia.dia === 'Lunes');
  if (!lunes?.comida.some(esLegumbreDeOlla)) continue;
  const jueves = semana.menu.find((dia) => dia.dia === 'Jueves');
  if (JSON.stringify(lunes.comida) !== JSON.stringify(jueves?.comida)) {
    throw new Error(`La olla ${lunes.comida.join(' + ')} no se aprovecha el jueves.`);
  }
}

const manual = structuredClone(semanaFritos.menu);
const juevesManual = manual.find((dia) => dia.dia === 'Jueves');
juevesManual.comida = ['Garbanzos fritos', 'Arroz blanco'];
const platosManual = listarPlatosParaCompra(manual, esLegumbreDeOlla);
if (platosManual.filter((plato) => plato === 'Garbanzos fritos').length !== 2) {
  throw new Error('La compra deduplica indebidamente garbanzos fritos manuales.');
}

const menuMes = plan.flatMap((semana) => semana.menu);
const compra = generarListaCompra(menuMes);
const tortillas = compra.find((i) => i.nombre === 'Tortillas de trigo');
const pitas = compra.find((i) => i.nombre === 'Pan de pita');
if (tortillas?.cantidad !== 6) throw new Error(`Tortillas mensuales: ${tortillas?.cantidad}, esperaba 6.`);
if (pitas?.cantidad !== 8) throw new Error(`Pitas mensuales: ${pitas?.cantidad}, esperaba 8.`);

const texto = menuMes.flatMap((dia) => [...dia.comida, ...dia.cena]).join(' ').toLocaleLowerCase('es');
for (const prohibido of ['brócoli', 'maíz', 'champiñón', 'merluza']) {
  if (texto.includes(prohibido)) throw new Error(`Aparece alimento excluido: ${prohibido}`);
}

// Restaurar recetas debe conservar de inmediato las recetas modernas gracias al listener.
restaurarRecetasOriginales();
recetas = cargarRecetas();
kebab = recetas.find((receta) => receta.nombre === 'Kebab');
if (!kebab?.ingredientes.some((i) => i.nombre === 'Pan de pita')) {
  throw new Error('Restaurar recetas ha recuperado el kebab antiguo.');
}
if (!recetas.some((receta) => receta.nombre === 'Pollo al limón con patatas')) {
  throw new Error('Restaurar recetas ha perdido las recetas modernas.');
}

await vite.close();
console.log('✓ kebab usa pita y fajitas usan tortillas sin mezclar productos');
console.log('✓ 10 recetas nuevas quedan disponibles y sobreviven a restaurar recetas');
console.log('✓ garbanzos fritos no se repiten; las ollas reales sí se aprovechan');
console.log('✓ compra base: 6 tortillas y 8 panes de pita');
console.log('✓ asociaciones Mercadona: pita 14378 y limón 3210');
console.log('✓ preferencias familiares siguen respetadas');
"""
write('scripts/probar-coherencia-v0923.mjs', coherencia_test)


# ---------------------------------------------------------------------------
# 12. Test de comensales: separar tortillas de fajita y pan de pita de kebab.
# ---------------------------------------------------------------------------
path = 'scripts/probar-comensales-por-servicio.mjs'
text = read(path)
if "aplicarMigracionV0923" not in text:
    text = text.replace(
        "const { generarListaCompra } = await vite.ssrLoadModule(\n  '/src/services/listaCompra.ts',\n);\n",
        "const { generarListaCompra } = await vite.ssrLoadModule(\n  '/src/services/listaCompra.ts',\n);\nconst { aplicarMigracionV0923 } = await vite.ssrLoadModule(\n  '/src/services/migracionV0923.ts',\n);\n",
        1,
    )
    text = text.replace(
        "localStorage.setItem(\n  'pfi-asociaciones-ingredientes-mercadona',",
        "aplicarMigracionV0923();\n\nlocalStorage.setItem(\n  'pfi-asociaciones-ingredientes-mercadona',",
        1,
    )
# El test escribe asociaciones históricas después de la migración; aplicar otra vez para sanear y añadir pita.
text = text.replace(
    "function crearDia(dia, comida, cenaDia, postreComida, postreCena) {",
    "aplicarMigracionV0923();\n\nfunction crearDia(dia, comida, cenaDia, postreComida, postreCena) {",
    1,
)
old_block = re.compile(r"const compraTortillasMesBase = generarListaCompra\(\[.*?\n\}\n\nconst compraCocidoDosDias", re.S)
match = old_block.search(text)
if not match:
    raise RuntimeError('No se encontró el bloque mensual de tortillas en comensales')
new_block = r"""const compraPanMesBase = generarListaCompra([
  crearDia('Miércoles', [], ['Fajitas'], 'Sin postre', 'Sin postre'),
  crearDia('Sábado', [], ['Kebab'], 'Sin postre', 'Sin postre'),
  crearDia('Miércoles', [], ['Kebab'], 'Sin postre', 'Sin postre'),
]);
const tortillasMesBase = compraPanMesBase.find(
  (ingrediente) => ingrediente.nombre === 'Tortillas de trigo',
);
const pitasMesBase = compraPanMesBase.find(
  (ingrediente) => ingrediente.nombre === 'Pan de pita',
);
if (tortillasMesBase?.cantidad !== 6 || pitasMesBase?.cantidad !== 8) {
  throw new Error(
    `Fajitas + 2 kebabs deben usar 6 tortillas y 8 pitas: tortillas=${tortillasMesBase?.cantidad}, pitas=${pitasMesBase?.cantidad}.`,
  );
}

const compraCocidoDosDias"""
text = text[:match.start()] + new_block + text[match.end():]
text = text.replace(
    "  asociacionesPollo['Tortillas de trigo'] !== '80859' ||\n",
    "  asociacionesPollo['Tortillas de trigo'] !== '80859' ||\n  asociacionesPollo['Pan de pita'] !== '14378' ||\n",
)
text = text.replace(
    "console.log('✓ fajitas + dos kebabs: 14 tortillas en total');",
    "console.log('✓ fajitas + dos kebabs: 6 tortillas + 8 panes de pita');",
)
write(path, text)


# ---------------------------------------------------------------------------
# 13. Auditoría mensual: cantidades comerciales correctas de tortilla y pita.
# ---------------------------------------------------------------------------
path = 'scripts/auditar-compra-mensual.mjs'
text = read(path)
if 'aplicarMigracionV0923' not in text:
    text = text.replace(
        "const { aplicarMigracionVariedadV0922 } = await vite.ssrLoadModule(\n  '/src/services/migracionV0922.ts',\n);\n",
        "const { aplicarMigracionVariedadV0922 } = await vite.ssrLoadModule(\n  '/src/services/migracionV0922.ts',\n);\nconst { aplicarMigracionV0923 } = await vite.ssrLoadModule(\n  '/src/services/migracionV0923.ts',\n);\n",
        1,
    )
text = text.replace(
    "aplicarMigracionVariedadV0922();\nconst recetasActuales = cargarRecetas();",
    "aplicarMigracionVariedadV0922();\naplicarMigracionV0923();\nconst recetasActuales = cargarRecetas();",
    1,
)
text = text.replace(
    "// Referencia crítica solicitada: una sola noche de fajitas + dos kebabs = 14 tortillas.\nexigirExacto('Tortillas de trigo', 14, 'ud');",
    "// Fajitas usan tortilla; los dos kebabs usan pan de pita.\nexigirExacto('Tortillas de trigo', 6, 'ud');\nexigirExacto('Pan de pita', 8, 'ud');",
    1,
)
text = text.replace(
    "const tortillasComerciales = exigirEnvasesEntre('80859', 'Tortillas de trigo', 2, 2);",
    "const tortillasComerciales = exigirEnvasesEntre('80859', 'Tortillas de trigo', 1, 1);\nconst pitasComerciales = exigirEnvasesEntre('14378', 'Pan de pita', 2, 2);",
    1,
)
text = text.replace(
    "const paquetesTortillasEsperados = Math.ceil(14 / unidadesTortillas);",
    "const paquetesTortillasEsperados = Math.ceil(6 / unidadesTortillas);",
    1,
)
text = text.replace("Math.abs(detalleTortillas.necesidadMenuEnvases - 1.4)", "Math.abs(detalleTortillas.necesidadMenuEnvases - 0.6)")
text = text.replace("detalleTortillas.compraEnvases !== 2", "detalleTortillas.compraEnvases !== 1")
text = text.replace("Math.abs(detalleTortillas.sobranteDespuesEnvases - 0.6)", "Math.abs(detalleTortillas.sobranteDespuesEnvases - 0.4)")
if 'detallePitas' not in text:
    marker = "for (const linea of lineasConProducto) {"
    pos = text.find(marker)
    if pos < 0:
        raise RuntimeError('No se encontró punto para validar pitas')
    pita_check = """const detallePitas = pitasComerciales.explicacionCantidad;\nif (\n  pitasComerciales.producto.unidadesTotales !== 5 ||\n  !detallePitas ||\n  Math.abs(detallePitas.necesidadMenuEnvases - 1.6) > 0.000001 ||\n  detallePitas.compraEnvases !== 2 ||\n  Math.abs(detallePitas.sobranteDespuesEnvases - 0.4) > 0.000001\n) {\n  throw new Error(`Pan de pita sin explicación coherente: ${JSON.stringify(detallePitas)}.`);\n}\n\n"""
    text = text[:pos] + pita_check + text[pos:]
text = text.replace(
    "console.log('✓ tortillas: 14 unidades; 2 paquetes de 10 y 6 unidades sobrantes');",
    "console.log('✓ fajitas: 6 tortillas; 1 paquete de 10 y 4 sobrantes');\nconsole.log('✓ kebabs: 8 panes de pita; 2 paquetes de 5 y 2 sobrantes');",
)
text = text.replace(
    "`✓ envases críticos: tortillas=${tortillasComerciales.envases}, bacon=",
    "`✓ envases críticos: tortillas=${tortillasComerciales.envases}, pitas=${pitasComerciales.envases}, bacon=",
)
write(path, text)


# ---------------------------------------------------------------------------
# 14. Versionado, scripts y CI exhaustivo.
# ---------------------------------------------------------------------------
path = 'package.json'
pkg = json.loads(read(path))
pkg['version'] = VERSION
pkg['scripts']['test:coherencia-v0923'] = 'node --experimental-strip-types scripts/probar-coherencia-v0923.mjs'
write(path, json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')

path = 'package-lock.json'
lock = json.loads(read(path))
lock['version'] = VERSION
if '' in lock.get('packages', {}):
    lock['packages']['']['version'] = VERSION
write(path, json.dumps(lock, ensure_ascii=False, indent=2) + '\n')

path = 'src/App.tsx'
write(path, read(path).replace('v0.9.22', 'v0.9.23'))
path = 'public/sw.js'
write(path, read(path).replace('pfi-v0.9.22-1', 'pfi-v0.9.23-1'))

workflow = r"""name: Validar PFI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  validar:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Descargar repositorio
        uses: actions/checkout@v4
      - name: Configurar Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - name: Instalar dependencias
        run: npm ci
      - name: Auditar dependencias de producción
        run: npm audit --omit=dev --audit-level=high
      - name: Comprobar TypeScript
        run: npm run typecheck
      - name: Comprobar el código
        run: npm run lint
      - name: Construir la PWA completa
        run: npm run build
      - name: Probar conversiones de compra
        run: npm run test:conversiones
      - name: Probar aprendizaje del menú
        run: npm run test:aprendizaje
      - name: Probar calendario, excepciones y sobrantes
        run: npm run test:calendario
      - name: Probar comensales y cantidades críticas
        run: npm run test:comensales
      - name: Probar reglas del menú
        run: npm run test:reglas-menu
      - name: Probar estructura del plan mensual
        run: npm run test:menu-mensual
      - name: Probar variedad mensual y verduras
        run: node --experimental-strip-types scripts/probar-variedad-menu-v0922.mjs
      - name: Probar coherencia integral v0.9.23
        run: npm run test:coherencia-v0923
      - name: Auditar cantidades del mes completo
        run: npm run test:auditoria-mensual
      - name: Probar presupuesto
        run: npm run test:presupuesto
      - name: Probar navegación de compra
        run: npm run test:compra-v0921
      - name: Probar cuentas y sincronización
        run: npm run test:cuenta
      - name: Probar regresiones v0.9.9 a v0.9.12
        run: npm run test:v099 && npm run test:v0910 && npm run test:v0911 && npm run test:v0912
      - name: Probar postres y asociaciones
        run: npm run test:v0913
      - name: Probar importación y reparación del JSON de rescate
        run: npm run test:rescate-json
      - name: Probar copias completas y restauración segura
        run: npm run test:copias
      - name: Probar asociaciones básicas verificadas
        run: node --experimental-strip-types scripts/probar-asociaciones-basicas.mjs
      - name: Probar periodicidad mensual y quesos
        run: node --experimental-strip-types scripts/probar-mensuales-complementarios.mjs
      - name: Probar formatos comerciales
        run: node --experimental-strip-types scripts/probar-formatos-comerciales.mjs
      - name: Probar objetivos exactos de Mercadona
        run: node scripts/probar-productos-objetivo.mjs
"""
write('.github/workflows/validar-pfi.yml', workflow)


# ---------------------------------------------------------------------------
# 15. Documentación.
# ---------------------------------------------------------------------------
path = 'CHANGELOG.md'
changelog = read(path)
if '# v0.9.23' not in changelog:
    entry = """# v0.9.23 — Coherencia integral de menú, recetas y compra

- Kebab usa 4 panes de pita; las tortillas de trigo quedan exclusivamente para fajitas.
- Pan de pita queda asociado al SKU Mercadona 14378 y limón al SKU 3210.
- La semana de garbanzos fritos ya no los repite el jueves: ese día rota a lentejas con arroz y verduras.
- El batch cooking de legumbres solo se aplica a ollas explícitas de dos días, no a cualquier receta de legumbres.
- Se añaden 10 recetas familiares nuevas, con más verduras y respetando alimentos excluidos.
- Restaurar/importar recetas ya no puede perder las recetas añadidas en versiones recientes ni recuperar el kebab antiguo hasta recargar.
- La auditoría mensual separa 6 tortillas de fajita de 8 panes de pita de los dos kebabs y comprueba sus envases reales.
- CI ampliado: build completo, dependencias de producción, conversiones, aprendizaje, presupuesto, navegación de compra, cuentas/sincronización y regresiones históricas.

"""
    write(path, entry + changelog)

path = 'README.md'
readme = read(path)
readme = readme.replace('Versión 0.9.22.', 'Versión 0.9.23.', 1)
if 'La v0.9.23' not in readme:
    needle = 'Versión 0.9.23.\n'
    addition = "\nLa v0.9.23 separa pan de pita y tortillas, evita repetir garbanzos fritos, amplía el recetario y refuerza las comprobaciones automáticas de compra, cuentas, copias y navegación.\n"
    if needle in readme:
        readme = readme.replace(needle, needle + addition, 1)
write(path, readme)

print('Cambios v0.9.23 aplicados.')
