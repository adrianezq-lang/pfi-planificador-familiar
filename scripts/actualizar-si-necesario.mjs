import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const archivoCatalogo = path.join(raiz, 'public', 'catalogo-mercadona.json');
const maxHoras = Math.max(1, Number(process.env.PFI_MERCADONA_MAX_HORAS ?? 24));
const esEntornoDespliegue = process.env.VERCEL === '1' || process.env.CI === 'true';

async function fechaUltimaActualizacion() {
  try {
    const contenido = JSON.parse(await readFile(archivoCatalogo, 'utf8'));
    const fechaJson = Date.parse(String(contenido.actualizado ?? ''));
    if (Number.isFinite(fechaJson)) return fechaJson;
  } catch {
    // Usamos la fecha del archivo como alternativa.
  }

  try {
    return (await stat(archivoCatalogo)).mtimeMs;
  } catch {
    return 0;
  }
}

function ejecutar(script) {
  const resultado = spawnSync(process.execPath, [path.join(raiz, 'scripts', script)], {
    cwd: raiz,
    stdio: 'inherit',
    env: process.env,
  });

  if (resultado.status !== 0) {
    throw new Error(`${script} terminó con código ${resultado.status ?? 'desconocido'}`);
  }
}

try {
  if (esEntornoDespliegue) {
    console.log('✓ Despliegue: se usa el catálogo Mercadona incluido en el proyecto.');
    process.exit(0);
  }

  const ultima = await fechaUltimaActualizacion();
  const antiguedadHoras = (Date.now() - ultima) / 3_600_000;

  if (ultima > 0 && antiguedadHoras < maxHoras) {
    console.log(`✓ Catálogo Mercadona vigente (${antiguedadHoras.toFixed(1)} h).`);
  } else {
    console.log(`↻ Actualizando catálogo y precios de Mercadona para el CP configurado…`);
    ejecutar('descargar-catalogo-mercadona.mjs');
    ejecutar('actualizar-precios-mercadona.mjs');
    console.log('✓ Catálogo y precios actualizados.');
  }
} catch (error) {
  console.warn('⚠ No se pudieron actualizar los precios. PFI arrancará con el último catálogo guardado.');
  console.warn(error instanceof Error ? error.message : String(error));
}
