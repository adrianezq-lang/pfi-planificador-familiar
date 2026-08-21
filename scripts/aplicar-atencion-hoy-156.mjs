import fs from 'node:fs';

const ruta = 'src/pages/Home.tsx';
if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);
let contenido = fs.readFileSync(ruta, 'utf8');

if (!contenido.includes("from '../components/AtencionHoy")) {
  const patron = /import type \{ DiaMenu \} from '\.\.\/data\/Menusemanal(?:\.ts)?';/;
  const encontrado = contenido.match(patron)?.[0];
  if (!encontrado) throw new Error('No se encontró la zona de imports de Home.');
  contenido = contenido.replace(
    encontrado,
    `${encontrado}\nimport AtencionHoy from '../components/AtencionHoy';`,
  );
}

if (!contenido.includes('<AtencionHoy semanaActiva={semanaActiva} navegar={navegar} />')) {
  const marcador = `      </section>\n\n      <section\n        className={\`budget-grid${`;
  if (!contenido.includes(marcador)) {
    throw new Error('No se encontró la separación entre Inicio y presupuesto.');
  }
  contenido = contenido.replace(
    marcador,
    `      </section>\n\n      <AtencionHoy semanaActiva={semanaActiva} navegar={navegar} />\n\n      <section\n        className={\`budget-grid${`,
  );
}

fs.writeFileSync(ruta, contenido, 'utf8');
console.log('✓ Atención hoy integrada en Inicio');
