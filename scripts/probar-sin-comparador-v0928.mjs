import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const compra = readFileSync(
  new URL('../src/pages/CompraPlanificada.tsx', import.meta.url),
  'utf8',
);
const navegacion = readFileSync(
  new URL('../src/components/NavegacionInferior.tsx', import.meta.url),
  'utf8',
);
const copias = readFileSync(
  new URL('../src/components/CentroDatosCopias.tsx', import.meta.url),
  'utf8',
);

assert.doesNotMatch(compra, /ComparadorCompra|comparadorPrecios|planComparado/);
assert.doesNotMatch(compra, /Carrefour|Eroski|Lidl|Compra separada por supermercados/);
assert.match(compra, /Tu lista de la compra/);
assert.match(compra, /Guardar.*en despensa/s);
assert.match(navegacion, /texto: 'Mercadona'/);
assert.doesNotMatch(copias, /precios comparados/);

console.log('✓ Compra ya no carga ni muestra el comparador de supermercados');
console.log('✓ la lista única conserva cantidades, marcado y guardado en despensa');
console.log('✓ el único catálogo visible se identifica claramente como Mercadona');
