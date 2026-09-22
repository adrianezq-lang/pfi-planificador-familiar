import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [app, main, sw, pkg, css] = await Promise.all([
  readFile(new URL('../src/App.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../public/sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../src/styles/premium-v5.css', import.meta.url), 'utf8'),
]);

assert.match(pkg, /"version": "0\.9\.51"/);
assert.match(app, /v0\.9\.51/);
assert.match(sw, /pfi-v0\.9\.51-1/);
assert.match(main, /pfi-version-disponible/);
assert.match(main, /pfi-version=\$\{Date\.now\(\)\}/);
assert.match(main, /cache: 'no-store'/);
assert.match(app, /Actualizar ahora/);
assert.match(css, /\.app-update-banner/);

console.log('✓ versión visible, caché y aviso PWA están alineados');
console.log('✓ PFI comprueba la versión publicada al volver a la app');
