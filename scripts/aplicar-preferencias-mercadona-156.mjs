import fs from 'node:fs';

function leer(ruta) {
  if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);
  return fs.readFileSync(ruta, 'utf8');
}

function guardar(ruta, contenido) {
  fs.writeFileSync(ruta, contenido, 'utf8');
}

function reemplazar(contenido, antes, despues, etiqueta) {
  if (contenido.includes(despues)) return contenido;
  if (!contenido.includes(antes)) {
    throw new Error(`Preferencias Mercadona: no se pudo aplicar ${etiqueta}`);
  }
  return contenido.replace(antes, despues);
}

function parchearMatchingPreferencias() {
  const ruta = 'scripts/matching-mercadona.mjs';
  let c = leer(ruta);

  if (!c.includes("if (ingrediente === 'leche')")) {
    c = reemplazar(
      c,
      "  if (ingrediente === 'huevos') {",
      "  if (ingrediente === 'leche') {\n    const esLacteo = contiene(`${seccion} ${subcategoria}`, [\n      'leche y bebidas vegetales',\n      'leche',\n    ]);\n    if (!esLacteo || contiene(contexto, ['chocolate', 'cacao', 'bombon'])) {\n      return false;\n    }\n    if (busqueda.includes('proteina')) {\n      return contiene(contexto, ['proteina', 'protein']);\n    }\n    if (busqueda.includes('sin lactosa')) {\n      return contexto.includes('sin lactosa');\n    }\n    return true;\n  }\n\n  if (ingrediente === 'huevos') {",
      'filtro de leche',
    );
  }

  if (!c.includes("ingrediente === 'queso rallado'")) {
    c = reemplazar(
      c,
      "  if (ingrediente === 'mozzarella rallada') {",
      "  if (ingrediente === 'queso rallado' && contiene(busqueda, ['cuatro quesos', '4 quesos'])) {\n    return (\n      contiene(nombre, ['cuatro quesos', '4 quesos']) &&\n      nombre.includes('rallad')\n    );\n  }\n\n  if (ingrediente === 'mozzarella rallada') {",
      'filtro de cuatro quesos',
    );
  }

  c = reemplazar(
    c,
    "  if (ingrediente === 'garbanzos secos') {\n    return (\n      nombre.includes('garbanzo') &&\n      !contiene(contexto, ['cocido', 'cocida', 'tarro'])\n    );\n  }",
    "  if (ingrediente === 'garbanzos secos') {\n    return (\n      nombre.includes('garbanzo') &&\n      !contiene(contexto, ['cocido', 'cocida', 'tarro']) &&\n      (!busqueda.includes('pedrosillano') || nombre.includes('pedrosillano'))\n    );\n  }",
    'garbanzo pedrosillano seco',
  );

  c = reemplazar(
    c,
    "  if (ingrediente === 'garbanzos cocidos') {\n    return nombre.includes('garbanzo') && contiene(contexto, ['cocido', 'tarro']);\n  }",
    "  if (ingrediente === 'garbanzos cocidos') {\n    return (\n      nombre.includes('garbanzo') &&\n      contiene(contexto, ['cocido', 'tarro']) &&\n      (!busqueda.includes('pedrosillano') || nombre.includes('pedrosillano'))\n    );\n  }",
    'garbanzo pedrosillano cocido',
  );

  c = reemplazar(
    c,
    "      (\n        totalUnidades === 6 ||\n        envase.includes('pack 6') ||\n        contiene(contexto, ['6 latas', 'pack 6'])\n      )\n    );",
    "      (\n        totalUnidades === 6 ||\n        envase.includes('pack 6') ||\n        contiene(contexto, ['6 latas', 'pack 6'])\n      ) &&\n      (!busqueda.includes('aceite de oliva') || contexto.includes('oliva'))\n    );",
    'atún en aceite de oliva',
  );

  guardar(ruta, c);
}

