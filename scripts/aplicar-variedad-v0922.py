from pathlib import Path
import json
import re

VERSION = '0.9.22'


def leer(ruta: str) -> str:
    return Path(ruta).read_text(encoding='utf-8')


def escribir(ruta: str, texto: str) -> None:
    Path(ruta).write_text(texto, encoding='utf-8')


def reemplazar_una(ruta: str, anterior: str, nuevo: str) -> None:
    texto = leer(ruta)
    if nuevo in texto:
        return
    if anterior not in texto:
        raise RuntimeError(f'No se encontró el bloque esperado en {ruta}')
    escribir(ruta, texto.replace(anterior, nuevo, 1))


# 1) Ampliar el recetario real que alimenta menú y compra.
nuevas_recetas = r"""
  {
    nombre: 'Vainas con patata y huevo',
    categoria: 'Verduras',
    ingredientes: [
      { nombre: 'Judías verdes', cantidad: 1, unidad: 'kg', seccion: 'Congelados' },
      { nombre: 'Patatas', cantidad: 0.8, unidad: 'kg', seccion: 'Fruta y verdura' },
      { nombre: 'Huevos', cantidad: 4, unidad: 'ud', seccion: 'Lácteos y huevos', ajusteAutomatico: true },
      { nombre: 'Ajo', cantidad: 2, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Verduras al horno',
    categoria: 'Verduras',
    ingredientes: [
      { nombre: 'Calabacín', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Zanahorias', cantidad: 4, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Calabaza', cantidad: 0.5, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Tomate', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Calabacín a la plancha',
    categoria: 'Verduras',
    ingredientes: [
      { nombre: 'Calabacín', cantidad: 3, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Ajo', cantidad: 2, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Albóndigas con tomate',
    categoria: 'Carne',
    ingredientes: [
      { nombre: 'Carne picada', cantidad: 700, unidad: 'g', seccion: 'Carnicería' },
      { nombre: 'Tomate frito', cantidad: 1.5, unidad: 'brick', seccion: 'Despensa' },
      { nombre: 'Ajo', cantidad: 2, unidad: 'dientes', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Pollo al ajillo',
    categoria: 'Pollo',
    ingredientes: [
      { nombre: 'Pechugas de pollo', cantidad: 700, unidad: 'g', seccion: 'Carnicería' },
      { nombre: 'Ajo', cantidad: 0.5, unidad: 'cabeza', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Ensalada de pasta con pollo',
    categoria: 'Pasta',
    ingredientes: [
      { nombre: 'Pasta corta', cantidad: 500, unidad: 'g', seccion: 'Despensa' },
      { nombre: 'Pechugas de pollo', cantidad: 400, unidad: 'g', seccion: 'Carnicería' },
      { nombre: 'Tomate', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Pepino', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Mayonesa', cantidad: 1, unidad: 'revisar', seccion: 'Salsas' },
    ],
  },
  {
    nombre: 'Ensalada de pasta con huevo',
    categoria: 'Pasta',
    ingredientes: [
      { nombre: 'Pasta corta', cantidad: 500, unidad: 'g', seccion: 'Despensa' },
      { nombre: 'Huevos', cantidad: 6, unidad: 'ud', seccion: 'Lácteos y huevos', ajusteAutomatico: true },
      { nombre: 'Tomate', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Pepino', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Aceitunas', cantidad: 1, unidad: 'ración', seccion: 'Despensa' },
    ],
  },
  {
    nombre: 'Ensalada de pasta mediterránea',
    categoria: 'Pasta',
    ingredientes: [
      { nombre: 'Pasta corta', cantidad: 500, unidad: 'g', seccion: 'Despensa' },
      { nombre: 'Atún', cantidad: 2, unidad: 'lata', seccion: 'Despensa' },
      { nombre: 'Tomate', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Pepino', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Aceitunas', cantidad: 1, unidad: 'ración', seccion: 'Despensa' },
      { nombre: 'Queso curado', cantidad: 0.5, unidad: 'cuña', seccion: 'Lácteos y huevos' },
    ],
  },
  {
    nombre: 'Ensalada de pasta con pavo',
    categoria: 'Pasta',
    ingredientes: [
      { nombre: 'Pasta corta', cantidad: 500, unidad: 'g', seccion: 'Despensa' },
      { nombre: 'Pechugas de pavo fileteadas', cantidad: 4, unidad: 'raciones', seccion: 'Carnicería' },
      { nombre: 'Tomate', cantidad: 2, unidad: 'ud', seccion: 'Fruta y verdura' },
      { nombre: 'Pepino', cantidad: 1, unidad: 'ud', seccion: 'Fruta y verdura' },
    ],
  },
  {
    nombre: 'Macarrones con atún',
    categoria: 'Pasta',
    ingredientes: [
      { nombre: 'Pasta corta', cantidad: 500, unidad: 'g', seccion: 'Despensa' },
      { nombre: 'Atún', cantidad: 3, unidad: 'lata', seccion: 'Despensa' },
      { nombre: 'Tomate frito', cantidad: 1, unidad: 'brick', seccion: 'Despensa' },
      { nombre: 'Queso rallado', cantidad: 1, unidad: 'bolsa', seccion: 'Lácteos y huevos' },
    ],
  },
"""

