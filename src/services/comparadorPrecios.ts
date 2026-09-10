import {
  calcularEnvasesParaNecesidades,
  type LineaCompra,
} from '../motor/compra';
import type { ProductoMercadonaCatalogo } from './catalogoMercadona';

export const CLAVE_CONFIGURACION_COMPARADOR = 'pfi-comparador-config-v1';
export const CLAVE_OFERTAS_COMPARADOR = 'pfi-comparador-ofertas-v1';
export const EVENTO_COMPARADOR_PRECIOS = 'pfi-comparador-precios-actualizado';

export type TipoTiendaComparador =
  | 'supermercado'
  | 'carniceria'
  | 'fruteria'
  | 'otro';

export type UnidadOfertaComparador = 'g' | 'kg' | 'ml' | 'l' | 'ud';
export type ModoVentaComparador = 'envase' | 'peso';

export type TiendaComparador = {
  id: string;
  nombre: string;
  tipo: TipoTiendaComparador;
  activa: boolean;
  automatica: boolean;
  fuenteUrl: string | null;
};

export type ConfiguracionComparador = {
  codigoPostal: string;
  maxTiendas: number;
  ahorroMinimo: number;
  vigenciaDias: number;
  tiendas: TiendaComparador[];
};

export type OfertaComparador = {
  id: string;
  productoClave: string;
  ingrediente: string;
  tiendaId: string;
  nombreProducto: string;
  precio: number;
  cantidad: number;
  unidad: UnidadOfertaComparador;
  modoVenta: ModoVentaComparador;
  actualizadaEn: string;
  origen: 'manual' | 'ticket' | 'catalogo';
  referenciaExterna?: string | null;
  urlFuente?: string | null;
  imagen?: string | null;
};

export type OfertaComparadorEntrada = Omit<OfertaComparador, 'id'>;

export type OpcionPrecioComparador = {
  tiendaId: string;
  tiendaNombre: string;
  productoNombre: string;
  precioEnvase: number;
  envases: number;
  coste: number;
  alPeso: boolean;
  cantidadAlPeso: number | null;
  unidadAlPeso: UnidadOfertaComparador | null;
  estimado: boolean;
  automatica: boolean;
  actualizadaEn: string | null;
  vigente: boolean;
};

export type ComparacionLinea = {
  clave: string;
  nombre: string;
  linea: LineaCompra;
  opciones: OpcionPrecioComparador[];
};

export type AsignacionComparador = {
  clave: string;
  nombre: string;
  opcion: OpcionPrecioComparador;
  ahorroFrenteMercadona: number | null;
};

export type PlanCompraComparada = {
  total: number;
  completo: boolean;
  cubiertos: number;
  totalLineas: number;
  tiendas: string[];
  asignaciones: AsignacionComparador[];
  sinPrecio: string[];
};

export type ResumenTiendaComparador = {
  tienda: TiendaComparador;
  total: number;
  cubiertos: number;
  totalLineas: number;
  completo: boolean;
};

export type ResultadoComparador = {
  lineas: ComparacionLinea[];
  porTienda: ResumenTiendaComparador[];
  unaTienda: PlanCompraComparada | null;
  practica: PlanCompraComparada;
  absoluta: PlanCompraComparada;
  recomendada: PlanCompraComparada;
  ofertasCaducadas: number;
};

const TIENDAS_BASE: TiendaComparador[] = [
  {
    id: 'mercadona',
    nombre: 'Mercadona',
    tipo: 'supermercado',
    activa: true,
    automatica: true,
    fuenteUrl: 'https://tienda.mercadona.es/',
  },
  {
    id: 'carrefour',
    nombre: 'Carrefour',
    tipo: 'supermercado',
    activa: true,
    automatica: true,
    fuenteUrl: 'https://www.carrefour.es/supermercado',
  },
  {
    id: 'eroski',
    nombre: 'Eroski',
    tipo: 'supermercado',
    activa: true,
    automatica: true,
    fuenteUrl: 'https://supermercado.eroski.es/es/',
  },
  {
    id: 'lidl',
    nombre: 'Lidl',
    tipo: 'supermercado',
    activa: true,
    automatica: false,
    fuenteUrl: 'https://www.lidl.es/',
  },
];

export const configuracionComparadorInicial: ConfiguracionComparador = {
  codigoPostal: '48950',
  maxTiendas: 2,
  ahorroMinimo: 3,
  vigenciaDias: 14,
  tiendas: TIENDAS_BASE,
};

