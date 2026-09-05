import type { DiaMenu } from '../data/Menusemanal';
import type { Ingrediente } from '../data/Recetas';
import type { ProductoMercadonaCatalogo } from '../services/catalogoMercadona';
import { obtenerProductosAsociados } from '../services/asociacionesIngredientes';
import {
  calcularReposicion,
  cargarDespensa,
  type ProductoDespensa,
} from '../services/despensa';
import { generarListaCompra } from '../services/listaCompra';

export type TipoCompra = 'semanal' | 'despensa';
export type OrigenLineaCompra = 'menu' | 'reposicion';

export type ExplicacionCantidadCompra = {
  periodo: 'semana' | 'mes';
  semana?: number;
  necesidadMenuEnvases: number;
  necesidadMensualEnvases: number;
  reservaEnvases: number;
  objetivoEnvases: number;
  stockAntesEnvases: number;
  compraEnvases: number;
  sobranteDespuesEnvases: number;
  stockAplicado: boolean;
};

export type LineaCompra = {
  clave: string;
  ingrediente: Ingrediente;
  necesidades: Ingrediente[];
  producto: ProductoMercadonaCatalogo | null;
  productoDespensa: ProductoDespensa | null;
  envases: number;
  envasesExactos: number | null;
  subtotal: number | null;
  calculoEstimado: boolean;
  tipoCompra: TipoCompra;
  origen: OrigenLineaCompra;
  explicacionCantidad?: ExplicacionCantidadCompra;
};

export type ResultadoCompra = {
  lineas: LineaCompra[];
  lineasSemanales: LineaCompra[];
  lineasDespensa: LineaCompra[];
  total: number;
  totalSemanal: number;
  totalDespensa: number;
  productosSinSeleccionar: string[];
  productosSinPrecio: string[];
  productosEstimados: string[];
  lineasCubiertas?: LineaCompra[];
};

type CantidadBase = {
  cantidad: number;
  unidad: 'g' | 'ml' | 'ud' | string;
};

type CapacidadProducto = CantidadBase;

type LineaMenuTemporal = {
  ingrediente: Ingrediente;
  producto: ProductoMercadonaCatalogo | null;
};

export type OpcionesCompra = {
  aplicarStock?: boolean;
  incluirReposicion?: boolean;
};

function crearClave(
  nombre: string,
  unidad: string,
  productoId?: string,
): string {
  return productoId
    ? `producto-${productoId}`
    : `${nombre}-${unidad}`;
}

function normalizarTexto(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizarUnidad(unidad: string): string {
  const valor = normalizarTexto(unidad)
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ');

  const equivalencias: Record<string, string> = {
    u: 'ud',
    ud: 'ud',
    uds: 'ud',
    unid: 'ud',
    unidad: 'ud',
    unidades: 'ud',
    pieza: 'ud',
    piezas: 'ud',
    envase: 'ud',
    envases: 'ud',
    loncha: 'ud',
    lonchas: 'ud',
    lata: 'ud',
    latas: 'ud',
    bote: 'ud',
    botes: 'ud',
    'bote grande': 'ud',
    'botes grandes': 'ud',
    tarro: 'ud',
    tarros: 'ud',
    bolsa: 'ud',
    bolsas: 'ud',
    paquete: 'ud',
    paquetes: 'ud',
    pack: 'ud',
    packs: 'ud',
    caja: 'ud',
    cajas: 'ud',
    estuche: 'ud',
    estuches: 'ud',
    malla: 'ud',
    mallas: 'ud',
    botella: 'ud',
    botellas: 'ud',
    rollo: 'ud',
    rollos: 'ud',
    brick: 'ud',
    bricks: 'ud',
    brik: 'ud',
    briks: 'ud',
    bandeja: 'ud',
    bandejas: 'ud',
    tarrina: 'ud',
    tarrinas: 'ud',
    barqueta: 'ud',
    barquetas: 'ud',
    racion: 'ud',
    raciones: 'ud',
    muslo: 'ud',
    muslos: 'ud',
    diente: 'ud',
    dientes: 'ud',
    cabeza: 'ud',
    cabezas: 'ud',
    sarta: 'ud',
    revisar: 'ud',
    gramo: 'g',
    gramos: 'g',
    kilo: 'kg',
    kilos: 'kg',
    kilogramo: 'kg',
    kilogramos: 'kg',
    centilitro: 'cl',
    centilitros: 'cl',
    decilitro: 'dl',
    decilitros: 'dl',
    mililitro: 'ml',
    mililitros: 'ml',
    litro: 'l',
    litros: 'l',
  };

  return equivalencias[valor] ?? valor;
}

function convertirABase(
  cantidad: number,
  unidad: string,
): CantidadBase {
  const unidadNormalizada = normalizarUnidad(unidad);

  if (unidadNormalizada === 'kg') {
    return { cantidad: cantidad * 1000, unidad: 'g' };
  }

  if (unidadNormalizada === 'l') {
    return { cantidad: cantidad * 1000, unidad: 'ml' };
  }

  if (unidadNormalizada === 'dl') {
    return { cantidad: cantidad * 100, unidad: 'ml' };
  }

  if (unidadNormalizada === 'cl') {
    return { cantidad: cantidad * 10, unidad: 'ml' };
  }

  return {
    cantidad,
    unidad: unidadNormalizada,
  };
}

function numero(texto: string): number {
  return Number(texto.replace(',', '.'));
}

function capacidadDesdeCantidad(
  cantidad: number,
  unidad: string,
): CapacidadProducto | null {
  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return null;
  }

  const base = convertirABase(cantidad, unidad);
  return base.cantidad > 0 ? base : null;
}

