import type { DiaMenu } from '../data/Menusemanal';
import {
  calcularEnvasesParaNecesidades,
  generarCompraMercadona,
  type ExplicacionCantidadCompra,
  type LineaCompra,
  type ResultadoCompra,
} from '../motor/compra';
import { obtenerSeccionCompra } from './categoriasCompra';
import { cargarDespensa, type ProductoDespensa } from './despensa';
import {
  calcularCompraMensualEnvases,
  obtenerNecesidadMensual,
} from './necesidadesMensuales';
import { correspondeACompraSemanal, proyectarComprasEnvases } from './proyeccionStock';

const COBERTURA_FRESCO_PESO_VARIABLE = 1.1;

type ReglaFormatoComercial = {
  ingredientes: string[];
  unidadesPorEnvase: number;
  unidadesNecesidad?: string[];
};

const UNIDADES_PIEZA = ['u', 'ud', 'uds', 'unidad', 'unidades'];

const FORMATOS_COMERCIALES_ESPECIALES: Record<string, ReglaFormatoComercial> = {
  // Dos paquetes interiores, cuatro salchichas reales en total.
  '53143': {
    ingredientes: ['salchichas'],
    unidadesPorEnvase: 4,
  },
  // Maxi pan de burger Hacendado: paquete de cuatro unidades.
  '13803': {
    ingredientes: ['pan de hamburguesa'],
    unidadesPorEnvase: 4,
  },
  // Pan hot dog Hacendado: paquete de seis unidades.
  '82332': {
    ingredientes: ['pan de perrito'],
    unidadesPorEnvase: 6,
  },
  // El catálogo del bacón en cintas expone dos unidades internas, pero las
  // recetas usan barqueta/paquete para referirse al envase comercial completo.
  '16252': {
    ingredientes: ['bacon'],
    unidadesPorEnvase: 1,
    unidadesNecesidad: ['barqueta', 'barquetas', 'paquete', 'paquetes'],
  },
};