const UNIDADES_OFERTA = new Set<UnidadOfertaComparador>([
  'g',
  'kg',
  'ml',
  'l',
  'ud',
]);

const TIPOS_TIENDA = new Set<TipoTiendaComparador>([
  'supermercado',
  'carniceria',
  'fruteria',
  'otro',
]);

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function numeroLimitado(
  valor: unknown,
  alternativa: number,
  minimo: number,
  maximo: number,
): number {
  const numero = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(numero)) return alternativa;
  return Math.min(maximo, Math.max(minimo, numero));
}

function normalizarTexto(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function fechaLocalISO(fecha = new Date()): string {
  const desplazamiento = fecha.getTimezoneOffset() * 60_000;
  return new Date(fecha.getTime() - desplazamiento).toISOString().slice(0, 10);
}

function normalizarFecha(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const dia = valor.slice(0, 10);
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  if (!coincidencia || dia > fechaLocalISO()) return null;

  const [, ano, mes, jornada] = coincidencia;
  const fecha = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(jornada)));
  if (
    fecha.getUTCFullYear() !== Number(ano) ||
    fecha.getUTCMonth() !== Number(mes) - 1 ||
    fecha.getUTCDate() !== Number(jornada)
  ) {
    return null;
  }
  return dia;
}

function normalizarTiendaPersonalizada(valor: unknown): TiendaComparador | null {
  if (!esObjeto(valor)) return null;
  const id = typeof valor.id === 'string' ? valor.id.trim() : '';
  const nombre = typeof valor.nombre === 'string' ? valor.nombre.trim() : '';
  const tipo = TIPOS_TIENDA.has(valor.tipo as TipoTiendaComparador)
    ? valor.tipo as TipoTiendaComparador
    : 'otro';

  if (!id.startsWith('local-') || !nombre) return null;

  return {
    id: id.slice(0, 80),
    nombre: nombre.slice(0, 80),
    tipo,
    activa: valor.activa !== false,
    automatica: false,
    fuenteUrl: null,
  };
}

export function normalizarConfiguracionComparador(
  valor: unknown,
): ConfiguracionComparador {
  const parcial = esObjeto(valor) ? valor : {};
  const tiendasGuardadas = Array.isArray(parcial.tiendas) ? parcial.tiendas : [];
  const activasPorId = new Map<string, boolean>();

  tiendasGuardadas.forEach((tienda) => {
    if (!esObjeto(tienda) || typeof tienda.id !== 'string') return;
    activasPorId.set(tienda.id, tienda.activa !== false);
  });

  const base = TIENDAS_BASE.map((tienda) => ({
    ...tienda,
    activa: tienda.id === 'mercadona'
      ? true
      : activasPorId.get(tienda.id) ?? tienda.activa,
  }));
  const personalizadas = tiendasGuardadas
    .map(normalizarTiendaPersonalizada)
    .filter((tienda): tienda is TiendaComparador => Boolean(tienda))
    .filter(
      (tienda, indice, todas) =>
        todas.findIndex((candidata) => candidata.id === tienda.id) === indice,
    )
    .slice(0, 12);
  const codigoPostal = typeof parcial.codigoPostal === 'string' && /^\d{5}$/.test(parcial.codigoPostal)
    ? parcial.codigoPostal
    : configuracionComparadorInicial.codigoPostal;

  return {
    codigoPostal,
    maxTiendas: Math.round(numeroLimitado(parcial.maxTiendas, 2, 1, 4)),
    ahorroMinimo: Math.round(numeroLimitado(parcial.ahorroMinimo, 3, 0, 50) * 100) / 100,
    vigenciaDias: Math.round(numeroLimitado(parcial.vigenciaDias, 14, 1, 90)),
    tiendas: [...base, ...personalizadas],
  };
}

function emitirActualizacion(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENTO_COMPARADOR_PRECIOS));
}

export function cargarConfiguracionComparador(): ConfiguracionComparador {
  try {
    const raw = localStorage.getItem(CLAVE_CONFIGURACION_COMPARADOR);
    const configuracion = normalizarConfiguracionComparador(
      raw ? JSON.parse(raw) as unknown : configuracionComparadorInicial,
    );
    const serializada = JSON.stringify(configuracion);
    if (raw !== serializada) localStorage.setItem(CLAVE_CONFIGURACION_COMPARADOR, serializada);
    return configuracion;
  } catch {
    return normalizarConfiguracionComparador(configuracionComparadorInicial);
  }
}

