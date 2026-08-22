import fs from 'node:fs';

function leer(ruta) {
  if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);
  return fs.readFileSync(ruta, 'utf8');
}

function guardar(ruta, contenido) {
  fs.writeFileSync(ruta, contenido, 'utf8');
}

function reemplazarUna(contenido, antes, despues, etiqueta) {
  if (contenido.includes(despues)) return contenido;
  if (!contenido.includes(antes)) throw new Error(`Compra mensual: no se pudo aplicar ${etiqueta}`);
  return contenido.replace(antes, despues);
}

function insertarTrasRegex(contenido, patron, insercion, etiqueta) {
  if (contenido.includes(insercion.trim())) return contenido;
  const coincidencia = contenido.match(patron)?.[0];
  if (!coincidencia) throw new Error(`Compra mensual: no se encontró ${etiqueta}`);
  return contenido.replace(coincidencia, `${coincidencia}${insercion}`);
}

function parchearListaCompra() {
  const ruta = 'src/services/listaCompra.ts';
  let c = leer(ruta);

  c = reemplazarUna(
    c,
    `export function generarListaCompra(menu: DiaMenu[]): Ingrediente[] {\n  const excepciones = cargarExcepcionesSemana();`,
    `export function generarListaCompra(\n  menu: DiaMenu[],\n  semanaIndice?: number,\n  descontarDisponibles = true,\n): Ingrediente[] {\n  const excepciones = cargarExcepcionesSemana(semanaIndice);`,
    'cálculo por semana concreta',
  );

  c = reemplazarUna(
    c,
    `  return descontarConservacion(\n    unirIngredientes([...ingredientesPlatos, ...ingredientesPostres]),\n  );`,
    `  const ingredientes = unirIngredientes([...ingredientesPlatos, ...ingredientesPostres]);\n  return descontarDisponibles ? descontarConservacion(ingredientes) : ingredientes;`,
    'cálculo mensual sin descontar el mismo stock cuatro veces',
  );

  guardar(ruta, c);
}