function parchearActualizador() {
  const ruta = 'scripts/actualizar-precios-mercadona.mjs';
  let c = leer(ruta);

  if (!c.includes("from './preferencias-productos.mjs'")) {
    c = reemplazar(
      c,
      "import { esProductoSeguro } from './matching-mercadona.mjs';",
      "import { esProductoSeguro } from './matching-mercadona.mjs';\nimport {\n  cargarPreferenciasProductos,\n  obtenerPreferenciasIngrediente,\n  mostrarResumenPreferencias,\n} from './preferencias-productos.mjs';",
      'import de preferencias',
    );
  }

  if (!c.includes('RUTA_PREFERENCIAS_RESUELTAS')) {
    c = reemplazar(
      c,
      "const RUTA_INFORME = path.resolve(\n  'scripts/informe-precios-mercadona.json',\n);",
      "const RUTA_INFORME = path.resolve(\n  'scripts/informe-precios-mercadona.json',\n);\nconst RUTA_PREFERENCIAS_RESUELTAS = path.resolve(\n  'public/preferencias-mercadona-resueltas.json',\n);",
      'ruta de preferencias resueltas',
    );
  }

  if (!c.includes('function resolverPreferenciasProductos(')) {
    const marcador = 'async function ejecutar() {';
    const funcion = `function resolverPreferenciasProductos(preferencias, productos) {\n  const resueltas = {};\n  const pendientes = [];\n\n  Object.entries(preferencias).forEach(([ingrediente, opciones]) => {\n    const opcionesResueltas = [];\n\n    opciones.forEach((opcion) => {\n      const objetivo = {\n        ingrediente,\n        buscar: opcion.buscar,\n        productoId: opcion.productoId ?? null,\n      };\n      const resultado = buscarMejorProducto(objetivo, productos);\n\n      if (!resultado.producto || resultado.puntuacion < 180) {\n        pendientes.push({\n          ingrediente,\n          buscar: opcion.buscar,\n          porcentaje: opcion.porcentaje,\n          puntuacion: resultado.puntuacion,\n        });\n        return;\n      }\n\n      opcionesResueltas.push({\n        buscar: opcion.buscar,\n        porcentaje: opcion.porcentaje,\n        productoId: String(resultado.producto.id),\n        nombreComercial:\n          resultado.producto.display_name ??\n          resultado.producto.name ??\n          opcion.buscar,\n        puntuacion: resultado.puntuacion,\n      });\n    });\n\n    if (opcionesResueltas.length > 0) {\n      resueltas[ingrediente] = opcionesResueltas.sort(\n        (a, b) => b.porcentaje - a.porcentaje,\n      );\n    }\n  });\n\n  return { resueltas, pendientes };\n}\n\n`;
    if (!c.includes(marcador)) throw new Error('Preferencias Mercadona: falta ejecutar()');
    c = c.replace(marcador, `${funcion}${marcador}`);
  }

  c = reemplazar(
    c,
    "  const objetivos = leerObjetivos();\n\n  console.log(\n    `Productos objetivo: ${objetivos.length}`,\n  );",
    "  const objetivosBase = leerObjetivos();\n  const preferencias = cargarPreferenciasProductos();\n  mostrarResumenPreferencias(preferencias);\n\n  console.log(\n    `Productos objetivo: ${objetivosBase.length}`,\n  );",
    'carga de preferencias',
  );

  c = reemplazar(
    c,
    "  console.log(\n    `Productos descargados: ${productosMercadona.length}`,\n  );\n\n  const fecha = new Date()",
    "  console.log(\n    `Productos descargados: ${productosMercadona.length}`,\n  );\n\n  const preferenciasResultado = resolverPreferenciasProductos(\n    preferencias,\n    productosMercadona,\n  );\n  const preferenciasResueltas = preferenciasResultado.resueltas;\n  const preferenciasPendientes = preferenciasResultado.pendientes;\n\n  const objetivos = objetivosBase.map((objetivo) => {\n    const opciones = obtenerPreferenciasIngrediente(preferencias, objetivo.ingrediente);\n    const principalResuelta = preferenciasResueltas[objetivo.ingrediente]?.[0];\n    if (opciones.length === 0 || !principalResuelta) return objetivo;\n    return {\n      ...objetivo,\n      buscar: principalResuelta.buscar,\n      productoId: principalResuelta.productoId,\n      preferenciaAplicada: {\n        porcentaje: principalResuelta.porcentaje,\n        opciones: preferenciasResueltas[objetivo.ingrediente],\n      },\n    };\n  });\n\n  const fecha = new Date()",
    'resolución de preferencias',
  );

  c = reemplazar(
    c,
    "      puntuacion:\n        resultado.puntuacion,\n    });",
    "      puntuacion:\n        resultado.puntuacion,\n      preferenciaAplicada: objetivo.preferenciaAplicada ?? null,\n    });",
    'informe de preferencia aplicada',
  );

  if (!c.includes("fs.writeFileSync(\n    RUTA_PREFERENCIAS_RESUELTAS")) {
    const marcador = "  fs.writeFileSync(\n    RUTA_INFORME,";
    const bloque = `  fs.writeFileSync(\n    RUTA_PREFERENCIAS_RESUELTAS,\n    JSON.stringify(\n      {\n        actualizado: new Date().toISOString(),\n        preferencias: preferenciasResueltas,\n        pendientes: preferenciasPendientes,\n      },\n      null,\n      2,\n    ),\n    'utf8',\n  );\n\n`;
    if (!c.includes(marcador)) throw new Error('Preferencias Mercadona: falta escritura de informe');
    c = c.replace(marcador, `${bloque}${marcador}`);
  }

  c = reemplazar(
    c,
    "    'Generado scripts/informe-precios-mercadona.json',\n  );",
    "    'Generado scripts/informe-precios-mercadona.json',\n  );\n  console.log(\n    'Generado public/preferencias-mercadona-resueltas.json',\n  );",
    'log de preferencias resueltas',
  );

  guardar(ruta, c);
}

