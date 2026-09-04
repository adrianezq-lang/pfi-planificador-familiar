import type {
  ProductoMercadonaCatalogo,
} from './catalogoMercadona.ts';
import {
  cargarCatalogoMercadona,
  obtenerProductoCatalogoPorId,
} from './catalogoMercadona.ts';

export type AsociacionesIngredientes = Record<
  string,
  string
>;

const CLAVE_ASOCIACIONES =
  'pfi-asociaciones-ingredientes-mercadona';
const CLAVE_COPIA_ASOCIACIONES =
  'pfi-asociaciones-ingredientes-mercadona-copia';
const CLAVES_ASOCIACIONES_ANTERIORES = [
  'pfi-asociaciones-ingredientes',
  'pfi-asociaciones-mercadona',
] as const;

export const EVENTO_ASOCIACIONES =
  'pfi-asociaciones-ingredientes-actualizadas';

let asociacionesEnMemoria: AsociacionesIngredientes | null = null;

const NOMBRES_RECUPERACION_CONOCIDOS: Record<string, string[]> = {
  ajo: ['ajos morados'],
};

const INGREDIENTES_NO_RECUPERABLES_AUTOMATICAMENTE = new Set([
  'pollo',
]);

/**
 * Defaults muy conservadores, verificados contra el catálogo. Solo se aplican
 * cuando el ingrediente no tiene ya una asociación válida elegida por el usuario.
 * Si un SKU no existe en el catálogo de la zona actual, no se fuerza.
 */
export const ASOCIACIONES_SEGURAS_POR_DEFECTO: Record<string, string> = {
  Aceitunas: '12764',
  Ajo: '69297',
  'Ajo en polvo': '86656',
  Almejas: '60874',
  'Alubias blancas secas': '5124',
  'Alubias rojas secas': '67609',
  Arroz: '5044',
  Atún: '18055',
  Bacalao: '87211',
  Bacon: '16252',
  'Bases de pizza': '63648',
  Calabacín: '69338',
  Calabaza: '69853',
  'Carne picada': '2869',
  Cebolla: '69089',
  Chorizo: '23145',
  Dorada: '81234.1',
  Espaguetis: '6245',
  'Filetes de ternera': '8936',
  'Garbanzos cocidos': '26029',
  'Garbanzos secos': '5214',
  Guacamole: '3840',
  Hamburguesas: '2873',
  Huevos: '30167',
  'Jamón cocido': '16395',
  Ketchup: '23579',
  Leche: '10380',
  'Lentejas secas': '5330',
  Lomo: '3395',
  Lubina: '81241.1',
  Manzanas: '3269',
  Mayonesa: '15793',
  'Media sandía': '3505.1',
  'Mezcla cuatro quesos': '21581',
  Morcillo: '13741',
  Mostaza: '23410',
  'Mozzarella rallada': '51110',
  Nachos: '33640',
  Naranjas: '3277',
  'Nata para cocinar': '10199',
  'Pan de hamburguesa': '13803',
  'Pan de perrito': '82332',
  'Pasta corta': '6250',
  Patatas: '69099',
  Peras: '14470',
  'Pechugas de pavo fileteadas': '2794',
  'Pechugas de pollo': '3724',
  Pepino: '69584',
  'Pimentón dulce': '60573',
  'Pimentón picante': '34183',
  'Pimiento rojo': '69310',
  'Pimiento tricolor': '69495',
  Plátanos: '3824',
  'Pollo entero': '2781',
  'Pollo para arroz': '3724',
  'Queso curado': '50965',
  'Queso en lonchas': '50545',
  'Queso rallado': '23621',
  'Queso roquefort': '86276',
  Salchichas: '53143',
  Salmón: '87204',
  'Salsa BBQ': '17346',
  'Salsa yogur': '17327',
  Tomate: '69968',
  'Tomate frito': '17132',
  'Tomate para pizza': '17108',
  'Tomate triturado': '16043',
  'Tortillas de trigo': '80859',
  'Yogures naturales': '22313',
  Zanahorias: '69586',
};