ruta = 'src/data/Recetas.ts'
texto = leer(ruta)
if "nombre: 'Vainas con patata y huevo'" not in texto:
    punto = texto.rfind('\n];')
    if punto < 0:
        raise RuntimeError('No se encontró el final del recetario')
    texto = texto[:punto] + '\n\n' + nuevas_recetas.rstrip() + texto[punto:]
    escribir(ruta, texto)


# 2) Cinco semanas con el mismo patrón nutricional pero servicios distintos.
menu_mensual = r"""import type { DiaMenu } from './Menusemanal';

export type SemanaMenu = {
  id: string;
  nombre: string;
  inicio: string;
  fin: string;
  menu: DiaMenu[];
  excluida?: boolean;
};

export const CENAS_VIERNES = [
  ['Pizza jamón y queso', 'Pizza BBQ'],
  ['Pizza BBQ', 'Pizza 4 quesos'],
  ['Pizza jamón y queso', 'Pizza 4 quesos'],
] as const;

const dia = (
  nombre: string,
  comida: string[],
  cena: string[],
  postreComida: 'Fruta' | 'Yogur' | 'Sin postre',
  postreCena: 'Fruta' | 'Yogur' | 'Sin postre',
): DiaMenu => ({
  dia: nombre,
  comida,
  cena,
  postreComida,
  postreCena,
  preparar: '',
});

/*
 * Se conserva el patrón familiar por días, pero se evita repetir el mismo
 * servicio completo entre semanas. Excepciones deliberadas: pizza del viernes,
 * domingo fuera y la olla de legumbres que se cocina el lunes y se termina el jueves.
 */
const PLANTILLAS_SEMANA: DiaMenu[][] = [
  [
    dia('Lunes', ['Lentejas'], ['Lomo', 'Ensalada'], 'Fruta', 'Yogur'),
    dia('Martes', ['Lubina', 'Patatas'], ['Vainas con patata y huevo'], 'Yogur', 'Fruta'),
    dia('Miércoles', ['Ensalada de pasta'], ['Fajitas', 'Nachos', 'Guacamole'], 'Fruta', 'Yogur'),
    dia('Jueves', ['Lentejas'], ['Filete de ternera', 'Patatas'], 'Yogur', 'Fruta'),
    dia('Viernes', ['Macarrones boloñesa'], ['Pizza jamón y queso', 'Pizza BBQ'], 'Fruta', 'Yogur'),
    dia('Sábado', ['Salmón', 'Arroz blanco'], ['Hamburguesas'], 'Yogur', 'Fruta'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Cocido de garbanzos'], ['Pechugas de pavo', 'Ensalada'], 'Yogur', 'Fruta'),
    dia('Martes', ['Dorada', 'Patatas'], ['Crema de calabacín', 'Tortilla francesa'], 'Fruta', 'Yogur'),
    dia('Miércoles', ['Ensalada de pasta con pollo'], ['Pollo al horno', 'Patatas'], 'Yogur', 'Fruta'),
    dia('Jueves', ['Cocido de garbanzos'], ['Lomo', 'Patatas'], 'Fruta', 'Yogur'),
    dia('Viernes', ['Macarrones con chorizo'], ['Pizza BBQ', 'Pizza 4 quesos'], 'Yogur', 'Fruta'),
    dia('Sábado', ['Bacalao', 'Arroz blanco'], ['Perritos calientes'], 'Fruta', 'Yogur'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Alubias rojas'], ['Pechugas de pollo', 'Arroz blanco'], 'Fruta', 'Yogur'),
    dia('Martes', ['Salmón', 'Patatas'], ['Verduras al horno', 'Tortilla francesa'], 'Yogur', 'Fruta'),
    dia('Miércoles', ['Ensalada de pasta con huevo'], ['Kebab'], 'Fruta', 'Yogur'),
    dia('Jueves', ['Alubias rojas'], ['Filete de ternera', 'Ensalada'], 'Yogur', 'Fruta'),
    dia('Viernes', ['Carbonara tradicional'], ['Pizza jamón y queso', 'Pizza 4 quesos'], 'Fruta', 'Yogur'),
    dia('Sábado', ['Lubina', 'Arroz blanco'], ['Arroz con huevo y tomate'], 'Yogur', 'Fruta'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Garbanzos fritos', 'Arroz blanco'], ['Albóndigas con tomate'], 'Yogur', 'Fruta'),
    dia('Martes', ['Bacalao', 'Patatas'], ['Crema de verduras', 'Tortilla de patata'], 'Fruta', 'Yogur'),
    dia('Miércoles', ['Ensalada de pasta mediterránea'], ['Pechugas de pavo', 'Patatas'], 'Yogur', 'Fruta'),
    dia('Jueves', ['Garbanzos fritos', 'Arroz blanco'], ['Pollo al ajillo'], 'Fruta', 'Yogur'),
    dia('Viernes', ['Macarrones con roquefort'], ['Pizza BBQ', 'Pizza 4 quesos'], 'Yogur', 'Fruta'),
    dia('Sábado', ['Dorada', 'Arroz blanco'], ['Hamburguesas', 'Ensalada'], 'Fruta', 'Yogur'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
  [
    dia('Lunes', ['Alubias blancas con almejas'], ['Pechugas de pollo', 'Ensalada'], 'Fruta', 'Yogur'),
    dia('Martes', ['Lubina', 'Ensalada'], ['Crema de calabaza', 'Pechugas de pavo'], 'Yogur', 'Fruta'),
    dia('Miércoles', ['Ensalada de pasta con pavo'], ['Fajitas'], 'Fruta', 'Yogur'),
    dia('Jueves', ['Alubias blancas con almejas'], ['Filete de ternera', 'Calabacín a la plancha'], 'Yogur', 'Fruta'),
    dia('Viernes', ['Macarrones con atún'], ['Pizza jamón y queso', 'Pizza BBQ'], 'Fruta', 'Yogur'),
    dia('Sábado', ['Salmón', 'Ensalada'], ['Perritos calientes', 'Ensalada'], 'Yogur', 'Fruta'),
    dia('Domingo', ['Comemos fuera'], ['Cola Cao y galletas'], 'Sin postre', 'Sin postre'),
  ],
];

export const menuMensualInicial: SemanaMenu[] = PLANTILLAS_SEMANA.map(
  (menu, indice) => ({
    id: `semana-${indice + 1}`,
    nombre: `Semana ${indice + 1}`,
    inicio: '',
    fin: '',
    menu,
  }),
);
"""
escribir('src/data/MenuMensual.ts', menu_mensual)


