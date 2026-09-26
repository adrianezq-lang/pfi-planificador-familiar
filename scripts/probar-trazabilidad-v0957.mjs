import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

class StorageMock {
  data = new Map();

  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(clave) { return this.data.get(clave) ?? null; }
  key(indice) { return [...this.data.keys()][indice] ?? null; }
  removeItem(clave) { this.data.delete(clave); }
  setItem(clave, valor) { this.data.set(String(clave), String(valor)); }
}

const eventos = [];
globalThis.localStorage = new StorageMock();
globalThis.window = {
  location: { origin: 'https://pfi.test' },
  dispatchEvent(evento) { eventos.push(evento.type); return true; },
  addEventListener() {},
  removeEventListener() {},
};
globalThis.Event = class { constructor(type) { this.type = type; } };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };

const catalogoRaw = await readFile(
  new URL('../public/catalogo-mercadona.json', import.meta.url),
  'utf8',
);
globalThis.fetch = async (url) => {
  if (String(url).startsWith('/catalogo-mercadona.json')) {
    return new Response(catalogoRaw, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  throw new Error(`Petición inesperada: ${url}`);
};

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});

const temporada = await vite.ssrLoadModule('/src/services/temporadaIngredientes.ts');
const excepciones = await vite.ssrLoadModule('/src/services/excepcionesCalendario.ts');
const programacionComensales =
  await vite.ssrLoadModule('/src/services/programacionComensales.ts');
const { generarListaCompra } = await vite.ssrLoadModule('/src/services/listaCompra.ts');
const inventario = await vite.ssrLoadModule('/src/services/inventario.ts');
const ahorro = await vite.ssrLoadModule('/src/services/ahorroReal.ts');
const consumoMenu = await vite.ssrLoadModule('/src/services/consumoMenu.ts');
const { buscarEnCatalogoMercadona } = await vite.ssrLoadModule('/src/services/catalogoMercadona.ts');
const {
  crearProductoDespensaDesdeCatalogo,
  actualizarStockProductoDespensa,
} = await vite.ssrLoadModule('/src/services/despensa.ts');
const { calcularConfianzaPresupuesto } = await vite.ssrLoadModule('/src/services/resumenEconomico.ts');
const { preverAgotamientosAntesFinMes } =
  await vite.ssrLoadModule('/src/services/planificacionCompra.ts');
const { registrarMarcadosEnInventario } = await vite.ssrLoadModule('/src/services/registroCompra.ts');

const configuracionTemporada = temporada.guardarConfiguracionTemporada({
  zona: 'bizkaia-norte',
  avisarAutomaticamente: true,
});
assert.equal(
  temporada.evaluarTemporadaIngrediente('Tomate', '2026-01-12', configuracionTemporada).enTemporada,
  false,
);
assert.equal(
  temporada.evaluarTemporadaIngrediente('Tomate', '2026-09-12', configuracionTemporada).enTemporada,
  true,
);
assert.ok(
  temporada.evaluarTemporadaIngrediente('Tomate', '2026-01-12', configuracionTemporada)
    .alternativas.some((alternativa) => alternativa.ingrediente === 'Zanahorias'),
);

const perfil = {
  nombre: 'Familia de prueba',
  adultos: 2,
  ninos: 2,
  edadesNinos: [12, 6],
  bebes: 0,
  bebesComenMenu: false,
  comensales: {
    comidaLaborable: { adultos: 2, ninos: [true, false], bebes: 0 },
    comidaFinSemana: { adultos: 2, ninos: [true, true], bebes: 0 },
    cena: { adultos: 2, ninos: [true, true], bebes: 0 },
  },
  horarios: { comida: '14:00', cena: '21:00' },
  supermercado: 'Mercadona',
  presupuesto: 500,
};
localStorage.setItem('pfi-perfil', JSON.stringify(perfil));
localStorage.setItem('pfi-recetas', JSON.stringify([{
  nombre: 'Arroz de prueba',
  categoria: 'Arroces',
  ingredientes: [{
    nombre: 'Arroz',
    cantidad: 1_000,
    unidad: 'g',
    seccion: 'Arroz, legumbres y pasta',
    ajusteAutomatico: false,
  }],
}]));
localStorage.setItem(
  'pfi-asociaciones-ingredientes-mercadona',
  JSON.stringify({ Arroz: '5044' }),
);

const crearDia = (comensalesComida) => ({
  dia: 'Lunes',
  comida: ['Arroz de prueba'],
  cena: [],
  comensalesComida,
  postreComida: 'Sin postre',
  postreCena: 'Sin postre',
  preparar: '',
});
const compraHabitual = generarListaCompra([crearDia(undefined)]);
const compraAjustada = generarListaCompra([crearDia({
  adultos: 1,
  ninos: [false, true],
  bebes: 0,
})]);
assert.ok(compraAjustada[0].cantidad < compraHabitual[0].cantidad);

