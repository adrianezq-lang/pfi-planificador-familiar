import { createServer } from 'vite';

class StorageMock {
  data = new Map();
  getItem(clave) { return this.data.get(clave) ?? null; }
  setItem(clave, valor) { this.data.set(clave, String(valor)); }
  removeItem(clave) { this.data.delete(clave); }
}

globalThis.localStorage = new StorageMock();
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class {
  constructor(type) { this.type = type; }
};

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});

const {
  calcularComensales,
  calcularRacionesEquivalentes,
  crearPerfilParaMomento,
  normalizarPerfil,
} = await vite.ssrLoadModule('/src/services/perfil.ts');
const { generarListaCompra } = await vite.ssrLoadModule(
  '/src/services/listaCompra.ts',
);

const perfilMigrado = normalizarPerfil({
  nombre: 'Adrián',
  adultos: 2,
  ninos: 2,
  edadesNinos: [12, 6],
  bebes: 1,
  bebesComenMenu: false,
  supermercado: 'Mercadona',
  presupuesto: 500,
});

const comidaLaborable = crearPerfilParaMomento(
  perfilMigrado,
  'comida',
  'Lunes',
);
const comidaFinSemana = crearPerfilParaMomento(
  perfilMigrado,
  'comida',
  'Sábado',
);
const cena = crearPerfilParaMomento(perfilMigrado, 'cena', 'Lunes');

if (
  calcularComensales(comidaLaborable) !== 3 ||
  JSON.stringify(comidaLaborable.edadesNinos) !== JSON.stringify([12])
) {
  throw new Error('La comida laborable no deja solo a los 2 adultos y al niño de 12 años.');
}

if (calcularRacionesEquivalentes(comidaLaborable) !== 2.85) {
  throw new Error('Las raciones laborables no equivalen a 2,85 adultos.');
}

if (calcularComensales(comidaFinSemana) !== 4 || calcularComensales(cena) !== 4) {
  throw new Error('El fin de semana y las cenas no incluyen a los cuatro comensales.');
}

localStorage.setItem('pfi-perfil', JSON.stringify(perfilMigrado));

function crearDia(dia, comida, cenaDia, postreComida, postreCena) {
  return {
    dia,
    comida,
    cena: cenaDia,
    postreComida: postreComida === 'Sin postre' ? 'Sin postre' : 'Fruta',
    postreCena: postreCena === 'Sin postre' ? 'Sin postre' : 'Fruta',
    postreComidaReceta: postreComida,
    postreCenaReceta: postreCena,
    preparar: '',
  };
}

const compraLaborable = generarListaCompra([
  crearDia(
    'Lunes',
    ['Macarrones boloñesa'],
    [],
    'Manzana',
    'Sin postre',
  ),
]);
const pastaLaborable = compraLaborable.find(
  (ingrediente) => ingrediente.nombre === 'Pasta corta',
);
const manzanasLaborables = compraLaborable.find(
  (ingrediente) => ingrediente.nombre === 'Manzanas',
);

if (pastaLaborable?.cantidad !== 250 || manzanasLaborables?.cantidad !== 3) {
  throw new Error(
    `La compra laborable no usa 3 comensales: pasta=${pastaLaborable?.cantidad}, manzanas=${manzanasLaborables?.cantidad}`,
  );
}

const compraFinSemana = generarListaCompra([
  crearDia(
    'Sábado',
    ['Macarrones boloñesa'],
    [],
    'Manzana',
    'Sin postre',
  ),
]);
const pastaFinSemana = compraFinSemana.find(
  (ingrediente) => ingrediente.nombre === 'Pasta corta',
);
const manzanasFinSemana = compraFinSemana.find(
  (ingrediente) => ingrediente.nombre === 'Manzanas',
);

if (pastaFinSemana?.cantidad !== 300 || manzanasFinSemana?.cantidad !== 4) {
  throw new Error(
    `La compra de fin de semana no usa 4 comensales: pasta=${pastaFinSemana?.cantidad}, manzanas=${manzanasFinSemana?.cantidad}`,
  );
}

await vite.close();

console.log('✓ comida laborable: 2 adultos + niño de 12 años');
console.log('✓ comida de fin de semana y cenas: cuatro comensales');
console.log('✓ la compra ajusta platos y postres al servicio');
