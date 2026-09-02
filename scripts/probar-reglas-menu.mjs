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
if (platosCompra.filter((plato) => plato === 'Lentejas').length !== 2) {
  throw new Error('La compra no está contando las dos comidas de la olla de legumbres.');
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
console.log('✓ la compra cuenta ingredientes para las dos comidas de legumbres');
console.log('✓ no se repite la misma pasta en semanas consecutivas');
console.log('✓ la ensalada de pasta semanal se conserva en verano');