function parchearMotor() {
  const ruta = 'src/motor/compra.ts';
  let c = leer(ruta);

  c = insertarTrasRegex(
    c,
    /import type \{ DiaMenu \} from '\.\.\/data\/Menusemanal(?:\.ts)?';/,
    `\nimport type { SemanaMenu } from '../data/MenuMensual';`,
    'import de SemanaMenu',
  );
  c = insertarTrasRegex(
    c,
    /import \{ generarListaCompra \} from '\.\.\/services\/listaCompra(?:\.ts)?';/,
    `\nimport { unirIngredientes } from '../services/UnirIngredientes';\nimport {\n  esCompraMensualDespensa,\n  esSemanaCompraMensual,\n} from '../services/politicaCompraMensual';`,
    'imports de política mensual',
  );

  const bloqueAnterior = `export async function generarCompraMercadona(\n  menu: DiaMenu[],\n): Promise<ResultadoCompra> {\n  const ingredientes = generarListaCompra(menu);\n  const despensa = cargarDespensa();\n  const despensaPorProducto = new Map(\n    despensa.map((producto) => [producto.productoId, producto]),\n  );\n\n  const productosAsociados = await obtenerProductosAsociados();\n  const temporales = ingredientes.map((ingrediente) =>\n    crearLineaTemporal(ingrediente, productosAsociados),\n  );\n\n  const sinProducto = temporales.filter((temporal) => !temporal.producto);\n  const conProducto = temporales.filter(\n    (\n      temporal,\n    ): temporal is LineaMenuTemporal & {\n      producto: ProductoMercadonaCatalogo;\n    } => Boolean(temporal.producto),\n  );\n\n  const grupos = new Map<string, LineaMenuTemporal[]>();\n  conProducto.forEach((temporal) => {\n    const productoId = temporal.producto.productoId;\n    const grupo = grupos.get(productoId) ?? [];\n    grupo.push(temporal);\n    grupos.set(productoId, grupo);\n  });\n\n  const lineasMenu: LineaCompra[] = [\n    ...sinProducto.map(crearLineaSinProducto),\n    ...Array.from(grupos.entries()).map(([productoId, grupo]) =>\n      combinarLineasProducto(\n        grupo,\n        despensaPorProducto.get(productoId) ?? null,\n      ),\n    ),\n  ];`;

  const bloqueNuevo = `export async function generarCompraMercadona(\n  menu: DiaMenu[],\n  planMensual: SemanaMenu[] = [],\n  semanaActiva = 0,\n): Promise<ResultadoCompra> {\n  const ingredientesSemana = generarListaCompra(menu, semanaActiva);\n  const ingredientesMes =\n    esSemanaCompraMensual(semanaActiva) && planMensual.length > 0\n      ? unirIngredientes(\n          planMensual.flatMap((semana, indice) =>\n            generarListaCompra(semana.menu, indice, false),\n          ),\n        )\n      : [];\n  const despensa = cargarDespensa();\n  const despensaPorProducto = new Map(\n    despensa.map((producto) => [producto.productoId, producto]),\n  );\n\n  const productosAsociados = await obtenerProductosAsociados();\n  const temporalesSemana = ingredientesSemana.map((ingrediente) =>\n    crearLineaTemporal(ingrediente, productosAsociados),\n  );\n  const temporalesMes = ingredientesMes.map((ingrediente) =>\n    crearLineaTemporal(ingrediente, productosAsociados),\n  );\n\n  const agruparPorProducto = (temporales: LineaMenuTemporal[]) => {\n    const grupos = new Map<string, LineaMenuTemporal[]>();\n    temporales\n      .filter((temporal) => temporal.producto)\n      .forEach((temporal) => {\n        const productoId = temporal.producto!.productoId;\n        const grupo = grupos.get(productoId) ?? [];\n        grupo.push(temporal);\n        grupos.set(productoId, grupo);\n      });\n    return grupos;\n  };\n\n  const gruposSemana = agruparPorProducto(temporalesSemana);\n  const gruposMes = agruparPorProducto(temporalesMes);\n  const idsProductos = new Set([...gruposSemana.keys(), ...gruposMes.keys()]);\n\n  const claveSinProducto = (temporal: LineaMenuTemporal) =>\n    \`${'${'}normalizarTexto(temporal.ingrediente.nombre)}::${'${'}normalizarUnidad(temporal.ingrediente.unidad)}\`;\n  const sinProductoSemana = new Map(\n    temporalesSemana\n      .filter((temporal) => !temporal.producto)\n      .map((temporal) => [claveSinProducto(temporal), temporal]),\n  );\n  const sinProductoMes = new Map(\n    temporalesMes\n      .filter((temporal) => !temporal.producto)\n      .map((temporal) => [claveSinProducto(temporal), temporal]),\n  );\n  const clavesSinProducto = new Set([\n    ...sinProductoSemana.keys(),\n    ...sinProductoMes.keys(),\n  ]);\n\n  const lineasSinProducto = Array.from(clavesSinProducto).flatMap((clave) => {\n    const semanal = sinProductoSemana.get(clave);\n    const mensual = sinProductoMes.get(clave);\n    const base = semanal ?? mensual;\n    if (!base) return [];\n    const esMensual = esCompraMensualDespensa(null, base.ingrediente.nombre);\n    if (esMensual && !esSemanaCompraMensual(semanaActiva)) return [];\n    if (!esMensual && !semanal) return [];\n    return [crearLineaSinProducto(esMensual ? mensual ?? base : semanal ?? base)];\n  });\n\n  const lineasMenu: LineaCompra[] = [\n    ...lineasSinProducto,\n    ...Array.from(idsProductos).flatMap((productoId) => {\n      const grupoSemana = gruposSemana.get(productoId) ?? [];\n      const grupoMes = gruposMes.get(productoId) ?? [];\n      const base = grupoSemana[0] ?? grupoMes[0];\n      if (!base) return [];\n      const productoDespensa = despensaPorProducto.get(productoId) ?? null;\n      const esMensual = esCompraMensualDespensa(\n        productoDespensa,\n        base.ingrediente.nombre,\n      );\n      if (esMensual && !esSemanaCompraMensual(semanaActiva)) return [];\n      const grupo = esMensual && grupoMes.length > 0 ? grupoMes : grupoSemana;\n      if (grupo.length === 0) return [];\n      const linea = combinarLineasProducto(grupo, productoDespensa);\n      return [{\n        ...linea,\n        // tipoCompra: esMensual ? 'despensa' : 'semanal'\n        tipoCompra: esMensual ? 'despensa' as const : 'semanal' as const,\n      }];\n    }),\n  ];`;

  c = reemplazarUna(c, bloqueAnterior, bloqueNuevo, 'suma de las cuatro semanas para despensa mensual');

  c = reemplazarUna(
    c,
    `  const lineasReposicion = despensa\n    .filter((producto) => !idsIncluidos.has(producto.productoId))\n    .map(crearLineaReposicion)\n    .filter((linea): linea is LineaCompra => linea !== null);`,
    `  const lineasReposicion = despensa\n    .filter((producto) => !idsIncluidos.has(producto.productoId))\n    .filter(\n      (producto) =>\n        esSemanaCompraMensual(semanaActiva) ||\n        !esCompraMensualDespensa(producto, producto.nombre),\n    )\n    .map((producto) => {\n      const linea = crearLineaReposicion(producto);\n      if (!linea) return null;\n      const esMensual = esCompraMensualDespensa(producto, producto.nombre);\n      return {\n        ...linea,\n        tipoCompra: esMensual ? 'despensa' as const : 'semanal' as const,\n      };\n    })\n    .filter((linea): linea is LineaCompra => linea !== null);`,
    'reposición mensual solo en semana 1',
  );

  guardar(ruta, c);
}