# 3) SKU real Mercadona para las vainas.
reemplazar_una(
    'src/services/asociacionesIngredientes.ts',
    "  Huevos: '30167',\n",
    "  Huevos: '30167',\n  'Judías verdes': '61282',\n",
)

ruta = 'src/services/asociacionesBasicas.ts'
texto = leer(ruta)
if 'CLAVE_MIGRACION_V6' not in texto:
    texto = texto.replace(
        "const CLAVE_MIGRACION_V5 = 'pfi-migracion-asociaciones-basicas-v5';\n",
        "const CLAVE_MIGRACION_V5 = 'pfi-migracion-asociaciones-basicas-v5';\nconst CLAVE_MIGRACION_V6 = 'pfi-migracion-asociaciones-basicas-v6';\n",
        1,
    )
    texto = texto.replace(
        "export const ASOCIACIONES_BASICAS_V5: Record<string, string> = {\n  'Mezcla cuatro quesos': '21581',\n  'Salsa BBQ': '17346',\n};\n",
        "export const ASOCIACIONES_BASICAS_V5: Record<string, string> = {\n  'Mezcla cuatro quesos': '21581',\n  'Salsa BBQ': '17346',\n};\n\nexport const ASOCIACIONES_BASICAS_V6: Record<string, string> = {\n  'Judías verdes': '61282',\n};\n",
        1,
    )
    texto = texto.replace(
        "  ...ASOCIACIONES_BASICAS_V5,\n};",
        "  ...ASOCIACIONES_BASICAS_V5,\n  ...ASOCIACIONES_BASICAS_V6,\n};",
        1,
    )
    texto = texto.replace(
        "  {\n    clave: CLAVE_MIGRACION_V5,\n    asociaciones: ASOCIACIONES_BASICAS_V5,\n    reemplazaIds: {\n      'Mezcla cuatro quesos': ['51234'],\n      'Salsa BBQ': ['19592'],\n    },\n  },\n];",
        "  {\n    clave: CLAVE_MIGRACION_V5,\n    asociaciones: ASOCIACIONES_BASICAS_V5,\n    reemplazaIds: {\n      'Mezcla cuatro quesos': ['51234'],\n      'Salsa BBQ': ['19592'],\n    },\n  },\n  {\n    clave: CLAVE_MIGRACION_V6,\n    asociaciones: ASOCIACIONES_BASICAS_V6,\n  },\n];",
        1,
    )
    escribir(ruta, texto)


