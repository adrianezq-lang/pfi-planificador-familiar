import type { DiaMenu } from '../data/Menusemanal';
import {
  generarCompraMercadona,
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
const PRODUCTO_SALCHICHAS_BOCATA_GOURMET = '53143';
const SALCHICHAS_POR_COMPRA_GOURMET = 4;

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
 * Algunos productos del catálogo exponen el número de paquetes interiores como
 * `unidadesTotales`, no el número de piezas de comida. El 53143 contiene cuatro
 * salchichas repartidas en dos paquetes internos; sin esta corrección, una receta
 * de cuatro perritos se interpretaría como dos compras comerciales.
 *
 * La regla está ligada al ID concreto: si el usuario selecciona otro producto,
 * no se aplica ninguna suposición sobre su formato.
 */
export function ajustarFormatoComercialEspecial(
  linea: LineaCompra,
): LineaCompra {
  if (linea.producto?.productoId !== PRODUCTO_SALCHICHAS_BOCATA_GOURMET) {
    return linea;
  }

  const unidadesSalchicha = linea.necesidades.reduce((total, necesidad) => {
    const nombre = normalizarTexto(necesidad.nombre);
    const unidad = normalizarTexto(necesidad.unidad);
    const esUnidad = ['u', 'ud', 'uds', 'unidad', 'unidades'].includes(unidad);
    return nombre === 'salchichas' && esUnidad
      ? total + Math.max(0, necesidad.cantidad)
      : total;
  }, 0);

  if (unidadesSalchicha <= 0) return linea;

  const envasesExactos = unidadesSalchicha / SALCHICHAS_POR_COMPRA_GOURMET;
  const envases = Math.max(1, Math.ceil(envasesExactos - 0.000001));

  return {
    ...linea,
    envasesExactos,
    envases,
    subtotal:
      linea.producto.precio === null
        ? null
        : envases * linea.producto.precio,
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
    aplicarNecesidadesMensuales(lineasNoFrescas),
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
    const ajustada: LineaCompra = {
      ...linea,
      envases,
      subtotal: linea.producto.precio === null ? null : envases * linea.producto.precio,
    };
    if (envases > 0) comprasActivas.push(ajustada);
    else cubiertasActivas.push(ajustada);
  });

  base.lineas
    .filter((linea) => esProductoSemanal(linea) && !linea.producto)
    .forEach((linea) => comprasActivas.push(linea));

  return rehacerResultado(base, comprasActivas, cubiertasActivas);
}
