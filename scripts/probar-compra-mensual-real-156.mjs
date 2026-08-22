import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  esCompraMensualDespensa,
  esSemanaCompraMensual,
} from '../src/services/politicaCompraMensual.ts';

assert.equal(esCompraMensualDespensa(null, 'Leche'), true, 'la leche se compra al inicio de mes');
assert.equal(esCompraMensualDespensa(null, 'Arroz'), true, 'el arroz se calcula para todo el mes');
assert.equal(esCompraMensualDespensa(null, 'Macarrones'), true, 'la pasta se calcula para todo el mes');
assert.equal(esCompraMensualDespensa(null, 'Garbanzos secos'), true, 'las legumbres secas se calculan para todo el mes');
assert.equal(esCompraMensualDespensa(null, 'Huevos'), false, 'los huevos siguen siendo semanales');
assert.equal(esCompraMensualDespensa(null, 'Yogures'), false, 'los yogures siguen siendo semanales');
assert.equal(esCompraMensualDespensa({ nombre: 'Producto especial', frecuencia: 'mensual' }), true, 'una frecuencia mensual manual se respeta');
assert.equal(esSemanaCompraMensual(0), true, 'la compra mensual aparece en Semana 1');
assert.equal(esSemanaCompraMensual(1), false, 'la compra mensual no se repite en Semana 2');

const app = fs.readFileSync('src/App.tsx', 'utf8');
const compra = fs.readFileSync('src/pages/Compra.tsx', 'utf8');
const motor = fs.readFileSync('src/motor/compra.ts', 'utf8');
const lista = fs.readFileSync('src/services/listaCompra.ts', 'utf8');

assert.ok(app.includes('planMensual={planMensual}'), 'App entrega las cuatro semanas a Compra');
assert.ok(compra.includes('generarCompraMercadona(menu, planMensual, semanaActiva)'), 'Compra usa el plan mensual completo');
assert.ok(compra.includes('Compra mensual de despensa'), 'Semana 1 identifica claramente la compra mensual');
assert.ok(compra.includes('La leche se compra aquí de una vez.'), 'la interfaz explica la regla mensual de leche');
assert.ok(motor.includes('planMensual.flatMap((semana, indice)'), 'el motor suma las cuatro semanas');
assert.ok(motor.includes('generarListaCompra(semana.menu, indice, false)'), 'el cálculo mensual no descuenta el mismo stock cuatro veces');
assert.ok(motor.includes("tipoCompra: esMensual ? 'despensa' : 'semanal'"), 'el motor separa compra mensual y semanal');
assert.ok(lista.includes('cargarExcepcionesSemana(semanaIndice)'), 'cada semana mensual respeta sus propias excepciones');
assert.ok(lista.includes('descontarDisponibles ? descontarConservacion(ingredientes) : ingredientes'), 'el stock disponible solo se descuenta una vez');

console.log('✓ Compra mensual real: despensa de 4 semanas en Semana 1, leche mensual y huevos/yogures semanales');
