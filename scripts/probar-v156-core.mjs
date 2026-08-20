class StorageMock {
  data = new Map();
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
  clear() { this.data.clear(); }
}

globalThis.localStorage = new StorageMock();
globalThis.window = {
  dispatchEvent() {},
  addEventListener() {},
  removeEventListener() {},
};
globalThis.Event = class { constructor(type) { this.type = type; } };
globalThis.CustomEvent = class extends globalThis.Event {};

function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

const perfil = await import(
  new URL('../src/services/perfil.ts', import.meta.url).href
);
const porciones = await import(
  new URL('../src/services/porciones.ts', import.meta.url).href
);
const inventario = await import(
  new URL('../src/services/inventario.ts', import.meta.url).href
);
const postres = await import(
  new URL('../src/services/postres.ts', import.meta.url).href
);
const datosMenu = await import(
  new URL('../src/data/MenuMensual.ts', import.meta.url).href
);

const familia = perfil.normalizarPerfil({
  nombre: 'Prueba',
  adultos: 2,
  ninos: 2,
  edadesNinos: [12, 6],
  bebes: 1,
  bebesComenMenu: false,
  supermercado: 'Mercadona',
  presupuesto: 500,
});
const soloAdultos = perfil.normalizarPerfil({
  ...familia,
  ninos: 0,
  edadesNinos: [],
  bebes: 0,
});

comprobar(
  perfil.calcularRacionesEquivalentes(familia) >
    perfil.calcularRacionesEquivalentes(soloAdultos),
  'El modo solo adultos debe reducir las raciones equivalentes',
);
comprobar(
  perfil.calcularComensales(familia) === 4,
  'El bebé no debe contar como comensal mientras no coma del menú',
);

const ingredientePasta = {
  nombre: 'Pasta corta',
  cantidad: 500,
  unidad: 'g',
  seccion: 'Despensa',
};
const recetaPasta = {
  nombre: 'Macarrones boloñesa',
  categoria: 'Pasta',
};
const pastaFamilia = porciones.obtenerSugerenciaBaseIngrediente(
  ingredientePasta,
  recetaPasta,
  familia,
);
const pastaAdultos = porciones.obtenerSugerenciaBaseIngrediente(
  ingredientePasta,
  recetaPasta,
  soloAdultos,
);

comprobar(
  pastaFamilia && pastaAdultos && pastaFamilia.cantidad > pastaAdultos.cantidad,
  'Las cantidades automáticas deben bajar al activar solo adultos',
);

localStorage.clear();
inventario.registrarCompra('producto-test', 10, 'Compra de prueba');
inventario.registrarConsumo('producto-test', 3, 'menu', 'Consumo de prueba');
comprobar(
  inventario.obtenerStockActual('producto-test') === 7,
  'Inventario: compra 10 y consumo 3 debe dejar stock 7',
);
inventario.registrarAjusteStock('producto-test', 5);
comprobar(
  inventario.obtenerStockActual('producto-test') === 5,
  'Inventario: el ajuste de stock debe dejar el valor deseado',
);
comprobar(
  inventario.calcularReposicionInventario('producto-test', 8) === 3,
  'Inventario: la reposición debe calcular solo lo que falta',
);

localStorage.clear();
const plan = structuredClone(datosMenu.menuMensualInicial);
const lunes = plan[0].menu.find((dia) => dia.dia === 'Lunes');
lunes.postreComida = 'Fruta';
lunes.postreComidaReceta = 'Plátano';
lunes.detallePostreComida = 'Plátano';
lunes.postreComidaManual = true;

const aplicado = postres.aplicarConfiguracionPostresAlPlan(
  plan,
  {
    comida: ['Manzana'],
    cena: ['Yogur natural'],
  },
  { respetarEdicionesManuales: true },
);
const lunesAplicado = aplicado[0].menu.find((dia) => dia.dia === 'Lunes');
const martesAplicado = aplicado[0].menu.find((dia) => dia.dia === 'Martes');

comprobar(
  lunesAplicado?.postreComidaReceta === 'Plátano',
  'Las excepciones/ediciones manuales de postre deben conservarse',
);
comprobar(
  martesAplicado?.postreComidaReceta === 'Manzana',
  'La configuración automática debe seguir aplicándose a días no manuales',
);

for (const [indice, semana] of datosMenu.menuMensualInicial.entries()) {
  comprobar(semana.menu.length === 7, `Semana ${indice + 1}: deben existir 7 días`);

  const viernes = semana.menu.find((dia) => dia.dia === 'Viernes');
  const domingo = semana.menu.find((dia) => dia.dia === 'Domingo');
  const miercoles = semana.menu.find((dia) => dia.dia === 'Miércoles');

  comprobar(
    viernes?.cena.some((plato) => plato.toLocaleLowerCase('es').includes('pizza')),
    `Semana ${indice + 1}: la pizza debe estar el viernes por la noche`,
  );
  comprobar(
    domingo?.comida.includes('Comemos fuera'),
    `Semana ${indice + 1}: el domingo debe mantener comida fuera`,
  );
  comprobar(
    miercoles?.comida.includes('Ensalada de pasta'),
    `Semana ${indice + 1}: debe mantenerse la ensalada de pasta semanal`,
  );
}

console.log('✓ perfil y raciones responden al número real de comensales');
console.log('✓ el modo solo adultos reduce cantidades automáticas');
console.log('✓ inventario y reposición funcionan con movimientos reales');
console.log('✓ las excepciones manuales de postre se respetan');
console.log('✓ pizza viernes, ensalada de pasta semanal y domingo fuera quedan fijados');