# 4) Migrar también los recetarios guardados en localStorage de usuarios existentes.
ruta = 'src/services/recetas.ts'
texto = leer(ruta)
if 'CLAVE_MIGRACION_RECETAS_V0922' not in texto:
    texto = texto.replace(
        "const CLAVE_MIGRACION_RECETAS_V095 = 'pfi-migracion-recetas-v095';\n",
        "const CLAVE_MIGRACION_RECETAS_V095 = 'pfi-migracion-recetas-v095';\nconst CLAVE_MIGRACION_RECETAS_V0922 = 'pfi-migracion-recetas-v0922';\n",
        1,
    )
    patron = re.compile(r"function aplicarMigracionRecetasV095\(recetas: Receta\[\]\): Receta\[\] \{.*?\n\}", re.S)
    coincidencia = patron.search(texto)
    if not coincidencia:
        raise RuntimeError('No se encontró aplicarMigracionRecetasV095')
    bloque = coincidencia.group(0)
    bloque = bloque.replace('return recetas;', 'return aplicarMigracionRecetasV0922(recetas);', 1)
    bloque = bloque.replace('return resultado;\n}', 'return aplicarMigracionRecetasV0922(resultado);\n}', 1)
    texto = texto[:coincidencia.start()] + bloque + texto[coincidencia.end():]
    punto = texto.find('\n\nfunction aplicarMigracionPostresV0910')
    if punto < 0:
        raise RuntimeError('No se encontró el punto de migración v0.9.22')
    migracion = r"""

function aplicarMigracionRecetasV0922(recetas: Receta[]): Receta[] {
  if (localStorage.getItem(CLAVE_MIGRACION_RECETAS_V0922) === '1') {
    return recetas;
  }

  const objetivos = new Set([
    'Vainas con patata y huevo',
    'Verduras al horno',
    'Calabacín a la plancha',
    'Albóndigas con tomate',
    'Pollo al ajillo',
    'Ensalada de pasta con pollo',
    'Ensalada de pasta con huevo',
    'Ensalada de pasta mediterránea',
    'Ensalada de pasta con pavo',
    'Macarrones con atún',
  ]);
  const nombres = new Set(
    recetas.map((receta) => normalizarTexto(receta.nombre)),
  );
  const nuevas = normalizarRecetas(recetasIniciales)
    .filter((receta) => objetivos.has(receta.nombre))
    .filter((receta) => !nombres.has(normalizarTexto(receta.nombre)));
  const nuevasAjustadas = ajustarRecetasAlPerfil(
    nuevas,
    cargarPerfil(),
    true,
  );
  const resultado = [...recetas, ...nuevasAjustadas];

  localStorage.setItem(CLAVE_MIGRACION_RECETAS_V0922, '1');
  localStorage.setItem(CLAVE_RECETAS, JSON.stringify(resultado));
  return resultado;
}
"""
    texto = texto[:punto] + migracion + texto[punto:]
    texto = texto.replace(
        "  localStorage.removeItem(CLAVE_MIGRACION_RECETAS_V095);\n",
        "  localStorage.removeItem(CLAVE_MIGRACION_RECETAS_V095);\n  localStorage.removeItem(CLAVE_MIGRACION_RECETAS_V0922);\n",
        1,
    )
    escribir(ruta, texto)


