import fs from 'node:fs';

function leer(ruta) {
  if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta} tras restaurar PFI 1.5.6`);
  return fs.readFileSync(ruta, 'utf8');
}

function guardar(ruta, contenido) {
  fs.writeFileSync(ruta, contenido, 'utf8');
}

function reemplazarObligatorio(contenido, anterior, nuevo, etiqueta) {
  if (contenido.includes(nuevo)) return contenido;
  if (!contenido.includes(anterior)) {
    throw new Error(`No se puede aplicar el parche 1.5.6: ${etiqueta}`);
  }
  return contenido.replace(anterior, nuevo);
}

function parchearMenuMensual() {
  const ruta = 'src/data/MenuMensual.ts';
  let contenido = leer(ruta);

  const bloqueAnterior = `export const CENAS_VIERNES = [\n  ['Hamburguesas'],\n  ['Perritos calientes'],\n  ['Kebab'],\n] as const;`;
  const bloqueNuevo = `export const CENAS_VIERNES = [\n  ['Pizza jamón y queso', 'Pizza BBQ'],\n  ['Pizza BBQ', 'Pizza 4 quesos'],\n] as const;\n\nexport const CENAS_SABADO = [\n  ['Hamburguesas'],\n  ['Perritos calientes'],\n  ['Kebab'],\n] as const;`;
  contenido = reemplazarObligatorio(
    contenido,
    bloqueAnterior,
    bloqueNuevo,
    'cenas fijas de viernes/sábado',
  );

  const viernes = [
    ['Pizza jamón y queso', 'Pizza BBQ'],
    ['Pizza BBQ', 'Pizza 4 quesos'],
    ['Pizza jamón y queso', 'Pizza BBQ'],
    ['Pizza BBQ', 'Pizza 4 quesos'],
  ];
  const sabado = [
    ['Hamburguesas'],
    ['Perritos calientes'],
    ['Kebab'],
    ['Hamburguesas'],
  ];
  let indiceViernes = 0;
  let indiceSabado = 0;

  contenido = contenido.replace(
    /(\{ dia: 'Viernes', comida: \[[^\n]*?\], cena: )\[[^\n]*?\](, postreComida:)/g,
    (coincidencia, inicio, final) => {
      const cena = viernes[indiceViernes++] ?? viernes[0];
      return `${inicio}${JSON.stringify(cena)}${final}`;
    },
  );
  contenido = contenido.replace(
    /(\{ dia: 'Sábado', comida: \[[^\n]*?\], cena: )\[[^\n]*?\](, postreComida:)/g,
    (coincidencia, inicio, final) => {
      const cena = sabado[indiceSabado++] ?? sabado[0];
      return `${inicio}${JSON.stringify(cena)}${final}`;
    },
  );

  if (indiceViernes !== 4 || indiceSabado !== 4) {
    throw new Error(`No se han podido fijar las 4 semanas: viernes=${indiceViernes}, sábado=${indiceSabado}`);
  }

  guardar(ruta, contenido);
}

function parchearMenuSemanal() {
  const ruta = 'src/data/Menusemanal.ts';
  let contenido = leer(ruta);
  contenido = contenido.replace(
    /(\{ dia: 'Viernes', comida: \[[^\n]*?\], cena: )\[[^\n]*?\](, postreComida:)/,
    '$1["Pizza jamón y queso","Pizza BBQ"]$2',
  );
  contenido = contenido.replace(
    /(\{ dia: 'Sábado', comida: \[[^\n]*?\], cena: )\[[^\n]*?\](, postreComida:)/,
    '$1["Hamburguesas"]$2',
  );
  guardar(ruta, contenido);
}

function parchearPlanMensual() {
  const ruta = 'src/services/planMensual.ts';
  let contenido = leer(ruta);

  if (!contenido.includes('CENAS_SABADO,')) {
    contenido = reemplazarObligatorio(
      contenido,
      "import {\n  CENAS_VIERNES,",
      "import {\n  CENAS_SABADO,\n  CENAS_VIERNES,",
      'import CENAS_SABADO en planMensual',
    );
  }

  if (!contenido.includes('export function aplicarCenasFijasPlan')) {
    const marcador = 'export function calcularEquilibrioSemana(menu: DiaMenu[]): ResumenEquilibrio {';
    const funcion = `export function aplicarCenasFijasPlan(plan: SemanaMenu[]): SemanaMenu[] {\n  return plan.map((semana, indiceSemana) => ({\n    ...semana,\n    menu: semana.menu.map((dia) => {\n      if (normalizar(dia.dia) === 'viernes') {\n        const cena = CENAS_VIERNES[indiceSemana % CENAS_VIERNES.length];\n        return { ...dia, cena: [...cena] };\n      }\n      if (normalizar(dia.dia) === 'sabado') {\n        const cena = CENAS_SABADO[indiceSemana % CENAS_SABADO.length];\n        return { ...dia, cena: [...cena] };\n      }\n      return dia;\n    }),\n  }));\n}\n\n`;
    contenido = reemplazarObligatorio(
      contenido,
      marcador,
      `${funcion}${marcador}`,
      'aplicarCenasFijasPlan',
    );
  }

  guardar(ruta, contenido);
}

function parchearMigracionMenu() {
  const ruta = 'src/hooks/useMenu.ts';
  let contenido = leer(ruta);

  contenido = contenido
    .replaceAll('CLAVE_MIGRACION_VIERNES_V095', 'CLAVE_MIGRACION_CENAS_V156')
    .replaceAll('migrarViernesV095', 'migrarCenasV156')
    .replace('pfi-migracion-viernes-v095', 'pfi-migracion-cenas-v156');

  const sabadoAnterior = `        if (dia.dia === 'Sábado' && dia.cena.includes('Hamburguesas')) {\n          return {\n            ...dia,\n            cena:\n              indiceSemana % 2 === 0\n                ? ['Pizza jamón y queso', 'Pizza BBQ']\n                : ['Pizza BBQ', 'Pizza 4 quesos'],\n          };\n        }\n`;
  contenido = contenido.replace(sabadoAnterior, '');

  if (!contenido.includes('CENAS_SABADO[')) {
    contenido = contenido.replace(/^\s*CENAS_SABADO,\n/m, '');
  }

  guardar(ruta, contenido);
}

function parchearMatchingMercadona() {
  const ruta = 'scripts/actualizar-precios-mercadona.mjs';
  let contenido = leer(ruta);

  if (!contenido.includes("from './matching-mercadona.mjs'")) {
    contenido = reemplazarObligatorio(
      contenido,
      "} from './mercadona-sesion.mjs';",
      "} from './mercadona-sesion.mjs';\nimport { esProductoSeguro } from './matching-mercadona.mjs';",
      'import del matching seguro',
    );
  }

  const marcador = `  productos.forEach((producto) => {\n    const puntuacion = puntuarProducto(`;
  const protegido = `  productos.forEach((producto) => {\n    if (!esProductoSeguro(objetivo, producto)) {\n      return;\n    }\n\n    const puntuacion = puntuarProducto(`;
  contenido = reemplazarObligatorio(
    contenido,
    marcador,
    protegido,
    'filtro seguro de productos',
  );

  guardar(ruta, contenido);
}

function parchearObjetivosMercadona() {
  const ruta = 'scripts/productos-objetivo.json';
  const objetivos = JSON.parse(leer(ruta));
  if (!Array.isArray(objetivos)) {
    throw new Error('productos-objetivo.json no contiene una lista');
  }

  const busquedas = new Map([
    ['Huevos', 'huevo'],
    ['Patatas', 'patata'],
    ['Cebolla', 'cebolla'],
    ['Zanahorias', 'zanahoria'],
    ['Ajo', 'ajo'],
    ['Salmón', 'salmón'],
    ['Almejas', 'almeja'],
    ['Mezcla cuatro quesos', '4 quesos'],
    ['Ajo en polvo', 'ajo granulado Hacendado'],
  ]);

  let aplicados = 0;
  const actualizados = objetivos.map((entrada) => {
    if (!entrada || typeof entrada !== 'object') return entrada;
    const nuevaBusqueda = busquedas.get(entrada.ingrediente);
    if (!nuevaBusqueda) return entrada;
    aplicados += 1;
    return { ...entrada, buscar: nuevaBusqueda };
  });

  if (aplicados !== busquedas.size) {
    throw new Error(`Solo se han podido actualizar ${aplicados}/${busquedas.size} objetivos Mercadona`);
  }

  guardar(ruta, `${JSON.stringify(actualizados, null, 2)}\n`);
  console.log(`✓ objetivos Mercadona reaplicados: ${aplicados}/${busquedas.size}`);
}

function parchearPwa() {
  const ruta = 'public/sw.js';
  let contenido = leer(ruta);
  contenido = contenido.replace(
    /const CACHE_NAME = ['"]pfi-v[^'"]+['"];/,
    "const CACHE_NAME = 'pfi-v1.5.6';",
  );
  guardar(ruta, contenido);
}

parchearMenuMensual();
parchearMenuSemanal();
parchearPlanMensual();
parchearMigracionMenu();
parchearMatchingMercadona();
parchearObjetivosMercadona();
parchearPwa();

console.log('✓ parches de salvamento PFI 1.5.6 reaplicados tras la restauración');
