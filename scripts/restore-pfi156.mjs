import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const bundleDir = path.resolve('bundle-pfi156');
const parts = fs.readdirSync(bundleDir)
  .filter((name) => /^part\d+\.b64$/.test(name))
  .sort();

if (parts.length === 0) {
  throw new Error('PFI 1.5.6: no se han encontrado fragmentos del paquete integral.');
}

const encoded = parts.map((name) => fs.readFileSync(path.join(bundleDir, name), 'utf8').trim()).join('');
const archive = Buffer.from(encoded, 'base64');
const hash = crypto.createHash('sha256').update(archive).digest('hex');
const expected = '40513a2695d15f6b04223d3cfa81942f4e48f57622bf23f62f733ff7fb545b1b';
if (hash !== expected) {
  throw new Error(`PFI 1.5.6: paquete incompleto o corrupto. SHA esperado ${expected}; recibido ${hash}`);
}

const archivePath = '/tmp/pfi156-text-overlay.tar.xz';
fs.writeFileSync(archivePath, archive);
execFileSync('tar', ['-xJf', archivePath, '-C', process.cwd()], { stdio: 'inherit' });
console.log(`PFI 1.5.6 integral restaurada correctamente desde ${parts.length} fragmentos.`);
