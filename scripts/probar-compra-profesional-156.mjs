import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const compra = fs.readFileSync('src/pages/Compra.tsx', 'utf8');

assert.ok(
  app.includes('<span className="app-version">v1.5.6</span>'),
  'La cabecera debe mostrar la versión 1.5.6',
);
assert.ok(
  !app.includes('<span className="app-version">v0.9.15</span>'),
  'No debe quedar la versión antigua visible',
);
assert.ok(
  app.includes('<Compra menu={menu} semanaActiva={semanaActiva} />'),
  'Compra debe recibir la semana seleccionada del plan',
);

assert.ok(
  compra.includes('semanaActiva: number'),
  'Compra debe identificar la semana activa',
);
assert.ok(
  compra.includes('obtenerClaveCompra(semanaActiva)'),
  'Las marcas deben usar la semana activa',
);
assert.ok(
  compra.includes("fecha.getMonth() + 1"),
  'Las marcas de Compra deben quedar separadas también por mes',
);
assert.ok(
  compra.includes('setComprados(cargarListaLocal(claveComprados))'),
  'Al cambiar de semana deben cargarse sus propias marcas',
);
assert.ok(
  compra.includes('setRegistrados(cargarListaLocal(claveRegistrados))'),
  'Al cambiar de semana debe cargarse su historial de inventario',
);

assert.ok(
  compra.includes('Guardar en inventario'),
  'Compra debe conservar una acción explícita para registrar stock',
);
assert.ok(
  compra.includes('Limpiar marcas'),
  'La acción de reinicio debe describir que solo limpia marcas',
);
assert.ok(
  compra.includes('window.confirm('),
  'Limpiar las marcas debe pedir confirmación',
);
assert.ok(
  compra.includes('El inventario registrado se conserva.'),
  'La interfaz debe explicar que limpiar marcas no altera inventario',
);
assert.ok(
  !compra.includes('setRegistrados([])'),
  'Limpiar marcas no puede olvidar qué compras ya se registraron',
);
assert.ok(
  !compra.includes('guardarListaLocal(claveRegistrados, [])'),
  'Limpiar marcas no puede borrar el registro semanal de inventario',
);
assert.ok(
  !/useEffect\(\(\) => \{\s*if \(!resultado\) return;[\s\S]{0,2200}registrarCompra\(/.test(compra),
  'Marcar comprado no debe registrar stock automáticamente',
);
assert.ok(
  compra.includes('describirCantidadStock('),
  'Compra debe mostrar el stock en unidades naturales',
);
assert.ok(
  compra.includes('new Set(['),
  'Las claves registradas deben deduplicarse',
);

console.log('✓ Compra: semanas aisladas, sin doble registro, limpieza segura, stock natural y versión coherente');
