import fs from 'node:fs';

function leer(ruta) {
  if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);
  return fs.readFileSync(ruta, 'utf8');
}
function guardar(ruta, contenido) { fs.writeFileSync(ruta, contenido, 'utf8'); }
function reemplazar(contenido, antes, despues, etiqueta) {
  if (contenido.includes(despues)) return contenido;
  if (!contenido.includes(antes)) throw new Error(`Stock real: no se pudo aplicar ${etiqueta}`);
  return contenido.replace(antes, despues);
}
function insertarTras(contenido, marcador, insercion, etiqueta) {
  if (contenido.includes(insercion.trim())) return contenido;
  if (!contenido.includes(marcador)) throw new Error(`Stock real: no se encontró ${etiqueta}`);
  return contenido.replace(marcador, `${marcador}${insercion}`);
}

function parchearDespensaService() {
  const ruta = 'src/services/despensa.ts';
  let c = leer(ruta);

  c = insertarTras(
    c,
    "} from './inventario.ts';",
    "\nimport { inferirConfiguracionStockReal } from './stockReal.ts';",
    'import de stockReal en despensa',
  );

  c = reemplazar(
    c,
    "  umbralAviso: number;\n  actualizado: string;",
    "  umbralAviso: number;\n  unidadContenido: string;\n  contenidoPorEnvase: number;\n  conversionStockAproximada: boolean;\n  actualizado: string;",
    'campos de contenido real',
  );

  c = reemplazar(
    c,
    "  return {\n    id: producto.id,",
    "  const configuracionInferida = inferirConfiguracionStockReal({\n    nombre: producto.nombre,\n    formato: typeof producto.formato === 'string' ? producto.formato : 'Envase',\n  });\n\n  return {\n    id: producto.id,",
    'inferencia en productos guardados',
  );

  c = reemplazar(
    c,
    "    umbralAviso:\n      typeof producto.umbralAviso === 'number'\n        ? Math.max(0, producto.umbralAviso)\n        : 0,\n    actualizado:",
    "    umbralAviso:\n      typeof producto.umbralAviso === 'number'\n        ? Math.max(0, producto.umbralAviso)\n        : 0,\n    unidadContenido:\n      typeof producto.unidadContenido === 'string' && producto.unidadContenido.trim()\n        ? producto.unidadContenido.trim()\n        : configuracionInferida.unidadContenido,\n    contenidoPorEnvase:\n      typeof producto.contenidoPorEnvase === 'number' &&\n      Number.isFinite(producto.contenidoPorEnvase) &&\n      producto.contenidoPorEnvase > 0\n        ? producto.contenidoPorEnvase\n        : configuracionInferida.contenidoPorEnvase,\n    conversionStockAproximada:\n      typeof producto.conversionStockAproximada === 'boolean'\n        ? producto.conversionStockAproximada\n        : configuracionInferida.conversionAproximada,\n    actualizado:",
    'normalización de contenido real',
  );

  c = reemplazar(
    c,
    "  ].some((termino) => seccion.includes(termino));\n\n  return {",
    "  ].some((termino) => seccion.includes(termino));\n  const configuracionStock = inferirConfiguracionStockReal(producto);\n\n  return {",
    'inferencia desde catálogo',
  );

  c = reemplazar(
    c,
    "    unidad: 'envase',\n    frecuencia: esPerecedero",
    "    unidad: 'envase',\n    unidadContenido: configuracionStock.unidadContenido,\n    contenidoPorEnvase: configuracionStock.contenidoPorEnvase,\n    conversionStockAproximada: configuracionStock.conversionAproximada,\n    frecuencia: esPerecedero",
    'configuración de stock al crear producto',
  );

  c = reemplazar(
    c,
    "  return Math.max(\n    0,\n    producto.stockObjetivo - producto.stockActual,\n  );",
    "  return Math.max(\n    0,\n    Math.ceil(producto.stockObjetivo - producto.stockActual),\n  );",
    'reposición en envases enteros',
  );

  guardar(ruta, c);
}

