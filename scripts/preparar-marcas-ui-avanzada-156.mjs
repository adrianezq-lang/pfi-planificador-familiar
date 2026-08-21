import fs from 'node:fs';

const cambios = [
  ['src/App.tsx', "import BottomNav from './components/NavegacionInferior.tsx';", "import BottomNav from './components/NavegacionInferior';"],
  ['src/pages/Despensa.tsx', "import ProductoDetalleModal from '../components/ProductoDetalleModal.tsx';", "import ProductoDetalleModal from '../components/ProductoDetalleModal';"],
];

for (const [ruta, conExtension, sinExtension] of cambios) {
  if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);
  let contenido = fs.readFileSync(ruta, 'utf8');
  if (contenido.includes(conExtension)) {
    contenido = contenido.replace(conExtension, sinExtension);
    fs.writeFileSync(ruta, contenido, 'utf8');
  }
}

console.log('✓ marcas de integración UI normalizadas para el parche avanzado');