const semana = {
  id: 'semana-prueba',
  nombre: 'Semana de prueba',
  inicio: '2026-09-21',
  fin: '2026-09-27',
  menu: [
    crearDia(undefined),
    ...['Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dia) => ({
      ...crearDia(undefined),
      dia,
      comida: [],
    })),
  ],
};
excepciones.guardarExcepcion('2026-09-21', {
  comensalesComida: { adultos: 1, ninos: [false, true], bebes: 0 },
});
const menuEfectivo = excepciones.menuEfectivoSemana(semana);
assert.deepEqual(menuEfectivo[0].comensalesComida, {
  adultos: 1,
  ninos: [false, true],
  bebes: 0,
});

inventario.registrarCompra('producto-merma', 3, 'Compra de prueba');
inventario.registrarConsumo('producto-merma', 1, 'menu', 'Consumo de prueba');
inventario.registrarDesperdicio('producto-merma', 0.5, 'Caducidad');
assert.equal(inventario.obtenerStockActual('producto-merma'), 1.5);
assert.deepEqual(inventario.resumirMovimientosProducto('producto-merma'), {
  comprado: 3,
  consumido: 1,
  desperdiciado: 0.5,
  ajustes: 0,
  stock: 1.5,
});

ahorro.registrarAhorroReal({
  referencia: 'semana:2026-09:4|producto-prueba',
  productoId: 'producto-prueba',
  productoNombre: 'Producto de prueba',
  tiendaId: 'tienda-local',
  tiendaNombre: 'Tienda local',
  costeReferencia: 5,
  costePagado: 4,
  origenImporte: 'precio-registrado',
  observaciones: 'Compra confirmada',
});
ahorro.registrarAhorroReal({
  referencia: 'semana:2026-09:4|producto-prueba',
  productoId: 'producto-prueba',
  productoNombre: 'Producto duplicado',
  tiendaId: 'tienda-local',
  tiendaNombre: 'Tienda local',
  costeReferencia: 8,
  costePagado: 1,
  origenImporte: 'precio-registrado',
  observaciones: 'No debe duplicarse',
});
const resumenAhorro = ahorro.resumirAhorroRealMes('2026-09');
assert.equal(resumenAhorro.comprasComparadas, 1);
assert.equal(resumenAhorro.ahorroNeto, 1);
assert.equal(resumenAhorro.costePagado, 4);

const zonaAnterior = process.env.TZ;
process.env.TZ = 'Europe/Madrid';
const registroEnCambioDeMes = {
  ...resumenAhorro.registros[0],
  id: 'cambio-mes-local',
  referencia: 'cambio-mes-local',
  fecha: '2026-09-30T22:30:00.000Z',
};
assert.equal(
  ahorro.resumirAhorroRealMes('2026-10', [registroEnCambioDeMes]).comprasComparadas,
  1,
);
if (zonaAnterior === undefined) delete process.env.TZ;
else process.env.TZ = zonaAnterior;

assert.equal(calcularConfianzaPresupuesto({
  partidasTotales: 4,
  partidasConfirmadas: 1,
  partidasPesoVariable: 1,
  partidasConversionEstimada: 1,
  partidasFormatoPendiente: 1,
  partidasSinImporte: 0,
  partidasExcluidasDisponibilidad: 0,
}), 71);

const [productoArroz] = await buscarEnCatalogoMercadona('Arroz redondo Hacendado');
assert.equal(productoArroz.productoId, '5044');
crearProductoDespensaDesdeCatalogo(productoArroz);
inventario.registrarCompra('5044', 2, 'Stock para consumo de menú');
const servicio = await consumoMenu.registrarServicioConsumido(
  '2026-09-21',
  'comida',
  crearDia({ adultos: 1, ninos: [false, false], bebes: 0 }),
);
assert.equal(servicio.consumos.length, 1);
const cantidadConsumida = servicio.consumos[0].cantidad;
assert.ok(cantidadConsumida > 0 && cantidadConsumida <= 2);
assert.ok(Math.abs(inventario.obtenerStockActual('5044') - (2 - cantidadConsumida)) < 0.000001);
const repetido = await consumoMenu.registrarServicioConsumido(
  '2026-09-21',
  'comida',
  crearDia({ adultos: 1, ninos: [false, false], bebes: 0 }),
);
assert.equal(repetido.id, servicio.id);
assert.ok(Math.abs(inventario.obtenerStockActual('5044') - (2 - cantidadConsumida)) < 0.000001);
consumoMenu.deshacerServicioConsumido(servicio.id);
assert.equal(inventario.obtenerStockActual('5044'), 2);

