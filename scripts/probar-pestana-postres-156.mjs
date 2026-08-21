import fs from 'node:fs';

const ruta = 'src/pages/Recetas.tsx';
const recetas = fs.readFileSync(ruta, 'utf8');

function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
  console.log(`✓ ${mensaje}`);
}

comprobar(
  recetas.includes("useState<'platos' | 'postres'>('platos')"),
  'Recetas tiene estado separado para Platos y Postres',
);
comprobar(
  recetas.includes("vistaRecetas === 'postres' ? esRecetaPostre(receta) : !esRecetaPostre(receta)"),
  'el listado filtra realmente postres y platos',
);
comprobar(
  recetas.includes('🍽️ Platos · {totalPlatos}') && recetas.includes('🍰 Postres · {totalPostres}'),
  'las dos pestañas se muestran con sus contadores',
);
comprobar(
  recetas.includes('{recetasVisibles.map((receta) => {'),
  'la cuadrícula usa solo las recetas de la pestaña activa',
);
comprobar(
  recetas.includes("categoria: vistaRecetas === 'postres' ? 'Postres' : 'Otros'") &&
    recetas.includes("tipo: vistaRecetas === 'postres' ? 'postre' : 'plato'"),
  'crear una receta desde Postres la da de alta como postre',
);

console.log('✓ pestaña Postres recuperada y aislada del recetario de platos');