function añadirCapacidad(
  capacidades: CapacidadProducto[],
  cantidad: number,
  unidad: string,
): void {
  const capacidad = capacidadDesdeCantidad(cantidad, unidad);
  if (capacidad) capacidades.push(capacidad);
}

function capacidadesDesdeFormato(
  formato: string,
): CapacidadProducto[] {
  const texto = normalizarTexto(formato);
  const capacidades: CapacidadProducto[] = [];

  // 6 x 200 ml, 3×250 g, 2 x 1 L...
  const multiplicadorMedida = texto.match(
    /(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|dl|l)\b/,
  );
  if (multiplicadorMedida) {
    añadirCapacidad(
      capacidades,
      numero(multiplicadorMedida[1]) * numero(multiplicadorMedida[2]),
      multiplicadorMedida[3],
    );
  } else {
    // 6 botellas x 1 L, 4 briks x 200 ml...
    const multiplicadorEnvases = texto.match(
      /(\d+)\s*(?:botellas?|bricks?|briks?|latas?|botes?|tarros?|tarrinas?|bolsas?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|dl|l)\b/,
    );
    if (multiplicadorEnvases) {
      añadirCapacidad(
        capacidades,
        numero(multiplicadorEnvases[1]) * numero(multiplicadorEnvases[2]),
        multiplicadorEnvases[3],
      );
    } else {
      const cantidadPesoVolumen = texto.match(
        /(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|dl|l)\b/,
      );
      if (cantidadPesoVolumen) {
        añadirCapacidad(
          capacidades,
          numero(cantidadPesoVolumen[1]),
          cantidadPesoVolumen[2],
        );
      }
    }
  }

  // 2 x 6 ud / 2×6 unidades.
  const multiplicadorUnidades = texto.match(
    /(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:u|ud|uds|unidades?)\.?\b/,
  );
  if (multiplicadorUnidades) {
    capacidades.push({
      cantidad: numero(multiplicadorUnidades[1]) * numero(multiplicadorUnidades[2]),
      unidad: 'ud',
    });
  }

  // 12 ud., 6 unidades, etc.
  const unidades = texto.match(
    /(\d+(?:[.,]\d+)?)\s*(?:u|ud|uds|unidades?)\.?\b/,
  );
  if (unidades) {
    capacidades.push({ cantidad: numero(unidades[1]), unidad: 'ud' });
  }

  // Pack/caja/estuche de 6 unidades.
  const packConUnidades = texto.match(
    /(?:pack|paq(?:uete)?|caja|estuche)\s*(?:de\s*)?(\d+)\s*(?:u|ud|uds|unidades?)\.?\b/,
  );
  if (packConUnidades) {
    capacidades.push({ cantidad: numero(packConUnidades[1]), unidad: 'ud' });
  }

  // "Pack 6" es frecuente; evitamos confundir "paquete 500 g" con 500 unidades.
  const packSimple = texto.match(
    /(?:pack|paq(?:uete)?)\s*[-x]?\s*(?:de\s*)?(\d+)\b(?!\s*(?:g|kg|ml|cl|dl|l)\b)/,
  );
  if (packSimple) {
    capacidades.push({ cantidad: numero(packSimple[1]), unidad: 'ud' });
  }

  // Docenas escritas como formato comercial.
  if (/\bmedia\s+docena\b/.test(texto)) {
    capacidades.push({ cantidad: 6, unidad: 'ud' });
  } else {
    const docenas = texto.match(/(\d+(?:[.,]\d+)?)\s*docenas?\b/);
    if (docenas) {
      capacidades.push({ cantidad: numero(docenas[1]) * 12, unidad: 'ud' });
    } else if (/\bdocena\b/.test(texto)) {
      capacidades.push({ cantidad: 12, unidad: 'ud' });
    }
  }

  // Formatos que indican directamente el número de elementos sin escribir "ud".
  const elementosNombrados = texto.match(
    /(\d+)\s*(?:huevos?|rollos?|botellas?|latas?|botes?|tarros?|sobres?|capsulas?)\b/,
  );
  if (elementosNombrados) {
    capacidades.push({ cantidad: numero(elementosNombrados[1]), unidad: 'ud' });
  }

  const esUnidadSimple = [
    'pieza',
    'unidad',
    'envase',
    'bote',
    'tarro',
    'lata',
    'bolsa',
    'paquete',
    'pack',
    'caja',
    'estuche',
    'malla',
    'bandeja',
    'barqueta',
    'tarrina',
    'botella',
    'brik',
    'brick',
    'rollo',
  ].some((palabra) => texto === palabra || texto.includes(palabra));

  if (esUnidadSimple && !capacidades.some((item) => item.unidad === 'ud')) {
    capacidades.push({ cantidad: 1, unidad: 'ud' });
  }

  return capacidades;
}

