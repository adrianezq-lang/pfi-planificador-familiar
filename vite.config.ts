import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import {
  actualizarProductosCatalogo,
  buscarCatalogo,
} from './scripts/catalogos-supermercados.mjs';

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

function leerJsonPeticion(peticion: import('node:http').IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const trozos: Buffer[] = [];
    let total = 0;
    peticion.on('data', (trozo: Buffer) => {
      total += trozo.length;
      if (total > 262_144) {
        reject(new Error('Petición demasiado grande.'));
        peticion.destroy();
        return;
      }
      trozos.push(trozo);
    });
    peticion.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(trozos).toString('utf8') || '{}'));
      } catch {
        reject(new Error('JSON no válido.'));
      }
    });
    peticion.on('error', reject);
  });
}

function catalogosSupermercados(): Plugin {
  return {
    name: 'pfi-catalogos-supermercados',
    configureServer(servidor) {
      servidor.middlewares.use(
        '/api/pfi/comparador/catalogo',
        async (peticion, respuesta) => {
          respuesta.setHeader('Content-Type', 'application/json; charset=utf-8');
          try {
            if (peticion.method === 'POST') {
              const cuerpo = await leerJsonPeticion(peticion) as { items?: unknown[] };
              const resultados = await actualizarProductosCatalogo(cuerpo.items);
              respuesta.statusCode = 200;
              respuesta.end(JSON.stringify({ ok: true, resultados }));
              return;
            }
            if (peticion.method !== 'GET') {
              respuesta.statusCode = 405;
              respuesta.end(JSON.stringify({ ok: false, error: 'Método no permitido.' }));
              return;
            }

            const url = new URL(peticion.url ?? '/', 'http://pfi.local');
            const tiendaId = url.searchParams.get('tienda') ?? '';
            const consulta = url.searchParams.get('q') ?? '';
            const productos = await buscarCatalogo(tiendaId, consulta);
            respuesta.statusCode = 200;
            respuesta.end(JSON.stringify({
              ok: true,
              tiendaId,
              productos,
              aviso: tiendaId === 'eroski'
                ? 'Precio de la tienda online de referencia de Eroski; puede variar al elegir entrega.'
                : null,
            }));
          } catch (error) {
            respuesta.statusCode = 502;
            respuesta.end(JSON.stringify({
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            }));
          }
        },
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), actualizadorMercadona(), catalogosSupermercados()],
});
