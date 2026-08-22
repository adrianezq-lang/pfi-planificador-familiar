import fs from 'node:fs';

const raiz = process.cwd();
const rutaMenu = `${raiz}/src/pages/Menu.tsx`;
const rutaCss = `${raiz}/src/index.css`;
const overrideConservacion = `${raiz}/scripts/overrides/conservacion-156.ts`;
const overridePanel = `${raiz}/scripts/overrides/ConservacionPanel-156.tsx`;

for (const ruta of [rutaMenu, rutaCss, overrideConservacion, overridePanel]) {
  if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);
}

fs.copyFileSync(overrideConservacion, `${raiz}/src/services/conservacion.ts`);
fs.copyFileSync(overridePanel, `${raiz}/src/components/ConservacionPanel.tsx`);

let menu = fs.readFileSync(rutaMenu, 'utf8');

if (!menu.includes("from '../services/conservacion")) {
  const patron = /import \{([\s\S]*?)\} from '\.\.\/services\/aprendizaje(?:\.ts)?';/;
  const encontrado = menu.match(patron)?.[0];
  if (!encontrado) throw new Error('No se encontró el import de aprendizaje en Menu.');
  menu = menu.replace(
    encontrado,
    `${encontrado}\nimport {\n  eliminarSobraOrigen,\n  obtenerSobraPorOrigen,\n  registrarSobraDesdeMenu,\n} from '../services/conservacion';`,
  );
}

const bloqueDia = `        <div className="active-day__meals">
          <div className="meal-day-stack">
            <MealPanel
              dia={diaActivo.dia}
              semanaActiva={semanaActiva}
              momento="comida"
              titulo="Comida"
              subtitulo="Mediodía"
              icono="🍽️"
              seleccion={diaActivo.comida}
              recetas={recetasPlatos}
              editando={
                editorActivo?.indice === indiceActivo &&
                editorActivo.momento === 'comida'
              }
              feedbackAbierto={feedbackActivo === 'comida'}
              onToggleFeedback={() =>
                setFeedbackActivo((actual) => actual === 'comida' ? null : 'comida')
              }
              onEditar={() =>
                setEditorActivo((actual) =>
                  actual?.indice === indiceActivo && actual.momento === 'comida'
                    ? null
                    : { indice: indiceActivo, momento: 'comida' },
                )
              }
              onChange={(platos) =>
                cambiarComposicion(indiceActivo, 'comida', platos)
              }
            />
            <DessertSelector
              momento="Postre de la comida"
              seleccion={obtenerRecetaPostre(diaActivo, 'comida')}
              recetas={recetasPostres}
              onChange={(nombreReceta) =>
                cambiarPostre(indiceActivo, 'comida', nombreReceta)
              }
            />
          </div>

          <div className="meal-day-stack">
            <MealPanel
              dia={diaActivo.dia}
              semanaActiva={semanaActiva}
              momento="cena"
              titulo="Cena"
              subtitulo="Noche"
              icono="🌙"
              seleccion={diaActivo.cena}
              recetas={recetasPlatos}
              editando={
                editorActivo?.indice === indiceActivo &&
                editorActivo.momento === 'cena'
              }
              feedbackAbierto={feedbackActivo === 'cena'}
              onToggleFeedback={() =>
                setFeedbackActivo((actual) => actual === 'cena' ? null : 'cena')
              }
              onEditar={() =>
                setEditorActivo((actual) =>
                  actual?.indice === indiceActivo && actual.momento === 'cena'
                    ? null
                    : { indice: indiceActivo, momento: 'cena' },
                )
              }
              onChange={(platos) =>
                cambiarComposicion(indiceActivo, 'cena', platos)
              }
            />
            <DessertSelector
              momento="Postre de la cena"
              seleccion={obtenerRecetaPostre(diaActivo, 'cena')}
              recetas={recetasPostres}
              onChange={(nombreReceta) =>
                cambiarPostre(indiceActivo, 'cena', nombreReceta)
              }
            />
          </div>
        </div>

`;

if (!menu.includes('className="meal-day-stack"')) {
  const patronBloque = /        <div className="active-day__meals">[\s\S]*?        <div className="tomorrow-prep">/;
  if (!patronBloque.test(menu)) throw new Error('No se encontró el bloque de comidas/postres del día.');
  menu = menu.replace(patronBloque, `${bloqueDia}        <div className="tomorrow-prep">`);
}

if (!menu.includes('  semanaActiva,\n  momento,')) {
  menu = menu.replace(
    'function MealPanel({\n  dia,\n  momento,',
    'function MealPanel({\n  dia,\n  semanaActiva,\n  momento,',
  );
}
if (!menu.includes('  semanaActiva: number;\n  momento: MomentoMenu;')) {
  menu = menu.replace(
    '  dia: string;\n  momento: MomentoMenu;',
    '  dia: string;\n  semanaActiva: number;\n  momento: MomentoMenu;',
  );
}

if (!menu.includes('          semanaActiva={semanaActiva}\n          momento={momento}')) {
  menu = menu.replace(
    '        <MealFeedback\n          dia={dia}\n          momento={momento}',
    '        <MealFeedback\n          dia={dia}\n          semanaActiva={semanaActiva}\n          momento={momento}',
  );
}

if (!menu.includes('function MealFeedback({\n  dia,\n  semanaActiva,')) {
  menu = menu.replace(
    'function MealFeedback({\n  dia,\n  momento,',
    'function MealFeedback({\n  dia,\n  semanaActiva,\n  momento,',
  );
}

const firmaFeedback = `  dia: string;
  semanaActiva: number;
  momento: MomentoMenu;
  titulo: string;
  seleccion: string[];
}) {`;
if (!menu.includes(firmaFeedback)) {
  menu = menu.replace(
    `  dia: string;
  momento: MomentoMenu;
  titulo: string;
  seleccion: string[];
}) {`,
    firmaFeedback,
  );
}