function capacidadesProducto(
  producto: ProductoMercadonaCatalogo,
): CapacidadProducto[] {
  const capacidades = capacidadesDesdeFormato(producto.formato);
  const nombreProducto = normalizarTexto(producto.nombre);
  const formatoProducto = normalizarTexto(producto.formato);

  // Mercadona publica la malla de ajos por peso, aunque el contenido habitual
  // fijado para la planificación familiar es de cuatro cabezas.
  if (
    formatoProducto.includes('malla') &&
    /\bajos?\b/.test(nombreProducto) &&
    !/\b(granulado|polvo|troceado|tierno|negro|alinado)\b/.test(nombreProducto)
  ) {
    capacidades.push({ cantidad: 4, unidad: 'ud' });
  }

  const unidadesTotales = producto.unidadesTotales ?? 0;
  const tamanoUnidad = producto.tamanoUnidad ?? 0;
  const formatoUnidad = producto.formatoUnidad ?? '';

  if (unidadesTotales > 0) {
    capacidades.push({
      cantidad: unidadesTotales,
      unidad: 'ud',
    });
  }

  if (tamanoUnidad > 0 && formatoUnidad) {
    // unit_size es el tamaño de UNA unidad del multipack. Para necesidades en
    // gramos/ml necesitamos la capacidad total del envase comercial completo.
    const multiplicador = unidadesTotales > 0 ? unidadesTotales : 1;
    const capacidad = capacidadDesdeCantidad(
      tamanoUnidad * multiplicador,
      formatoUnidad,
    );

    if (capacidad) capacidades.push(capacidad);
  }

  const unicas = new Map<string, CapacidadProducto>();
  capacidades.forEach((capacidad) => {
    const existente = unicas.get(capacidad.unidad);
    if (!existente || capacidad.cantidad > existente.cantidad) {
      unicas.set(capacidad.unidad, capacidad);
    }
  });

  return Array.from(unicas.values());
}

function tienePrecioVariable(
  producto: ProductoMercadonaCatalogo,
): boolean {
  const formato = normalizarTexto(producto.formato);
  const unidadPeso = normalizarUnidad(producto.formatoUnidad ?? '');

  return (
    formato.includes('pieza') &&
    (unidadPeso === 'g' || unidadPeso === 'kg')
  );
}