function parchearAppYCompra() {
  const rutaApp = 'src/App.tsx';
  let app = leer(rutaApp);
  app = reemplazarUna(
    app,
    '<Compra menu={menu} semanaActiva={semanaActiva} />',
    '<Compra menu={menu} planMensual={planMensual} semanaActiva={semanaActiva} />',
    'paso del plan mensual a Compra',
  );
  guardar(rutaApp, app);

  const rutaCompra = 'src/pages/Compra.tsx';
  let c = leer(rutaCompra);
  c = insertarTrasRegex(
    c,
    /import type \{ DiaMenu \} from '\.\.\/data\/Menusemanal(?:\.ts)?';/,
    `\nimport type { SemanaMenu } from '../data/MenuMensual';`,
    'import de SemanaMenu en Compra',
  );
  c = reemplazarUna(
    c,
    `type CompraProps = {\n  menu: DiaMenu[];\n  semanaActiva: number;\n};`,
    `type CompraProps = {\n  menu: DiaMenu[];\n  planMensual: SemanaMenu[];\n  semanaActiva: number;\n};`,
    'props mensuales de Compra',
  );
  c = reemplazarUna(
    c,
    'function Compra({ menu, semanaActiva }: CompraProps) {',
    'function Compra({ menu, planMensual, semanaActiva }: CompraProps) {',
    'recepción del plan mensual',
  );
  c = reemplazarUna(
    c,
    'const nuevaCompra = await generarCompraMercadona(menu);',
    'const nuevaCompra = await generarCompraMercadona(menu, planMensual, semanaActiva);',
    'motor mensual',
  );
  c = reemplazarUna(
    c,
    '  }, [menu]);',
    '  }, [menu, planMensual, semanaActiva]);',
    'dependencias del cálculo mensual',
  );
  c = c.replace(
    'Perecederos del menú y reposición de despensa,\n          separados automáticamente.',
    'Frescos de la semana. Pasta, arroz, legumbres, leche y demás compra mensual se calculan con las cuatro semanas y se compran al inicio de mes.',
  );
  c = reemplazarUna(
    c,
    `<BloqueCompra\n        titulo="📦 Reposición de despensa"\n        descripcion="Productos configurados para volver a su stock objetivo."\n        lineas={resultado.lineasDespensa}\n        comprados={comprados}\n        registrados={registrados}\n        onCambiar={cambiarEstado}\n        onAsociar={(ingrediente) =>\n          abrirSelector(ingrediente)\n        }\n        onAbrirProducto={setProductoAbierto}\n      />`,
    `{semanaActiva === 0 && (\n        <BloqueCompra\n          titulo="📦 Compra mensual de despensa"\n          descripcion="Necesidades de las cuatro semanas, descontando lo que ya hay en casa. La leche se compra aquí de una vez."\n          lineas={resultado.lineasDespensa}\n          comprados={comprados}\n          registrados={registrados}\n          onCambiar={cambiarEstado}\n          onAsociar={(ingrediente) =>\n            abrirSelector(ingrediente)\n          }\n          onAbrirProducto={setProductoAbierto}\n        />\n      )}`,
    'bloque mensual visible solo en semana 1',
  );
  guardar(rutaCompra, c);
}

parchearListaCompra();
parchearMotor();
parchearAppYCompra();
console.log('✓ Compra mensual: 4 semanas de despensa en Semana 1; leche mensual; huevos/yogures semanales');