function normalizarTexto(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function coberturaPorEnvase(linea: LineaCompra): number {
  const producto = linea.producto;
  if (!producto) return 1;

  const seccion = normalizarTexto(producto.seccion ?? '');
  const formato = normalizarTexto(producto.formato ?? '');
  const unidadPeso = normalizarTexto(producto.formatoUnidad ?? '');
  const esCarneOPescado =
    seccion.includes('carne') ||
    seccion.includes('pescado') ||
    seccion.includes('marisco');
  const formatoVariable =
    formato.includes('bandeja') ||
    formato.includes('pieza');
  const vendidoPorPeso = unidadPeso === 'kg' || unidadPeso === 'g';

  return esCarneOPescado && formatoVariable && vendidoPorPeso
    ? COBERTURA_FRESCO_PESO_VARIABLE
    : 1;
}

/**
 * Corrige productos cuyo catálogo comercial no expresa bien cuántas piezas de
 * comida contiene el envase. La regla va ligada al SKU exacto, por lo que una
 * elección manual de otro producto nunca hereda estas capacidades.
 *
 * Una misma referencia puede recibir necesidades en formatos distintos. Es el
 * caso del bacón: carbonara/hamburguesas usan barquetas completas y las pizzas
 * gramos. Las necesidades no especiales se conservan y se convierten con el
 * motor general para no perder parte de la compra al aplicar la excepción.
 */
export function ajustarFormatoComercialEspecial(
  linea: LineaCompra,
): LineaCompra {
  const producto = linea.producto;
  if (!producto) return linea;

  const regla = FORMATOS_COMERCIALES_ESPECIALES[producto.productoId];
  if (!regla) return linea;

  const unidadesAceptadas = regla.unidadesNecesidad ?? UNIDADES_PIEZA;
  const necesidadesEspeciales = linea.necesidades.filter((necesidad) => {
    const nombre = normalizarTexto(necesidad.nombre);
    const unidad = normalizarTexto(necesidad.unidad);
    return regla.ingredientes.includes(nombre) && unidadesAceptadas.includes(unidad);
  });
  const necesidadesResto = linea.necesidades.filter(
    (necesidad) => !necesidadesEspeciales.includes(necesidad),
  );
  const unidadesNecesarias = necesidadesEspeciales.reduce(
    (total, necesidad) => total + Math.max(0, necesidad.cantidad),
    0,
  );

  if (unidadesNecesarias <= 0) return linea;

  const exactosEspeciales = unidadesNecesarias / regla.unidadesPorEnvase;
  const calculoResto = necesidadesResto.length > 0
    ? calcularEnvasesParaNecesidades(necesidadesResto, producto)
    : null;
  const envasesExactos = exactosEspeciales + (calculoResto?.envasesExactos ?? 0);
  const envases = Math.max(1, Math.ceil(envasesExactos - 0.000001));

  return {
    ...linea,
    envasesExactos,
    envases,
    calculoEstimado: linea.calculoEstimado || Boolean(calculoResto?.estimado),
    subtotal:
      producto.precio === null
        ? null
        : envases * producto.precio,
  };
}

export function esProductoSemanal(linea: LineaCompra): boolean {
  const texto = `${linea.ingrediente.nombre} ${linea.ingrediente.seccion} ${linea.producto?.nombre ?? ''}`;
  return correspondeACompraSemanal(obtenerSeccionCompra(linea), texto);
}

function rehacerResultado(
  base: ResultadoCompra,
  lineas: LineaCompra[],
  lineasCubiertas: LineaCompra[] = [],
): ResultadoCompra {
  const lineasSemanales = lineas.filter((linea) => linea.tipoCompra === 'semanal');
  const lineasDespensa = lineas.filter((linea) => linea.tipoCompra === 'despensa');
  const sumar = (elementos: LineaCompra[]) =>
    elementos.reduce((total, linea) => total + (linea.subtotal ?? 0), 0);

  return {
    ...base,
    lineas,
    lineasSemanales,
    lineasDespensa,
    totalSemanal: sumar(lineasSemanales),
    totalDespensa: sumar(lineasDespensa),
    total: sumar(lineas),
    productosSinSeleccionar: lineas
      .filter((linea) => !linea.producto)
      .map((linea) => linea.ingrediente.nombre),
    productosSinPrecio: lineas
      .filter((linea) => linea.producto?.precio === null)
      .map((linea) => linea.ingrediente.nombre),
    productosEstimados: lineas
      .filter((linea) => linea.calculoEstimado)
      .map((linea) => linea.ingrediente.nombre),
    lineasCubiertas,
  };
}

function explicacionMensual(linea: LineaCompra): ExplicacionCantidadCompra | undefined {
  if (!linea.producto) return undefined;

  const productoDespensa = linea.productoDespensa;
  const stockAplicado = Boolean(
    productoDespensa &&
      productoDespensa.tipo === 'despensa' &&
      productoDespensa.frecuencia !== 'manual',
  );
  const stockAntesEnvases = stockAplicado
    ? Math.max(0, productoDespensa?.stockActual ?? 0)
    : 0;
  const necesidadMenuEnvases = linea.origen === 'menu'
    ? Math.max(0, linea.envasesExactos ?? linea.envases)
    : 0;
  const necesidadMensualEnvases =
    productoDespensa?.tipo === 'despensa' &&
    productoDespensa.frecuencia === 'mensual'
    ? obtenerNecesidadMensual(
        productoDespensa.productoId,
        productoDespensa.frecuencia,
      )
    : 0;
  const reservaEnvases = stockAplicado
    ? Math.max(0, productoDespensa?.stockMinimo ?? 0)
    : 0;
  const objetivoEnvases = Math.max(
    necesidadMenuEnvases,
    necesidadMensualEnvases,
    reservaEnvases,
  );

  return {
    periodo: 'mes',
    necesidadMenuEnvases,
    necesidadMensualEnvases,
    reservaEnvases,
    objetivoEnvases,
    stockAntesEnvases,
    compraEnvases: linea.envases,
    sobranteDespuesEnvases: Math.max(
      0,
      stockAntesEnvases + linea.envases - objetivoEnvases,
    ),
    stockAplicado,
  };
}

function explicarLineasMensuales(lineas: LineaCompra[]): LineaCompra[] {
  return lineas.map((linea) => ({
    ...linea,
    explicacionCantidad: explicacionMensual(linea),
  }));
}

function crearLineaMensualDespensa(
  productoDespensa: ProductoDespensa,
  cantidadMensual: number,
  envases: number,
): LineaCompra {
  const ingrediente = {
    nombre: productoDespensa.nombre,
    cantidad: cantidadMensual,
    unidad: productoDespensa.unidad,
    seccion: 'Despensa',
  };
  const producto = {
    productoId: productoDespensa.productoId,
    nombre: productoDespensa.nombre,
    precio: productoDespensa.precio,
    precioReferencia: null,
    formato: productoDespensa.formato,
    pesoAproximado: false,
    seccion: 'Despensa',
    subcategoria: 'Compra mensual',
    imagen: productoDespensa.imagen,
    url: '',
    disponible: true,
  };

  return {
    clave: `mensual-${productoDespensa.productoId}`,
    ingrediente,
    necesidades: [ingrediente],
    producto,
    productoDespensa,
    envases,
    envasesExactos: cantidadMensual,
    subtotal:
      productoDespensa.precio === null
        ? null
        : envases * productoDespensa.precio,
    calculoEstimado: false,
    tipoCompra: 'despensa',
    origen: 'reposicion',
  };
}

export function aplicarNecesidadesMensuales(
  lineasBase: LineaCompra[],
): LineaCompra[] {
  const lineas = [...lineasBase];
  const despensaMensual = cargarDespensa().filter(
    (producto) =>
      producto.tipo === 'despensa' &&
      producto.frecuencia === 'mensual',
  );

  despensaMensual.forEach((productoDespensa) => {
    const cantidadMensual = obtenerNecesidadMensual(
      productoDespensa.productoId,
      productoDespensa.frecuencia,
    );
    if (cantidadMensual <= 0) return;

    const indice = lineas.findIndex(
      (linea) => linea.producto?.productoId === productoDespensa.productoId,
    );
    const existente = indice >= 0 ? lineas[indice] : null;
    const necesidadMenu = existente?.envasesExactos ?? 0;
    const envases = calcularCompraMensualEnvases(
      productoDespensa,
      necesidadMenu,
      cantidadMensual,
    );

    if (existente?.producto) {
      if (envases <= 0) {
        lineas.splice(indice, 1);
        return;
      }

      lineas[indice] = {
        ...existente,
        envases,
        subtotal:
          existente.producto.precio === null
            ? null
            : envases * existente.producto.precio,
      };
      return;
    }

    if (envases > 0) {
      lineas.push(
        crearLineaMensualDespensa(
          productoDespensa,
          cantidadMensual,
          envases,
        ),
      );
    }
  });

  return lineas;
}

export async function generarCompraMensual(
  menuMes: DiaMenu[],
): Promise<ResultadoCompra> {
  const resultado = await generarCompraMercadona(menuMes);
  const lineasCorregidas = resultado.lineas.map(ajustarFormatoComercialEspecial);
  const lineasNoFrescas = lineasCorregidas.filter(
    (linea) => !esProductoSemanal(linea),
  );

  return rehacerResultado(
    resultado,
    explicarLineasMensuales(
      aplicarNecesidadesMensuales(lineasNoFrescas),
    ),
  );
}

export async function generarCompraSemanalProyectada(
  menusSemanas: DiaMenu[][],
  semanaActiva: number,
): Promise<ResultadoCompra> {
  const resultados = await Promise.all(
    menusSemanas
      .slice(0, semanaActiva + 1)
      .map((menu) =>
        generarCompraMercadona(menu, {
          aplicarStock: false,
          incluirReposicion: false,
        }),
      ),
  );
  const base = resultados[semanaActiva] ?? (await generarCompraMercadona([], {
    aplicarStock: false,
    incluirReposicion: false,
  }));
  const stockInicial = new Map(
    cargarDespensa().map((producto) => [producto.productoId, producto.stockActual]),
  );
  const comprasActivas: LineaCompra[] = [];
  const cubiertasActivas: LineaCompra[] = [];
  const productos = new Set(
    resultados.flatMap((resultado) =>
      resultado.lineas
        .filter((linea) => esProductoSemanal(linea) && linea.producto)
        .map((linea) => linea.producto?.productoId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  productos.forEach((productoId) => {
    const lineasProducto = resultados.map((resultado) =>
      resultado.lineas.find((linea) => linea.producto?.productoId === productoId && esProductoSemanal(linea)),
    );
    const necesidades = lineasProducto.map((linea) => linea?.envasesExactos ?? 0);
    const lineaReferencia = lineasProducto.find((linea) => Boolean(linea?.producto));
    const proyeccion = proyectarComprasEnvases(
      necesidades,
      stockInicial.get(productoId) ?? 0,
      lineaReferencia ? coberturaPorEnvase(lineaReferencia) : 1,
    );
    const linea = lineasProducto[semanaActiva];
    if (!linea?.producto) return;
    const envases = proyeccion.compras[semanaActiva] ?? 0;
    const paso = proyeccion.pasos[semanaActiva];
    const ajustada: LineaCompra = {
      ...linea,
      envases,
      subtotal: linea.producto.precio === null ? null : envases * linea.producto.precio,
      explicacionCantidad: paso
        ? {
            periodo: 'semana',
            semana: semanaActiva + 1,
            necesidadMenuEnvases: paso.necesidad,
            necesidadMensualEnvases: 0,
            reservaEnvases: 0,
            objetivoEnvases: paso.necesidad,
            stockAntesEnvases: paso.stockAntes,
            compraEnvases: paso.compra,
            sobranteDespuesEnvases: paso.stockDespues,
            stockAplicado: true,
          }
        : undefined,
    };
    if (envases > 0) comprasActivas.push(ajustada);
    else cubiertasActivas.push(ajustada);
  });

  base.lineas
    .filter((linea) => esProductoSemanal(linea) && !linea.producto)
    .forEach((linea) => comprasActivas.push(linea));

  return rehacerResultado(base, comprasActivas, cubiertasActivas);
}
