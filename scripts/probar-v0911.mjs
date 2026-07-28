import { aplicarConfiguracionPostresAlPlan } from '../src/services/postres.ts';

const memoria = new Map();
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
globalThis.localStorage = {
  getItem(clave) {
    return memoria.get(clave) ?? null;
  },
  setItem(clave, valor) {
    memoria.set(clave, String(valor));
  },
  removeItem(clave) {
    memoria.delete(clave);
  },
};

const dias = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

function crearDia(dia) {
  return {
    dia,
    comida: ['Plato'],
    cena: ['Cena'],
    postreComida: 'Fruta',
    postreCena: 'Yogur',
    preparar: '',
  };
}

const plan = [1, 2].map((numero) => ({
  id: `semana-${numero}`,
  nombre: `Semana ${numero}`,
  menu: dias.map(crearDia),
}));

const resultado = aplicarConfiguracionPostresAlPlan(plan, {
  recetas: ['Tarta de queso', 'Arroz con leche', 'Flan'],
});

function comprobar(valor, esperado, mensaje) {
  if (valor !== esperado) {
    throw new Error(`${mensaje}: se obtuvo «${valor}» y se esperaba «${esperado}».`);
  }
}

const semana1 = resultado[0].menu;
comprobar(semana1[0].postreComidaReceta, 'Fruta variada', 'El lunes al mediodía debe llevar fruta');
comprobar(semana1[0].postreCenaReceta, 'Tarta de queso', 'El lunes por la noche debe llevar yogur');
comprobar(semana1[1].postreComidaReceta, 'Arroz con leche', 'El martes debe continuar la rotación del recetario');
comprobar(semana1[1].postreCenaReceta, 'Yogur natural', 'La cena del martes debe volver al yogur base');
comprobar(semana1[2].postreComidaReceta, 'Fruta variada', 'El miércoles debe volver a la fruta base');
comprobar(semana1[2].postreCenaReceta, 'Flan', 'El miércoles por la noche debe usar el siguiente postre del recetario');
comprobar(semana1[6].postreComidaReceta, 'Sin postre', 'El domingo debe quedar sin postre en la comida');
comprobar(semana1[6].postreCenaReceta, 'Sin postre', 'El domingo debe quedar sin postre en la cena');

const semana2 = resultado[1].menu;
comprobar(semana2[0].postreComidaReceta, 'Fruta variada', 'Cada semana debe empezar con fruta en la comida');
comprobar(semana2[0].postreCenaReceta, 'Tarta de queso', 'Cada semana debe intercalar el recetario en la cena del lunes');

console.log('✓ fruta/yogur alternan con los postres del recetario');
console.log('✓ los domingos quedan sin postre por defecto');
console.log('✓ la alternancia semanal se reinicia correctamente');

const { readFile } = await import('node:fs/promises');
const catalogoPrueba = JSON.parse(
  await readFile(new URL('../public/catalogo-mercadona.json', import.meta.url), 'utf8'),
);
const productoPrueba = catalogoPrueba.productos[0];
if (!productoPrueba?.productoId) {
  throw new Error('El catálogo de prueba no contiene productos válidos.');
}

globalThis.fetch = async () => ({
  ok: true,
  async json() {
    return catalogoPrueba;
  },
});

localStorage.setItem(
  'pfi-asociaciones-ingredientes-mercadona',
  JSON.stringify({ 'Ingrediente de prueba': String(productoPrueba.productoId) }),
);

const despensa = await import('../src/services/despensa.ts');
const añadidos = await despensa.sincronizarProductosRecetasConDespensa([
  {
    nombre: 'Receta de prueba',
    categoria: 'Otros',
    tipo: 'plato',
    ingredientes: [
      {
        nombre: 'Ingrediente de prueba',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Despensa',
        ajusteAutomatico: false,
      },
    ],
  },
]);

if (añadidos !== 1) {
  throw new Error(`La sincronización debía añadir 1 producto y añadió ${añadidos}.`);
}
if (
  !despensa
    .cargarDespensa()
    .some((producto) => producto.productoId === String(productoPrueba.productoId))
) {
  throw new Error('El producto asociado a la receta no llegó a la despensa.');
}
const repetidos = await despensa.sincronizarProductosRecetasConDespensa([
  {
    nombre: 'Receta de prueba',
    categoria: 'Otros',
    tipo: 'plato',
    ingredientes: [
      {
        nombre: 'Ingrediente de prueba',
        cantidad: 1,
        unidad: 'ud',
        seccion: 'Despensa',
        ajusteAutomatico: false,
      },
    ],
  },
]);
if (repetidos !== 0) {
  throw new Error('La sincronización está duplicando productos de despensa.');
}
console.log('✓ los productos asociados a recetas pasan a la despensa sin duplicados');