export function guardarConfiguracionComparador(
  configuracion: ConfiguracionComparador,
): ConfiguracionComparador {
  const normalizada = normalizarConfiguracionComparador(configuracion);
  localStorage.setItem(CLAVE_CONFIGURACION_COMPARADOR, JSON.stringify(normalizada));
  emitirActualizacion();
  return normalizada;
}

export function crearTiendaLocal(
  configuracion: ConfiguracionComparador,
  nombre: string,
  tipo: TipoTiendaComparador,
): ConfiguracionComparador {
  const nombreLimpio = nombre.trim().slice(0, 80);
  if (!nombreLimpio) throw new Error('Escribe el nombre del comercio.');
  if (!TIPOS_TIENDA.has(tipo) || tipo === 'supermercado') {
    throw new Error('Elige carnicería, frutería u otro comercio.');
  }

  const baseId = normalizarTexto(nombreLimpio) || 'comercio';
  let id = `local-${baseId}`;
  let sufijo = 2;
  while (configuracion.tiendas.some((tienda) => tienda.id === id)) {
    id = `local-${baseId}-${sufijo}`;
    sufijo += 1;
  }

  return guardarConfiguracionComparador({
    ...configuracion,
    tiendas: [
      ...configuracion.tiendas,
      {
        id,
        nombre: nombreLimpio,
        tipo,
        activa: true,
        automatica: false,
        fuenteUrl: null,
      },
    ],
  });
}

function normalizarOferta(valor: unknown): OfertaComparador | null {
  if (!esObjeto(valor)) return null;
  const productoClave = typeof valor.productoClave === 'string'
    ? valor.productoClave.trim().slice(0, 160)
    : '';
  const tiendaId = typeof valor.tiendaId === 'string'
    ? valor.tiendaId.trim().slice(0, 80)
    : '';
  const ingrediente = typeof valor.ingrediente === 'string'
    ? valor.ingrediente.trim().slice(0, 160)
    : '';
  const nombreProducto = typeof valor.nombreProducto === 'string'
    ? valor.nombreProducto.trim().slice(0, 180)
    : '';
  const precio = numeroLimitado(valor.precio, 0, 0, 100_000);
  const cantidad = numeroLimitado(valor.cantidad, 0, 0, 100_000);
  const actualizadaEn = normalizarFecha(valor.actualizadaEn);
  const unidad = UNIDADES_OFERTA.has(valor.unidad as UnidadOfertaComparador)
    ? valor.unidad as UnidadOfertaComparador
    : null;
  const modoVenta = valor.modoVenta === 'peso' ? 'peso' : 'envase';
  const origenSolicitado = valor.origen === 'ticket'
    ? 'ticket'
    : valor.origen === 'catalogo'
      ? 'catalogo'
      : 'manual';
  const referenciaExterna = typeof valor.referenciaExterna === 'string'
    ? valor.referenciaExterna.trim().slice(0, 120) || null
    : null;
  const urlFuente = typeof valor.urlFuente === 'string' && /^https:\/\//.test(valor.urlFuente)
    ? valor.urlFuente.slice(0, 800)
    : null;
  const imagen = typeof valor.imagen === 'string' && /^https:\/\//.test(valor.imagen)
    ? valor.imagen.slice(0, 800)
    : null;
  const origen = origenSolicitado === 'catalogo' && (
    !referenciaExterna ||
    !urlFuente ||
    (tiendaId !== 'eroski' && tiendaId !== 'carrefour')
  )
    ? 'manual'
    : origenSolicitado;

  if (
    !productoClave ||
    !tiendaId ||
    !ingrediente ||
    !nombreProducto ||
    precio <= 0 ||
    cantidad <= 0 ||
    !unidad ||
    (modoVenta === 'peso' && unidad !== 'g' && unidad !== 'kg') ||
    !actualizadaEn
  ) {
    return null;
  }

  return {
    id: `${productoClave}::${tiendaId}`,
    productoClave,
    ingrediente,
    tiendaId,
    nombreProducto,
    precio: Math.round(precio * 100) / 100,
    cantidad: Math.round(cantidad * 1000) / 1000,
    unidad,
    modoVenta,
    actualizadaEn,
    origen,
    referenciaExterna: origen === 'catalogo' ? referenciaExterna : null,
    urlFuente,
    imagen,
  };
}

