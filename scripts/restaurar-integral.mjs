import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archivoCodificado = path.join(raiz, 'pfi-1.5.6-overlay.tar.xz');
const archivoXz = path.join(raiz, '.pfi-1.5.6-overlay-decoded.tar.xz');

const texto = fs.readFileSync(archivoCodificado, 'utf8').replace(/\s+/g, '');
const contenido = Buffer.from(texto, 'base64');
const cabeceraXz = Buffer.from([0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00]);

if (contenido.length < cabeceraXz.length || !contenido.subarray(0, cabeceraXz.length).equals(cabeceraXz)) {
  throw new Error('El paquete integral PFI 1.5.6 no contiene un XZ válido.');
}

fs.writeFileSync(archivoXz, contenido);
try {
  execFileSync('tar', ['-xJf', archivoXz, '-C', raiz], { stdio: 'inherit' });
} finally {
  fs.rmSync(archivoXz, { force: true });
}

console.log('✓ Código integral PFI 1.5.6 restaurado para el build.');
