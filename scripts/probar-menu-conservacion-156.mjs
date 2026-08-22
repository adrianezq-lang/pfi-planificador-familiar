import fs from 'node:fs';
import assert from 'node:assert/strict';

// Se aplica al final del prebuild, cuando ya están presentes todos los parches
// de stock, Compra profesional, postres y conservación.
await import('./aplicar-compra-mensual-156.mjs');

class StorageMock {
  data = new Map();
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
  clear() { this.data.clear(); }
}

globalThis.localStorage = new StorageMock();
globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} };
globalThis.CustomEvent = class { constructor(type) { this.type = type; } };

const conservacion = await import(
  new URL('../src/services/conservacion.ts', import.meta.url).href
);

localStorage.clear();
const abierto = conservacion.anadirConservacion({
  tipo: 'abierto',
  nombre: 'Macarrón grueso Hacendado',
  cantidad: 250,
  unidad: 'g',
  productoId: 'pasta-500',
});
assert.equal(abierto.productoId, 'pasta-500', 'Abiertos debe quedar vinculado al producto del inventario');
assert.equal(
  conservacion.cantidadConservada('Macarrón grueso Hacendado', 'g'),
  0,
  'Un abierto vinculado no puede volver a descontarse de Compra porque ya está en Inventario',
);
conservacion.consumirConservacion(abierto.id, 100);
assert.equal(
  conservacion.cargarConservacion().find((item) => item.id === abierto.id)?.cantidad,
  150,
  'El consumo parcial debe conservar la cantidad restante',
);

const sobra1 = conservacion.registrarSobraDesdeMenu({
  origen: 'menu:2026-08:semana-1:Lunes:comida',
  nombre: 'Lentejas',
  cantidad: 1,
});
assert.equal(sobra1.cantidad, 1, 'La sobra debe guardarse en raciones');
const sobra2 = conservacion.registrarSobraDesdeMenu({
  origen: 'menu:2026-08:semana-1:Lunes:comida',
  nombre: 'Lentejas',
  cantidad: 2,
});
assert.equal(sobra2.id, sobra1.id, 'Actualizar la sobra de la misma comida no debe duplicarla');
assert.equal(
  conservacion.obtenerSobraPorOrigen('menu:2026-08:semana-1:Lunes:comida')?.cantidad,
  2,
  'La cantidad de la sobra debe poder corregirse',
);
conservacion.eliminarSobraOrigen('menu:2026-08:semana-1:Lunes:comida');
assert.equal(
  conservacion.obtenerSobraPorOrigen('menu:2026-08:semana-1:Lunes:comida'),
  null,
  'Cambiar la valoración de Sobró debe poder retirar la sobra asociada',
);

const menu = fs.readFileSync('src/pages/Menu.tsx', 'utf8');
const panel = fs.readFileSync('src/components/ConservacionPanel.tsx', 'utf8');

assert.ok(menu.includes('className="meal-day-stack"'), 'Menú debe agrupar cada comida con su postre');
assert.ok(!menu.includes('className="daily-desserts"'), 'Los postres no deben quedar en un bloque separado al final del día');
assert.ok(menu.includes('momento="Postre de la comida"'), 'Debe existir el postre justo en la columna de comida');
assert.ok(menu.includes('momento="Postre de la cena"'), 'Debe existir el postre justo en la columna de cena');
assert.ok(menu.includes('registrarSobraDesdeMenu'), 'El botón Sobró debe estar conectado con Despensa');
assert.ok(menu.includes('¿Cuánto quedó?'), 'Sobró debe pedir la cantidad real de raciones');

assert.ok(panel.includes('Producto del inventario…'), 'Abiertos/Congelados deben elegirse desde Inventario');
assert.ok(panel.includes('registrarConsumo('), 'Consumir un abierto/congelado debe reducir también Inventario');
assert.ok(panel.includes('Todo usado'), 'Debe poder consumirse toda la cantidad');
assert.ok(panel.includes('Congelar') && panel.includes('Descongelar'), 'Debe poder cambiar el estado abierto/congelado');
assert.ok(panel.includes('sin duplicar el stock'), 'La interfaz debe explicar que el estado no suma stock');