export function cargarOfertasComparador(): OfertaComparador[] {
  try {
    const raw = localStorage.getItem(CLAVE_OFERTAS_COMPARADOR);
    if (!raw) return [];
    const valor = JSON.parse(raw) as unknown;
    if (!Array.isArray(valor)) return [];
    return valor
      .map(normalizarOferta)
      .filter((oferta): oferta is OfertaComparador => Boolean(oferta))
      .filter(
        (oferta, indice, todas) =>
          todas.findIndex((candidata) => candidata.id === oferta.id) === indice,
      )
      .slice(0, 2_000);
  } catch {
    return [];
  }
}

export function guardarOfertaComparador(
  entrada: OfertaComparadorEntrada,
): OfertaComparador {
  const oferta = normalizarOferta(entrada);
  if (!oferta) {
    throw new Error('Revisa el precio, el formato y el producto antes de guardar.');
  }
  const actuales = cargarOfertasComparador().filter(
    (candidata) => candidata.id !== oferta.id,
  );
  const siguientes = [oferta, ...actuales].slice(0, 2_000);
  localStorage.setItem(CLAVE_OFERTAS_COMPARADOR, JSON.stringify(siguientes));
  emitirActualizacion();
  return oferta;
}

export function eliminarOfertaComparador(id: string): void {
  const siguientes = cargarOfertasComparador().filter((oferta) => oferta.id !== id);
  localStorage.setItem(CLAVE_OFERTAS_COMPARADOR, JSON.stringify(siguientes));
  emitirActualizacion();
}

export function claveProductoComparador(linea: LineaCompra): string {
  if (linea.producto?.productoId) return `producto:${linea.producto.productoId}`;
  const ingredientes = linea.necesidades
    .map((ingrediente) => normalizarTexto(ingrediente.nombre))
    .filter(Boolean)
    .sort();
  return `ingrediente:${ingredientes.join('+') || normalizarTexto(linea.ingrediente.nombre)}`;
}

export function sugerirContenidoOferta(
  linea: LineaCompra,
): { cantidad: number; unidad: UnidadOfertaComparador } {
  const producto = linea.producto;
  const formatoUnidad = producto?.formatoUnidad?.toLocaleLowerCase('es') ?? '';
  const unidad = UNIDADES_OFERTA.has(formatoUnidad as UnidadOfertaComparador)
    ? formatoUnidad as UnidadOfertaComparador
    : null;
  const unidadesTotales = producto?.unidadesTotales ?? 0;
  const tamanoUnidad = producto?.tamanoUnidad ?? 0;

  if (unidad && tamanoUnidad > 0) {
    return {
      cantidad: tamanoUnidad * Math.max(1, unidadesTotales || 1),
      unidad,
    };
  }
  if (unidadesTotales > 0) return { cantidad: unidadesTotales, unidad: 'ud' };

  const formato = producto?.formato.toLocaleLowerCase('es') ?? '';
  const medida = formato.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|ud|uds|unidades?)\b/);
  if (medida) {
    const medidaUnidad = medida[2].startsWith('u') ? 'ud' : medida[2];
    if (UNIDADES_OFERTA.has(medidaUnidad as UnidadOfertaComparador)) {
      return {
        cantidad: Number(medida[1].replace(',', '.')),
        unidad: medidaUnidad as UnidadOfertaComparador,
      };
    }
  }

  return { cantidad: 1, unidad: 'ud' };
}

function productoDesdeOferta(oferta: OfertaComparador): ProductoMercadonaCatalogo {
  const unidades = oferta.unidad === 'ud' ? oferta.cantidad : null;
  return {
    productoId: `comparador-${oferta.id}`,
    nombre: oferta.nombreProducto,
    precio: oferta.precio,
    precioReferencia: null,
    formato: `${oferta.cantidad} ${oferta.unidad}`,
    unidadesTotales: unidades,
    tamanoUnidad: oferta.unidad === 'ud' ? 1 : oferta.cantidad,
    formatoUnidad: oferta.unidad,
    pesoAproximado: false,
    seccion: 'Comparador',
    subcategoria: 'Precio guardado',
    imagen: oferta.imagen ?? null,
    url: oferta.urlFuente ?? '',
    disponible: true,
  };
}