function parchearMotorCompra() {
  const ruta = 'src/motor/compra.ts';
  let c = leer(ruta);

  c = reemplazar(
    c,
    "): { envases: number; estimado: boolean } {",
    "): { envases: number; envasesExactos: number; estimado: boolean } {",
    'retorno exacto de necesidades',
  );

  c = reemplazar(
    c,
    "  return {\n    envases: Math.max(1, Math.ceil(equivalentesEnvase)),\n    estimado:",
    "  return {\n    envases: Math.max(1, Math.ceil(equivalentesEnvase)),\n    envasesExactos: Math.max(0, equivalentesEnvase),\n    estimado:",
    'envases exactos antes del redondeo',
  );

  c = reemplazar(
    c,
    "  const envasesMenu = calculo.envases;\n\n  const esDespensaAutomatica",
    "  const envasesMenu = calculo.envases;\n  const envasesMenuExactos = calculo.envasesExactos;\n\n  const esDespensaAutomatica",
    'necesidad exacta en línea de compra',
  );

  c = reemplazar(
    c,
    "  const envases = esDespensaAutomatica\n    ? calcularEnvasesConStock(\n        envasesMenu,\n        productoDespensa?.stockActual ?? 0,\n        productoDespensa?.stockObjetivo ?? 0,\n      )\n    : envasesMenu;",
    "  const envases = productoDespensa\n    ? calcularEnvasesConStock(\n        envasesMenuExactos,\n        productoDespensa.stockActual,\n        esDespensaAutomatica ? productoDespensa.stockObjetivo : 0,\n      )\n    : envasesMenu;",
    'descuento de stock en todos los productos controlados',
  );

  guardar(ruta, c);
}

