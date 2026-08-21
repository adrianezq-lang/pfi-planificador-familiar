import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const raiz = process.cwd();
const respaldo = path.join(raiz, '.pfi-ui-1.5.5', 'src');
const src = path.join(raiz, 'src');

function listar(dir) {
  if (!fs.existsSync(dir)) return [];
  const salida = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name);
    if (entrada.isDirectory()) salida.push(...listar(ruta));
    else if (/\.(?:ts|tsx|js|jsx|css)$/i.test(entrada.name)) salida.push(ruta);
  }
  return salida;
}

function hash(ruta) {
  return crypto.createHash('sha1').update(fs.readFileSync(ruta)).digest('hex');
}

function relativo(ruta) {
  return path.relative(raiz, ruta).replaceAll('\\', '/');
}

const patrones = {
  excepciones: /excepci|solo adultos|sin niñ|no.*comemos.*casa|fuera.*casa|esta semana/i,
  conservacion: /sobras?|congelad|abiert[oa]s?|caduc|nevera|congelador/i,
  asistente: /asistente|chat|comando|interpretar.*cambio|pedir.*cambio|mensaje.*usuario/i,
};

const archivos = listar(src);
const diferencias = [];
const coincidencias = [];

for (const archivo of archivos) {
  const relSrc = path.relative(src, archivo);
  const anterior = path.join(respaldo, relSrc);
  const zonaInterfaz = relSrc === 'App.tsx' || relSrc.startsWith(`pages${path.sep}`) || relSrc.startsWith(`components${path.sep}`) || relSrc.startsWith(`styles${path.sep}`) || relSrc === 'index.css';

  if (zonaInterfaz) {
    if (!fs.existsSync(anterior)) {
      diferencias.push({ tipo: 'NUEVO', archivo: relativo(archivo) });
    } else if (hash(archivo) !== hash(anterior)) {
      diferencias.push({ tipo: 'CAMBIADO', archivo: relativo(archivo) });
    }
  }

  const texto = fs.readFileSync(archivo, 'utf8');
  const categorias = Object.entries(patrones)
    .filter(([, patron]) => patron.test(texto))
    .map(([nombre]) => nombre);

  if (categorias.length === 0) continue;

  const lineas = texto.split(/\r?\n/);
  const muestras = [];
  for (let i = 0; i < lineas.length && muestras.length < 8; i += 1) {
    if (Object.values(patrones).some((patron) => patron.test(lineas[i]))) {
      muestras.push(`${i + 1}: ${lineas[i].trim().slice(0, 180)}`);
    }
  }
  coincidencias.push({ archivo: relativo(archivo), categorias, muestras });
}

console.log('PFI 1.5.6 · diagnóstico de funciones antes de restaurar la UI 1.5.5');
console.log(`→ archivos UI nuevos/cambiados respecto a 1.5.5: ${diferencias.length}`);
for (const item of diferencias) console.log(`  [${item.tipo}] ${item.archivo}`);

console.log(`→ archivos relacionados con excepciones/conservación/asistente: ${coincidencias.length}`);
for (const item of coincidencias) {
  console.log(`  [${item.categorias.join(', ')}] ${item.archivo}`);
  for (const muestra of item.muestras) console.log(`    ${muestra}`);
}

if (coincidencias.length === 0) {
  console.warn('⚠ No se localizaron las funciones reclamadas dentro de la parte extraída del paquete truncado.');
}
