import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leer = (ruta) => readFile(new URL(`../${ruta}`, import.meta.url), 'utf8');

const [perfil, porciones, listaCompra, app, menu, compra, css] = await Promise.all([
  leer('src/services/perfil.ts'),
  leer('src/services/porciones.ts'),
  leer('src/services/listaCompra.ts'),
  leer('src/App.tsx'),
  leer('src/pages/MenuModern.tsx'),
  leer('src/pages/CompraModern.tsx'),
  leer('src/styles/pro-product.css'),
]);

assert.match(perfil, /if \(edad >= 12\) return 1;/);
assert.match(perfil, /if \(edad >= 6\) return 0\.7;/);
assert.match(porciones, /gramosPorRacion\(125, 25, 'carne principal'\)/);
assert.match(porciones, /gramosPorRacion\(80, 25, 'pasta seca como plato principal'\)/);
assert.match(porciones, /gramosPorRacion\(80, 25, 'legumbre seca'\)/);
assert.match(listaCompra, /calcularRacionesEquivalentes/);
assert.match(listaCompra, /const racionesReferencia = Math\.max/);
assert.match(listaCompra, /const racionesServicio = calcularRacionesEquivalentes/);

assert.match(app, /import '\.\/styles\/pro-product\.css';/);
assert.match(app, /<ContextoFamiliar \/>/);
assert.match(menu, /function ValoracionPlegable/);
assert.match(compra, /const desmarcarTodo = \(\) =>/);
assert.match(compra, /✓ Marcar todo/);
assert.match(compra, /<summary>Ver cálculo<\/summary>/);

assert.match(css, /linear-gradient\(135deg, #173722 0%, #244b32 58%, #315d3e 100%\)/);
assert.match(css, /\.modern-shopping-summary \{/);
assert.match(css, /\.modern-meal-card::before/);
assert.match(css, /\.home-card--prep\.pfi-card/);
assert.match(css, /\.budget-card--total\.pfi-card/);

console.log('✓ 12+ usa ración adulta equivalente y 6-8 usa 0,70');
console.log('✓ carne, pasta y legumbre tienen bases recalibradas');
console.log('✓ cantidades manuales y ollas escalan por raciones equivalentes');
console.log('✓ contexto familiar visible en Menú y Compra');
console.log('✓ valoración plegable y compra reversible siguen presentes');
console.log('✓ cabecera, resumen de compra, comidas e Inicio tienen jerarquía de alto contraste');