function parchearProductoDetalle() {
  const ruta = 'src/components/ProductoDetalleModal.tsx';
  let c = leer(ruta);

  c = insertarTras(
    c,
    "} from '../services/inventario';",
    "\nimport {\n  configuracionStockReal,\n  cantidadRealDesdeEnvases,\n  envasesDesdeCantidadReal,\n  etiquetaUnidadStock,\n  formatearNumeroStock,\n  inferirConfiguracionStockReal,\n  pasoCantidadStock,\n  UNIDADES_STOCK_SUGERIDAS,\n} from '../services/stockReal';",
    'import de stock real en detalle',
  );

  c = reemplazar(
    c,
    "        if (encontrado) setCatalogo(encontrado);",
    "        if (encontrado) {\n          setCatalogo(encontrado);\n          setEditor((actual) => {\n            if (!actual) return actual;\n            const sinConfigNatural =\n              !actual.unidadContenido ||\n              !actual.contenidoPorEnvase ||\n              (actual.unidadContenido === 'envase' && actual.contenidoPorEnvase === 1);\n            if (!sinConfigNatural) return actual;\n            const inferida = inferirConfiguracionStockReal(encontrado);\n            return {\n              ...actual,\n              unidadContenido: inferida.unidadContenido,\n              contenidoPorEnvase: inferida.contenidoPorEnvase,\n              conversionStockAproximada: inferida.conversionAproximada,\n            };\n          });\n        }",
    'inferencia del catálogo al abrir',
  );

  c = reemplazar(
    c,
    "      unidad: editor.unidad,\n      tipo: editor.tipo,",
    "      unidad: 'envase',\n      unidadContenido: editor.unidadContenido,\n      contenidoPorEnvase: editor.contenidoPorEnvase,\n      conversionStockAproximada: editor.conversionStockAproximada,\n      tipo: editor.tipo,",
    'guardado de configuración natural',
  );

  const bloqueAnterior = `              <CampoNumero\n                etiqueta="Stock actual"\n                valor={editor.stockActual}\n                onChange={(stockActual) => setEditor({ ...editor, stockActual })}\n              />\n              <CampoNumero\n                etiqueta="Stock objetivo"\n                valor={editor.stockObjetivo}\n                onChange={(stockObjetivo) =>\n                  setEditor({ ...editor, stockObjetivo })\n                }\n              />\n              <CampoNumero\n                etiqueta="Avisar cuando quede"\n                valor={editor.umbralAviso}\n                onChange={(umbralAviso) => setEditor({ ...editor, umbralAviso })}\n              />\n              <label>\n                <span>Unidad</span>\n                <input\n                  value={editor.unidad}\n                  onChange={(evento) =>\n                    setEditor({ ...editor, unidad: evento.target.value })\n                  }\n                />\n              </label>`;

  const bloqueNuevo = `              <EditorStockReal\n                editor={editor}\n                onChange={setEditor}\n              />\n              <CampoCantidadReal\n                etiqueta="Stock objetivo"\n                valorEnvases={editor.stockObjetivo}\n                editor={editor}\n                onChange={(stockObjetivo) => setEditor({ ...editor, stockObjetivo })}\n              />\n              <CampoCantidadReal\n                etiqueta="Avisar cuando quede"\n                valorEnvases={editor.umbralAviso}\n                editor={editor}\n                onChange={(umbralAviso) => setEditor({ ...editor, umbralAviso })}\n              />\n              <label>\n                <span>Unidad de compra</span>\n                <strong style={{ padding: '10px 0', color: '#4f6f52' }}>envase</strong>\n              </label>`;

  c = reemplazar(c, bloqueAnterior, bloqueNuevo, 'editor de stock natural');

  const marcadorCampo = `function CampoNumero({\n  etiqueta,\n  valor,\n  onChange,`;
  const componentes = `function CampoCantidadReal({\n  etiqueta,\n  valorEnvases,\n  editor,\n  onChange,\n}: {\n  etiqueta: string;\n  valorEnvases: number;\n  editor: ProductoDespensa;\n  onChange: (valorEnvases: number) => void;\n}) {\n  const config = configuracionStockReal(editor);\n  const cantidadReal = cantidadRealDesdeEnvases(valorEnvases, config);\n  const unidad = etiquetaUnidadStock(config.unidadContenido, cantidadReal);\n  return (\n    <CampoNumero\n      etiqueta={\`${'${'}etiqueta} (${'${'}unidad})\`}\n      valor={cantidadReal}\n      paso={pasoCantidadStock(config)}\n      onChange={(cantidad) => onChange(envasesDesdeCantidadReal(cantidad, config))}\n    />\n  );\n}\n\nfunction EditorStockReal({\n  editor,\n  onChange,\n}: {\n  editor: ProductoDespensa;\n  onChange: (editor: ProductoDespensa) => void;\n}) {\n  const config = configuracionStockReal(editor);\n  const cantidadReal = cantidadRealDesdeEnvases(editor.stockActual, config);\n  const unidad = etiquetaUnidadStock(config.unidadContenido, cantidadReal);\n  const actualizarConfig = (unidadContenido: string, contenidoPorEnvase: number) => {\n    onChange({\n      ...editor,\n      unidadContenido,\n      contenidoPorEnvase: Math.max(0.01, contenidoPorEnvase),\n      conversionStockAproximada: unidadContenido === 'cabeza' || unidadContenido === 'diente'\n        ? true\n        : editor.conversionStockAproximada,\n    });\n  };\n\n  return (\n    <>\n      <CampoNumero\n        etiqueta={\`Stock actual (${'${'}unidad})\`}\n        valor={cantidadReal}\n        paso={pasoCantidadStock(config)}\n        onChange={(cantidad) =>\n          onChange({\n            ...editor,\n            stockActual: envasesDesdeCantidadReal(cantidad, config),\n          })\n        }\n      />\n      <label>\n        <span>Cómo contar el stock</span>\n        <select\n          value={config.unidadContenido}\n          onChange={(evento) => {\n            const nuevaUnidad = evento.target.value;\n            actualizarConfig(nuevaUnidad, nuevaUnidad === 'envase' ? 1 : config.contenidoPorEnvase);\n          }}\n        >\n          {UNIDADES_STOCK_SUGERIDAS.map((opcion) => (\n            <option key={opcion} value={opcion}>{opcion}</option>\n          ))}\n        </select>\n      </label>\n      {config.unidadContenido !== 'envase' && (\n        <CampoNumero\n          etiqueta={\`1 envase contiene (${'${'}config.unidadContenido})\`}\n          valor={config.contenidoPorEnvase}\n          paso={config.unidadContenido === 'g' || config.unidadContenido === 'ml' ? 10 : 1}\n          minimo={0.01}\n          onChange={(contenidoPorEnvase) =>\n            actualizarConfig(config.unidadContenido, contenidoPorEnvase)\n          }\n        />\n      )}\n      <div style={{ gridColumn: '1 / -1', color: '#6d786f', fontSize: 12, lineHeight: 1.4 }}>\n        PFI guarda el equivalente como {formatearNumeroStock(editor.stockActual)} envase(s) para calcular precios y reposición.\n        {config.conversionAproximada ? ' La equivalencia es aproximada.' : ''}\n      </div>\n    </>\n  );\n}\n\n`;
  c = reemplazar(c, marcadorCampo, `${componentes}${marcadorCampo}`, 'componentes de stock real');

  c = reemplazar(
    c,
    "  onChange,\n}: {\n  etiqueta: string;\n  valor: number;\n  onChange: (valor: number) => void;\n}) {",
    "  onChange,\n  paso = 0.1,\n  minimo = 0,\n}: {\n  etiqueta: string;\n  valor: number;\n  onChange: (valor: number) => void;\n  paso?: number;\n  minimo?: number;\n}) {",
    'parámetros de CampoNumero',
  );

  c = reemplazar(
    c,
    "        min=\"0\"\n        step=\"0.1\"",
    "        min={minimo}\n        step={paso}",
    'paso dinámico de CampoNumero',
  );

  guardar(ruta, c);
}

