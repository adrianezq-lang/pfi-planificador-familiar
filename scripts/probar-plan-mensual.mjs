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
  const domingo = semana.menu.find((dia) => dia.dia === 'Domingo');
  const cenasViernes = new Set(['Hamburguesas', 'Perritos calientes', 'Kebab']);
  if (!viernes?.cena.some((plato) => cenasViernes.has(plato))) {
    throw new Error(`La semana ${indice + 1} no mantiene la rotación del viernes`);
  }
  if (!domingo?.comida.includes('Comemos fuera')) {
    throw new Error(`La semana ${indice + 1} no mantiene la comida fuera del domingo`);
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

console.log('✓ cuatro semanas completas');
console.log('✓ todas las semanas superan el 90% de equilibrio');
console.log('✓ viernes con hamburguesa, perritos o kebab y comida fuera del domingo');
console.log('✓ comida y cena mantienen postres diferenciados y el domingo queda sin postre');
