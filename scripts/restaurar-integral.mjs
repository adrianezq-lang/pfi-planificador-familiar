import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archivo = path.join(raiz, 'pfi-1.5.6-overlay.tar.xz');

execFileSync('tar', ['-xJf', archivo, '-C', raiz], { stdio: 'inherit' });
console.log('✓ Código integral PFI 1.5.6 restaurado para el build.');