console.log('✓ Menú: postre debajo de cada comida/cena');
console.log('✓ Sobró crea/actualiza raciones reales en Despensa sin duplicados');
console.log('✓ Abiertos/Congelados quedan vinculados al Inventario y admiten consumo parcial');

await import('./probar-compra-mensual-real-156.mjs');

// Pulido final: se ejecuta después de toda la lógica funcional para que el
// prebuild no vuelva a restaurar textos o estilos antiguos.
function leer(ruta) {
  if (!fs.existsSync(ruta)) throw new Error(`UI profesional: falta ${ruta}`);
  return fs.readFileSync(ruta, 'utf8');
}

function guardar(ruta, contenido) {
  fs.writeFileSync(ruta, contenido, 'utf8');
}

function parchearMenuProfesional() {
  const ruta = 'src/pages/Menu.tsx';
  let c = leer(ruta);

  c = c.replace('<h2>📅 Menú</h2>', '<h2>Menú semanal</h2>');
  c = c.replace(/\n\s*<p>Cuatro semanas editables con postres únicamente desde Recetas\.<\/p>/, '');
  c = c.replace(/\n\s*<section className="learning-strip"[\s\S]*?<\/section>\n/, '\n');
  c = c.replace(/\n\s*<div className="dessert-auto-note">[\s\S]*?<\/div>\n/, '\n');

  const balanceInicio = c.indexOf('      <div className={`balance-summary');
  const diaInicio = c.indexOf('      <section\n        className={`active-day', balanceInicio);
  if (balanceInicio >= 0 && diaInicio > balanceInicio) {
    c = `${c.slice(0, balanceInicio)}${c.slice(diaInicio)}`;
  }

  c = c.replace(
    "  Lunes: 'L',\n  Martes: 'M',\n  Miércoles: 'X',\n  Jueves: 'J',\n  Viernes: 'V',\n  Sábado: 'S',\n  Domingo: 'D',",
    "  Lunes: 'Lun',\n  Martes: 'Mar',\n  Miércoles: 'Mié',\n  Jueves: 'Jue',\n  Viernes: 'Vie',\n  Sábado: 'Sáb',\n  Domingo: 'Dom',",
  );

  c = c.replace(
    /\n\s*<div className="active-day__summary">[\s\S]*?<\/div>\n\s*<\/header>/,
    '\n        </header>',
  );
  c = c.replace(/\n\s*<small>Pincha en un día para editarlo<\/small>/, '');
  c = c.replace(
    "{editando ? '✓ Cerrar' : '✏️ Elegir postre'}",
    "{editando ? 'Cerrar' : 'Cambiar'}",
  );

  guardar(ruta, c);
}