function parchearDespensaPage() {
  const ruta = 'src/pages/Despensa.tsx';
  let c = leer(ruta);

  c = insertarTras(
    c,
    "import ConservacionPanel from '../components/ConservacionPanel';",
    "\nimport {\n  configuracionStockReal,\n  cantidadRealDesdeEnvases,\n  describirCantidadStock,\n  envasesDesdeCantidadReal,\n  etiquetaUnidadStock,\n  formatearNumeroStock,\n  pasoCantidadStock,\n} from '../services/stockReal';",
    'import stockReal en Despensa',
  );

  c = reemplazar(
    c,
    "  const sumarStock = (producto: ProductoDespensa) => {\n    registrarCompra(producto.productoId, 1, 'Entrada manual desde despensa');\n    setMensaje(`Añadido 1 ${producto.unidad}.`);\n  };",
    "  const sumarStock = (producto: ProductoDespensa) => {\n    const config = configuracionStockReal(producto);\n    const paso = pasoCantidadStock(config);\n    registrarCompra(\n      producto.productoId,\n      envasesDesdeCantidadReal(paso, config),\n      'Entrada manual desde despensa',\n    );\n    setMensaje(`Añadido ${formatearNumeroStock(paso)} ${etiquetaUnidadStock(config.unidadContenido, paso)}.`);\n  };",
    'botón sumar stock real',
  );

  c = reemplazar(
    c,
    "  const restarStock = (producto: ProductoDespensa) => {\n    if (producto.stockActual <= 0) return;\n    registrarConsumo(\n      producto.productoId,\n      1,\n      'manual',\n      'Consumo manual desde despensa',\n    );\n    setMensaje(`Consumido 1 ${producto.unidad}.`);\n  };",
    "  const restarStock = (producto: ProductoDespensa) => {\n    if (producto.stockActual <= 0) return;\n    const config = configuracionStockReal(producto);\n    const disponible = cantidadRealDesdeEnvases(producto.stockActual, config);\n    const cantidad = Math.min(pasoCantidadStock(config), disponible);\n    registrarConsumo(\n      producto.productoId,\n      envasesDesdeCantidadReal(cantidad, config),\n      'manual',\n      'Consumo manual desde despensa',\n    );\n    setMensaje(`Consumido ${formatearNumeroStock(cantidad)} ${etiquetaUnidadStock(config.unidadContenido, cantidad)}.`);\n  };",
    'botón restar stock real',
  );

  c = reemplazar(
    c,
    "                  <div>\n                    <strong>{producto.stockActual}</strong>\n                    <span>{producto.unidad}</span>\n                  </div>",
    "                  <StockProducto producto={producto} />",
    'visualización de stock real',
  );

  c = reemplazar(
    c,
    "                  Comprar {calcularReposicion(producto)} {producto.unidad}",
    "                  Comprar {calcularReposicion(producto)} {calcularReposicion(producto) === 1 ? 'envase' : 'envases'}",
    'reposición en envases enteros',
  );

  c = reemplazar(
    c,
    "                  Stock {producto.stockActual} · objetivo {producto.stockObjetivo} ·{' '}",
    "                  Stock {describirCantidadStock(producto, producto.stockActual).texto} · objetivo {describirCantidadStock(producto, producto.stockObjetivo).texto} ·{' '}",
    'resumen natural en reposición',
  );

  c = reemplazar(
    c,
    "                    {etiquetaMovimiento(movimiento)} ·{' '}",
    "                    {etiquetaMovimiento(movimiento, producto)} ·{' '}",
    'historial con unidad real',
  );

  const marcador = `function porcentajeStock(producto: ProductoDespensa): number {`;
  const componente = `function StockProducto({ producto }: { producto: ProductoDespensa }) {\n  const stock = describirCantidadStock(producto, producto.stockActual);\n  const config = configuracionStockReal(producto);\n  return (\n    <div>\n      <strong>{formatearNumeroStock(stock.cantidad)}</strong>\n      <span>{stock.unidad}</span>\n      {config.unidadContenido !== 'envase' && (\n        <small style={{ display: 'block', color: '#8a918a', marginTop: 2 }}>\n          ≈ {stock.equivalenteEnvases}\n        </small>\n      )}\n    </div>\n  );\n}\n\n`;
  c = reemplazar(c, marcador, `${componente}${marcador}`, 'componente StockProducto');

  c = reemplazar(
    c,
    "function estadoProducto(producto: ProductoDespensa): string {\n  if (producto.tipo === 'perecedero') {\n    return 'Compra según las cantidades del menú · sin objetivo fijo';\n  }\n  if (producto.frecuencia === 'manual') {\n    return `Reposición manual · stock ${producto.stockActual} ${producto.unidad}`;\n  }\n  const faltan = calcularReposicion(producto);\n  return `Objetivo: ${producto.stockObjetivo} ${producto.unidad}${\n    faltan > 0 ? ` · faltan ${faltan}` : ' · stock correcto'\n  }`;\n}",
    "function estadoProducto(producto: ProductoDespensa): string {\n  const stock = describirCantidadStock(producto, producto.stockActual).texto;\n  const objetivo = describirCantidadStock(producto, producto.stockObjetivo).texto;\n  if (producto.tipo === 'perecedero') {\n    return `Stock ${stock} · compra según el menú`;\n  }\n  if (producto.frecuencia === 'manual') {\n    return `Reposición manual · stock ${stock}`;\n  }\n  const faltan = calcularReposicion(producto);\n  return `Objetivo: ${objetivo}${\n    faltan > 0 ? ` · comprar ${faltan} ${faltan === 1 ? 'envase' : 'envases'}` : ' · stock correcto'\n  }`;\n}",
    'estado de producto en unidad natural',
  );

  c = reemplazar(
    c,
    "function etiquetaMovimiento(movimiento: MovimientoInventario): string {\n  const signo = movimiento.tipo === 'consumo' ? '−' : movimiento.cantidad >= 0 ? '+' : '−';\n  const cantidad = Math.abs(movimiento.cantidad);\n  if (movimiento.tipo === 'compra') return `${signo}${cantidad} compra`;\n  if (movimiento.tipo === 'consumo') return `${signo}${cantidad} consumo`;\n  return `${signo}${cantidad} ajuste`;\n}",
    "function etiquetaMovimiento(\n  movimiento: MovimientoInventario,\n  producto?: ProductoDespensa,\n): string {\n  const signo = movimiento.tipo === 'consumo' ? '−' : movimiento.cantidad >= 0 ? '+' : '−';\n  const cantidadEnvases = Math.abs(movimiento.cantidad);\n  const cantidad = producto\n    ? describirCantidadStock(producto, cantidadEnvases).texto\n    : `${formatearNumeroStock(cantidadEnvases)} envase(s)`;\n  if (movimiento.tipo === 'compra') return `${signo}${cantidad} compra`;\n  if (movimiento.tipo === 'consumo') return `${signo}${cantidad} consumo`;\n  return `${signo}${cantidad} ajuste`;\n}",
    'etiqueta natural del historial',
  );

  guardar(ruta, c);
}

parchearDespensaService();
parchearMotorCompra();
parchearProductoDetalle();
parchearDespensaPage();
console.log('✓ stock real aplicado: contenido natural + equivalencia de envase + compra descontando stock');
