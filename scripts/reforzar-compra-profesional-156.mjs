import fs from 'node:fs';

function leer(ruta) {
  if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);
  return fs.readFileSync(ruta, 'utf8');
}

function guardar(ruta, contenido) {
  fs.writeFileSync(ruta, contenido, 'utf8');
}

function parchearApp() {
  const ruta = 'src/App.tsx';
  let c = leer(ruta);
  c = c.replace(
    '<span className="app-version">v0.9.15</span>',
    '<span className="app-version">v1.5.6</span>',
  );
  c = c.replace(
    "{pantalla === 'compra' && <Compra menu={menu} />}",
    "{pantalla === 'compra' && (\n          <Compra menu={menu} semanaActiva={semanaActiva} />\n        )}",
  );
  if (!c.includes('<span className="app-version">v1.5.6</span>')) {
    throw new Error('Compra profesional: no se pudo corregir la versión visible.');
  }
  if (!c.includes('<Compra menu={menu} semanaActiva={semanaActiva} />')) {
    throw new Error('Compra profesional: Compra no recibe la semana seleccionada.');
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

  const propsAnterior = `type CompraProps = {\n  menu: DiaMenu[];\n};`;
  const propsNuevo = `type CompraProps = {\n  menu: DiaMenu[];\n  semanaActiva: number;\n};`;
  if (!c.includes(propsNuevo)) {
    if (!c.includes(propsAnterior)) throw new Error('Compra profesional: faltan props de Compra.');
    c = c.replace(propsAnterior, propsNuevo);
  }

  const clavesAnteriores = `function obtenerClaveSemana(): string {\n  const fecha = new Date();\n  const dia = fecha.getDay();\n  const diferencia = dia === 0 ? -6 : 1 - dia;\n  const lunes = new Date(fecha);\n  lunes.setDate(fecha.getDate() + diferencia);\n\n  return lunes.toISOString().slice(0, 10);\n}\n\nconst claveSemana = obtenerClaveSemana();\nconst CLAVE_COMPRADOS = \`pfi-compra-comprados-${'${'}claveSemana}\`;\nconst CLAVE_REGISTRADOS = \`pfi-compra-inventario-${'${'}claveSemana}\`;`;
  const clavesNuevas = `function obtenerClaveCompra(semanaActiva: number): string {\n  const fecha = new Date();\n  const mes = String(fecha.getMonth() + 1).padStart(2, '0');\n  return \`${'${'}fecha.getFullYear()}-${'${'}mes}-semana-${'${'}semanaActiva + 1}\`;\n}`;
  if (!c.includes(clavesNuevas)) {
    if (!c.includes(clavesAnteriores)) {
      throw new Error('Compra profesional: no se encontraron las claves semanales antiguas.');
    }
    c = c.replace(clavesAnteriores, clavesNuevas);
  }

  c = c.replace(
    'function Compra({ menu }: CompraProps) {',
    `function Compra({ menu, semanaActiva }: CompraProps) {\n  const claveCompra = useMemo(\n    () => obtenerClaveCompra(semanaActiva),\n    [semanaActiva],\n  );\n  const claveComprados = useMemo(\n    () => \`pfi-compra-comprados-${'${'}claveCompra}\`,\n    [claveCompra],\n  );\n  const claveRegistrados = useMemo(\n    () => \`pfi-compra-inventario-${'${'}claveCompra}\`,\n    [claveCompra],\n  );`,
  );

  c = c.replace(
    `  const [comprados, setComprados] = useState<string[]>(\n    () => cargarListaLocal(CLAVE_COMPRADOS),\n  );\n  const [registrados, setRegistrados] = useState<string[]>(\n    () => cargarListaLocal(CLAVE_REGISTRADOS),\n  );`,
    `  const [comprados, setComprados] = useState<string[]>([]);\n  const [registrados, setRegistrados] = useState<string[]>([]);`,
  );

  if (!c.includes('setComprados(cargarListaLocal(claveComprados));')) {
    const marcador = `  const cargarCompra = useCallback(async () => {`;
    const efecto = `  useEffect(() => {\n    setComprados(cargarListaLocal(claveComprados));\n    setRegistrados(cargarListaLocal(claveRegistrados));\n    setMensaje('');\n  }, [claveComprados, claveRegistrados]);\n\n`;
    if (!c.includes(marcador)) throw new Error('Compra profesional: falta cargarCompra.');
    c = c.replace(marcador, `${efecto}${marcador}`);
  }

  c = c.replaceAll('CLAVE_COMPRADOS', 'claveComprados');
  c = c.replaceAll('CLAVE_REGISTRADOS', 'claveRegistrados');
  c = c.replaceAll('claveSemana', 'claveCompra');

  const autoRegistro = /\n\s*useEffect\(\(\) => \{\n\s*if \(!resultado\) return;\n\n\s*const pendientes = resultado\.lineasDespensa\.filter\([\s\S]*?\n\s*\}, \[resultado, comprados, registrados\]\);\n/;
  if (autoRegistro.test(c)) {
    c = c.replace(
      autoRegistro,
      '\n  // Marcar un artículo como comprado no modifica el inventario.\n  // La entrada de stock solo se confirma desde “Guardar en inventario”.\n',
    );
  }

  const reinicioAnterior = `  const reiniciar = () => {\n    setComprados([]);\n    setRegistrados([]);\n    guardarListaLocal(claveComprados, []);\n    guardarListaLocal(claveRegistrados, []);\n    setMensaje('Lista semanal reiniciada.');\n  };`;
  const reinicioNuevo = `  const reiniciar = () => {\n    const confirmado = window.confirm(\n      'Se quitarán las marcas de comprado de esta semana. El stock que ya guardaste en inventario se conservará. ¿Continuar?',\n    );\n    if (!confirmado) return;\n\n    setComprados([]);\n    guardarListaLocal(claveComprados, []);\n    setMensaje('Marcas de compra limpiadas. El inventario registrado se conserva.');\n  };`;
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

  if (c.includes('setRegistrados([])') || c.includes('guardarListaLocal(claveRegistrados, [])')) {
    throw new Error('Compra profesional: limpiar marcas sigue borrando el historial de inventario.');
  }
  if (!c.includes('Guardar en inventario') || !c.includes('Limpiar marcas')) {
    throw new Error('Compra profesional: faltan acciones explícitas de Compra.');
  }
  if (!c.includes('semanaActiva: number') || !c.includes('obtenerClaveCompra(semanaActiva)')) {
    throw new Error('Compra profesional: las marcas no están separadas por semana del plan.');
  }

  guardar(ruta, c);
}

parchearApp();
parchearCompra();
console.log('✓ Compra profesional: registro explícito, limpieza segura, semana aislada, stock natural y versión 1.5.6');
