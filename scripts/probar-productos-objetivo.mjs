import fs from 'node:fs';

const objetivos = JSON.parse(
  fs.readFileSync(new URL('./productos-objetivo.json', import.meta.url), 'utf8'),
);

const porIngrediente = new Map(
  objetivos.map((objetivo) => [objetivo.ingrediente, objetivo]),
);

if (porIngrediente.has('Pollo')) {
  throw new Error('El actualizador no debe volver a usar el alias genérico Pollo.');
}

const esperados = {
  'Carne picada': '2869',
  'Calabacín': '69338',
  'Pimiento rojo': '69310',
  'Pimiento tricolor': '69495',
  'Pepino': '69584',
  'Ajo': '69297',
  'Pollo entero': '2781',
  'Jamoncitos de pollo': '2778',
  'Pollo para arroz': '3724',
  'Pechugas de pollo': '3724',
  'Lomo': '3395',
  'Lubina': '81241.1',
  'Dorada': '81234.1',
  'Bacalao': '87211',
  'Guacamole': '3840',
};

for (const [ingrediente, productoId] of Object.entries(esperados)) {
  const objetivo = porIngrediente.get(ingrediente);
  if (!objetivo || String(objetivo.productoId) !== productoId) {
    throw new Error(
      `${ingrediente} debe usar ${productoId}, no ${objetivo?.productoId ?? 'sin SKU'}.`,
    );
  }
}

for (const ingrediente of ['Patatas', 'Cebolla', 'Zanahorias', 'Almejas', 'Mayonesa']) {
  const objetivo = porIngrediente.get(ingrediente);
  if (!objetivo) {
    throw new Error(`Falta el objetivo manual ${ingrediente}.`);
  }
  if (objetivo.productoId) {
    throw new Error(`${ingrediente} debe seguir sin SKU forzado.`);
  }
}

console.log('✓ el actualizador no usa Pollo genérico');
console.log('✓ los frescos inequívocos usan SKU exacto');
console.log('✓ los productos con formato/preferencia ambigua siguen manuales');