function quitarExplicaciones() {
  const rutaCompra = 'src/pages/Compra.tsx';
  let compra = leer(rutaCompra);
  compra = compra.replace(/\n\s*<p style=\{estiloSubtitulo\}>[\s\S]*?<\/p>/, '');
  compra = compra.replace(/\n\s*<p style=\{estiloSubtitulo\}>\{descripcion\}<\/p>/, '');
  guardar(rutaCompra, compra);

  const rutaPerfil = 'src/pages/Perfil.tsx';
  let perfil = leer(rutaPerfil);
  perfil = perfil.replace(/\n\s*<p style=\{estiloIntroduccion\}>[\s\S]*?<\/p>/g, '');
  perfil = perfil.replace(/\n\s*<small>\n\s*Es una estimación inicial\.[\s\S]*?<\/small>/, '');
  guardar(rutaPerfil, perfil);

  const rutaConservacion = 'src/components/ConservacionPanel.tsx';
  let conservacionUi = leer(rutaConservacion);
  conservacionUi = conservacionUi.replace(/\n\s*<span style=\{estilos\.subtitulo\}>[\s\S]*?<\/span>/, '');
  conservacionUi = conservacionUi.replace(/\n\s*<p style=\{estilos\.ayuda\}>\{ETIQUETAS\[tipo\]\.ayuda\}<\/p>/, '');
  guardar(rutaConservacion, conservacionUi);

  const rutaExcepciones = 'src/components/ExcepcionesSemanaPanel.tsx';
  let excepciones = leer(rutaExcepciones);
  excepciones = excepciones.replace(/\n\s*<p style=\{estilos\.ayuda\}>[\s\S]*?<\/p>/, '');
  guardar(rutaExcepciones, excepciones);

  const rutaBackup = 'src/components/CopiaSeguridadPanel.tsx';
  let backup = leer(rutaBackup);
  backup = backup.replace(/\n\s*<p style=\{estilos\.texto\}>[\s\S]*?<\/p>/, '');
  guardar(rutaBackup, backup);
}