function escribirServicioRuntime() {
  guardar(
    'src/services/preferenciasMercadona.ts',
    `export type PreferenciaMercadonaResuelta = {\n  buscar: string;\n  porcentaje: number;\n  productoId: string;\n  nombreComercial: string;\n  puntuacion: number;\n};\n\ntype ArchivoPreferencias = {\n  preferencias?: Record<string, PreferenciaMercadonaResuelta[]>;\n};\n\nlet cache: Record<string, PreferenciaMercadonaResuelta[]> | null = null;\n\nexport async function cargarPreferenciasMercadonaResueltas(): Promise<Record<string, PreferenciaMercadonaResuelta[]>> {\n  if (cache) return cache;\n  try {\n    const respuesta = await fetch('/preferencias-mercadona-resueltas.json', { cache: 'force-cache' });\n    if (!respuesta.ok) return {};\n    const datos = (await respuesta.json()) as ArchivoPreferencias;\n    cache = datos.preferencias && typeof datos.preferencias === 'object'\n      ? datos.preferencias\n      : {};\n    return cache;\n  } catch {\n    return {};\n  }\n}\n\nexport function preferenciaPrincipal(\n  preferencias: Record<string, PreferenciaMercadonaResuelta[]>,\n  ingrediente: string,\n): PreferenciaMercadonaResuelta | null {\n  const opciones = preferencias[ingrediente] ?? [];\n  return opciones.length > 0\n    ? [...opciones].sort((a, b) => b.porcentaje - a.porcentaje)[0]\n    : null;\n}\n`,
  );
}

function parchearAsociaciones() {
  const ruta = 'src/services/asociacionesIngredientes.ts';
  let c = leer(ruta);

  if (!c.includes("from './preferenciasMercadona")) {
    const patron = /import \{\n  cargarCatalogoMercadona,\n  obtenerProductoCatalogoPorId,\n\} from '\.\/catalogoMercadona(?:\.ts)?';/;
    const encontrado = c.match(patron)?.[0];
    if (!encontrado) throw new Error('Preferencias Mercadona: falta import de catálogo en asociaciones');
    c = c.replace(
      encontrado,
      `${encontrado}\nimport {\n  cargarPreferenciasMercadonaResueltas,\n  preferenciaPrincipal,\n} from './preferenciasMercadona';`,
    );
  }

  c = reemplazar(
    c,
    "  const nuevas = { ...asociaciones };\n  let recuperadas = 0;\n  const pendientesCatalogo: string[] = [];\n\n  pendientes.forEach((ingrediente) => {",
    "  const nuevas = { ...asociaciones };\n  let recuperadas = 0;\n  const preferencias = await cargarPreferenciasMercadonaResueltas();\n  const pendientesSinPreferencia = pendientes.filter((ingrediente) => {\n    const preferida = preferenciaPrincipal(preferencias, ingrediente);\n    if (!preferida?.productoId) return true;\n    nuevas[ingrediente] = preferida.productoId;\n    recuperadas += 1;\n    return false;\n  });\n  const pendientesCatalogo: string[] = [];\n\n  pendientesSinPreferencia.forEach((ingrediente) => {",
    'recuperación prioritaria por preferencias',
  );

  guardar(ruta, c);
}

parchearMatchingPreferencias();
parchearActualizador();
escribirServicioRuntime();
parchearAsociaciones();
console.log('✓ preferencias Mercadona integradas: filtros estrictos, resolución real y recuperación de asociaciones');