/**
 * IDs que existieron en el catálogo pero son semánticamente incompatibles con
 * el ingrediente. Que un ID siga existiendo no significa que la asociación sea
 * correcta, por eso estas combinaciones se saneaban mal con la validación previa.
 */
const IDS_INCOMPATIBLES_CONOCIDOS: Record<string, string[]> = {
  'Tortillas de trigo': ['14378'], // pan de pita
  'Pechugas de pollo': ['13778'], // relleno congelado para kebab
  'Tomate para pizza': ['17647'], // tomate para untar
  'Garbanzos secos': ['26033'], // garbanzos cocidos
  'Alubias blancas secas': ['26216'], // alubias cocidas
  'Alubias rojas secas': ['26222'], // alubias cocidas
  'Mozzarella rallada': ['50917'], // mozzarella en lonchas
  Hamburguesas: ['3106'], // arreglo para puchero
  'Salmón': ['64558'], // alimento para perro sabor salmón
  'Pan hamburguesa': ['2876'], // merluza empanada (alias histórico)
  'Pan de hamburguesa': ['2876'], // merluza empanada
  'Pan perrito': ['2876'], // merluza empanada (alias histórico)
  'Pan de perrito': ['2876'], // merluza empanada
  'Ajo en polvo': ['86516'], // cebolla en polvo
  'Atún': ['18086'], // lata grande de 900 g, incompatible con recetas en latas individuales
};

function normalizarTexto(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function leerAsociaciones(clave: string): AsociacionesIngredientes {
  try {
    const guardadas = localStorage.getItem(clave);
    if (!guardadas) return {};

    const datos = JSON.parse(guardadas) as unknown;
    if (
      typeof datos !== 'object' ||
      datos === null ||
      Array.isArray(datos)
    ) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(datos)
        .filter(([ingrediente]) => ingrediente.trim().length > 0)
        .map(([ingrediente, productoId]) => [
          ingrediente,
          String(productoId),
        ]),
    );
  } catch {
    return {};
  }
}

export function cargarAsociacionesIngredientes():
  AsociacionesIngredientes {
  if (asociacionesEnMemoria) return asociacionesEnMemoria;

  const actuales = leerAsociaciones(CLAVE_ASOCIACIONES);
  const copia = leerAsociaciones(CLAVE_COPIA_ASOCIACIONES);
  const anteriores = CLAVES_ASOCIACIONES_ANTERIORES.reduce(
    (resultado, clave) => ({ ...resultado, ...leerAsociaciones(clave) }),
    {} as AsociacionesIngredientes,
  );
  const recuperadas = {
    ...anteriores,
    ...copia,
    ...actuales,
  };

  if (
    Object.keys(recuperadas).length > 0 &&
    JSON.stringify(recuperadas) !== JSON.stringify(actuales)
  ) {
    const serializadas = JSON.stringify(recuperadas);
    localStorage.setItem(CLAVE_ASOCIACIONES, serializadas);
    localStorage.setItem(CLAVE_COPIA_ASOCIACIONES, serializadas);
  }

  asociacionesEnMemoria = recuperadas;
  return recuperadas;
}

export function guardarAsociacionesIngredientes(
  asociaciones: AsociacionesIngredientes,
): void {
  asociacionesEnMemoria = asociaciones;
  const serializadas = JSON.stringify(asociaciones);
  localStorage.setItem(CLAVE_ASOCIACIONES, serializadas);
  localStorage.setItem(CLAVE_COPIA_ASOCIACIONES, serializadas);

  window.dispatchEvent(
    new CustomEvent(EVENTO_ASOCIACIONES),
  );
}

export function asociarProductoAIngrediente(
  ingrediente: string,
  productoId: string,
): AsociacionesIngredientes {
  const asociaciones =
    cargarAsociacionesIngredientes();

  const nuevasAsociaciones = {
    ...asociaciones,
    [ingrediente]: productoId,
  };

  guardarAsociacionesIngredientes(
    nuevasAsociaciones,
  );

  return nuevasAsociaciones;
}

