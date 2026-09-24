import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const home = await readFile(new URL('../src/pages/Home.tsx', import.meta.url), 'utf8');
const menu = await readFile(new URL('../src/pages/MenuModern.tsx', import.meta.url), 'utf8');
const compra = await readFile(new URL('../src/pages/CompraModern.tsx', import.meta.url), 'utf8');
const despensa = await readFile(new URL('../src/pages/Despensa.tsx', import.meta.url), 'utf8');
const navegacion = await readFile(new URL('../src/components/NavegacionInferior.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/premium-modern.css', import.meta.url), 'utf8');
const cssFinal = await readFile(new URL('../src/styles/premium-final.css', import.meta.url), 'utf8');
const cssRefinado = await readFile(new URL('../src/styles/premium-v5.css', import.meta.url), 'utf8');
const cssNavegacion = await readFile(new URL('../src/styles/premium-navigation.css', import.meta.url), 'utf8');
const cssDespensa = await readFile(new URL('../src/styles/pantry-decimal.css', import.meta.url), 'utf8');

assert.match(app, /import '\.\/styles\/premium-modern\.css';/, 'La capa visual moderna debe estar cargada.');
assert.match(app, /import '\.\/styles\/premium-navigation\.css';/, 'La navegación premium debe cargarse después de la capa visual.');
assert.match(app, /import\('\.\/pages\/MenuModern'\)/, 'Producción debe usar el menú moderno.');
assert.match(app, /import\('\.\/pages\/CompraModern'\)/, 'Producción debe usar la compra moderna.');

assert.match(home, /Menú de hoy/, 'Inicio debe identificar claramente el menú de hoy.');
assert.match(home, /Menú de la semana elegida/, 'Inicio debe distinguir la semana consultada de hoy.');
assert.match(home, /detalle={`Postre · \$\{postreComida\}`}/, 'El postre de la comida debe integrarse en la misma fila para evitar una tarjeta enorme.');
assert.match(home, /detalle={`Postre · \$\{postreCena\}`}/, 'El postre de la cena debe integrarse en la misma fila para evitar una tarjeta enorme.');
assert.match(cssFinal, /\.home-card--menu\.pfi-card[\s\S]*background:[\s\S]*!important;/, 'La tarjeta principal debe conservar fondo oscuro sobre el estilo global de Card.');
assert.match(cssFinal, /\.home-card--menu \.home-day[\s\S]*color: #fff !important;/, 'El texto principal del menú debe conservar contraste alto.');
assert.match(cssFinal, /\.meal-row__detail/, 'El postre integrado debe tener un estilo legible.');
assert.match(cssFinal, /@media \(max-width: 720px\)[\s\S]*\.home-card--menu \.meal-row/, 'Inicio debe compactarse explícitamente en móvil.');
assert.match(cssRefinado, /:focus-visible/, 'Los controles deben conservar un foco de teclado visible.');

assert.match(menu, /<details[\s\S]*className="meal-feedback"/, 'La valoración debe poder plegarse.');
assert.match(menu, /<span>Valorar/, 'La valoración debe ser discreta cuando está plegada.');
assert.doesNotMatch(menu, /resultadoActual/, 'El resultado Gustó, Sobró, Faltó o No gustó no debe quedar visible al cerrar la valoración.');
assert.match(menu, /Opciones de esta semana/, 'Las acciones secundarias del menú deben estar agrupadas.');
assert.match(menu, /Ajustar este día/, 'Las excepciones diarias deben quedar agrupadas y no invadir la pantalla.');

assert.match(compra, /const desmarcarTodo = \(\) =>/, 'Compra debe permitir desmarcar la selección.');
assert.match(compra, /↩ Desmarcar todo/, 'La acción de desmarcar toda la selección debe ser explícita.');
assert.match(compra, /✓ Marcar todo/, 'La acción de marcar todos debe seguir disponible.');
assert.match(compra, /const compraMensualDisponible = semanaActiva === 0/, 'Compra mensual debe seguir limitada a Semana 1.');
assert.match(compra, /ORDEN_SECCIONES_COMPRA/, 'La lista debe conservar el recorrido por secciones.');
assert.match(compra, /modern-progress/, 'La compra debe mostrar progreso de forma comprensible.');

assert.match(despensa, /inputMode="decimal"/, 'Despensa debe permitir escribir cantidades decimales desde móvil.');
assert.match(despensa, /replace\(',', '\.'\)/, 'Despensa debe aceptar coma decimal española.');
assert.match(despensa, /actualizarStockProductoDespensa/, 'El stock decimal debe guardarse en el inventario real.');
assert.match(despensa, /Math\.min\(1, producto\.stockActual\)/, 'Restar stock no debe generar cantidades internas negativas cuando queda menos de una unidad.');
assert.match(despensa, /maximumFractionDigits: 3/, 'Despensa debe conservar precisión útil sin redondear a enteros.');
assert.match(cssDespensa, /\.pantry-stock-editor input/, 'El editor decimal debe tener una presentación táctil específica.');

assert.match(navegacion, /const principales:[\s\S]*'inicio'[\s\S]*'menu'[\s\S]*'compra'[\s\S]*'despensa'/, 'La barra debe priorizar las cuatro áreas de uso diario.');
assert.match(navegacion, /const secundarios:[\s\S]*'recetas'[\s\S]*'catalogo'[\s\S]*'perfil'/, 'Recetas, Mercadona y Cuenta deben vivir en Más.');
assert.match(navegacion, />Más</, 'La barra debe ofrecer un acceso Más claro.');
assert.match(cssNavegacion, /grid-template-columns: repeat\(5/, 'La barra inferior debe tener exactamente cinco destinos visuales.');

assert.match(css, /\.modern-meal-card/, 'La nueva jerarquía visual del menú debe tener estilos propios.');
assert.match(css, /\.modern-shopping-row/, 'La lista de compra moderna debe tener estilos propios.');
assert.match(css, /@media \(max-width: 720px\)/, 'La nueva interfaz debe incluir adaptación móvil explícita.');

console.log('✓ Inicio recupera contraste y reduce su altura en móvil');
console.log('✓ valoraciones ocultas hasta abrirlas y acciones secundarias agrupadas');
console.log('✓ compra reversible: marcar todo y desmarcar todo');
console.log('✓ despensa acepta y conserva cantidades decimales');
console.log('✓ compra mensual solo en Semana 1 y recorrido por secciones');
console.log('✓ navegación principal reducida a cinco destinos');
console.log('✓ interfaz moderna con adaptación móvil');
