import { aplicarConfiguracionPostresAlPlan } from '../src/services/postres.ts';
import {
  obtenerSeccionCompra,
  ORDEN_SECCIONES_COMPRA,
} from '../src/services/categoriasCompra.ts';

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

const plan = [{
  id: 'semana-1',
  nombre: 'Semana 1',
  menu: dias.map(crearDia),
}];

const resultado = aplicarConfiguracionPostresAlPlan(plan, {
  recetas: ['Tarta de queso', 'Flan', 'Arroz con leche'],
});
const semana = resultado[0].menu;

const esperados = [
  ['Tarta de queso', 'Sin postre'],
  ['Flan', 'Sin postre'],
  ['Arroz con leche', 'Sin postre'],
  ['Tarta de queso', 'Sin postre'],
  ['Flan', 'Sin postre'],
  ['Arroz con leche', 'Sin postre'],
  ['Sin postre', 'Sin postre'],
];

esperados.forEach(([comida, cena], indice) => {
  if (
    semana[indice].postreComidaReceta !== comida ||
    semana[indice].postreCenaReceta !== cena
  ) {
    throw new Error(
      `${dias[indice]} no respeta la alternancia: ${semana[indice].postreComidaReceta} / ${semana[indice].postreCenaReceta}.`,
    );
  }
});

const domingoEditado = [{
  ...plan[0],
  menu: plan[0].menu.map((dia) =>
    dia.dia === 'Domingo'
      ? {
          ...dia,
          postreCenaReceta: 'Tarta de queso',
          postreCenaManual: true,
        }
      : dia,
  ),
}];
const conservado = aplicarConfiguracionPostresAlPlan(
  domingoEditado,
  { recetas: ['Tarta de queso'] },
  { respetarEdicionesManuales: true },
);
if (conservado[0].menu[6].postreCenaReceta !== 'Tarta de queso') {
  throw new Error('La edición puntual del domingo no se ha conservado.');
}

function linea(seccion, nombre, seccionIngrediente = 'Despensa') {
  return {
    ingrediente: {
      nombre,
      cantidad: 1,
      unidad: 'ud',
      seccion: seccionIngrediente,
    },
    producto: {
      seccion,
      subcategoria: '',
      nombre,
    },
  };
}

const categorias = [
  [linea('Fruta y verdura', 'Plátano'), 'Fruta y Verdura'],
  [linea('Charcutería y quesos', 'Jamón cocido'), 'Charcutería y Quesos'],
  [linea('Carne', 'Pechuga de pollo'), 'Carnicería'],
  [linea('Marisco y pescado', 'Salmón'), 'Pescadería'],
  [linea('Huevos, leche y mantequilla', 'Leche'), 'Lácteos y Huevos'],
];

categorias.forEach(([entrada, esperada]) => {
  const obtenida = obtenerSeccionCompra(entrada);
  if (obtenida !== esperada) {
    throw new Error(`Categoría incorrecta: ${obtenida}; se esperaba ${esperada}.`);
  }
});

if (ORDEN_SECCIONES_COMPRA[0] !== 'Fruta y Verdura') {
  throw new Error('Fruta y Verdura debe ser la primera sección de compra.');
}


console.log('✓ configuración antigua migrada sin inventar fruta ni yogur');
console.log('✓ domingos editables sin perder la excepción manual');
console.log('✓ compra agrupada y ordenada por categorías reales');
