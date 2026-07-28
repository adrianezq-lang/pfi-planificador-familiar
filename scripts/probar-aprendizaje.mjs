class StorageMock {
  data = new Map();
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

globalThis.localStorage = new StorageMock();
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };

const mod = await import(new URL('../src/services/aprendizaje.ts', import.meta.url).href);

mod.registrarEleccionMenu('Lunes', 'cena', ['Lomo', 'Ensalada']);
const raw = JSON.parse(localStorage.getItem('pfi-aprendizaje-v1'));
raw.menu[0].fecha = new Date(Date.now() - 11 * 60_000).toISOString();
localStorage.setItem('pfi-aprendizaje-v1', JSON.stringify(raw));
mod.registrarEleccionMenu('Lunes', 'cena', ['Lomo', 'Patatas']);
mod.registrarResultadoComida('Lunes', 'cena', ['Lomo', 'Ensalada'], 'gusto');

const sugerencias = mod.obtenerSugerenciasMenu(
  'Lunes',
  'cena',
  ['Lomo', 'Patatas'],
);
if (sugerencias[0]?.platos.join('+') !== 'Lomo+Ensalada') {
  throw new Error('La valoración positiva no mejora la sugerencia de menú');
}

const complementos = mod.obtenerComplementosSugeridos(
  'Lomo',
  'cena',
  ['Lomo'],
  ['Lomo', 'Ensalada', 'Patatas', 'Arroz blanco'],
);
if (!complementos.some((item) => item.plato === 'Ensalada')) {
  throw new Error('No se aprendió el complemento usado con Lomo');
}

mod.registrarResultadoComida(
  'Jueves',
  'cena',
  ['Filete de ternera'],
  'falto',
);
const ajustadaPorResultado = mod.aplicarAprendizajePorcion(
  'Filete de ternera',
  'Filete de ternera',
  { cantidad: 650, unidad: 'g', explicacion: 'base' },
);
if (ajustadaPorResultado.cantidad !== 700) {
  throw new Error(
    `Cantidad tras indicar que faltó incorrecta: ${ajustadaPorResultado.cantidad}`,
  );
}

mod.registrarAjustePorcion({
  receta: 'Salmón',
  ingrediente: 'Salmón',
  cantidadBase: 650,
  unidadBase: 'g',
  cantidadManual: 700,
  unidadManual: 'g',
});
const ajustadaManual = mod.aplicarAprendizajePorcion('Salmón', 'Salmón', {
  cantidad: 650,
  unidad: 'g',
  explicacion: 'base',
});
if (ajustadaManual.cantidad !== 700) {
  throw new Error(`Cantidad manual aprendida incorrecta: ${ajustadaManual.cantidad}`);
}

const resumen = mod.obtenerResumenAprendizaje();
if (resumen.valoraciones !== 2 || resumen.ajustesRecetas !== 1) {
  throw new Error('El resumen de aprendizaje no incluye la nueva información');
}

console.log('✓ valoraciones influyen en las sugerencias');
console.log('✓ complementos aprendidos y contextuales');
console.log('✓ “Faltó” ajusta 650 g → 700 g');
console.log('✓ corrección manual conserva 650 g → 700 g');
