import fs from 'node:fs';

function leer(ruta) {
  if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);
  return fs.readFileSync(ruta, 'utf8');
}

function guardar(ruta, contenido) {
  fs.writeFileSync(ruta, contenido, 'utf8');
}

function parchearVersion() {
  const ruta = 'src/App.tsx';
  let c = leer(ruta);
  c = c.replace(
    '<span className="app-version">v0.9.15</span>',
    '<span className="app-version">v1.5.6</span>',
  );
  if (!c.includes('<span className="app-version">v1.5.6</span>')) {
    throw new Error('Compra profesional: no se pudo corregir la versión visible.');
  }
  guardar(ruta, c);
}

function parchearCompra() {
  const ruta = 'src/pages/Compra.tsx';
  let c = leer(ruta);

  if (!c.includes("from '../services/stockReal")) {
    const patronImport = /import \{\n  obtenerSeccionCompra,\n  ORDEN_SECCIONES_COMPRA,\n\} from '\.\.\/services\/categoriasCompra(?:\.ts)?';/;
    const encontrado = c.match(patronImport)?.[0];
    if (!encontrado) {
      throw new Error('Compra profesional: no se encontró el import de categorías.');
    }
    c = c.replace(
      encontrado,
      `${encontrado}\nimport { describirCantidadStock } from '../services/stockReal';`,
    );
  }

  const autoRegistro = /\n\s*useEffect\(\(\) => \{\n\s*if \(!resultado\) return;\n\n\s*const pendientes = resultado\.lineasDespensa\.filter\([\s\S]*?\n\s*\}, \[resultado, comprados, registrados\]\);\n/;
  if (autoRegistro.test(c)) {
    c = c.replace(
      autoRegistro,
      '\n  // Marcar un artículo como comprado no modifica el inventario.\n  // La entrada de stock solo se confirma desde “Guardar en inventario”.\n',
    );
  }

  const reinicioAnterior = `  const reiniciar = () => {\n    setComprados([]);\n    setRegistrados([]);\n    guardarListaLocal(CLAVE_COMPRADOS, []);\n    guardarListaLocal(CLAVE_REGISTRADOS, []);\n    setMensaje('Lista semanal reiniciada.');\n  };`;
  const reinicioNuevo = `  const reiniciar = () => {\n    const confirmado = window.confirm(\n      'Se quitarán las marcas de comprado de esta semana. El stock que ya guardaste en inventario se conservará. ¿Continuar?',\n    );\n    if (!confirmado) return;\n\n    setComprados([]);\n    guardarListaLocal(CLAVE_COMPRADOS, []);\n    setMensaje('Marcas de compra limpiadas. El inventario registrado se conserva.');\n  };`;
  if (!c.includes(reinicioNuevo)) {
    if (!c.includes(reinicioAnterior)) {
      throw new Error('Compra profesional: no se encontró el reinicio anterior.');
    }
    c = c.replace(reinicioAnterior, reinicioNuevo);
  }

  c = c.replace(
    `    const nuevasRegistradas = [\n      ...registrados,\n      ...paraRegistrar.map((linea) => linea.clave),\n    ];`,
    `    const nuevasRegistradas = Array.from(\n      new Set([\n        ...registrados,\n        ...paraRegistrar.map((linea) => linea.clave),\n      ]),\n    );`,
  );

  c = c.replace(
    '>\n            Reiniciar semana\n          </button>',
    '>\n            Limpiar marcas\n          </button>',
  );

  const stockAnterior = `        {linea.productoDespensa && (\n          <span style={estiloDetalle}>\n            Stock {linea.productoDespensa.stockActual}{' '}\n            {linea.productoDespensa.unidad} · objetivo{' '}\n            {linea.productoDespensa.stockObjetivo}\n          </span>\n        )}`;
  const stockNuevo = `        {linea.productoDespensa && (\n          <span style={estiloDetalle}>\n            Stock{' '}\n            {describirCantidadStock(\n              linea.productoDespensa,\n              linea.productoDespensa.stockActual,\n            ).texto}{' '}\n            · objetivo{' '}\n            {describirCantidadStock(\n              linea.productoDespensa,\n              linea.productoDespensa.stockObjetivo,\n            ).texto}\n          </span>\n        )}`;
  if (!c.includes(stockNuevo)) {
    if (!c.includes(stockAnterior)) {
      throw new Error('Compra profesional: no se encontró el texto de stock.');
    }
    c = c.replace(stockAnterior, stockNuevo);
  }

  if (c.includes('setRegistrados([])') || c.includes('guardarListaLocal(CLAVE_REGISTRADOS, [])')) {
    throw new Error('Compra profesional: limpiar marcas sigue borrando el historial de inventario.');
  }
  if (!c.includes('Guardar en inventario') || !c.includes('Limpiar marcas')) {
    throw new Error('Compra profesional: faltan acciones explícitas de Compra.');
  }

  guardar(ruta, c);
}

parchearVersion();
parchearCompra();
console.log('✓ Compra profesional: registro explícito, limpieza segura, stock natural y versión 1.5.6');