export function quitarAsociacionIngrediente(
  ingrediente: string,
): AsociacionesIngredientes {
  const asociaciones =
    cargarAsociacionesIngredientes();

  const nuevasAsociaciones = {
    ...asociaciones,
  };

  delete nuevasAsociaciones[ingrediente];

  guardarAsociacionesIngredientes(
    nuevasAsociaciones,
  );

  return nuevasAsociaciones;
}

export function obtenerProductoIdAsociado(
  ingrediente: string,
): string | undefined {
  const asociaciones =
    cargarAsociacionesIngredientes();

  return asociaciones[ingrediente];
}

export async function obtenerProductoAsociado(
  ingrediente: string,
): Promise<
  ProductoMercadonaCatalogo | undefined
> {
  const productoId =
    obtenerProductoIdAsociado(
      ingrediente,
    );

  if (!productoId) {
    return undefined;
  }

  return obtenerProductoCatalogoPorId(productoId);
}

export async function obtenerProductosAsociados():
  Promise<
    Record<
      string,
      ProductoMercadonaCatalogo
    >
  > {
  const asociaciones =
    cargarAsociacionesIngredientes();

  const { productos } =
    await cargarCatalogoMercadona();

  const productosPorId = new Map(
    productos.map((producto) => [
      producto.productoId,
      producto,
    ]),
  );

  const resultado: Record<
    string,
    ProductoMercadonaCatalogo
  > = {};

  Object.entries(asociaciones).forEach(
    ([ingrediente, productoId]) => {
      const producto =
        productosPorId.get(productoId);

      if (producto) {
        resultado[ingrediente] =
          producto;
      }
    },
  );

  return resultado;
}

export function buscarIngredientesAsociadosAProducto(
  productoId: string,
): string[] {
  const asociaciones =
    cargarAsociacionesIngredientes();

  return Object.entries(asociaciones)
    .filter(
      ([, idAsociado]) =>
        idAsociado === productoId,
    )
    .map(([ingrediente]) => ingrediente);
}

export function ingredienteTieneAsociacion(
  ingrediente: string,
): boolean {
  return Boolean(
    obtenerProductoIdAsociado(
      ingrediente,
    ),
  );
}

export function limpiarTodasLasAsociaciones():
  void {
  asociacionesEnMemoria = null;
  localStorage.removeItem(CLAVE_ASOCIACIONES);
  localStorage.removeItem(CLAVE_COPIA_ASOCIACIONES);
  CLAVES_ASOCIACIONES_ANTERIORES.forEach((clave) =>
    localStorage.removeItem(clave),
  );

  window.dispatchEvent(
    new CustomEvent(EVENTO_ASOCIACIONES),
  );
}

export function buscarCoincidenciasIniciales(
  ingrediente: string,
  productos: ProductoMercadonaCatalogo[],
): ProductoMercadonaCatalogo[] {
  const termino =
    normalizarTexto(ingrediente);

  const palabrasIngrediente =
    termino
      .split(' ')
      .filter(
        (palabra) =>
          palabra.length >= 2,
      );

  return productos
    .map((producto) => {
      const nombre =
        normalizarTexto(
          producto.nombre,
        );

      let puntuacion = 0;

      if (nombre === termino) {
        puntuacion += 1000;
      }

      if (
        nombre.startsWith(termino)
      ) {
        puntuacion += 600;
      }

      if (nombre.includes(termino)) {
        puntuacion += 400;
      }

      palabrasIngrediente.forEach(
        (palabra) => {
          if (
            nombre.includes(palabra)
          ) {
            puntuacion += 120;
          }
        },
      );

      return {
        producto,
        puntuacion,
      };
    })
    .filter(
      (resultado) =>
        resultado.puntuacion > 0,
    )
    .sort(
      (a, b) =>
        b.puntuacion -
        a.puntuacion,
    )
    .map(
      (resultado) =>
        resultado.producto,
    );
}

