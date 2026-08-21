import fs from 'node:fs';

const ruta = 'src/pages/Recetas.tsx';
if (!fs.existsSync(ruta)) throw new Error('Falta src/pages/Recetas.tsx');

let contenido = fs.readFileSync(ruta, 'utf8');

function reemplazar(antes, despues, etiqueta) {
  if (contenido.includes(despues)) return;
  if (!contenido.includes(antes)) throw new Error(`No se pudo aplicar ${etiqueta}`);
  contenido = contenido.replace(antes, despues);
}

reemplazar(
  "  const [selectorEditorIndice, setSelectorEditorIndice] =\n    useState<number | null>(null);",
  "  const [selectorEditorIndice, setSelectorEditorIndice] =\n    useState<number | null>(null);\n  const [vistaRecetas, setVistaRecetas] = useState<'platos' | 'postres'>('platos');",
  'estado de pestaña Platos/Postres',
);

reemplazar(
  "        categoria: 'Otros',\n        tipo: 'plato',",
  "        categoria: vistaRecetas === 'postres' ? 'Postres' : 'Otros',\n        tipo: vistaRecetas === 'postres' ? 'postre' : 'plato',",
  'alta de receta según la pestaña activa',
);

reemplazar(
  "  const productoActual = ingredienteSelector\n    ? productosPorIngrediente[ingredienteSelector] ?? null\n    : null;\n\n  return (",
  "  const productoActual = ingredienteSelector\n    ? productosPorIngrediente[ingredienteSelector] ?? null\n    : null;\n\n  const recetasVisibles = useMemo(\n    () => recetas.filter((receta) =>\n      vistaRecetas === 'postres' ? esRecetaPostre(receta) : !esRecetaPostre(receta),\n    ),\n    [recetas, vistaRecetas],\n  );\n  const totalPlatos = recetas.filter((receta) => !esRecetaPostre(receta)).length;\n  const totalPostres = recetas.filter((receta) => esRecetaPostre(receta)).length;\n\n  return (",
  'filtro de recetas por tipo',
);

reemplazar(
  "      <section style={estiloCuadricula}>\n        {recetas.map((receta) => {",
  "      <div\n        role=\"tablist\"\n        aria-label=\"Tipo de receta\"\n        style={{\n          display: 'grid',\n          gridTemplateColumns: '1fr 1fr',\n          gap: 8,\n          padding: 6,\n          marginBottom: 16,\n          borderRadius: 18,\n          background: 'rgba(255,252,245,.86)',\n          border: '1px solid rgba(79,111,82,.16)',\n          boxShadow: '0 8px 22px rgba(49,73,53,.07)',\n        }}\n      >\n        <button\n          type=\"button\"\n          role=\"tab\"\n          aria-selected={vistaRecetas === 'platos'}\n          onClick={() => setVistaRecetas('platos')}\n          style={{\n            border: 0,\n            borderRadius: 14,\n            padding: '12px 10px',\n            background: vistaRecetas === 'platos' ? '#4f6f52' : 'transparent',\n            color: vistaRecetas === 'platos' ? '#fff' : '#4f6f52',\n            fontWeight: 850,\n            fontSize: 15,\n            cursor: 'pointer',\n          }}\n        >\n          🍽️ Platos · {totalPlatos}\n        </button>\n        <button\n          type=\"button\"\n          role=\"tab\"\n          aria-selected={vistaRecetas === 'postres'}\n          onClick={() => setVistaRecetas('postres')}\n          style={{\n            border: 0,\n            borderRadius: 14,\n            padding: '12px 10px',\n            background: vistaRecetas === 'postres' ? '#4f6f52' : 'transparent',\n            color: vistaRecetas === 'postres' ? '#fff' : '#4f6f52',\n            fontWeight: 850,\n            fontSize: 15,\n            cursor: 'pointer',\n          }}\n        >\n          🍰 Postres · {totalPostres}\n        </button>\n      </div>\n\n      {recetasVisibles.length === 0 && (\n        <Card style={{ marginBottom: 16, textAlign: 'center' }}>\n          <p style={{ margin: 0, color: '#6f796f' }}>\n            {vistaRecetas === 'postres'\n              ? 'Todavía no hay postres guardados.'\n              : 'Todavía no hay platos guardados.'}\n          </p>\n        </Card>\n      )}\n\n      <section style={estiloCuadricula}>\n        {recetasVisibles.map((receta) => {",
  'pestañas visuales y listado filtrado',
);

fs.writeFileSync(ruta, contenido, 'utf8');
console.log('✓ Recetario separado en pestañas Platos y Postres');
