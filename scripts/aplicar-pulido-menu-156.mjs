import fs from 'node:fs';

const menuPath = 'src/pages/Menu.tsx';
const appPath = 'src/App.tsx';
const cssPath = 'src/index.css';

let menu = fs.readFileSync(menuPath, 'utf8');
let app = fs.readFileSync(appPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

function replaceOnce(source, before, after, label) {
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error(`No se pudo aplicar: ${label}`);
  return source.replace(before, after);
}

menu = replaceOnce(
  menu,
  '          <p>Cuatro semanas editables con postres únicamente desde Recetas.</p>\n',
  '',
  'texto explicativo de cabecera',
);

const learningBlock = /\n      <section className="learning-strip"[\s\S]*?<\/section>\n/;
menu = menu.replace(learningBlock, '\n');

const dessertNote = /\n      <div className="dessert-auto-note">[\s\S]*?<\/div>\n/;
menu = menu.replace(dessertNote, '\n');

const balanceBlock = /\n      <div className="balance-summary[\s\S]*?<\/div>\n\n      <section\n/;
menu = menu.replace(balanceBlock, '\n      <section\n');

menu = replaceOnce(
  menu,
  '              <span>Comida, cena y postre</span>\n',
  '',
  'subtítulo redundante del día',
);

app = replaceOnce(
  app,
  '            <p>Menús, compra, despensa y presupuesto en un mismo lugar</p>\n',
  '',
  'subtítulo global explicativo',
);
app = replaceOnce(
  app,
  '          <span className="app-version">v0.9.15</span>\n',
  '          <span className="app-version">v1.5.6</span>\n',
  'versión visible',
);

const cssAddition = `\n/* PFI 1.5.6 · Pulido visual del Menú */\n.menu-page .menu-intro {\n  align-items: center;\n  gap: 16px;\n}\n\n.menu-page .menu-intro h2 {\n  margin-bottom: 0;\n  letter-spacing: -0.02em;\n}\n\n.menu-page .menu-intro__actions {\n  display: flex;\n  gap: 8px;\n  flex-wrap: wrap;\n  justify-content: flex-end;\n}\n\n.menu-page .menu-navigation-sticky {\n  gap: 12px;\n}\n\n.menu-page .month-switcher {\n  border: 1px solid rgba(84, 112, 88, 0.18);\n  box-shadow: var(--shadow-sm);\n}\n\n.menu-page .month-week-card {\n  border-radius: 16px;\n  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;\n}\n\n.menu-page .month-week-card:hover {\n  transform: translateY(-1px);\n}\n\n.menu-page .week-switcher {\n  border: 1px solid rgba(84, 112, 88, 0.14);\n  box-shadow: 0 8px 24px rgba(55, 68, 48, 0.07);\n}\n\n.menu-page .week-day-button {\n  min-height: 58px;\n  border-radius: 15px;\n}\n\n.menu-page .active-day {\n  border-radius: 28px;\n  border: 1px solid rgba(84, 112, 88, 0.15);\n  box-shadow: var(--shadow-md);\n  overflow: hidden;\n}\n\n.menu-page .active-day__header {\n  padding-bottom: 18px;\n}\n\n.menu-page .active-day__header h3 {\n  letter-spacing: -0.025em;\n}\n\n.menu-page .active-day__meals {\n  gap: 14px;\n}\n\n.menu-page .meal-panel {\n  border-radius: 22px;\n  border-color: rgba(84, 112, 88, 0.14);\n  box-shadow: 0 8px 24px rgba(55, 68, 48, 0.06);\n}\n\n.menu-page .meal-dish-card {\n  border-radius: 18px;\n}\n\n.menu-page .daily-desserts {\n  margin-top: 14px;\n  gap: 14px;\n}\n\n.menu-page .daily-dessert-stack {\n  border-radius: 18px;\n}\n\n.menu-page .tomorrow-prep {\n  margin-top: 14px;\n  border-radius: 18px;\n}\n\n@media (max-width: 720px) {\n  .menu-page .menu-intro {\n    align-items: stretch;\n  }\n\n  .menu-page .menu-intro__actions {\n    justify-content: stretch;\n  }\n\n  .menu-page .menu-intro__actions > * {\n    flex: 1;\n  }\n\n  .menu-page .active-day {\n    border-radius: 22px;\n  }\n}\n`;

if (!css.includes('PFI 1.5.6 · Pulido visual del Menú')) css += cssAddition;

fs.writeFileSync(menuPath, menu);
fs.writeFileSync(appPath, app);
fs.writeFileSync(cssPath, css);
console.log('✓ limpieza de textos y pulido visual del Menú aplicados');
