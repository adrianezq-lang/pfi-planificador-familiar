import fs from 'node:fs';
import path from 'node:path';

const ruta = path.join(process.cwd(), 'src/pages/Menu.tsx');
const menu = fs.readFileSync(ruta, 'utf8');

function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

const renderFeedback = (menu.match(/<MealFeedback\b/g) ?? []).length;

comprobar(
  menu.includes('const [feedbackActivo, setFeedbackActivo]'),
  'Falta el estado que controla una única valoración abierta.',
);
comprobar(
  menu.includes('meal-dish-card--feedback-toggle'),
  'La tarjeta de receta no es pulsable para abrir la valoración.',
);
comprobar(
  menu.includes('feedbackAbierto && !editando'),
  'La valoración no está configurada como desplegable bajo demanda.',
);
comprobar(
  renderFeedback === 1,
  `MealFeedback debe renderizarse una sola vez dentro de MealPanel; encontrados: ${renderFeedback}`,
);
comprobar(
  menu.includes("actual === 'comida' ? null : 'comida'") &&
    menu.includes("actual === 'cena' ? null : 'cena'"),
  'Comida y cena no alternan correctamente la valoración activa.',
);

for (const texto of ['Gustó', 'Sobró', 'Faltó', 'No gustó']) {
  comprobar(menu.includes(`texto=\"${texto}\"`), `Falta el botón de valoración: ${texto}`);
}

console.log('✓ UI compacta: valoración oculta por defecto y desplegable al tocar la receta');
console.log('✓ una sola valoración puede quedar activa a la vez');
console.log('✓ se conservan Gustó, Sobró, Faltó y No gustó');
