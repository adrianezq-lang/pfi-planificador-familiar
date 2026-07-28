import {
  cargarPreferenciasProductos,
  mostrarResumenPreferencias,
} from './preferencias-productos.mjs';

try {
  const preferencias =
    cargarPreferenciasProductos();

  mostrarResumenPreferencias(
    preferencias,
  );

  console.log(
    '✅ Preferencias leídas correctamente.',
  );
} catch (error) {
  console.error(
    `❌ ${error.message}`,
  );

  process.exit(1);
}