function necesidadesPendientes(linea: LineaCompra) {
  const exactos = linea.envasesExactos ?? linea.envases;
  const explicacion = linea.explicacionCantidad;
  const pendienteExacto = explicacion
    ? Math.max(0, explicacion.objetivoEnvases - explicacion.stockAntesEnvases)
    : exactos;
  const factor = exactos > 0 ? Math.min(1, pendienteExacto / exactos) : 1;
  return linea.necesidades.map((necesidad) => ({
    ...necesidad,
    cantidad: necesidad.cantidad * factor,
  }));
}

function antiguedadDias(fecha: string, ahora: Date): number {
  const fechaMs = new Date(`${fecha}T12:00:00`).getTime();
  if (Number.isNaN(fechaMs)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((ahora.getTime() - fechaMs) / 86_400_000));
}

function opcionMercadona(
  linea: LineaCompra,
  tienda: TiendaComparador,
): OpcionPrecioComparador | null {
  const producto = linea.producto;
  if (!producto || producto.precio === null || linea.envases <= 0) return null;
  return {
    tiendaId: tienda.id,
    tiendaNombre: tienda.nombre,
    productoNombre: producto.nombre,
    precioEnvase: producto.precio,
    envases: linea.envases,
    coste: Math.round(linea.envases * producto.precio * 100) / 100,
    alPeso: false,
    cantidadAlPeso: null,
    unidadAlPeso: null,
    estimado: linea.calculoEstimado,
    automatica: true,
    actualizadaEn: null,
    vigente: true,
  };
}

function opcionDesdeOferta(
  linea: LineaCompra,
  tienda: TiendaComparador,
  oferta: OfertaComparador,
  configuracion: ConfiguracionComparador,
  ahora: Date,
): OpcionPrecioComparador {
  const calculo = calcularEnvasesParaNecesidades(
    necesidadesPendientes(linea),
    productoDesdeOferta(oferta),
  );
  const alPeso = oferta.modoVenta === 'peso';
  const multiplicadorPrecio = alPeso ? calculo.envasesExactos : calculo.envases;
  return {
    tiendaId: tienda.id,
    tiendaNombre: tienda.nombre,
    productoNombre: oferta.nombreProducto,
    precioEnvase: oferta.precio,
    envases: multiplicadorPrecio,
    coste: Math.round(multiplicadorPrecio * oferta.precio * 100) / 100,
    alPeso,
    cantidadAlPeso: alPeso
      ? Math.round(multiplicadorPrecio * oferta.cantidad * 1000) / 1000
      : null,
    unidadAlPeso: alPeso ? oferta.unidad : null,
    estimado: linea.calculoEstimado || calculo.estimado,
    automatica: oferta.origen === 'catalogo',
    actualizadaEn: oferta.actualizadaEn,
    vigente: antiguedadDias(oferta.actualizadaEn, ahora) <= configuracion.vigenciaDias,
  };
}

function compararLinea(
  linea: LineaCompra,
  configuracion: ConfiguracionComparador,
  ofertas: OfertaComparador[],
  ahora: Date,
): ComparacionLinea {
  const productoClave = claveProductoComparador(linea);
  const tiendas = configuracion.tiendas.filter((tienda) => tienda.activa);
  const opciones = tiendas.flatMap((tienda) => {
    if (tienda.id === 'mercadona') {
      const opcion = opcionMercadona(linea, tienda);
      return opcion ? [opcion] : [];
    }
    const oferta = ofertas.find(
      (candidata) =>
        candidata.productoClave === productoClave && candidata.tiendaId === tienda.id,
    );
    return oferta ? [opcionDesdeOferta(linea, tienda, oferta, configuracion, ahora)] : [];
  });

  return {
    clave: productoClave,
    nombre: linea.producto?.nombre ?? linea.ingrediente.nombre,
    linea,
    opciones: opciones.sort((a, b) => a.coste - b.coste),
  };
}

function opcionMercadonaComparacion(
  comparacion: ComparacionLinea,
): OpcionPrecioComparador | undefined {
  return comparacion.opciones.find(
    (opcion) => opcion.tiendaId === 'mercadona' && opcion.vigente,
  );
}

