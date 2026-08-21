import fs from 'node:fs';
import path from 'node:path';

const rutaMenu = path.join(process.cwd(), 'src/pages/Menu.tsx');

if (!fs.existsSync(rutaMenu)) {
  throw new Error('No existe src/pages/Menu.tsx para aplicar la valoración compacta.');
}

let contenido = fs.readFileSync(rutaMenu, 'utf8');

function reemplazarUna(antes, despues, etiqueta) {
  if (contenido.includes(despues)) return;
  if (!contenido.includes(antes)) {
    throw new Error(`No se pudo aplicar el parche de UI compacta: ${etiqueta}`);
  }
  contenido = contenido.replace(antes, despues);
}

reemplazarUna(
  "  const [editorActivo, setEditorActivo] = useState<EditorActivo>(null);\n  const [, forzarAprendizaje] = useState(0);",
  "  const [editorActivo, setEditorActivo] = useState<EditorActivo>(null);\n  const [feedbackActivo, setFeedbackActivo] = useState<MomentoMenu | null>(null);\n  const [, forzarAprendizaje] = useState(0);",
  'estado de valoración activa',
);

reemplazarUna(
  "            editando={\n              editorActivo?.indice === indiceActivo &&\n              editorActivo.momento === 'comida'\n            }\n            onEditar={() =>",
  "            editando={\n              editorActivo?.indice === indiceActivo &&\n              editorActivo.momento === 'comida'\n            }\n            feedbackAbierto={feedbackActivo === 'comida'}\n            onToggleFeedback={() =>\n              setFeedbackActivo((actual) => actual === 'comida' ? null : 'comida')\n            }\n            onEditar={() =>",
  'valoración compacta de comida',
);

reemplazarUna(
  "            editando={\n              editorActivo?.indice === indiceActivo &&\n              editorActivo.momento === 'cena'\n            }\n            onEditar={() =>",
  "            editando={\n              editorActivo?.indice === indiceActivo &&\n              editorActivo.momento === 'cena'\n            }\n            feedbackAbierto={feedbackActivo === 'cena'}\n            onToggleFeedback={() =>\n              setFeedbackActivo((actual) => actual === 'cena' ? null : 'cena')\n            }\n            onEditar={() =>",
  'valoración compacta de cena',
);

const feedbackPermanenteComida = `\n            <MealFeedback\n              dia={diaActivo.dia}\n              momento="comida"\n              titulo="Comida"\n              seleccion={diaActivo.comida}\n            />`;
const feedbackPermanenteCena = `\n            <MealFeedback\n              dia={diaActivo.dia}\n              momento="cena"\n              titulo="Cena"\n              seleccion={diaActivo.cena}\n            />`;

contenido = contenido.replace(feedbackPermanenteComida, '');
contenido = contenido.replace(feedbackPermanenteCena, '');

reemplazarUna(
  "  editando,\n  onEditar,\n  onChange,",
  "  editando,\n  feedbackAbierto,\n  onToggleFeedback,\n  onEditar,\n  onChange,",
  'propiedades de MealPanel',
);

reemplazarUna(
  "  editando: boolean;\n  onEditar: () => void;\n  onChange: (platos: string[]) => void;",
  "  editando: boolean;\n  feedbackAbierto: boolean;\n  onToggleFeedback: () => void;\n  onEditar: () => void;\n  onChange: (platos: string[]) => void;",
  'tipos de MealPanel',
);

reemplazarUna(
  "              className={`meal-dish-card${indice === 0 ? ' meal-dish-card--primary' : ' meal-dish-card--secondary'}`}\n            >",
  "              className={`meal-dish-card meal-dish-card--feedback-toggle${indice === 0 ? ' meal-dish-card--primary' : ' meal-dish-card--secondary'}`}\n              role=\"button\"\n              tabIndex={editando ? -1 : 0}\n              aria-expanded={feedbackAbierto}\n              aria-label={`Valorar ${plato}`}\n              title=\"Toca para valorar esta comida\"\n              onClick={() => {\n                if (!editando) onToggleFeedback();\n              }}\n              onKeyDown={(evento) => {\n                if (!editando && (evento.key === 'Enter' || evento.key === ' ')) {\n                  evento.preventDefault();\n                  onToggleFeedback();\n                }\n              }}\n            >",
  'tarjeta de receta pulsable',
);

reemplazarUna(
  "      </div>\n\n      {editando && (\n        <div className=\"meal-editor-v2\">",
  "      </div>\n\n      {feedbackAbierto && !editando && (\n        <MealFeedback\n          dia={dia}\n          momento={momento}\n          titulo={titulo}\n          seleccion={seleccion}\n        />\n      )}\n\n      {editando && (\n        <div className=\"meal-editor-v2\">",
  'desplegable de valoración bajo la receta',
);

fs.writeFileSync(rutaMenu, contenido);
console.log('✓ valoración compacta aplicada: los botones solo se muestran al tocar la receta');