# 5) Una ensalada de pasta distinta por semana durante todo el año y migración
# de planes guardados que todavía repiten servicios.
ruta = 'src/hooks/useMenu.ts'
texto = leer(ruta)
if 'ENSALADAS_PASTA' not in texto:
    texto = texto.replace(
        "const PASTAS_ALTERNATIVAS = [\n  'Macarrones boloñesa',\n  'Macarrones con chorizo',\n  'Carbonara tradicional',\n  'Macarrones con roquefort',\n] as const;",
        "const PASTAS_ALTERNATIVAS = [\n  'Macarrones boloñesa',\n  'Macarrones con chorizo',\n  'Carbonara tradicional',\n  'Macarrones con roquefort',\n  'Macarrones con atún',\n] as const;\n\nconst ENSALADAS_PASTA = [\n  'Ensalada de pasta',\n  'Ensalada de pasta con pollo',\n  'Ensalada de pasta con huevo',\n  'Ensalada de pasta mediterránea',\n  'Ensalada de pasta con pavo',\n] as const;",
        1,
    )
    texto = re.sub(
        r"\nfunction esMesDeVerano\(mes: string\): boolean \{.*?\n\}",
        '',
        texto,
        count=1,
        flags=re.S,
    )
    texto = re.sub(
        r"function contieneEnsaladaDePasta\(dia: DiaMenu\): boolean \{.*?\n\}",
        "function esEnsaladaDePasta(plato: string): boolean {\n  return /^ensalada de pasta(?:\\b| )/i.test(plato.trim());\n}\n\nfunction contieneEnsaladaDePasta(dia: DiaMenu): boolean {\n  return dia.comida.some(esEnsaladaDePasta);\n}",
        texto,
        count=1,
        flags=re.S,
    )
    nueva_preferencia = r"""function aplicarPreferenciaEnsaladaPasta(
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

    usadas.add(objetivo);

    if (existentes.length === 1 && existentes[0] === objetivo) {
      return semana;
    }

    huboCambios = true;
    const tieneEnsalada = existentes.length > 0;
    const menu = semana.menu.map((dia) => {
      if (tieneEnsalada && contieneEnsaladaDePasta(dia)) {
        return {
          ...dia,
          comida: dia.comida.map((plato) =>
            esEnsaladaDePasta(plato) ? objetivo : plato,
          ),
        };
      }

      if (!tieneEnsalada && dia.dia === 'Miércoles') {
        return { ...dia, comida: [objetivo] };
      }

      return { ...dia };
    });

    return { ...semana, menu };
  });

  return huboCambios ? recalcularPreparacionesPlan(ajustadas) : semanas;
}
"""
    texto, cambios = re.subn(
        r"function aplicarPreferenciaEnsaladaPasta\(.*?\n\}\n\nfunction aplicarPostresDelRecetario",
        nueva_preferencia + '\nfunction aplicarPostresDelRecetario',
        texto,
        count=1,
        flags=re.S,
    )
    if cambios != 1:
        raise RuntimeError('No se pudo actualizar la rotación de ensalada de pasta')
    texto = texto.replace(
        "  const conPastasVariadas = aplicarVariedadPastas(\n    estacionales,\n    esMesDeVerano(mes),\n  );",
        "  const conPastasVariadas = aplicarVariedadPastas(\n    estacionales,\n    true,\n  );",
        1,
    )
    nuevo_patron = r"""function planNecesitaPatron(semanas: SemanaMenu[]): boolean {
  if (semanas.length < 3) return false;

  const firmaServicio = (platos: string[]): string =>
    platos
      .map((plato) =>
        plato
          .toLocaleLowerCase('es')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim(),
      )
      .join(' + ');
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

          tieneVainas = tieneVainas || firma.includes('vainas con patata');
          tieneVerdurasHorno = tieneVerdurasHorno || firma.includes('verduras al horno');
          tieneCalabacinPlancha = tieneCalabacinPlancha || firma.includes('calabacin a la plancha');

          if (firma === 'comemos fuera' || firma === 'cola cao y galletas') return;
          if (dia.dia === 'Viernes' && momento === 'cena' && firma.includes('pizza')) return;
          if (dia.dia === 'Jueves' && momento === 'comida' && firma === firmaLegumbreLunes) return;

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

  return hayServicioRepetido || !tieneVainas || !tieneVerdurasHorno || !tieneCalabacinPlancha;
}
"""
    texto, cambios = re.subn(
        r"function contienePlato\(.*?\nfunction migrarPlanAlPatron",
        nuevo_patron + '\nfunction migrarPlanAlPatron',
        texto,
        count=1,
        flags=re.S,
    )
    if cambios != 1:
        raise RuntimeError('No se pudo endurecer la migración del patrón mensual')
    escribir(ruta, texto)


