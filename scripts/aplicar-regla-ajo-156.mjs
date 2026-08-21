import fs from 'node:fs';

function leer(ruta) {
  if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);
  return fs.readFileSync(ruta, 'utf8');
}

function guardar(ruta, contenido) {
  fs.writeFileSync(ruta, contenido, 'utf8');
}

function reemplazar(contenido, anterior, nuevo, etiqueta) {
  if (contenido.includes(nuevo)) return contenido;
  if (!contenido.includes(anterior)) throw new Error(`No se pudo aplicar: ${etiqueta}`);
  return contenido.replace(anterior, nuevo);
}

function corregirConversionCompra() {
  const ruta = 'src/motor/compra.ts';
  let contenido = leer(ruta);

  contenido = reemplazar(
    contenido,
    "type LineaMenuTemporal = {\n  ingrediente: Ingrediente;\n  producto: ProductoMercadonaCatalogo | null;\n};",
    "type LineaMenuTemporal = {\n  ingrediente: Ingrediente;\n  producto: ProductoMercadonaCatalogo | null;\n};\n\nconst DIENTES_POR_MALLA_AJO = 30;\nconst CABEZAS_POR_MALLA_AJO = 3;",
    'constantes de malla de ajo',
  );

  contenido = reemplazar(
    contenido,
    "  const formatoUnidad = producto.formatoUnidad ?? '';\n\n  if (unidadesTotales > 0) {",
    "  const formatoUnidad = producto.formatoUnidad ?? '';\n  const nombreProducto = normalizarTexto(producto.nombre);\n  const formatoProducto = normalizarTexto(producto.formato);\n\n  if (nombreProducto.includes('ajo') && formatoProducto.includes('malla')) {\n    capacidades.push({ cantidad: DIENTES_POR_MALLA_AJO, unidad: 'diente_ajo' });\n    capacidades.push({ cantidad: CABEZAS_POR_MALLA_AJO, unidad: 'cabeza_ajo' });\n  }\n\n  if (unidadesTotales > 0) {",
    'capacidad de una malla de ajo',
  );

  contenido = reemplazar(
    contenido,
    "  const productoTienePeso = Boolean(capacidadPorUnidad.get('g'));\n  const productoSeVendePorPieza = formato.includes('pieza');",
    "  const productoTienePeso = Boolean(capacidadPorUnidad.get('g'));\n  const productoSeVendePorPieza = formato.includes('pieza');\n\n  if (nombre === 'ajo') {\n    if (['diente', 'dientes'].includes(unidadOriginal) && capacidadPorUnidad.has('diente_ajo')) {\n      return { cantidad: ingrediente.cantidad, unidad: 'diente_ajo', aproximada: true };\n    }\n    if (['cabeza', 'cabezas'].includes(unidadOriginal) && capacidadPorUnidad.has('cabeza_ajo')) {\n      return { cantidad: ingrediente.cantidad, unidad: 'cabeza_ajo', aproximada: true };\n    }\n  }",
    'conversión dientes/cabezas de ajo',
  );

  guardar(ruta, contenido);
}

function corregirRecetaGuardada() {
  const ruta = 'src/services/recetas.ts';
  let contenido = leer(ruta);

  contenido = reemplazar(
    contenido,
    "const CLAVE_MIGRACION_RECETAS_V095 = 'pfi-migracion-recetas-v095';",
    "const CLAVE_MIGRACION_RECETAS_V095 = 'pfi-migracion-recetas-v095';\nconst CLAVE_MIGRACION_AJO_V156 = 'pfi-migracion-ajo-v156';",
    'clave de migración ajo',
  );

  const marcador = 'function aplicarMigracionPostresV0910(recetas: Receta[]): Receta[] {';
  const funcion = `function aplicarMigracionAjoV156(recetas: Receta[]): Receta[] {\n  if (localStorage.getItem(CLAVE_MIGRACION_AJO_V156) === '1') return recetas;\n\n  let cambiado = false;\n  const resultado = recetas.map((receta) => {\n    if (normalizarTexto(receta.nombre) !== 'garbanzos fritos') return receta;\n\n    const ingredientes = receta.ingredientes.map((ingrediente) => {\n      if (normalizarTexto(ingrediente.nombre) !== 'ajo') return ingrediente;\n      if (ingrediente.cantidad === 0.5 && normalizarTexto(ingrediente.unidad) === 'cabeza') return ingrediente;\n      cambiado = true;\n      return { ...ingrediente, cantidad: 0.5, unidad: 'cabeza', seccion: 'Fruta y verdura' };\n    });\n\n    return { ...receta, ingredientes };\n  });\n\n  localStorage.setItem(CLAVE_MIGRACION_AJO_V156, '1');\n  if (cambiado) localStorage.setItem(CLAVE_RECETAS, JSON.stringify(resultado));\n  return resultado;\n}\n\n`;
  contenido = reemplazar(contenido, marcador, `${funcion}${marcador}`, 'migración receta ajo');

  contenido = reemplazar(
    contenido,
    '    const normalizadas = normalizarRecetas(origen);',
    '    const normalizadas = aplicarMigracionAjoV156(normalizarRecetas(origen));',
    'aplicar migración ajo',
  );

  contenido = reemplazar(
    contenido,
    '  localStorage.removeItem(CLAVE_MIGRACION_RECETAS_V095);',
    '  localStorage.removeItem(CLAVE_MIGRACION_RECETAS_V095);\n  localStorage.removeItem(CLAVE_MIGRACION_AJO_V156);',
    'limpiar migración ajo',
  );

  guardar(ruta, contenido);
}

corregirConversionCompra();
corregirRecetaGuardada();
console.log('✓ regla de ajo 1.5.6 aplicada: 0,5 cabeza y una malla como envase real');