function aplicarCssProfesional() {
  const ruta = 'src/index.css';
  let css = leer(ruta);
  const marca = '/* PFI 1.5.6 · UI profesional limpia */';
  if (css.includes(marca)) return;

  css += `

${marca}
.app-brand p,
.pantry-lead,
.recipes-intro-copy,
.learning-strip,
.dessert-auto-note,
.balance-summary,
.daily-dessert__identity em,
.dessert-recipe-option small,
.smart-recommendation__copy > span,
.week-overview__heading > small {
  display: none !important;
}

.menu-page {
  width: min(1120px, 100%);
  margin-inline: auto;
  padding-top: 14px;
}

.menu-intro {
  padding: 4px 2px 12px;
  border: 0;
  background: transparent;
  box-shadow: none;
  align-items: center;
}

.menu-intro h2 {
  margin: 0;
  color: #304d38;
  font-size: clamp(28px, 4vw, 38px);
  line-height: 1;
  letter-spacing: -0.04em;
}

.menu-intro__actions { gap: 8px; }
.menu-intro__actions .primary-action,
.menu-intro__actions .secondary-action {
  min-height: 42px;
  border-radius: 999px;
  padding: 9px 14px;
  box-shadow: none;
}

.menu-navigation-sticky {
  position: sticky;
  top: 8px;
  z-index: 8;
  margin: 0 0 14px;
  padding: 10px;
  border: 1px solid rgba(79, 111, 82, 0.12);
  border-radius: 20px;
  background: rgba(250, 249, 244, 0.92);
  box-shadow: 0 10px 30px rgba(48, 77, 56, 0.08);
  backdrop-filter: blur(14px);
}

.month-switcher--compact {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}
.month-switcher__heading { display: none; }
.month-switcher__grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
}
.month-week-card {
  min-height: 42px;
  padding: 8px 6px;
  border: 1px solid #dbe3d8;
  border-radius: 13px;
  background: #fff;
  color: #58705e;
  box-shadow: none;
}
.month-week-card strong { display: none; }
.month-week-card--active {
  border-color: #4f6f52;
  background: #4f6f52;
  color: #fff;
  transform: none;
  box-shadow: 0 6px 16px rgba(79, 111, 82, 0.18);
}

.week-switcher {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin-top: 8px;
}
.week-day-button {
  min-width: 0;
  min-height: 48px;
  padding: 8px 3px;
  border: 1px solid transparent;
  border-radius: 13px;
  background: transparent;
  color: #667368;
  box-shadow: none;
}
.week-day-button__letter {
  font-size: 12px;
  font-weight: 850;
  letter-spacing: -0.02em;
}
.week-day-button__name { display: none; }
.week-day-button small { margin-top: 1px; font-size: 9px; }
.week-day-button--active {
  border-color: #d5e1d2;
  background: #edf4eb;
  color: #355a42;
}
.week-day-button--today.week-day-button--active {
  border-color: #4f6f52;
  background: #4f6f52;
  color: #fff;
}

.active-day {
  margin-top: 0;
  padding: clamp(14px, 2.5vw, 22px);
  border: 1px solid rgba(79, 111, 82, 0.12);
  border-radius: 26px;
  background: #f8f7f2;
  box-shadow: 0 16px 40px rgba(45, 67, 50, 0.08);
}
.active-day__header {
  margin-bottom: 14px;
  padding: 0 2px;
  border: 0;
}
.active-day__eyebrow {
  color: #7a887c;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.08em;
}
.active-day__header h3 {
  margin: 3px 0 0;
  color: #2f4936;
  font-size: clamp(27px, 4vw, 36px);
  letter-spacing: -0.04em;
}
.active-day__meals {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  align-items: start;
}
.meal-day-stack {
  display: grid;
  align-content: start;
  gap: 8px;
  min-width: 0;
}
.meal-panel {
  overflow: hidden;
  border: 1px solid #e0e6dd;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(50, 75, 56, 0.06);
}
.meal-panel__header {
  padding-bottom: 10px;
  border-bottom: 1px solid #edf0ea;
}
.meal-panel__identity { gap: 10px; }
.meal-panel__identity small { display: none; }
.meal-panel__identity h4 {
  margin: 0;
  color: #355a42;
  font-size: 18px;
}
.meal-panel__icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 12px;
  background: #edf4eb;
  font-size: 19px;
}
.meal-edit-button {
  border-radius: 999px;
  padding: 7px 10px;
  background: #f5f7f3;
  font-size: 12px;
}
.meal-composition { gap: 8px; margin-top: 10px; }
.meal-dish-card {
  min-height: 0;
  padding: 12px;
  border: 0;
  border-radius: 14px;
  background: #f7f7f3;
}
.meal-dish-card--primary { background: #edf4eb; }
.meal-dish-card > span {
  color: #829086;
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.meal-dish-card strong {
  margin-top: 3px;
  color: #2f4234;
  font-size: 16px;
  line-height: 1.28;
}

.meal-day-stack > .daily-dessert { margin: 0; }
.daily-dessert {
  min-height: 0;
  padding: 10px 12px;
  border: 1px solid #e3e7df;
  border-radius: 16px;
  background: #fffdf8;
  box-shadow: none;
}
.daily-dessert__icon { width: 34px; height: 34px; font-size: 18px; }
.daily-dessert__identity { gap: 5px; }
.daily-dessert__identity small {
  color: #8a8f88;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.daily-dessert__identity strong { color: #48564b; font-size: 14px; }
.daily-dessert__edit-button {
  min-height: 0;
  border-radius: 999px;
  padding: 6px 9px;
  font-size: 11px;
}
.meal-feedback-v2 { margin-top: 0; border-radius: 14px; }
.leftover-capture, .leftover-saved { box-shadow: none; }

.tomorrow-prep {
  margin-top: 14px;
  padding: 11px 13px;
  border: 1px solid #e2e7df;
  border-radius: 15px;
  background: #fff;
  box-shadow: none;
}
.tomorrow-prep__icon {
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background: #eef3ec;
  font-size: 17px;
}
.tomorrow-prep small { color: #859087; font-size: 9px; }
.tomorrow-prep strong { color: #45574a; font-size: 13px; }

.week-overview { margin-top: 18px; }
.week-overview__heading { margin-bottom: 9px; }
.week-overview__heading > div > span { display: none; }
.week-overview__heading h3 {
  margin: 0;
  color: #4c5f50;
  font-size: 17px;
}
.week-overview__grid { gap: 8px; }
.week-summary-card {
  border: 1px solid #e2e7df;
  border-radius: 16px;
  background: #fff;
  box-shadow: none;
}
.week-summary-card--active {
  border-color: #a9bea9;
  background: #f1f6ef;
}

.page-hero-card { gap: 8px; }
.page-hero-card > :last-child { margin-bottom: 0; }

@media (max-width: 720px) {
  .menu-page { padding-inline: 12px; }
  .menu-intro { align-items: flex-start; gap: 10px; }
  .menu-intro__actions { width: 100%; }
  .menu-intro__actions .primary-action,
  .menu-intro__actions .secondary-action { flex: 1; }
  .menu-navigation-sticky { top: 4px; padding: 8px; border-radius: 18px; }
  .month-week-card { min-height: 39px; font-size: 11px; }
  .week-switcher { gap: 4px; }
  .week-day-button { min-height: 45px; border-radius: 11px; }
  .week-day-button__letter { font-size: 11px; }
  .active-day { border-radius: 22px; padding: 12px; }
  .active-day__meals { grid-template-columns: 1fr; gap: 12px; }
  .week-overview__grid { grid-template-columns: 1fr; }
}
`;

  guardar(ruta, css);
}