function crearPlan(
  comparaciones: ComparacionLinea[],
  tiendasPermitidas: Set<string>,
): PlanCompraComparada {
  const asignaciones: AsignacionComparador[] = [];
  const sinPrecio: string[] = [];

  comparaciones.forEach((comparacion) => {
    const opcion = comparacion.opciones.find(
      (candidata) => candidata.vigente && tiendasPermitidas.has(candidata.tiendaId),
    );
    if (!opcion) {
      sinPrecio.push(comparacion.nombre);
      return;
    }
    const mercadona = opcionMercadonaComparacion(comparacion);
    asignaciones.push({
      clave: comparacion.clave,
      nombre: comparacion.nombre,
      opcion,
      ahorroFrenteMercadona: mercadona
        ? Math.round((mercadona.coste - opcion.coste) * 100) / 100
        : null,
    });
  });

  const tiendas = Array.from(
    new Set(asignaciones.map((asignacion) => asignacion.opcion.tiendaId)),
  );
  const total = asignaciones.reduce((suma, asignacion) => suma + asignacion.opcion.coste, 0);

  return {
    total: Math.round(total * 100) / 100,
    completo: sinPrecio.length === 0,
    cubiertos: asignaciones.length,
    totalLineas: comparaciones.length,
    tiendas,
    asignaciones,
    sinPrecio,
  };
}

function combinacionesHasta(ids: string[], maximo: number): string[][] {
  const resultado: string[][] = [];
  const recorrer = (inicio: number, actual: string[]) => {
    if (actual.length > 0) resultado.push([...actual]);
    if (actual.length === maximo) return;
    for (let indice = inicio; indice < ids.length; indice += 1) {
      actual.push(ids[indice]);
      recorrer(indice + 1, actual);
      actual.pop();
    }
  };
  recorrer(0, []);
  return resultado;
}

export function compararPreciosCompra(
  lineasCompra: LineaCompra[],
  configuracionEntrada: ConfiguracionComparador = cargarConfiguracionComparador(),
  ofertasEntrada: OfertaComparador[] = cargarOfertasComparador(),
  ahora = new Date(),
): ResultadoComparador {
  const configuracion = normalizarConfiguracionComparador(configuracionEntrada);
  const lineas = lineasCompra.filter((linea) => linea.envases > 0);
  const ofertas = ofertasEntrada
    .map(normalizarOferta)
    .filter((oferta): oferta is OfertaComparador => Boolean(oferta));
  const comparaciones = lineas.map((linea) =>
    compararLinea(linea, configuracion, ofertas, ahora),
  );
  const tiendasActivas = configuracion.tiendas.filter((tienda) => tienda.activa);
  const idsActivos = tiendasActivas.map((tienda) => tienda.id);
  const porTienda = tiendasActivas.map((tienda): ResumenTiendaComparador => {
    const plan = crearPlan(comparaciones, new Set([tienda.id]));
    return {
      tienda,
      total: plan.total,
      cubiertos: plan.cubiertos,
      totalLineas: plan.totalLineas,
      completo: plan.completo,
    };
  });
  const mejorResumenUnaTienda = porTienda
    .filter((resumen) => resumen.completo)
    .sort((a, b) => a.total - b.total)[0];
  const unaTienda = mejorResumenUnaTienda
    ? crearPlan(comparaciones, new Set([mejorResumenUnaTienda.tienda.id]))
    : null;
  const absoluta = crearPlan(comparaciones, new Set(idsActivos));
  const planesCandidatos = combinacionesHasta(
    idsActivos,
    Math.min(configuracion.maxTiendas, idsActivos.length),
  )
    .map((ids) => crearPlan(comparaciones, new Set(ids)));
  const planesPracticos = planesCandidatos
    .filter((plan) => plan.completo)
    .sort((a, b) => a.total - b.total || a.tiendas.length - b.tiendas.length);
  const mejorParcial = [...planesCandidatos].sort(
    (a, b) =>
      b.cubiertos - a.cubiertos ||
      a.total - b.total ||
      a.tiendas.length - b.tiendas.length,
  )[0];
  const practica = planesPracticos[0] ?? mejorParcial ?? crearPlan(comparaciones, new Set());
  const ahorroPractico = unaTienda && practica.completo
    ? unaTienda.total - practica.total
    : Number.POSITIVE_INFINITY;
  const recomendada = unaTienda && ahorroPractico < configuracion.ahorroMinimo
    ? unaTienda
    : practica;
  const ofertasCaducadas = comparaciones.reduce(
    (total, comparacion) =>
      total + comparacion.opciones.filter((opcion) => !opcion.vigente).length,
    0,
  );

  return {
    lineas: comparaciones,
    porTienda,
    unaTienda,
    practica,
    absoluta,
    recomendada,
    ofertasCaducadas,
  };
}