if (!menu.includes('const [registrandoSobra, setRegistrandoSobra]')) {
  menu = menu.replace(
    `}) {
  const esEspecial = seleccion.some(esOpcionEspecial);`,
    `}) {
  const [registrandoSobra, setRegistrandoSobra] = useState(false);
  const [racionesSobra, setRacionesSobra] = useState(1);
  const mesActual = new Date().toISOString().slice(0, 7);
  const origenSobra = \`menu:\${mesActual}:semana-\${semanaActiva + 1}:\${dia}:\${momento}\`;
  const sobraGuardada = obtenerSobraPorOrigen(origenSobra);
  const esEspecial = seleccion.some(esOpcionEspecial);`,
  );
}

const valorarAnterior = `  const valorar = (resultado: ResultadoComida) => {
    registrarResultadoComida(dia, momento, seleccion, resultado);
  };`;
const valorarNuevo = `  const valorar = (resultado: ResultadoComida) => {
    registrarResultadoComida(dia, momento, seleccion, resultado);
    if (resultado === 'sobro') {
      setRacionesSobra(sobraGuardada?.cantidad ?? 1);
      setRegistrandoSobra(true);
      return;
    }
    eliminarSobraOrigen(origenSobra);
    setRegistrandoSobra(false);
  };

  const guardarSobra = () => {
    registrarSobraDesdeMenu({
      origen: origenSobra,
      nombre: formatearPlatosMenu(seleccion),
      cantidad: Math.max(0.5, racionesSobra),
      notas: \`\${dia} · \${momento}\`,
    });
    setRegistrandoSobra(false);
  };`;
if (!menu.includes('const guardarSobra = () =>')) {
  if (!menu.includes(valorarAnterior)) throw new Error('No se encontró la función de valoración.');
  menu = menu.replace(valorarAnterior, valorarNuevo);
}

const marcadorAjustes = `      {ajustes.length > 0 && (`;
if (!menu.includes('className="leftover-capture"')) {
  const captura = `      {registrandoSobra && (
        <div className="leftover-capture">
          <div>
            <strong>🍲 ¿Cuánto quedó?</strong>
            <span>Se guardará en Despensa → Sobras.</span>
          </div>
          <div className="leftover-capture__actions">
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={racionesSobra}
              onChange={(evento) => setRacionesSobra(Number(evento.target.value))}
              aria-label="Raciones que han sobrado"
            />
            <span>raciones</span>
            <button type="button" onClick={guardarSobra}>Guardar sobra</button>
            <button type="button" className="leftover-capture__cancel" onClick={() => setRegistrandoSobra(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {!registrandoSobra && sobraGuardada && (
        <div className="leftover-saved">
          <span>🍲 {sobraGuardada.cantidad.toLocaleString('es-ES')} ración{sobraGuardada.cantidad === 1 ? '' : 'es'} guardada{sobraGuardada.cantidad === 1 ? '' : 's'} en Sobras</span>
          <button
            type="button"
            onClick={() => {
              setRacionesSobra(sobraGuardada.cantidad);
              setRegistrandoSobra(true);
            }}
          >
            Cambiar
          </button>
        </div>
      )}
`;
  const indice = menu.indexOf(marcadorAjustes, menu.indexOf('function MealFeedback'));
  if (indice < 0) throw new Error('No se encontró el punto para insertar el registro de sobras.');
  menu = `${menu.slice(0, indice)}${captura}${menu.slice(indice)}`;
}

menu = menu.replace(
  'className="meal-feedback-v2 meal-feedback-v2--after-dessert"',
  'className="meal-feedback-v2 meal-feedback-v2--compact"',
);

fs.writeFileSync(rutaMenu, menu, 'utf8');

let css = fs.readFileSync(rutaCss, 'utf8');
const estilos = `

/* PFI 1.5.6 · postres junto a cada comida + sobras funcionales */
.meal-day-stack {
  display: grid;
  align-content: start;
  gap: 10px;
  min-width: 0;
}

.meal-day-stack > .daily-dessert {
  margin: 0;
}

.leftover-capture,
.leftover-saved {
  margin-top: 10px;
  border: 1px solid rgba(82, 116, 90, 0.2);
  border-radius: 14px;
  background: rgba(233, 240, 229, 0.75);
  color: var(--ink);
}

.leftover-capture {
  display: grid;
  gap: 9px;
  padding: 11px 12px;
}

.leftover-capture > div:first-child {
  display: grid;
  gap: 2px;
}

.leftover-capture > div:first-child span {
  color: var(--muted);
  font-size: 12px;
}

.leftover-capture__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
}

.leftover-capture__actions input {
  width: 76px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-strong);
  padding: 8px 9px;
}

.leftover-capture__actions button,
.leftover-saved button {
  border: 0;
  border-radius: 10px;
  background: var(--sage-700);
  color: #fff;
  padding: 8px 10px;
  font-weight: 800;
  cursor: pointer;
}

.leftover-capture__actions .leftover-capture__cancel {
  background: transparent;
  color: var(--muted);
}

.leftover-saved {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  padding: 9px 11px;
  color: var(--sage-800);
  font-size: 12px;
  font-weight: 750;
}

@media (max-width: 640px) {
  .leftover-saved {
    align-items: flex-start;
  }
}
`;
if (!css.includes('PFI 1.5.6 · postres junto a cada comida')) {
  css += estilos;
  fs.writeFileSync(rutaCss, css, 'utf8');
}

console.log('✓ Menú: postre bajo su comida/cena; Abiertos/Congelados vinculados al inventario; Sobras por raciones');
