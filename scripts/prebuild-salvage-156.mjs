import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const raiz = process.cwd();

function ejecutarNode(args, etiqueta) {
  const resultado = spawnSync(process.execPath, args, {
    cwd: raiz,
    stdio: 'inherit',
    env: process.env,
  });

  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) {
    throw new Error(`${etiqueta} falló con código ${resultado.status ?? 'desconocido'}`);
  }
}

function normalizar(texto = '') {
  return String(texto)
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function listarCodigo(directorio) {
  if (!fs.existsSync(directorio)) return [];
  const encontrados = [];
  for (const entrada of fs.readdirSync(directorio, { withFileTypes: true })) {
    const ruta = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) {
      encontrados.push(...listarCodigo(ruta));
    } else if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/i.test(entrada.name)) {
      encontrados.push(ruta);
    }
  }
  return encontrados;
}

console.log('PFI 1.5.6 · restauración de salvamento');
ejecutarNode(['scripts/restaurar-integral.mjs'], 'Restauración 1.5.6');

console.log('PFI 1.5.6 · reaplicando correcciones posteriores al paquete truncado');
ejecutarNode(['scripts/aplicar-parches-salvage-156.mjs'], 'Parches de salvamento 1.5.6');

ejecutarNode(
  ['scripts/preparar-imports-node-156.mjs'],
  'Preparación de imports TypeScript para Node',
);

const packageJson = JSON.parse(
  fs.readFileSync(path.join(raiz, 'package.json'), 'utf8'),
);
if (packageJson.version !== '1.5.6') {
  throw new Error(`Versión restaurada inesperada: ${packageJson.version ?? 'sin versión'}`);
}

const src = path.join(raiz, 'src');
const archivosCodigo = listarCodigo(src);
if (archivosCodigo.length < 20) {
  throw new Error(`Restauración incompleta: solo hay ${archivosCodigo.length} archivos de código en src/.`);
}

const corpus = normalizar(
  archivosCodigo
    .map((ruta) => fs.readFileSync(ruta, 'utf8'))
    .join('\n'),
);

const capacidades = [
  ['raciones/porciones', /racion|porcion/],
  ['excepciones', /excepcion/],
  ['inventario', /inventario/],
  ['sobras', /sobra/],
  ['despensa', /despensa/],
  ['Mercadona', /mercadona/],
];

for (const [nombre, patron] of capacidades) {
  if (!patron.test(corpus)) {
    throw new Error(`No se ha encontrado la capacidad crítica de ${nombre} en el código restaurado.`);
  }
  console.log(`✓ Capacidad presente: ${nombre}`);
}

for (const archivo of [
  'public/sw.js',
  'public/manifest.webmanifest',
  'public/pwa-192x192.png',
  'public/pwa-512x512.png',
]) {
  if (!fs.existsSync(path.join(raiz, archivo))) {
    throw new Error(`Falta un archivo PWA crítico: ${archivo}`);
  }
}

const pruebas = [
  ['scripts/probar-v156-core.mjs', ['--experimental-strip-types']],
  ['scripts/probar-v156-matching-mercadona.mjs', []],
  ['scripts/probar-plan-mensual.mjs', ['--experimental-strip-types']],
  ['scripts/probar-v156-conversiones-compra.cjs', []],
  ['scripts/probar-presupuesto-mensual.mjs', ['--experimental-strip-types']],
  ['scripts/probar-aprendizaje.mjs', ['--experimental-strip-types']],
  ['scripts/probar-preferencias.mjs', []],
  ['scripts/probar-pwa.mjs', []],
];

console.log('PFI 1.5.6 · suite funcional reconstruida');
for (const [script, flags] of pruebas) {
  const ruta = path.join(raiz, script);
  if (!fs.existsSync(ruta)) {
    throw new Error(`Falta una prueba obligatoria de PFI 1.5.6: ${script}`);
  }
  console.log(`→ ${script}`);
  ejecutarNode([...flags, script], script);
}
console.log(`✓ Suite funcional: ${pruebas.length}/${pruebas.length} pruebas superadas`);

console.log('PFI 1.5.6 · validación real de precios Mercadona');
ejecutarNode(
  ['scripts/actualizar-precios-mercadona.mjs'],
  'Actualización completa de precios Mercadona',
);
ejecutarNode(
  ['scripts/probar-v156-precios-generados.mjs'],
  'Validación de precios Mercadona generados',
);

console.log('✓ PFI 1.5.6 preparada para TypeScript + Vite.');
