import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const raiz = path.dirname(fileURLToPath(import.meta.url));
let actualizacionEnCurso: Promise<void> | null = null;

function ejecutarScript(nombre: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proceso = spawn(process.execPath, [path.join(raiz, 'scripts', nombre)], {
      cwd: raiz,
      env: process.env,
      stdio: 'inherit',
    });

    proceso.once('error', reject);
    proceso.once('exit', (codigo) => {
      if (codigo === 0) resolve();
      else reject(new Error(`${nombre} terminó con código ${codigo ?? 'desconocido'}.`));
    });
  });
}

function actualizadorMercadona(): Plugin {
  return {
    name: 'pfi-actualizador-mercadona',
    configureServer(servidor) {
      servidor.middlewares.use(
        '/api/pfi/mercadona/actualizar-completo',
        async (peticion, respuesta) => {
          respuesta.setHeader('Content-Type', 'application/json; charset=utf-8');

          if (peticion.method !== 'POST') {
            respuesta.statusCode = 405;
            respuesta.end(JSON.stringify({ ok: false, error: 'Método no permitido.' }));
            return;
          }

          try {
            if (!actualizacionEnCurso) {
              actualizacionEnCurso = (async () => {
                await ejecutarScript('descargar-catalogo-mercadona.mjs');
                await ejecutarScript('actualizar-precios-mercadona.mjs');
              })().finally(() => {
                actualizacionEnCurso = null;
              });
            }

            await actualizacionEnCurso;
            respuesta.statusCode = 200;
            respuesta.end(JSON.stringify({ ok: true }));
          } catch (error) {
            respuesta.statusCode = 500;
            respuesta.end(
              JSON.stringify({
                ok: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          }
        },
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), actualizadorMercadona()],
});
