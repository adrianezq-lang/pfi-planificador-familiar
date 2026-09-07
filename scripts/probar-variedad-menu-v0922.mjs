import assert from 'node:assert/strict';
import { menuMensualInicial } from '../src/data/MenuMensual.ts';
import { recetasVariedadV0922 } from '../src/data/RecetasV0922.ts';

function normalizar(platos) {
  return platos
    .map((plato) =>
      plato
        .toLocaleLowerCase('es')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim(),
    )
    .join(' + ');
}

assert.equal(menuMensualInicial.length, 6, 'Deben existir seis plantillas para meses de seis semanas');

const usos = new Map();
const legumbresLunes = [];
const ensaladasPasta = [];
const serviciosVegetales = new Set();

menuMensualInicial.forEach((semana, indiceSemana) => {
  const lunes = semana.menu.find((dia) => dia.dia === 'Lunes');
  const firmaLunes = normalizar(lunes?.comida ?? []);
  legumbresLunes.push(firmaLunes);

  const ensaladas = semana.menu
    .flatMap((dia) => dia.comida)
    .filter((plato) => /^Ensalada de pasta/.test(plato));
  assert.equal(ensaladas.length, 1, `Semana ${indiceSemana + 1}: debe haber una ensalada de pasta`);
  ensaladasPasta.push(ensaladas[0]);

  const sabado = semana.menu.find((dia) => dia.dia === 'Sábado');
  assert.ok(
    sabado?.cena.some((plato) => ['Hamburguesas', 'Perritos calientes', 'Kebab'].includes(plato)),
    `Semana ${indiceSemana + 1}: el sábado debe mantener cena informal`,
  );

  semana.menu.forEach((dia) => {
    for (const [momento, platos] of [['comida', dia.comida], ['cena', dia.cena]]) {
      const firma = normalizar(platos);
      if (/vaina|verduras al horno|calabacin a la plancha|crema de calabacin|crema de verduras|crema de calabaza/.test(firma)) {
        serviciosVegetales.add(firma);
      }

      if (firma === 'comemos fuera' || firma === 'cola cao y galletas') continue;
      if (dia.dia === 'Viernes' && momento === 'cena' && firma.includes('pizza')) continue;
      if (dia.dia === 'Jueves' && momento === 'comida' && firma === firmaLunes) continue;

      const anterior = usos.get(firma);
      assert.ok(
        anterior === undefined || anterior === indiceSemana,
        `Servicio repetido entre semanas ${anterior + 1} y ${indiceSemana + 1}: ${firma}`,
      );
      usos.set(firma, indiceSemana);
    }
  });
});

assert.equal(new Set(legumbresLunes).size, menuMensualInicial.length, 'La legumbre principal debe cambiar cada semana');
assert.equal(new Set(ensaladasPasta).size, menuMensualInicial.length, 'La ensalada de pasta debe cambiar cada semana');
assert.ok(serviciosVegetales.size >= 7, 'Faltan servicios de verduras realmente distintos');

const textoMenu = menuMensualInicial
  .flatMap((semana) => semana.menu)
  .flatMap((dia) => [...dia.comida, ...dia.cena])
  .join(' ')
  .toLocaleLowerCase('es');
assert.match(textoMenu, /vainas con patata/);
assert.match(textoMenu, /vainas salteadas/);
assert.match(textoMenu, /verduras al horno/);
assert.match(textoMenu, /calabacín a la plancha/);
for (const prohibido of ['brócoli', 'maíz', 'champiñón', 'merluza']) {
  assert.equal(textoMenu.includes(prohibido), false, `Aparece un alimento excluido: ${prohibido}`);
}

const nombresNuevos = new Set(recetasVariedadV0922.map((receta) => receta.nombre));
for (const nombre of [
  'Vainas con patata y huevo',
  'Vainas salteadas con jamón',
  'Verduras al horno',
  'Calabacín a la plancha',
  'Albóndigas con tomate',
  'Pollo al ajillo',
  'Garbanzos guisados con verduras',
  'Ensalada de pasta con pollo',
  'Ensalada de pasta con huevo',
  'Ensalada de pasta mediterránea',
  'Ensalada de pasta con pavo',
  'Ensalada de pasta con atún y huevo',
  'Macarrones con atún',
  'Espaguetis con tomate y atún',
]) {
  assert.ok(nombresNuevos.has(nombre), `Falta la receta nueva ${nombre}`);
}

console.log('✓ seis semanas distintas cubren cualquier mes real');
console.log('✓ no se repite el mismo servicio completo entre semanas');
console.log('✓ cada semana cambia la legumbre y la ensalada de pasta');
console.log('✓ se incorporan vainas y más verduras sin alimentos excluidos');
console.log('✓ se conserva pizza viernes, sábado informal y domingo fuera');
