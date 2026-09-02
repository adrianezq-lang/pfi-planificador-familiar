import { menuMensualInicial } from '../src/data/MenuMensual.ts';
import {
  aplicarRepeticionLegumbres,
  aplicarVariedadPastas,
  listarPlatosParaCompra,
} from '../src/services/reglasMenuMensual.ts';

const normalizar = (texto) => texto
  .toLocaleLowerCase('es')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

const esPasta = (plato) =>
  /\b(pasta|macarrones?|carbonara|espaguetis?|tallarines?|lasanas?|canelones?)\b/.test(
    normalizar(plato),
  );

const esLegumbre = (plato) =>
  /\b(lenteja|garbanzo|alubia|cocido)\b/.test(normalizar(plato));

const plan = aplicarVariedadPastas(
  aplicarRepeticionLegumbres(menuMensualInicial),
);
let pastasSemanaAnterior = new Set();

plan.forEach((semana, indice) => {
  const lunes = semana.menu.find((dia) => dia.dia === 'Lunes');
  const jueves = semana.menu.find((dia) => dia.dia === 'Jueves');
  if (JSON.stringify(lunes?.comida) !== JSON.stringify(jueves?.comida)) {
    throw new Error(`La semana ${indice + 1} no repite el jueves las legumbres del lunes.`);
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

const primeraSemana = plan[0].menu;
const platosCompra = listarPlatosParaCompra(
  primeraSemana,
  (plato) => plato === 'Lentejas',
);
if (platosCompra.filter((plato) => plato === 'Lentejas').length !== 1) {
  throw new Error('La olla de lentejas debe entrar una sola vez en la compra semanal.');
}

const semanaGarbanzos = plan[3].menu;
const compraGarbanzos = listarPlatosParaCompra(
  semanaGarbanzos,
  (plato) => plato === 'Garbanzos fritos',
);
if (compraGarbanzos.filter((plato) => plato === 'Garbanzos fritos').length !== 1) {
  throw new Error('Los garbanzos preparados para lunes y jueves deben comprarse una sola vez.');
}
const arrocesMenu = semanaGarbanzos
  .flatMap((dia) => [...dia.comida, ...dia.cena])
  .filter((plato) => plato === 'Arroz blanco').length;
const arrocesCompra = compraGarbanzos.filter((plato) => plato === 'Arroz blanco').length;
if (arrocesCompra !== arrocesMenu) {
  throw new Error(
    `Los acompañamientos independientes no deben deduplicarse: arroz compra=${arrocesCompra}, menú=${arrocesMenu}.`,
  );
}

// La compra mensual concatena todas las semanas. Alubias rojas aparece como
// olla en Semana 3 y vuelve a aparecer como otra olla independiente en Semana 5.
// Deben contarse DOS preparaciones, aunque cada una se repita lunes + jueves.
const compraMes = listarPlatosParaCompra(
  plan.flatMap((semana) => semana.menu),
  esLegumbre,
);
const alubiasRojasMes = compraMes.filter((plato) => plato === 'Alubias rojas').length;
if (alubiasRojasMes !== 2) {
  throw new Error(
    `La compra mensual debe contar una olla de alubias por semana: obtuvo ${alubiasRojasMes}, esperaba 2.`,
  );
}
const ollasEsperadas = plan.reduce((total, semana) => {
  const lunes = semana.menu.find((dia) => dia.dia === 'Lunes');
  return total + (lunes?.comida.some(esLegumbre) ? 1 : 0);
}, 0);
const ollasCompraMes = compraMes.filter(esLegumbre).length;
if (ollasCompraMes !== ollasEsperadas) {
  throw new Error(
    `La compra mensual perdió o duplicó ollas entre semanas: compra=${ollasCompraMes}, semanas=${ollasEsperadas}.`,
  );
}

const verano = structuredClone(menuMensualInicial);
verano.forEach((semana) => {
  const miercoles = semana.menu.find((dia) => dia.dia === 'Miércoles');
  if (miercoles) miercoles.comida = ['Ensalada de pasta'];
});
const veranoAjustado = aplicarVariedadPastas(verano, true);
if (
  veranoAjustado.some(
    (semana) =>
      semana.menu.flatMap((dia) => dia.comida).filter((plato) => plato === 'Ensalada de pasta')
        .length !== 1,
  )
) {
  throw new Error('La regla de variedad ha eliminado la ensalada semanal de verano.');
}

console.log('✓ las legumbres del lunes se repiten el jueves');
console.log('✓ la olla de legumbres entra una sola vez dentro de su semana');
console.log('✓ la misma legumbre en otra semana vuelve a contar en la compra mensual');
console.log('✓ los acompañamientos independientes conservan todas sus apariciones');
console.log('✓ no se repite la misma pasta en semanas consecutivas');
console.log('✓ la ensalada de pasta semanal se conserva en verano');
