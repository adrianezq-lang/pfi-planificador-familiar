import { menuMensualInicial } from '../src/data/MenuMensual.ts';
import {
  aplicarReglaGarbanzosFritos,
  aplicarRepeticionLegumbres,
  aplicarVariedadPastas,
  esLegumbreDeOlla,
  listarPlatosParaCompra,
} from '../src/services/reglasMenuMensual.ts';

const normalizar = (texto) => texto
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

const esPasta = (plato) =>
  /\b(pasta|macarrones?|carbonara|espaguetis?|tallarines?|lasanas?|canelones?)\b/.test(normalizar(plato));

const plan = aplicarVariedadPastas(
  aplicarRepeticionLegumbres(
    aplicarReglaGarbanzosFritos(structuredClone(menuMensualInicial)),
  ),
  true,
);
let pastasSemanaAnterior = new Set();

plan.forEach((semana, indice) => {
  const lunes = semana.menu.find((dia) => dia.dia === 'Lunes');
  const jueves = semana.menu.find((dia) => dia.dia === 'Jueves');
  const lunesEsOlla = lunes?.comida.some(esLegumbreDeOlla) === true;
  const lunesTieneFritos = lunes?.comida.includes('Garbanzos fritos') === true;

  if (lunesEsOlla && JSON.stringify(lunes?.comida) !== JSON.stringify(jueves?.comida)) {
    throw new Error(`La semana ${indice + 1} no reutiliza el jueves la olla del lunes.`);
  }
  if (lunesTieneFritos && jueves?.comida.includes('Garbanzos fritos')) {
    throw new Error(`La semana ${indice + 1} repite indebidamente garbanzos fritos el jueves.`);
  }

  const pastas = semana.menu
    .flatMap((dia) => [...dia.comida, ...dia.cena])
    .filter(esPasta)
    .map(normalizar);
  if (new Set(pastas).size !== pastas.length) {
    throw new Error(`La semana ${indice + 1} repite una pasta.`);
  }
  if (pastas.some((pasta) => pastasSemanaAnterior.has(pasta))) {
    throw new Error(`Las semanas ${indice} y ${indice + 1} repiten una pasta.`);
  }
  pastasSemanaAnterior = new Set(pastas);
});

const compraLentejas = listarPlatosParaCompra(plan[0].menu, esLegumbreDeOlla);
if (compraLentejas.filter((plato) => plato === 'Lentejas').length !== 1) {
  throw new Error('La olla de lentejas debe entrar una sola vez en la compra semanal.');
}

const repeticionManualFritos = structuredClone(plan[3].menu);
for (const dia of repeticionManualFritos) {
  if (dia.dia === 'Jueves') dia.comida = ['Garbanzos fritos', 'Arroz blanco'];
}
const compraFritos = listarPlatosParaCompra(repeticionManualFritos, esLegumbreDeOlla);
if (compraFritos.filter((plato) => plato === 'Garbanzos fritos').length !== 2) {
  throw new Error('Garbanzos fritos repetidos manualmente deben contar dos consumos, no una olla.');
}

const repeticionEntreSemanas = structuredClone(plan.slice(0, 2));
for (const dia of repeticionEntreSemanas[1].menu) {
  if (dia.dia === 'Lunes' || dia.dia === 'Jueves') dia.comida = ['Lentejas'];
}
const compraRepetida = listarPlatosParaCompra(
  repeticionEntreSemanas.flatMap((semana) => semana.menu),
  esLegumbreDeOlla,
);
if (compraRepetida.filter((plato) => plato === 'Lentejas').length !== 2) {
  throw new Error('Una olla nueva en otra semana debe volver a entrar en la compra mensual.');
}

const verano = structuredClone(menuMensualInicial);
verano.forEach((semana) => {
  const miercoles = semana.menu.find((dia) => dia.dia === 'Miércoles');
  if (miercoles) miercoles.comida = ['Ensalada de pasta'];
});
const veranoAjustado = aplicarVariedadPastas(verano, true);
if (veranoAjustado.some((semana) =>
  semana.menu.flatMap((dia) => dia.comida).filter((plato) => plato === 'Ensalada de pasta').length !== 1
)) {
  throw new Error('La regla de variedad ha eliminado la ensalada semanal de verano.');
}

console.log('✓ solo las ollas reales del lunes se reutilizan el jueves');
console.log('✓ los garbanzos fritos no se repiten automáticamente');
console.log('✓ si se añaden manualmente dos veces, la compra cuenta ambos consumos');
console.log('✓ cada semana nueva vuelve a comprar su propia olla');
console.log('✓ no se repite la misma pasta en semanas consecutivas');
console.log('✓ la ensalada de pasta semanal se conserva');
