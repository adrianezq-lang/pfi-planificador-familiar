import assert from 'node:assert/strict';
import { menuMensualInicial } from '../src/data/MenuMensual.ts';
import { recetasVariedadV0924 } from '../src/data/RecetasV0924.ts';

function normalizar(plato) {
  return plato
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function mismaLista(a, b) {
  return a.length === b.length && a.every((plato, indice) => normalizar(plato) === normalizar(b[indice] ?? ''));
}

assert.equal(menuMensualInicial.length, 6, 'Deben existir seis plantillas para meses de seis semanas');

const usos = new Map();
const legumbresLunes = [];
const ensaladasPasta = [];
const serviciosVegetales = new Set();
const cenasPizza = new Set();
const cenasInformales = new Set([
  'Hamburguesas',
  'Perritos calientes',
  'Kebab',
  'Nachos gratinados con carne',
  'Tortilla de patata con ensalada',
  'Pollo especiado al horno con patatas',
]);
let aparicionesFajitas = 0;
let aparicionesKebab = 0;

menuMensualInicial.forEach((semana, indiceSemana) => {
  const lunes = semana.menu.find((dia) => dia.dia === 'Lunes');
  const comidaLunes = lunes?.comida ?? [];
  legumbresLunes.push(comidaLunes.map(normalizar).join(' + '));

  const ensaladas = semana.menu
    .flatMap((dia) => dia.comida)
    .filter((plato) => /^Ensalada de pasta/.test(plato));
  assert.equal(ensaladas.length, 1, `Semana ${indiceSemana + 1}: debe haber una ensalada de pasta`);
  ensaladasPasta.push(ensaladas[0]);

  const viernes = semana.menu.find((dia) => dia.dia === 'Viernes');
  assert.equal(viernes?.cena.length, 2, `Semana ${indiceSemana + 1}: faltan las dos pizzas del viernes`);
  assert.ok(viernes?.cena.every((plato) => normalizar(plato).includes('pizza')));
  cenasPizza.add(viernes?.cena.map(normalizar).join(' + '));

  const sabado = semana.menu.find((dia) => dia.dia === 'Sábado');
  assert.ok(
    sabado?.cena.length === 1 && cenasInformales.has(sabado.cena[0]),
    `Semana ${indiceSemana + 1}: el sábado debe mantener una cena informal distinta`,
  );

  semana.menu.forEach((dia) => {
    aparicionesFajitas += [...dia.comida, ...dia.cena].filter((plato) => plato === 'Fajitas').length;
    aparicionesKebab += [...dia.comida, ...dia.cena].filter((plato) => plato === 'Kebab').length;

    for (const [momento, platos] of [['comida', dia.comida], ['cena', dia.cena]]) {
      const texto = platos.map(normalizar).join(' + ');
      if (/vaina|menestra|verdura|calabacin|calabaza/.test(texto)) {
        serviciosVegetales.add(texto);
      }

      if (dia.dia === 'Jueves' && momento === 'comida' && mismaLista(platos, comidaLunes)) continue;

      for (const plato of platos) {
        const clave = normalizar(plato);
        if (clave === 'comemos fuera' || clave === 'cola cao y galletas') continue;
        if (dia.dia === 'Viernes' && momento === 'cena' && clave.includes('pizza')) continue;

        const anterior = usos.get(clave);
        assert.ok(
          anterior === undefined || anterior === indiceSemana,
          `Plato repetido entre semanas ${anterior + 1} y ${indiceSemana + 1}: ${plato}`,
        );
        usos.set(clave, indiceSemana);
      }
    }
  });
});

assert.equal(new Set(legumbresLunes).size, menuMensualInicial.length, 'La legumbre principal debe cambiar cada semana');
assert.equal(new Set(ensaladasPasta).size, menuMensualInicial.length, 'La ensalada de pasta debe cambiar cada semana');
assert.equal(cenasPizza.size, menuMensualInicial.length, 'La pareja de pizzas debe cambiar cada semana');
assert.ok(serviciosVegetales.size >= 12, 'Faltan servicios de verduras realmente distintos');
assert.equal(aparicionesFajitas, 1, 'La plantilla mensual debe tener una sola noche de fajitas');
assert.equal(aparicionesKebab, 1, 'La plantilla mensual no debe repetir kebab');

const textoMenu = menuMensualInicial
  .flatMap((semana) => semana.menu)
  .flatMap((dia) => [...dia.comida, ...dia.cena])
  .join(' ')
  .toLocaleLowerCase('es');
assert.match(textoMenu, /vainas con patata/);
assert.match(textoMenu, /vainas con tomate/);
assert.match(textoMenu, /menestra de verduras/);
assert.match(textoMenu, /verduras al horno/);
for (const prohibido of ['brócoli', 'maíz', 'champiñón', 'merluza']) {
  assert.equal(textoMenu.includes(prohibido), false, `Aparece un alimento excluido: ${prohibido}`);
}

const ingredientesNuevos = recetasVariedadV0924.flatMap((receta) => receta.ingredientes);
assert.ok(ingredientesNuevos.filter((ingrediente) => ingrediente.nombre === 'Pimiento rojo').length >= 8);
assert.ok(ingredientesNuevos.filter((ingrediente) => ingrediente.nombre === 'Pimiento tricolor').length >= 3);

console.log('✓ seis semanas distintas cubren cualquier mes real');
console.log('✓ ningún plato se repite entre semanas salvo batch, pizza y domingo');
console.log('✓ cada semana cambia la legumbre, la ensalada de pasta y la cena informal');
console.log('✓ se incorporan dos platos de vainas, menestra y más verduras');
console.log('✓ el pimiento rojo y tricolor se conserva y amplía en el recetario');
console.log('✓ una sola noche de fajitas y una de kebab evitan compras duplicadas');