const PESO_APROXIMADO_POR_PIEZA_G: Record<string, number> = {
  zanahoria: 100,
  zanahorias: 100,
  tomate: 180,
  tomates: 180,
  pepino: 300,
  pepinos: 300,
  calabacin: 300,
  calabacines: 300,
  cebolla: 200,
  cebollas: 200,
  patata: 200,
  patatas: 200,
  pimiento: 200,
  pimientos: 200,
  berenjena: 300,
  berenjenas: 300,
  manzana: 180,
  manzanas: 180,
  pera: 170,
  peras: 170,
  naranja: 200,
  naranjas: 200,
  limon: 150,
  limones: 150,
  platano: 120,
  platanos: 120,
  'fruta variada': 170,
};

const GRAMOS_POR_VASO_ARROZ: Record<string, number> = {
  vaso: 180,
  vasos: 180,
  taza: 180,
  tazas: 180,
  'vaso pequeno': 150,
  'vaso grande': 200,
};

type NecesidadConvertida = CantidadBase & {
  aproximada: boolean;
};

function convertirNecesidadParaProducto(
  ingrediente: Ingrediente,
  producto: ProductoMercadonaCatalogo,
  capacidadPorUnidad: Map<string, number>,
): NecesidadConvertida {
  const necesidadDirecta = convertirABase(
    ingrediente.cantidad,
    ingrediente.unidad,
  );
  const formato = normalizarTexto(producto.formato);
  const nombre = normalizarTexto(ingrediente.nombre);
  const unidadOriginal = normalizarTexto(ingrediente.unidad);

  const productoTienePeso = Boolean(capacidadPorUnidad.get('g'));
  const productoSeVendePorPieza = formato.includes('pieza');

  // Las bolsas de verduras suelen indicar peso, mientras las recetas usan piezas.
  // En ese caso estimamos el peso medio de cada pieza en lugar de interpretar
  // cada zanahoria, cebolla, etc. como una bolsa completa.
  if (
    necesidadDirecta.unidad === 'ud' &&
    productoTienePeso &&
    !productoSeVendePorPieza
  ) {
    const gramosPorPieza = PESO_APROXIMADO_POR_PIEZA_G[nombre];

    if (gramosPorPieza) {
      return {
        cantidad: ingrediente.cantidad * gramosPorPieza,
        unidad: 'g',
        aproximada: true,
      };
    }
  }

  // Respaldo para recetas editadas que conserven la medida en vasos.
  // El arroz seco se aproxima a 180 g por vaso estándar.
  if (
    nombre === 'arroz' &&
    productoTienePeso &&
    GRAMOS_POR_VASO_ARROZ[unidadOriginal]
  ) {
    return {
      cantidad:
        ingrediente.cantidad * GRAMOS_POR_VASO_ARROZ[unidadOriginal],
      unidad: 'g',
      aproximada: true,
    };
  }

  return {
    ...necesidadDirecta,
    aproximada: false,
  };
}

export type CosteProporcionalIngrediente = {
  coste: number | null;
  envasesExactos: number | null;
  estimado: boolean;
};

export function calcularCosteProporcionalIngrediente(
  ingrediente: Ingrediente,
  producto: ProductoMercadonaCatalogo,
): CosteProporcionalIngrediente {
  if (producto.precio === null) {
    return { coste: null, envasesExactos: null, estimado: false };
  }

  const capacidades = capacidadesProducto(producto);
  const capacidadPorUnidad = new Map(
    capacidades.map((capacidad) => [capacidad.unidad, capacidad.cantidad]),
  );
  const necesidad = convertirNecesidadParaProducto(
    ingrediente,
    producto,
    capacidadPorUnidad,
  );
  const capacidad = capacidadPorUnidad.get(necesidad.unidad);

  if (!capacidad || capacidad <= 0) {
    return {
      coste: null,
      envasesExactos: null,
      estimado: true,
    };
  }

  const envasesExactos = necesidad.cantidad / capacidad;
  return {
    coste: producto.precio * envasesExactos,
    envasesExactos,
    estimado: necesidad.aproximada || tienePrecioVariable(producto),
  };
}