actualizarStockProductoDespensa('5044', 0.3);
assert.equal(inventario.obtenerStockActual('5044'), 0.3);
const menusAgotamiento = [0, 1, 2].map(() => [
  crearDia({ adultos: 2, ninos: [true, true], bebes: 0 }),
]);
const alertasAgotamiento = await preverAgotamientosAntesFinMes(
  menusAgotamiento,
  0,
);
const alertaArroz = alertasAgotamiento.find(
  (alerta) => alerta.productoId === '5044',
);
assert.ok(alertaArroz);
assert.ok(alertaArroz.necesidadRestanteEnvases > alertaArroz.stockActualEnvases);
assert.ok(alertaArroz.deficitEnvases > 0);
assert.ok(alertaArroz.semanaAgotamiento >= 2);

const ingrediente = {
  nombre: 'Arroz', cantidad: 1_000, unidad: 'g', seccion: 'Despensa',
};
const linea = {
  clave: 'producto-5044',
  ingrediente,
  necesidades: [ingrediente],
  producto: productoArroz,
  productoDespensa: null,
  envases: 1,
  envasesExactos: 1,
  subtotal: productoArroz.precio,
  calculoEstimado: false,
  precisionCantidad: 'exacta',
  tipoCompra: 'semanal',
  origen: 'menu',
};
const registroCompra = registrarMarcadosEnInventario(
  [linea],
  [linea.clave],
  [],
  'Compra semanal · septiembre de 2026',
  [{
    clave: 'producto:5044',
    nombre: 'Arroz',
    opcion: {
      tiendaId: 'tienda-local',
      tiendaNombre: 'Tienda local',
      productoNombre: 'Arroz local',
      precioEnvase: 1,
      coste: 1,
      equivalenciaInventarioEnvases: 1,
      automatica: false,
    },
    ahorroFrenteMercadona: 0.15,
  }],
  'semana:2026-09:4-integracion',
);
assert.equal(registroCompra.ahorrosRegistrados, 1);
assert.equal(ahorro.resumirAhorroRealMes('2026-09').comprasComparadas, 2);

const perfilProgramacion = {
  ...perfil,
  comensales: {
    ...perfil.comensales,
    comidaLaborable: { adultos: 2, ninos: [true, false], bebes: 0 },
  },
};
localStorage.setItem('pfi-perfil', JSON.stringify(perfilProgramacion));
programacionComensales.programarCambioComensales({
  desde: '2026-12-01',
  etiqueta: 'Todos comen en casa desde diciembre',
  comensales: {
    ...perfilProgramacion.comensales,
    comidaLaborable: { adultos: 2, ninos: [true, true], bebes: 0 },
  },
}, perfilProgramacion);

const semanaDiciembre = {
  id: 'semana-diciembre',
  nombre: 'Semana diciembre',
  inicio: '2026-12-07',
  fin: '2026-12-13',
  menu: [
    {
      dia: 'Lunes',
      comida: ['Arroz de prueba'],
      cena: [],
      postreComida: 'Sin postre',
      postreCena: 'Sin postre',
      preparar: '',
    },
    ...['Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dia) => ({
      dia,
      comida: [],
      cena: [],
      postreComida: 'Sin postre',
      postreCena: 'Sin postre',
      preparar: '',
    })),
  ],
};
const diciembreProgramado = excepciones.menuEfectivoSemana(semanaDiciembre, {});
assert.deepEqual(diciembreProgramado[0].comensalesComida, {
  adultos: 2,
  ninos: [true, true],
  bebes: 0,
});

excepciones.guardarExcepcion('2026-12-07', {
  comensalesComida: { adultos: 2, ninos: [true, false], bebes: 0 },
});
const diciembreConExcepcion = excepciones.menuEfectivoSemana(
  semanaDiciembre,
  excepciones.cargarExcepciones(),
);
assert.deepEqual(diciembreConExcepcion[0].comensalesComida, {
  adultos: 2,
  ninos: [true, false],
  bebes: 0,
});

await vite.close();

console.log('✓ comensales futuros se activan por fecha y la excepción puntual prevalece');
console.log('✓ temporada por zona y fecha con alternativas orientativas');
console.log('✓ comensales por servicio recalculan cantidades y persisten por fecha');
console.log('✓ inventario separa consumo, merma y ajuste');
console.log('✓ ahorro real es idempotente, mensual y trazable');
console.log('✓ consumo del menú descuenta stock una vez y puede deshacerse');
console.log('✓ PFI avisa si el stock físico actual no alcanza hasta fin de mes');
console.log('✓ compra comparada confirmada registra ahorro sin usar proyecciones');