type IngredienteRecuperable = { nombre: string };
type RecetaRecuperable = { ingredientes: IngredienteRecuperable[] };
type ProductoRecuperable = { productoId: string; nombre: string };

function buscarCoincidenciaUnicaEnProductos(
  ingrediente: string,
  productos: ProductoRecuperable[],
): ProductoRecuperable | undefined {
  const termino = normalizarTexto(ingrediente);
  if (!termino) return undefined;

  const exactas = productos.filter(
    (producto) => normalizarTexto(producto.nombre) === termino,
  );
  if (exactas.length === 1) return exactas[0];

  if (termino.length < 4) return undefined;
  const palabras = termino.split(' ').filter((palabra) => palabra.length >= 3);
  const compatibles = productos.filter((producto) => {
    const nombre = normalizarTexto(producto.nombre);
    return (
      nombre.startsWith(`${termino} `) ||
      nombre.endsWith(` ${termino}`) ||
      palabras.every((palabra) => nombre.includes(palabra))
    );
  });

  return compatibles.length === 1 ? compatibles[0] : undefined;
}

function crearIndiceProductosPorNombre(
  productos: ProductoRecuperable[],
): Map<string, ProductoRecuperable[]> {
  const indice = new Map<string, ProductoRecuperable[]>();

  productos.forEach((producto) => {
    const clave = normalizarTexto(producto.nombre);
    const coincidencias = indice.get(clave) ?? [];
    coincidencias.push(producto);
    indice.set(clave, coincidencias);
  });

  return indice;
}

function buscarProductoActualPorNombre(
  nombre: string,
  productos: ProductoRecuperable[],
  productosPorNombre: Map<string, ProductoRecuperable[]>,
): ProductoRecuperable | undefined {
  const exactas = productosPorNombre.get(normalizarTexto(nombre)) ?? [];
  if (exactas.length === 1) return exactas[0];
  return buscarCoincidenciaUnicaEnProductos(nombre, productos);
}

function sanearAsociacionesConocidas(
  asociaciones: AsociacionesIngredientes,
  ingredientes: string[],
  idsCatalogo: Set<string>,
): AsociacionesIngredientes {
  const nuevas = { ...asociaciones };
  const ingredientesRecetario = new Set(ingredientes);

  // El alias genérico Pollo acabó apuntando a cortes incompatibles. Las recetas
  // que lo necesitan ya se normalizan a cortes específicos antes de comprar.
  if (Object.prototype.hasOwnProperty.call(nuevas, 'Pollo')) {
    delete nuevas.Pollo;
  }

  Object.entries(IDS_INCOMPATIBLES_CONOCIDOS).forEach(
    ([ingrediente, idsIncompatibles]) => {
      const actual = nuevas[ingrediente];
      if (!actual || !idsIncompatibles.includes(actual)) return;

      const seguro = ASOCIACIONES_SEGURAS_POR_DEFECTO[ingrediente];
      if (seguro && idsCatalogo.has(seguro)) {
        nuevas[ingrediente] = seguro;
      } else {
        delete nuevas[ingrediente];
      }
    },
  );

  Object.entries(ASOCIACIONES_SEGURAS_POR_DEFECTO).forEach(
    ([ingrediente, productoId]) => {
      if (
        !ingredientesRecetario.has(ingrediente) ||
        nuevas[ingrediente] ||
        !idsCatalogo.has(productoId)
      ) {
        return;
      }

      nuevas[ingrediente] = productoId;
    },
  );

  return nuevas;
}

function contarCambiosAsociaciones(
  anteriores: AsociacionesIngredientes,
  siguientes: AsociacionesIngredientes,
): number {
  const ingredientes = new Set([
    ...Object.keys(anteriores),
    ...Object.keys(siguientes),
  ]);

  return Array.from(ingredientes).reduce(
    (total, ingrediente) =>
      total + Number(anteriores[ingrediente] !== siguientes[ingrediente]),
    0,
  );
}