parchearMenuProfesional();
quitarExplicaciones();
aplicarCssProfesional();

const menuPulido = leer('src/pages/Menu.tsx');
const compraPulida = leer('src/pages/Compra.tsx');
const perfilPulido = leer('src/pages/Perfil.tsx');
const conservacionPulida = leer('src/components/ConservacionPanel.tsx');
const excepcionesPulidas = leer('src/components/ExcepcionesSemanaPanel.tsx');
const backupPulido = leer('src/components/CopiaSeguridadPanel.tsx');
const cssPulido = leer('src/index.css');

assert.ok(menuPulido.includes('<h2>Menú semanal</h2>'), 'Menú debe tener cabecera limpia');
assert.ok(!menuPulido.includes('PFI ya está aprendiendo de vuestra familia'), 'Se retira el bloque explicativo de aprendizaje');
assert.ok(!menuPulido.includes('En la comida rota la fruta del recetario'), 'Se retira la nota fija de postres');
assert.ok(!menuPulido.includes('Equilibrio PFI de esta semana'), 'Se retira el bloque grande de equilibrio');
assert.ok(menuPulido.includes("Lunes: 'Lun'") && menuPulido.includes("Domingo: 'Dom'"), 'Los días usan abreviaturas claras');
assert.ok(menuPulido.includes('className="meal-day-stack"'), 'Se conserva comida/postre y cena/postre agrupados');
assert.ok(menuPulido.includes('registrarSobraDesdeMenu'), 'Sobró sigue conectado a Despensa');
assert.ok(menuPulido.includes('¿Cuánto quedó?'), 'El flujo de sobras sigue operativo');
assert.ok(!compraPulida.includes('<p style={estiloSubtitulo}>{descripcion}</p>'), 'Compra no repite explicaciones bajo cada bloque');
assert.ok(!perfilPulido.includes('<p style={estiloIntroduccion}>'), 'Perfil queda sin párrafos instructivos permanentes');
assert.ok(!perfilPulido.includes('Es una estimación inicial.'), 'Perfil no muestra explicación fija de raciones');
assert.ok(!conservacionPulida.includes('Inventario = cantidad total. Abiertos/Congelados = estado.'), 'Conservación queda sin explicación fija');
assert.ok(!excepcionesPulidas.includes('Esto cambia Compra y las cantidades de esta semana'), 'Excepciones queda sin párrafo instructivo');
assert.ok(!backupPulido.includes('Guarda menú, recetas, perfil, inventario'), 'Copia de seguridad queda en título y acciones');
assert.ok(cssPulido.includes('PFI 1.5.6 · UI profesional limpia'), 'Se aplican estilos profesionales');
assert.ok(cssPulido.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'Comida y cena quedan en dos tarjetas en escritorio');
assert.ok(cssPulido.includes('@media (max-width: 720px)'), 'El Menú sigue adaptado a móvil');

console.log('✓ UI profesional: textos permanentes retirados y Menú rediseñado');
