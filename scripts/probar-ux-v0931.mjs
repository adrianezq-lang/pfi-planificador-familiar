import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const menu = await readFile(new URL('../src/pages/MenuModern.tsx', import.meta.url), 'utf8');
const compra = await readFile(new URL('../src/pages/CompraModern.tsx', import.meta.url), 'utf8');
const navegacion = await readFile(new URL('../src/components/NavegacionInferior.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/styles/premium-modern.css', import.meta.url), 'utf8');
const cssNavegacion = await readFile(new URL('../src/styles/premium-navigation.css', import.meta.url), 'utf8');

assert.match(app, /import '\.\/styles\/premium-modern\.css';/, 'La capa visual moderna debe estar cargada.');
assert.match(app, /import '\.\/styles\/premium-navigation\.css';/, 'La navegación premium debe cargarse después de la capa visual.');
assert.match(app, /import\('\.\/pages\/MenuModern'\)/, 'Producción debe usar el menú moderno.');
assert.match(app, /import\('\.\/pages\/CompraModern'\)/, 'Producción debe usar la compra moderna.');

assert.match(menu, /<details[\s\S]*className="meal-feedback"/, 'La valoración debe poder plegarse.');
assert.match(menu, /Valorar este menú/, 'La valoración plegada debe seguir siendo fácil de descubrir.');
assert.match(menu, /Opciones de esta semana/, 'Las acciones secundarias del menú deben estar agrupadas.');
assert.match(menu, /Ajustar este día/, 'Las excepciones diarias deben quedar agrupadas y no invadir la pantalla.');

assert.match(compra, /const desmarcarTodo = \(\) =>/, 'Compra debe permitir desmarcar la selección.');
assert.match(compra, /↩ Desmarcar/, 'La acción de desmarcar debe ser visible cuando hay selección editable.');
assert.match(compra, /✓ Marcar todo/, 'La acción de marcar todos debe seguir disponible.');
assert.match(compra, /const compraMensualDisponible = semanaActiva === 0/, 'Compra mensual debe seguir limitada a Semana 1.');
assert.match(compra, /ORDEN_SECCIONES_COMPRA/, 'La lista debe conservar el recorrido por secciones.');
assert.match(compra, /modern-progress/, 'La compra debe mostrar progreso de forma comprensible.');

assert.match(navegacion, /const principales:[\s\S]*'inicio'[\s\S]*'menu'[\s\S]*'compra'[\s\S]*'despensa'/, 'La barra debe priorizar las cuatro áreas de uso diario.');
assert.match(navegacion, /const secundarios:[\s\S]*'recetas'[\s\S]*'catalogo'[\s\S]*'perfil'/, 'Recetas, Mercadona y Cuenta deben vivir en Más.');
assert.match(navegacion, />Más</, 'La barra debe ofrecer un acceso Más claro.');
assert.match(cssNavegacion, /grid-template-columns: repeat\(5/, 'La barra inferior debe tener exactamente cinco destinos visuales.');

assert.match(css, /\.modern-meal-card/, 'La nueva jerarquía visual del menú debe tener estilos propios.');
assert.match(css, /\.modern-shopping-row/, 'La lista de compra moderna debe tener estilos propios.');
assert.match(css, /@media \(max-width: 720px\)/, 'La nueva interfaz debe incluir adaptación móvil explícita.');

console.log('✓ valoraciones plegables y acciones secundarias agrupadas');
console.log('✓ compra reversible: marcar todo y desmarcar');
console.log('✓ compra mensual solo en Semana 1 y recorrido por secciones');
console.log('✓ navegación principal reducida a cinco destinos');
console.log('✓ interfaz moderna con adaptación móvil');
