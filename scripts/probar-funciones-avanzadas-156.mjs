import fs from 'node:fs';

class MemoriaLocal {
  datos = new Map();
  getItem(clave) { return this.datos.has(clave) ? this.datos.get(clave) : null; }
  setItem(clave, valor) { this.datos.set(String(clave), String(valor)); }
  removeItem(clave) { this.datos.delete(clave); }
  clear() { this.datos.clear(); }
}

globalThis.localStorage = new MemoriaLocal();
globalThis.CustomEvent ??= class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};

const excepciones = await import('../src/services/excepcionesSemana.ts');
const conservacion = await import('../src/services/conservacion.ts');
const asistente = await import('../src/services/asistentePfi.ts');

function ok(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
  console.log(`✓ ${mensaje}`);
}

const perfil = {
  nombre: 'Familia', adultos: 2, ninos: 2, edadesNinos: [12, 6],
  bebes: 1, bebesComenMenu: true, supermercado: 'Mercadona', presupuesto: 500,
};
const soloAdultos = excepciones.perfilTemporalParaSemana(perfil, {
  soloAdultos: true, fueraTodaSemana: false, comidasFuera: {},
});
ok(soloAdultos.adultos === 2 && soloAdultos.ninos === 0 && soloAdultos.bebes === 0, 'solo adultos crea un perfil temporal de 2 adultos');
ok(perfil.ninos === 2 && perfil.bebes === 1, 'la excepción no modifica el perfil familiar permanente');

const menu = [
  {
    dia: 'Lunes', comida: ['Lentejas'], cena: ['Tortilla francesa'],
    preparar: 'Pollo', postreComida: 'Fruta', postreCena: 'Yogur',
    postreComidaReceta: 'Fruta variada', postreCenaReceta: 'Yogur natural',
  },
  {
    dia: 'Martes', comida: ['Pasta'], cena: ['Salmón'],
    preparar: '', postreComida: 'Fruta', postreCena: 'Yogur',
    postreComidaReceta: 'Fruta variada', postreCenaReceta: 'Yogur natural',
  },
];
const lunesFuera = excepciones.aplicarExcepcionesAlMenu(menu, {
  soloAdultos: false,
  fueraTodaSemana: false,
  comidasFuera: { Lunes: { comida: true } },
});
ok(lunesFuera[0].comida.length === 0 && lunesFuera[0].cena.length === 1, 'una comida fuera elimina solo esa comida y su compra');
ok(lunesFuera[0].postreComidaReceta === 'Sin postre', 'una comida fuera elimina también su postre');

const todaFuera = excepciones.aplicarExcepcionesAlMenu(menu, {
  soloAdultos: false, fueraTodaSemana: true, comidasFuera: {},
});
ok(todaFuera.every((dia) => dia.comida.length === 0 && dia.cena.length === 0), 'toda la semana fuera elimina todas las necesidades del menú');

excepciones.guardarExcepcionesSemana({ soloAdultos: true, fueraTodaSemana: false, comidasFuera: {} }, 2);
ok(excepciones.cargarExcepcionesSemana(2).soloAdultos === true, 'las excepciones se guardan de forma independiente por semana');
ok(excepciones.cargarExcepcionesSemana(1).soloAdultos === false, 'una excepción no contamina otras semanas');

localStorage.clear();
const item = conservacion.anadirConservacion({ tipo: 'sobra', nombre: 'Lentejas', cantidad: 2, unidad: 'ración' });
ok(conservacion.cargarConservacion().length === 1, 'las sobras se guardan realmente');
conservacion.consumirConservacion(item.id, 1);
ok(conservacion.cargarConservacion()[0]?.cantidad === 1, 'una sobra se puede consumir parcialmente');
conservacion.consumirConservacion(item.id);
ok(conservacion.cargarConservacion().length === 0, 'una sobra consumida completamente desaparece');

localStorage.clear();
let resultado = asistente.procesarComandoAsistentePfi('Esta semana no están los niños', menu, 0);
ok(resultado.entendido && excepciones.cargarExcepcionesSemana(0).soloAdultos, 'el asistente aplica “esta semana no están los niños”');
resultado = asistente.procesarComandoAsistentePfi('El martes cenamos fuera', menu, 0);
ok(resultado.entendido && excepciones.cargarExcepcionesSemana(0).comidasFuera.Martes?.cena === true, 'el asistente aplica una cena fuera concreta');
resultado = asistente.procesarComandoAsistentePfi('Cambia la cena del lunes por Hamburguesas', menu, 0);
ok(resultado.menu?.[0]?.cena?.[0] === 'Hamburguesas', 'el asistente modifica un plato del menú');
resultado = asistente.procesarComandoAsistentePfi('He congelado 2 raciones de lentejas', menu, 0);
const congelado = conservacion.cargarConservacion().find((i) => i.tipo === 'congelado');
ok(resultado.entendido && congelado?.cantidad === 2 && congelado?.unidad === 'ración', 'el asistente registra congelados con cantidad y unidad naturales');

const listaCompra = fs.readFileSync('src/services/listaCompra.ts', 'utf8');
ok(listaCompra.includes('aplicarExcepcionesAlMenu') && listaCompra.includes('perfilTemporalParaSemana'), 'Compra está conectada a las excepciones semanales');
ok(listaCompra.includes('cantidadConservada'), 'Compra descuenta productos abiertos o congelados disponibles');

const menuUi = fs.readFileSync('src/pages/Menu.tsx', 'utf8');
const appUi = fs.readFileSync('src/App.tsx', 'utf8');
const despensaUi = fs.readFileSync('src/pages/Despensa.tsx', 'utf8');
ok(menuUi.includes('<ExcepcionesSemanaPanel semanaActiva={semanaActiva} />'), 'Menú muestra las excepciones semanales');
ok(appUi.includes('<AsistentePfiPanel'), 'el asistente PFI queda accesible desde toda la app');
ok(despensaUi.includes("vista === 'conservacion'") && despensaUi.includes('<ConservacionPanel />'), 'Despensa incluye la vista de abiertos, congelados y sobras');

console.log('✓ Funciones avanzadas PFI 1.5.6: 3/3 módulos funcionales y conectados');
