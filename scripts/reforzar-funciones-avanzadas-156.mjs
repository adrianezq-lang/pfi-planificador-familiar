import fs from 'node:fs';

function leer(ruta) {
  if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);
  return fs.readFileSync(ruta, 'utf8');
}
function guardar(ruta, contenido) { fs.writeFileSync(ruta, contenido, 'utf8'); }

function reforzarCompra() {
  const ruta = 'src/pages/Compra.tsx';
  let contenido = leer(ruta);

  if (!contenido.includes('EVENTO_EXCEPCIONES_SEMANA')) {
    const marcador = "import SelectorProductoIngrediente";
    const posicion = contenido.indexOf(marcador);
    if (posicion < 0) throw new Error('No se encontró la zona de imports de Compra');
    contenido =
      contenido.slice(0, posicion) +
      "import { EVENTO_EXCEPCIONES_SEMANA } from '../services/excepcionesSemana';\n" +
      "import { EVENTO_CONSERVACION } from '../services/conservacion';\n" +
      contenido.slice(posicion);
  }

  const alta = '    window.addEventListener(EVENTO_ASOCIACIONES, actualizar);';
  if (!contenido.includes('window.addEventListener(EVENTO_EXCEPCIONES_SEMANA, actualizar);')) {
    if (!contenido.includes(alta)) throw new Error('No se encontró el alta de eventos de Compra');
    contenido = contenido.replace(
      alta,
      `${alta}\n    window.addEventListener(EVENTO_EXCEPCIONES_SEMANA, actualizar);\n    window.addEventListener(EVENTO_CONSERVACION, actualizar);`,
    );
  }

  const baja = `      window.removeEventListener(\n        EVENTO_ASOCIACIONES,\n        actualizar,\n      );`;
  if (!contenido.includes('window.removeEventListener(EVENTO_EXCEPCIONES_SEMANA, actualizar);')) {
    if (!contenido.includes(baja)) throw new Error('No se encontró la baja de eventos de Compra');
    contenido = contenido.replace(
      baja,
      `${baja}\n      window.removeEventListener(EVENTO_EXCEPCIONES_SEMANA, actualizar);\n      window.removeEventListener(EVENTO_CONSERVACION, actualizar);`,
    );
  }

  guardar(ruta, contenido);
}

function reforzarAsistente() {
  const ruta = 'src/services/asistentePfi.ts';
  let contenido = leer(ruta);

  if (!contenido.includes('cargarRecetas')) {
    const marcador = "import { anadirConservacion";
    const posicion = contenido.indexOf(marcador);
    if (posicion < 0) throw new Error('No se encontró la zona de imports del asistente');
    contenido =
      contenido.slice(0, posicion) +
      "import { cargarRecetas } from './recetas';\n" +
      contenido.slice(posicion);
  }

  const anterior = `    const plato = cambio[3].trim();\n    if (diaCambio && plato) {\n      return {\n        entendido: true,\n        respuesta: \`He cambiado la \${momentoCambio} del \${diaCambio.toLocaleLowerCase('es')} por \${plato}.\`,\n        menu: cambiarPlato(menu, diaCambio, momentoCambio, plato),\n      };\n    }`;
  const nuevo = `    const solicitado = cambio[3].trim();\n    const plato = cargarRecetas().find(\n      (receta) => normalizar(receta.nombre) === normalizar(solicitado),\n    )?.nombre;\n    if (diaCambio && plato) {\n      return {\n        entendido: true,\n        respuesta: \`He cambiado la \${momentoCambio} del \${diaCambio.toLocaleLowerCase('es')} por \${plato}.\`,\n        menu: cambiarPlato(menu, diaCambio, momentoCambio, plato),\n      };\n    }\n    if (diaCambio && solicitado) {\n      return {\n        entendido: false,\n        respuesta: \`No encuentro “\${solicitado}” en Recetas. Añádela o dime el nombre de una receta existente.\`,\n      };\n    }`;

  if (!contenido.includes(nuevo)) {
    if (!contenido.includes(anterior)) throw new Error('No se encontró el cambio de plato del asistente');
    contenido = contenido.replace(anterior, nuevo);
  }

  guardar(ruta, contenido);
}

reforzarCompra();
reforzarAsistente();
console.log('✓ funciones avanzadas reforzadas: Compra reactiva y recetas canónicas en el asistente');