/**
 * Recupera asociaciones perdidas o rotas sin adivinar entre varios productos.
 * Una asociación cuyo productId ya no existe en el catálogo se considera rota.
 * Además sanea combinaciones históricas conocidas donde el productId sí existe
 * pero pertenece a otro alimento o incluso a otra categoría.
 */
export async function repararAsociacionesIngredientes(
  recetas: RecetaRecuperable[],
  productosDespensa: ProductoRecuperable[] = [],
): Promise<number> {
  const asociaciones = cargarAsociacionesIngredientes();
  const ingredientes = Array.from(
    new Set(
      recetas.flatMap((receta) =>
        receta.ingredientes.map((ingrediente) => ingrediente.nombre.trim()),
      ),
    ),
  ).filter(Boolean);

  let productosCatalogo: ProductoMercadonaCatalogo[];
  try {
    productosCatalogo = (await cargarCatalogoMercadona()).productos;
  } catch {
    return 0;
  }

  const idsCatalogo = new Set(
    productosCatalogo.map((producto) => producto.productoId),
  );
  const productosPorNombre = crearIndiceProductosPorNombre(productosCatalogo);
  const despensaPorId = new Map(
    productosDespensa.map((producto) => [producto.productoId, producto]),
  );
  const nuevas = sanearAsociacionesConocidas(
    asociaciones,
    ingredientes,
    idsCatalogo,
  );

  ingredientes.forEach((ingrediente) => {
    const nombreNormalizado = normalizarTexto(ingrediente);
    if (INGREDIENTES_NO_RECUPERABLES_AUTOMATICAMENTE.has(nombreNormalizado)) {
      return;
    }

    const productoIdActual = nuevas[ingrediente];
    if (productoIdActual && idsCatalogo.has(productoIdActual)) return;

    let productoRecuperado: ProductoRecuperable | undefined;

    if (productoIdActual) {
      const productoHistorico = despensaPorId.get(productoIdActual);
      if (productoHistorico) {
        productoRecuperado = buscarProductoActualPorNombre(
          productoHistorico.nombre,
          productosCatalogo,
          productosPorNombre,
        );
      }
    }

    if (!productoRecuperado) {
      const candidatoDespensa = buscarCoincidenciaUnicaEnProductos(
        ingrediente,
        productosDespensa,
      );

      if (candidatoDespensa) {
        productoRecuperado = idsCatalogo.has(candidatoDespensa.productoId)
          ? candidatoDespensa
          : buscarProductoActualPorNombre(
              candidatoDespensa.nombre,
              productosCatalogo,
              productosPorNombre,
            );
      }
    }

    if (!productoRecuperado) {
      const exactas = productosPorNombre.get(nombreNormalizado) ?? [];
      const nombresConocidos = NOMBRES_RECUPERACION_CONOCIDOS[nombreNormalizado] ?? [];
      const conocidas = nombresConocidos.flatMap(
        (nombre) => productosPorNombre.get(normalizarTexto(nombre)) ?? [],
      );
      const candidatas = exactas.length === 1 ? exactas : conocidas;

      if (candidatas.length === 1) {
        productoRecuperado = candidatas[0];
      }
    }

    if (!productoRecuperado) {
      const productoIdSeguro = ASOCIACIONES_SEGURAS_POR_DEFECTO[ingrediente];
      if (productoIdSeguro && idsCatalogo.has(productoIdSeguro)) {
        productoRecuperado = productosCatalogo.find(
          (producto) => producto.productoId === productoIdSeguro,
        );
      }
    }

    if (
      productoRecuperado &&
      productoRecuperado.productoId !== productoIdActual
    ) {
      nuevas[ingrediente] = productoRecuperado.productoId;
      return;
    }

    if (productoIdActual && !productoRecuperado) delete nuevas[ingrediente];
  });

  const cambios = contarCambiosAsociaciones(asociaciones, nuevas);
  if (cambios > 0) guardarAsociacionesIngredientes(nuevas);
  return cambios;
}
