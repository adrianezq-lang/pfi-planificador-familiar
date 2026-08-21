import fs from 'node:fs';

const ruta = 'src/pages/Perfil.tsx';
if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);
let contenido = fs.readFileSync(ruta, 'utf8');

function insertarTras(marcador, insercion, etiqueta) {
  if (contenido.includes(insercion.trim())) return;
  if (!contenido.includes(marcador)) throw new Error(`No se encontró ${etiqueta}`);
  contenido = contenido.replace(marcador, `${marcador}${insercion}`);
}

insertarTras(
  "import Title from '../components/ui/Title';",
  "\nimport CopiaSeguridadPanel from '../components/CopiaSeguridadPanel';",
  'zona de imports de Perfil',
);

const cierre = `      </Card>\n\n    </main>`;
const bloque = `      </Card>\n\n      <Card>\n        <CopiaSeguridadPanel />\n      </Card>\n\n    </main>`;
if (!contenido.includes('<CopiaSeguridadPanel />')) {
  if (!contenido.includes(cierre)) throw new Error('No se encontró el cierre esperado de Perfil.');
  contenido = contenido.replace(cierre, bloque);
}

fs.writeFileSync(ruta, contenido, 'utf8');
console.log('✓ Perfil incluye exportación e importación de copia de seguridad');
