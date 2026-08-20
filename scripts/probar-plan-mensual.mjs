class StorageMock {
  data = new Map();
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

globalThis.localStorage = new StorageMock();
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };

const datos = await import(
  new URL('../src/data/MenuMensual.ts', import.meta.url).href
);
const planificador = await import(
  new URL('../src/services/planMensual.ts', import.meta.url).href
);

const plan = planificador.copiarPlanMensual(datos.menuMensualInicial);
if (plan.length !== 4 || plan.some((semana) => semana.menu.length !== 7)) {
  throw new Error('El plan mensual no contiene cuatro semanas completas');
}

plan.forEach((semana, indice) => {
  const equilibrio = planificador.calcularEquilibrioSemana(semana.menu);
  if (equilibrio.puntuacion < 90) {
    throw new Error(
      `La semana ${indice + 1} no alcanza el equilibrio mínimo: ${equilibrio.puntuacion}%`,
    );
  }

  const viernes = semana.menu.find((dia) => dia.dia === 'Viernes');
  const sabado = semana.menu.find((dia) => dia.dia === 'Sábado');
  const domingo = semana.menu.find((dia) => dia.dia === 'Domingo');
  const miercoles = semana.menu.find((dia) => dia.dia === 'Miércoles');
  const cenasSabado = new Set(['Hamburguesas', 'Perritos calientes', 'Kebab']);

  if (!viernes?.cena.some((plato) => plato.toLocaleLowerCase('es').includes('pizza'))) {
    throw new Error(`La semana ${indice + 1} no mantiene pizza el viernes`);
  }
  if (!sabado?.cena.some((plato) => cenasSabado.has(plato))) {
    throw new Error(`La semana ${indice + 1} no mantiene la rotación del sábado`);
  }
  if (!domingo?.comida.includes('Comemos fuera')) {
    throw new Error(`La semana ${indice + 1} no mantiene la comida fuera del domingo`);
  }
  if (!miercoles?.comida.includes('Ensalada de pasta')) {
    throw new Error(`La semana ${indice + 1} no mantiene la ensalada de pasta semanal`);
  }

  semana.menu.forEach((dia, indiceDia) => {
    const postresValidos = new Set(['Fruta', 'Yogur', 'Sin postre']);
    if (
      !postresValidos.has(dia.postreComida) ||
      !postresValidos.has(dia.postreCena)
    ) {
      throw new Error(`La semana ${indice + 1} tiene postres no válidos`);
    }
    if (dia.dia === 'Domingo') {
      if (dia.postreComida !== 'Sin postre' || dia.postreCena !== 'Sin postre') {
        throw new Error(
          `La semana ${indice + 1} no deja el domingo sin postre por defecto`,
        );
      }
    } else if (dia.postreComida === dia.postreCena) {
      throw new Error(
        `La semana ${indice + 1}, día ${indiceDia + 1}, no diferencia los postres de comida y cena`,
      );
    }
  });
});

console.log('✓ cuatro semanas completas y equilibradas');
console.log('✓ pizza fijada el viernes y rotación de sábado separada');
console.log('✓ ensalada de pasta semanal y comida fuera del domingo');
console.log('✓ postres diferenciados y domingo sin postre');
