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

console.log('PFI 1.5.6 · restauración de salvamento');
ejecutarNode(['scripts/restaurar-integral.mjs'], 'Restauración 1.5.6');

const pruebas = [
  ['scripts/probar-integral.mjs', []],
  ['scripts/probar-raciones-excepciones.mjs', ['--experimental-strip-types']],
  ['scripts/probar-v154-inventario-sobras.cjs', []],
  ['scripts/probar-v155-precios-online.mjs', ['--experimental-strip-types']],
];

console.log('PFI 1.5.6 · validación funcional del código restaurado');
for (const [script, flags] of pruebas) {
  const ruta = path.join(raiz, script);
  if (!fs.existsSync(ruta)) {
    throw new Error(`Falta una prueba crítica de la 1.5.6: ${script}`);
  }
  console.log(`→ ${script}`);
  ejecutarNode([...flags, script], script);
}

if (process.env.VERCEL_ENV === 'preview') {
  console.log('✓ Preview: se omite la actualización completa de Mercadona para acelerar la validación.');
} else {
  ejecutarNode(['scripts/actualizar-si-necesario.mjs'], 'Actualización Mercadona');
}

console.log('✓ PFI 1.5.6 validada antes de compilar.');