export function calcularEnvasesParaNecesidades(
  necesidades: Ingrediente[],
  producto: ProductoMercadonaCatalogo,
): { envases: number; envasesExactos: number; estimado: boolean } {
  const capacidades = capacidadesProducto(producto);
  const capacidadPorUnidad = new Map(
    capacidades.map((capacidad) => [capacidad.unidad, capacidad.cantidad]),
  );

  let equivalentesEnvase = 0;
  let conversionIncompleta = false;
  let conversionAproximada = false;

  necesidades.forEach((ingrediente) => {
    const necesidad = convertirNecesidadParaProducto(
      ingrediente,
      producto,
      capacidadPorUnidad,
    );
    const capacidad = capacidadPorUnidad.get(necesidad.unidad);

    if (capacidad && capacidad > 0) {
      equivalentesEnvase += necesidad.cantidad / capacidad;
      conversionAproximada ||= necesidad.aproximada;
      return;
    }

    conversionIncompleta = true;

    if (necesidad.unidad === 'ud') {
      equivalentesEnvase += Math.max(1, necesidad.cantidad);
    } else {
      equivalentesEnvase += 1;
    }
  });

  return {
    envases: Math.max(1, Math.ceil(equivalentesEnvase)),
    envasesExactos: Math.max(0, equivalentesEnvase),
    estimado:
      tienePrecioVariable(producto) ||
      conversionAproximada ||
      conversionIncompleta ||
      capacidades.length === 0,
  };
}

export function calcularEnvasesConStock(
  envasesMenu: number,
  stockActual: number,
  stockMinimo: number,
): number {
  return Math.max(
    0,
    Math.ceil(
      Math.max(stockMinimo, envasesMenu) - stockActual,
    ),
  );
}

function crearLineaTemporal(
  ingrediente: Ingrediente,
  productosAsociados: Record<string, ProductoMercadonaCatalogo>,
): LineaMenuTemporal {
  return {
    ingrediente,
    producto: productosAsociados[ingrediente.nombre] ?? null,
  };
}

function crearLineaSinProducto(
  temporal: LineaMenuTemporal,
): LineaCompra {
  return {
    clave: crearClave(
      temporal.ingrediente.nombre,
      temporal.ingrediente.unidad,
    ),
    ingrediente: temporal.ingrediente,
    necesidades: [temporal.ingrediente],
    producto: null,
    productoDespensa: null,
    envases: 0,
    envasesExactos: null,
    subtotal: null,
    calculoEstimado: false,
    tipoCompra: 'semanal',
    origen: 'menu',
  };
}

function combinarLineasProducto(
  temporales: LineaMenuTemporal[],
  productoDespensa: ProductoDespensa | null,
  aplicarStock: boolean,
): LineaCompra {
  const primera = temporales[0];
  const producto = primera.producto;

  if (!producto) return crearLineaSinProducto(primera);

  const necesidades = temporales.map((temporal) => temporal.ingrediente);
  const calculo = calcularEnvasesParaNecesidades(necesidades, producto);
  const envasesMenu = calculo.envases;

  const esDespensaAutomatica = Boolean(
    productoDespensa &&
      productoDespensa.tipo === 'despensa' &&
      productoDespensa.frecuencia !== 'manual',
  );

  const envases = esDespensaAutomatica && aplicarStock
    ? calcularEnvasesConStock(
        calculo.envasesExactos,
        productoDespensa?.stockActual ?? 0,
        productoDespensa?.stockMinimo ?? 0,
      )
    : envasesMenu;

  const nombres = necesidades.map((necesidad) => necesidad.nombre);
  const ingrediente: Ingrediente = {
    ...primera.ingrediente,
    nombre: Array.from(new Set(nombres)).join(' + '),
  };

  return {
    clave: crearClave(
      ingrediente.nombre,
      ingrediente.unidad,
      producto.productoId,
    ),
    ingrediente,
    necesidades,
    producto,
    productoDespensa,
    envases,
    envasesExactos: calculo.envasesExactos,
    subtotal:
      producto.precio === null
        ? null
        : envases * producto.precio,
    calculoEstimado: calculo.estimado,
    tipoCompra: esDespensaAutomatica ? 'despensa' : 'semanal',
    origen: 'menu',
  };
}