# 6) Reglas de rotación y aprendizaje: no volver a ofrecer la misma receta.
ruta = 'src/services/reglasMenuMensual.ts'
texto = leer(ruta)
if "'Macarrones con atún'" not in texto:
    texto = texto.replace(
        "  'Macarrones con roquefort',\n] as const;",
        "  'Macarrones con roquefort',\n  'Macarrones con atún',\n] as const;",
        1,
    )
texto = texto.replace(
    "          permitirEnsaladaSemanal && claveActual === 'ensalada de pasta';",
    "          permitirEnsaladaSemanal && claveActual.startsWith('ensalada de pasta');",
    1,
)
escribir(ruta, texto)

ruta = 'src/services/planMensual.ts'
texto = leer(ruta).replace(
    "sugerencia.every((plato) => (usados.get(plato) ?? 0) < 2)",
    "sugerencia.every((plato) => (usados.get(plato) ?? 0) < 1)",
    1,
)
escribir(ruta, texto)


# 7) Regresión: variedad, verduras, exclusiones familiares y recetas existentes.
test = r"""import assert from 'node:assert/strict';
import { menuMensualInicial } from '../src/data/MenuMensual.ts';
import { recetas } from '../src/data/Recetas.ts';

function normalizar(platos) {
  return platos
    .map((plato) => plato.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim())
    .join(' + ');
}

const usos = new Map();
const legumbres = [];
const serviciosVegetales = new Set();
const ensaladasPasta = [];

menuMensualInicial.forEach((semana, indiceSemana) => {
  const lunes = semana.menu.find((dia) => dia.dia === 'Lunes');
  const firmaLunes = normalizar(lunes?.comida ?? []);
  legumbres.push(firmaLunes);

  const ensalada = semana.menu.flatMap((dia) => dia.comida).find((plato) => /^Ensalada de pasta/.test(plato));
  assert.ok(ensalada, `Semana ${indiceSemana + 1} sin ensalada de pasta`);
  ensaladasPasta.push(ensalada);

  semana.menu.forEach((dia) => {
    for (const [momento, platos] of [['comida', dia.comida], ['cena', dia.cena]]) {
      const firma = normalizar(platos);
      if (/vaina|verduras al horno|calabacin a la plancha|crema de calabacin|crema de verduras|crema de calabaza/.test(firma)) {
        serviciosVegetales.add(firma);
      }
      if (firma === 'comemos fuera' || firma === 'cola cao y galletas') continue;
      if (dia.dia === 'Viernes' && momento === 'cena' && firma.includes('pizza')) continue;
      if (dia.dia === 'Jueves' && momento === 'comida' && firma === firmaLunes) continue;

      const anterior = usos.get(firma);
      assert.ok(
        anterior === undefined || anterior === indiceSemana,
        `Servicio repetido entre semanas ${anterior + 1} y ${indiceSemana + 1}: ${firma}`,
      );
      usos.set(firma, indiceSemana);
    }
  });
});

assert.equal(new Set(legumbres).size, menuMensualInicial.length);
assert.equal(new Set(ensaladasPasta).size, menuMensualInicial.length);
assert.ok(serviciosVegetales.size >= 5, 'Faltan servicios de verduras realmente distintos');

const textoMenu = menuMensualInicial
  .flatMap((semana) => semana.menu)
  .flatMap((dia) => [...dia.comida, ...dia.cena])
  .join(' ')
  .toLocaleLowerCase('es');
assert.match(textoMenu, /vainas con patata/);
assert.match(textoMenu, /verduras al horno/);
assert.match(textoMenu, /calabacín a la plancha/);
for (const prohibido of ['brócoli', 'maíz', 'champiñón', 'merluza']) {
  assert.equal(textoMenu.includes(prohibido), false, `Aparece un alimento excluido: ${prohibido}`);
}

const nombresRecetas = new Set(recetas.map((receta) => receta.nombre));
for (const nombre of [
  'Vainas con patata y huevo',
  'Verduras al horno',
  'Calabacín a la plancha',
  'Albóndigas con tomate',
  'Pollo al ajillo',
  'Ensalada de pasta con pollo',
  'Ensalada de pasta con huevo',
  'Ensalada de pasta mediterránea',
  'Ensalada de pasta con pavo',
  'Macarrones con atún',
]) {
  assert.ok(nombresRecetas.has(nombre), `Falta la receta ${nombre}`);
}

console.log('✓ las cinco semanas mantienen servicios completos distintos');
console.log('✓ la olla de legumbres solo se repite dentro de su propia semana');
console.log('✓ cada semana tiene una ensalada de pasta diferente');
console.log('✓ se incorporan vainas y más cenas de verduras sin alimentos excluidos');
"""
escribir('scripts/probar-variedad-menu-v0922.mjs', test)


