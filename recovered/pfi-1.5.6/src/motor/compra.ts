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

export type LineaCompra = {
  clave: string;
  ingrediente: Ingrediente;
  necesidades: Ingrediente[];
  producto: ProductoMercadonaCatalogo | null;
  productoDespensa: ProductoDespensa | null;
  envases: number;
  subtotal: number | null;
  calculoEstimado: boolean;
  tipoCompra: TipoCompra;
  origen: OrigenLineaCompra;
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
  const valor = normalizarTexto(unidad);

  const equivalencias: Record<string, string> = {
    uds: 'ud',
    unidad: 'ud',
    unidades: 'ud',
    pieza: 'ud',
    piezas: 'ud',
    loncha: 'ud',
    lonchas: 'ud',
    lata: 'ud',
    latas: 'ud',
    bote: 'ud',
    botes: 'ud',
    bolsa: 'ud',
    bolsas: 'ud',
    paquete: 'ud',
    paquetes: 'ud',
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

function capacidadesDesdeFormato(
  formato: string,
): CapacidadProducto[] {
  const texto = normalizarTexto(formato);
  const capacidades: CapacidadProducto[] = [];

  const multiplicador = texto.match(
    /(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l)\b/,
  );

  if (multiplicador) {
    const unidades = numero(multiplicador[1]);
    const cantidad = numero(multiplicador[2]);
    const unidad = multiplicador[3];
    const capacidad = capacidadDesdeCantidad(
      unidades * cantidad * (unidad === 'cl' ? 10 : 1),
      unidad === 'cl' ? 'ml' : unidad,
    );

    if (capacidad) capacidades.push(capacidad);
  } else {
    const cantidadPesoVolumen = texto.match(
      /(\d+(?:[.,]\d+)?)\s*(g|kg|ml|cl|l)\b/,
    );

    if (cantidadPesoVolumen) {
      const unidad = cantidadPesoVolumen[2];
      const capacidad = capacidadDesdeCantidad(
        numero(cantidadPesoVolumen[1]) *
          (unidad === 'cl' ? 10 : 1),
        unidad === 'cl' ? 'ml' : unidad,
      );

      if (capacidad) capacidades.push(capacidad);
    }
  }

  const pack = texto.match(
    /(?:pack|paq(?:uete)?)\s*[-x]?\s*(?:de\s*)?(\d+)/,
  );
  const unidades = texto.match(
    /(\d+)\s*(?:ud|uds|unidades|unidad)\b/,
  );

  const cantidadUnidades = pack?.[1] ?? unidades?.[1];
  if (cantidadUnidades) {
    capacidades.push({
      cantidad: numero(cantidadUnidades),
      unidad: 'ud',
    });
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
    const capacidad = capacidadDesdeCantidad(
      tamanoUnidad,
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
): { envases: number; estimado: boolean } {
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
  stockObjetivo: number,
): number {
  return Math.max(
    0,
    Math.ceil(
      Math.max(stockObjetivo, envasesMenu) - stockActual,
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
    subtotal: null,
    calculoEstimado: false,
    tipoCompra: 'semanal',
    origen: 'menu',
  };
}

function combinarLineasProducto(
  temporales: LineaMenuTemporal[],
  productoDespensa: ProductoDespensa | null,
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

  const envases = esDespensaAutomatica
    ? calcularEnvasesConStock(
        envasesMenu,
        productoDespensa?.stockActual ?? 0,
        productoDespensa?.stockObjetivo ?? 0,
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
): Promise<ResultadoCompra> {
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
      ),
    ),
  ];

  const idsIncluidos = new Set(
    lineasMenu
      .map((linea) => linea.producto?.productoId)
      .filter((id): id is string => Boolean(id)),
  );

  const lineasReposicion = despensa
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
