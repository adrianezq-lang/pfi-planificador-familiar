import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve('src');

function archivosCodigo(directorio) {
  const salida = [];
  if (!fs.existsSync(directorio)) return salida;

  for (const entrada of fs.readdirSync(directorio, { withFileTypes: true })) {
    const ruta = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) {
      salida.push(...archivosCodigo(ruta));
    } else if (/\.(?:ts|tsx)$/i.test(entrada.name)) {
      salida.push(ruta);
    }
  }
  return salida;
}

function resolver(rutaArchivo, especificador) {
  if (!especificador.startsWith('.')) return null;
  if (/\.[a-z0-9]+$/i.test(especificador)) return null;

  const base = path.resolve(path.dirname(rutaArchivo), especificador);
  const candidatos = [
    ['.ts', `${base}.ts`],
    ['.tsx', `${base}.tsx`],
    ['/index.ts', path.join(base, 'index.ts')],
    ['/index.tsx', path.join(base, 'index.tsx')],
  ];

  const encontrado = candidatos.find(([, absoluto]) => fs.existsSync(absoluto));
  return encontrado?.[0] ?? null;
}

let archivosModificados = 0;
let importsModificados = 0;

for (const ruta of archivosCodigo(raiz)) {
  const original = fs.readFileSync(ruta, 'utf8');
  let cambiosArchivo = 0;

  const actualizado = original.replace(
    /((?:from\s+|import\s*\(\s*)['"])(\.{1,2}\/[^'"]+)(['"])/g,
    (coincidencia, inicio, especificador, final) => {
      const sufijo = resolver(ruta, especificador);
      if (!sufijo) return coincidencia;
      cambiosArchivo += 1;
      importsModificados += 1;
      return `${inicio}${especificador}${sufijo}${final}`;
    },
  );

  if (cambiosArchivo > 0) {
    fs.writeFileSync(ruta, actualizado, 'utf8');
    archivosModificados += 1;
  }
}

console.log(
  `✓ imports Node normalizados: ${importsModificados} en ${archivosModificados} archivos`,
);
