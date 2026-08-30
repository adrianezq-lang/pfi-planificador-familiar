import fs from 'node:fs';

const menu = fs.readFileSync('src/pages/Menu.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const css = fs.readFileSync('src/index.css', 'utf8');

function ok(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

ok(!menu.includes('PFI ya está aprendiendo de vuestra familia'), 'se eliminó la explicación permanente de aprendizaje');
ok(!menu.includes('En la comida rota la fruta del recetario'), 'se eliminó la explicación permanente de postres');
ok(!menu.includes('Equilibrio PFI de esta semana'), 'se eliminó el bloque explicativo de equilibrio');
ok(menu.includes('Postre de la comida') && menu.includes('Postre de la cena'), 'los postres siguen junto a sus comidas');
ok(app.includes('v0.9.15') === false, 'la versión antigua visible fue eliminada');
ok(!app.includes('Planificador Familiar Inteligente'), 'la cabecera anterior fue sustituida por la cabecera pulida');
ok(!app.includes('Menús, compra, despensa y presupuesto en un mismo lugar'), 'se eliminó el subtítulo global redundante');
ok(css.includes('PFI 1.5.6 · Pulido visual del Menú'), 'el estilo profesional del Menú está presente');
console.log('✓ pulido visual del Menú validado');