function crearLineaReposicion(
  productoDespensa: ProductoDespensa,
): LineaCompra | null {
  const envases = calcularReposicion(productoDespensa);
  if (envases <= 0) return null;

  const ingrediente: Ingrediente = {
    nombre: productoDespensa.nombre,
    cantidad: envases,
    unidad: productoDespensa.unidad,
    seccion: 'Despensa',
  };

  const producto: ProductoMercadonaCatalogo = {
    productoId: productoDespensa.productoId,
    nombre: productoDespensa.nombre,
    precio: productoDespensa.precio,
    precioReferencia: null,
    formato: productoDespensa.formato,
    pesoAproximado: false,
    seccion: 'Despensa',
    subcategoria: 'Reposición',
    imagen: productoDespensa.imagen,
    url: '',
    disponible: true,
  };

  return {
    clave: crearClave(
      productoDespensa.nombre,
      productoDespensa.unidad,
      productoDespensa.productoId,
    ),
    ingrediente,
    necesidades: [ingrediente],
    producto,
    productoDespensa,
    envases,
    envasesExactos: envases,
    subtotal:
      productoDespensa.precio === null
        ? null
        : envases * productoDespensa.precio,
    calculoEstimado: false,
    tipoCompra: 'despensa',
    origen: 'reposicion',
  };
}

function sumarSubtotal(lineas: LineaCompra[]): number {
  return lineas.reduce(
    (total, linea) => total + (linea.subtotal ?? 0),
    0,
  );
}

export async function generarCompraMercadona(
  menu: DiaMenu[],
  opciones: OpcionesCompra = {},
): Promise<ResultadoCompra> {
  const aplicarStock = opciones.aplicarStock ?? true;
  const incluirReposicion = opciones.incluirReposicion ?? true;
  const ingredientes = generarListaCompra(menu);
  const despensa = cargarDespensa();
  const despensaPorProducto = new Map(
    despensa.map((producto) => [producto.productoId, producto]),
  );

  const productosAsociados = await obtenerProductosAsociados();
  const temporales = ingredientes.map((ingrediente) =>
    crearLineaTemporal(ingrediente, productosAsociados),
  );

  const sinProducto = temporales.filter((temporal) => !temporal.producto);
  const conProducto = temporales.filter(
    (
      temporal,
    ): temporal is LineaMenuTemporal & {
      producto: ProductoMercadonaCatalogo;
    } => Boolean(temporal.producto),
  );

  const grupos = new Map<string, LineaMenuTemporal[]>();
  conProducto.forEach((temporal) => {
    const productoId = temporal.producto.productoId;
    const grupo = grupos.get(productoId) ?? [];
    grupo.push(temporal);
    grupos.set(productoId, grupo);
  });

  const lineasMenu: LineaCompra[] = [
    ...sinProducto.map(crearLineaSinProducto),
    ...Array.from(grupos.entries()).map(([productoId, grupo]) =>
      combinarLineasProducto(
        grupo,
        despensaPorProducto.get(productoId) ?? null,
        aplicarStock,
      ),
    ),
  ];

  const idsIncluidos = new Set(
    lineasMenu
      .map((linea) => linea.producto?.productoId)
      .filter((id): id is string => Boolean(id)),
  );

  const lineasReposicion = (incluirReposicion ? despensa : [])
    .filter((producto) => !idsIncluidos.has(producto.productoId))
    .map(crearLineaReposicion)
    .filter((linea): linea is LineaCompra => linea !== null);

  const lineas = [...lineasMenu, ...lineasReposicion].filter(
    (linea) => linea.envases > 0 || !linea.producto,
  );

  const lineasSemanales = lineas.filter(
    (linea) => linea.tipoCompra === 'semanal',
  );
  const lineasDespensa = lineas.filter(
    (linea) => linea.tipoCompra === 'despensa',
  );

  const productosSinSeleccionar = lineas
    .filter((linea) => !linea.producto)
    .map((linea) => linea.ingrediente.nombre);
  const productosSinPrecio = lineas
    .filter((linea) => linea.producto?.precio === null)
    .map((linea) => linea.ingrediente.nombre);
  const productosEstimados = lineas
    .filter((linea) => linea.calculoEstimado)
    .map((linea) => linea.ingrediente.nombre);

  const totalSemanal = sumarSubtotal(lineasSemanales);
  const totalDespensa = sumarSubtotal(lineasDespensa);

  return {
    lineas,
    lineasSemanales,
    lineasDespensa,
    total: totalSemanal + totalDespensa,
    totalSemanal,
    totalDespensa,
    productosSinSeleccionar,
    productosSinPrecio,
    productosEstimados,
  };
}
