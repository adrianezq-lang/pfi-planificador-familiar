import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const raiz = process.cwd();
const respaldoUi = path.join(raiz, '.pfi-ui-1.5.5');

const rutasUiProtegidas = [
  'src/App.tsx',
  'src/main.tsx',
  'src/index.css',
  'src/assets',
  'src/components',
  'src/pages',
  'src/styles',
];

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

function copiarRuta(origenRelativo, destinoBase) {
  const origen = path.join(raiz, origenRelativo);
  if (!fs.existsSync(origen)) {
    throw new Error(`No se puede proteger la interfaz: falta ${origenRelativo}`);
  }

  const destino = path.join(destinoBase, origenRelativo);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const estado = fs.statSync(origen);
  if (estado.isDirectory()) {
    fs.cpSync(origen, destino, { recursive: true });
  } else {
    fs.copyFileSync(origen, destino);
  }
}

function respaldarInterfaz155() {
  fs.rmSync(respaldoUi, { recursive: true, force: true });
  fs.mkdirSync(respaldoUi, { recursive: true });
  rutasUiProtegidas.forEach((ruta) => copiarRuta(ruta, respaldoUi));
  console.log(`✓ interfaz 1.5.5 protegida: ${rutasUiProtegidas.length} rutas`);
}

function restaurarInterfaz155() {
  for (const rutaRelativa of rutasUiProtegidas) {
    const origen = path.join(respaldoUi, rutaRelativa);
    const destino = path.join(raiz, rutaRelativa);
    fs.rmSync(destino, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    if (fs.statSync(origen).isDirectory()) {
      fs.cpSync(origen, destino, { recursive: true });
    } else {
      fs.copyFileSync(origen, destino);
    }
  }

  const menu = fs.readFileSync(path.join(raiz, 'src/pages/Menu.tsx'), 'utf8');
  const home = fs.readFileSync(path.join(raiz, 'src/pages/Home.tsx'), 'utf8');
  const despensa = fs.readFileSync(path.join(raiz, 'src/pages/Despensa.tsx'), 'utf8');
  const css = fs.readFileSync(path.join(raiz, 'src/index.css'), 'utf8');

  const firmas = [
    [menu.includes('PFI ya está aprendiendo de vuestra familia'), 'aprendizaje del menú'],
    [menu.includes('Equilibrio PFI de esta semana'), 'equilibrio semanal'],
    [home.includes('Menú del día') && home.includes('Preparar para mañana'), 'inicio de tarjetas'],
    [despensa.includes('Todos los productos controlados'), 'despensa visual'],
    [css.includes('.home-card') && css.includes('.pantry-summary-card'), 'estilos 1.5.5'],
  ];

  for (const [valida, etiqueta] of firmas) {
    if (!valida) throw new Error(`La interfaz 1.5.5 no conserva ${etiqueta}`);
  }

  console.log('✓ interfaz 1.5.5 restaurada exactamente después del paquete 1.5.6');
}

respaldarInterfaz155();

console.log('PFI 1.5.6 · restauración de salvamento');
ejecutarNode(['scripts/restaurar-integral.mjs'], 'Restauración 1.5.6');

console.log('PFI 1.5.6 · reaplicando correcciones posteriores al paquete truncado');
ejecutarNode(['scripts/aplicar-parches-salvage-156.mjs'], 'Parches de salvamento 1.5.6');

console.log('PFI 1.5.6 · restaurando la interfaz visual 1.5.5 elegida');
restaurarInterfaz155();

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

fs.rmSync(respaldoUi, { recursive: true, force: true });
console.log('✓ PFI 1.5.6 preparada para TypeScript + Vite con interfaz 1.5.5.');