# 8) Versión, CI y documentación.
ruta = 'package.json'
paquete = json.loads(leer(ruta))
paquete['version'] = VERSION
paquete.setdefault('scripts', {})['test:variedad-menu'] = 'node --experimental-strip-types scripts/probar-variedad-menu-v0922.mjs'
escribir(ruta, json.dumps(paquete, ensure_ascii=False, indent=2) + '\n')

ruta = 'package-lock.json'
lock = json.loads(leer(ruta))
lock['version'] = VERSION
if '' in lock.get('packages', {}):
    lock['packages']['']['version'] = VERSION
escribir(ruta, json.dumps(lock, ensure_ascii=False, indent=2) + '\n')

ruta = '.github/workflows/validar-pfi.yml'
texto = leer(ruta)
if 'test:variedad-menu' not in texto:
    texto = texto.replace(
        "      - name: Probar estructura del plan mensual\n        run: npm run test:menu-mensual\n",
        "      - name: Probar estructura del plan mensual\n        run: npm run test:menu-mensual\n\n      - name: Probar variedad mensual y verduras\n        run: npm run test:variedad-menu\n",
        1,
    )
    escribir(ruta, texto)

ruta = 'src/App.tsx'
escribir(ruta, leer(ruta).replace('v0.9.21', 'v0.9.22'))

ruta = 'public/sw.js'
escribir(ruta, leer(ruta).replace('pfi-v0.9.21-1', 'pfi-v0.9.22-1'))

ruta = 'README.md'
texto = leer(ruta).replace('Versión 0.9.21.', 'Versión 0.9.22.', 1)
if 'La v0.9.22' not in texto:
    texto = texto.replace(
        'Versión 0.9.22.\n',
        'Versión 0.9.22.\n\nLa v0.9.22 mantiene el patrón semanal pero evita repetir servicios completos entre semanas, añade vainas y otras verduras, rota una ensalada de pasta distinta por semana y conserva pizza del viernes, domingo fuera y la olla de legumbres lunes/jueves.\n',
        1,
    )
escribir(ruta, texto)

ruta = 'CHANGELOG.md'
texto = leer(ruta)
if '# v0.9.22' not in texto:
    bloque = """# v0.9.22 — Más variedad y más verduras

- El patrón semanal se conserva, pero no se repite el mismo servicio completo entre semanas.
- La pizza del viernes, el domingo fuera y la olla de legumbres lunes/jueves siguen siendo excepciones deliberadas.
- Se incorporan vainas con patata y huevo, verduras al horno y calabacín a la plancha.
- Se añaden albóndigas con tomate y pollo al ajillo para ampliar la rotación.
- Cada semana rota una ensalada de pasta diferente, siempre sin maíz.
- Se añade Macarrones con atún como quinta pasta para evitar repetir los viernes.
- Judías verdes queda vinculada al SKU 61282 del catálogo Mercadona actual.
- Los planes mensuales antiguos con repeticiones migran al nuevo patrón conservando las semanas excluidas.

"""
    escribir(ruta, bloque + texto)
