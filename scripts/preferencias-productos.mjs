import fs from 'node:fs';
import path from 'node:path';

const RUTA_PREFERENCIAS = path.resolve(
  'scripts/productos-preferidos.json',
);

export function cargarPreferenciasProductos() {
  if (!fs.existsSync(RUTA_PREFERENCIAS)) {
    console.warn(
      '⚠️ No existe scripts/productos-preferidos.json',
    );

    return {};
  }

  let contenido;

  try {
    contenido = JSON.parse(
      fs.readFileSync(
        RUTA_PREFERENCIAS,
        'utf8',
      ),
    );
  } catch {
    throw new Error(
      'productos-preferidos.json no contiene un JSON válido.',
    );
  }

  if (
    contenido === null ||
    Array.isArray(contenido) ||
    typeof contenido !== 'object'
  ) {
    throw new Error(
      'productos-preferidos.json debe contener un objeto.',
    );
  }

  const preferenciasNormalizadas = {};

  Object.entries(contenido).forEach(
    ([ingrediente, opciones]) => {
      if (!Array.isArray(opciones)) {
        throw new Error(
          `La preferencia "${ingrediente}" debe contener una lista.`,
        );
      }

      if (opciones.length === 0) {
        return;
      }

      const opcionesValidas = opciones.map(
        (opcion, indice) => {
          if (
            !opcion ||
            typeof opcion !== 'object' ||
            typeof opcion.buscar !== 'string' ||
            opcion.buscar.trim() === ''
          ) {
            throw new Error(
              `La opción ${indice + 1} de "${ingrediente}" no es válida.`,
            );
          }

          const porcentaje =
            typeof opcion.porcentaje === 'number'
              ? opcion.porcentaje
              : 100;

          if (
            porcentaje <= 0 ||
            porcentaje > 100
          ) {
            throw new Error(
              `El porcentaje de "${ingrediente}" debe estar entre 1 y 100.`,
            );
          }

          return {
            buscar: opcion.buscar.trim(),
            porcentaje,
            productoId: opcion.productoId
              ? String(opcion.productoId)
              : null,
          };
        },
      );

      const totalPorcentaje =
        opcionesValidas.reduce(
          (total, opcion) =>
            total + opcion.porcentaje,
          0,
        );

      if (
        opcionesValidas.length > 1 &&
        totalPorcentaje !== 100
      ) {
        throw new Error(
          `Los porcentajes de "${ingrediente}" suman ${totalPorcentaje}%. Deben sumar 100%.`,
        );
      }

      preferenciasNormalizadas[ingrediente] =
        opcionesValidas;
    },
  );

  return preferenciasNormalizadas;
}

export function obtenerPreferenciasIngrediente(
  preferencias,
  ingrediente,
) {
  return preferencias[ingrediente] ?? [];
}

export function mostrarResumenPreferencias(
  preferencias,
) {
  const ingredientes =
    Object.keys(preferencias);

  console.log('');
  console.log('⭐ Productos preferidos');
  console.log(
    `Preferencias configuradas: ${ingredientes.length}`,
  );

  ingredientes.forEach((ingrediente) => {
    const opciones =
      preferencias[ingrediente];

    if (opciones.length === 1) {
      console.log(
        `  ${ingrediente}: ${opciones[0].buscar}`,
      );

      return;
    }

    console.log(`  ${ingrediente}:`);

    opciones.forEach((opcion) => {
      console.log(
        `    ${opcion.porcentaje}% · ${opcion.buscar}`,
      );
    });
  });

  console.log('');
}