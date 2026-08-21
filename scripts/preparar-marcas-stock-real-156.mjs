import fs from 'node:fs';

const cambios = [
  [
    'src/components/ProductoDetalleModal.tsx',
    "} from '../services/inventario.ts';",
    "} from '../services/inventario';",
  ],
  [
    'src/pages/Despensa.tsx',
    "import ConservacionPanel from '../components/ConservacionPanel.tsx';",
    "import ConservacionPanel from '../components/ConservacionPanel';",
  ],
];

for (const [ruta, conExtension, sinExtension] of cambios) {
  if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);
  let contenido = fs.readFileSync(ruta, 'utf8');
  if (contenido.includes(conExtension)) {
    contenido = contenido.replace(conExtension, sinExtension);
    fs.writeFileSync(ruta, contenido, 'utf8');
  }
}

console.log('✓ marcas del parche de stock real normalizadas');
