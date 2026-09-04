import { createServer } from 'vite';

class StorageMock {
  data = new Map();
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

globalThis.localStorage = new StorageMock();
globalThis.window = { dispatchEvent() {} };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});
const datos = await vite.ssrLoadModule('/src/data/MenuMensual.ts');
const planificador = await vite.ssrLoadModule('/src/services/planMensual.ts');

const plan = planificador.copiarPlanMensual(datos.menuMensualInicial);
if (
  plan.length !== datos.menuMensualInicial.length ||
  plan.some((semana) => semana.menu.length !== 7)
) {
  throw new Error('El plan mensual no conserva todas sus semanas completas');
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
  const pizzasViernes = new Set(['Pizza jamón y queso', 'Pizza BBQ', 'Pizza 4 quesos']);
  const cenasInformales = new Set(['Hamburguesas', 'Perritos calientes', 'Kebab']);
  if (
    !viernes ||
    viernes.cena.length !== 2 ||
    !viernes.cena.every((plato) => pizzasViernes.has(plato))
  ) {
    throw new Error(`La semana ${indice + 1} no mantiene las pizzas del viernes`);
  }
  if (!sabado?.cena.some((plato) => cenasInformales.has(plato))) {
    throw new Error(`La semana ${indice + 1} no mantiene la rotación informal del sábado`);
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

console.log(`✓ ${plan.length} semanas completas`);
console.log('✓ todas las semanas superan el 90% de equilibrio');
console.log('✓ pizza el viernes, cena informal el sábado y comida fuera el domingo');
console.log('✓ comida y cena mantienen postres diferenciados y el domingo queda sin postre');

await vite.close();
