import fs from 'node:fs';

const ruta = 'src/pages/Perfil.tsx';
if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);

let contenido = fs.readFileSync(ruta, 'utf8');
const conExtension = "import Title from '../components/ui/Title.tsx';";
const sinExtension = "import Title from '../components/ui/Title';";

if (contenido.includes(conExtension)) {
  contenido = contenido.replace(conExtension, sinExtension);
  fs.writeFileSync(ruta, contenido, 'utf8');
}

console.log('✓ marcador de Perfil normalizado para la copia de seguridad');
