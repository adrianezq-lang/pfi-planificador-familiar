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

for (const archivo of ['public/sw.js', 'public/manifest.webmanifest']) {
  if (!fs.existsSync(path.join(raiz, archivo))) {
    throw new Error(`Falta un archivo PWA crítico: ${archivo}`);
  }
}

const pruebas = [
  ['scripts/probar-integral.mjs', []],
  ['scripts/probar-raciones-excepciones.mjs', ['--experimental-strip-types']],
  ['scripts/probar-v154-inventario-sobras.cjs', []],
  ['scripts/probar-v155-precios-online.mjs', ['--experimental-strip-types']],
];

console.log('PFI 1.5.6 · pruebas funcionales supervivientes');
let ejecutadas = 0;
const ausentes = [];
for (const [script, flags] of pruebas) {
  const ruta = path.join(raiz, script);
  if (!fs.existsSync(ruta)) {
    ausentes.push(script);
    console.warn(`⚠ Test perdido por el paquete truncado: ${script}`);
    continue;
  }
  console.log(`→ ${script}`);
  ejecutarNode([...flags, script], script);
  ejecutadas += 1;
}

console.log(`✓ Tests funcionales ejecutados: ${ejecutadas}/${pruebas.length}`);
if (ausentes.length > 0) {
  console.warn(`⚠ Tests ausentes: ${ausentes.join(', ')}`);
  console.warn('  Se sustituyen temporalmente por comprobaciones estructurales + TypeScript + Vite; no se considera todavía apto para producción.');
}

if (process.env.VERCEL_ENV === 'preview') {
  console.log('✓ Preview: se omite la actualización completa de Mercadona para acelerar la validación.');
} else {
  ejecutarNode(['scripts/actualizar-si-necesario.mjs'], 'Actualización Mercadona');
}

console.log('✓ Salvamento PFI 1.5.6 preparado para la validación TypeScript/Vite.');
