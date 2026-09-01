import type { DiaMenu } from '../data/Menusemanal';
import {
  generarCompraMercadona,
  type LineaCompra,
  type ResultadoCompra,
} from '../motor/compra';
import { obtenerSeccionCompra } from './categoriasCompra';
import { cargarDespensa } from './despensa';
import { correspondeACompraSemanal, proyectarComprasEnvases } from './proyeccionStock';

export function esProductoSemanal(linea: LineaCompra): boolean {
  const texto = `${linea.ingrediente.nombre} ${linea.ingrediente.seccion} ${linea.producto?.nombre ?? ''}`
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

export async function generarCompraMensual(
  menuMes: DiaMenu[],
): Promise<ResultadoCompra> {
  const resultado = await generarCompraMercadona(menuMes);
  return rehacerResultado(
    resultado,
    resultado.lineas.filter((linea) => !esProductoSemanal(linea)),
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
    const proyeccion = proyectarComprasEnvases(
      necesidades,
      stockInicial.get(productoId) ?? 0,
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
