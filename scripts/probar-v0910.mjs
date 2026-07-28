import { recalcularPreparacionesPlan } from '../src/services/menu.ts';
import { aplicarConfiguracionPostresAlPlan } from '../src/services/postres.ts';

const memoria = new Map();
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

function crearDia(dia, comida) {
  return {
    dia,
    comida,
    cena: [],
    postreComida: 'Fruta',
    postreCena: 'Yogur',
    preparar: '',
  };
}

const plan = [
  {
    id: 'semana-1',
    nombre: 'Semana 1',
    menu: dias.map((dia, indice) =>
      crearDia(dia, indice === 0 ? ['Lentejas'] : ['Patatas']),
    ),
  },
  {
    id: 'semana-2',
    nombre: 'Semana 2',
    menu: dias.map((dia, indice) =>
      crearDia(dia, indice === 0 ? ['Alubias rojas'] : ['Patatas']),
    ),
  },
];

const recalculado = recalcularPreparacionesPlan(plan);
if (recalculado[0].menu[6].preparar !== 'Poner alubias a remojo') {
  throw new Error('El domingo no está usando el lunes de la semana siguiente.');
}
console.log('✓ preparar para mañana cruza correctamente de semana');

const postres = aplicarConfiguracionPostresAlPlan(plan, {
  recetas: ['Sandía', 'Plátano', 'Yogur natural'],
});
const semana1 = postres[0].menu;
if (
  semana1[0].postreComidaReceta !== 'Fruta variada' ||
  semana1[0].postreCenaReceta !== 'Sandía'
) {
  throw new Error('La fruta base no se está intercalando con el recetario.');
}
if (
  semana1[1].postreComidaReceta !== 'Plátano' ||
  semana1[1].postreCenaReceta !== 'Yogur natural'
) {
  throw new Error('El yogur base no se está intercalando con el recetario.');
}
if (
  semana1[6].postreComidaReceta !== 'Sin postre' ||
  semana1[6].postreCenaReceta !== 'Sin postre'
) {
  throw new Error('El domingo debe quedar sin postre por defecto.');
}
console.log('✓ la rotación mensual usa recetas de postre y respeta los domingos');
