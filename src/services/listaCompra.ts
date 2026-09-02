import type { DiaMenu } from '../data/Menusemanal';
import type { Ingrediente, Receta } from '../data/Recetas';
import {
  cargarAsociacionesIngredientes,
  guardarAsociacionesIngredientes,
} from './asociacionesIngredientes';
import { cargarRecetas } from './recetas';
import { unirIngredientes } from './UnirIngredientes';
import { obtenerRecetaPostre } from './menu';
import {
  calcularComensales,
  cargarPerfil,
  crearPerfilParaMomento,
  type PerfilFamiliar,
} from './perfil';
import { obtenerSugerenciaIngrediente } from './porciones';
import { listarPlatosParaCompra } from './reglasMenuMensual';

const PRODUCTO_JAMONCITOS_POLLO = '2778';
const PRODUCTO_TORTILLAS_TRIGO = '80859';
const PRODUCTO_PAN_PITA = '14378';
const PRODUCTO_PECHUGAS_POLLO = '3724';
const PRODUCTO_RELLENO_KEBAB = '13778';
const PRODUCTO_TOMATE_UNTAR = '17647';
const PRODUCTO_TOMATE_FRITO = '17108';
const GRAMOS_APROXIMADOS_POR_JAMONCITO = 180;
const GRAMOS_POLLO_POR_RACION_ARROZ = 150;

function redondearCantidad(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function normalizarTexto(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanea asociaciones históricas que sabemos que apuntaron a productos
 * incompatibles con el ingrediente. Solo se sustituyen IDs concretos ya
 * identificados como erróneos; cualquier elección manual distinta se conserva.
 */
function prepararAsociacionesCompra(): void {
  const actuales = cargarAsociacionesIngredientes();
  const siguientes = { ...actuales };
  let cambiadas = false;

  // "Pollo" se usó para recetas con cortes distintos y llegó a apuntar tanto
  // a pollo entero como a carcasa/espinazo. Las recetas actuales ya se normalizan
  // a nombres específicos, por lo que conservar este alias solo añade riesgo.
  if (Object.prototype.hasOwnProperty.call(siguientes, 'Pollo')) {
    delete siguientes.Pollo;
    cambiadas = true;
  }

  // El ID 14378 es Pan de pita Mission, no tortillas de trigo.
  if (siguientes['Tortillas de trigo'] === PRODUCTO_PAN_PITA) {
    siguientes['Tortillas de trigo'] = PRODUCTO_TORTILLAS_TRIGO;
    cambiadas = true;
  }

  // El ID 13778 es relleno congelado para kebab, no pechuga fresca.
  if (siguientes['Pechugas de pollo'] === PRODUCTO_RELLENO_KEBAB) {
    siguientes['Pechugas de pollo'] = PRODUCTO_PECHUGAS_POLLO;
    cambiadas = true;
  }

  // El ID 17647 es tomate para untar con aceite; para la base de pizza usamos
  // tomate frito normal y su consumo se calcula como fracción de tarro.
  if (siguientes['Tomate para pizza'] === PRODUCTO_TOMATE_UNTAR) {
    siguientes['Tomate para pizza'] = PRODUCTO_TOMATE_FRITO;
    cambiadas = true;
  }

  if (!siguientes['Jamoncitos de pollo']) {
    siguientes['Jamoncitos de pollo'] = PRODUCTO_JAMONCITOS_POLLO;
    cambiadas = true;
  }

  // Arroz con pollo usa un nombre específico para evitar volver al alias
  // genérico. Si todavía no tiene producto, reutilizamos la pechuga normal.
  if (!siguientes['Pollo para arroz']) {
    siguientes['Pollo para arroz'] =
      siguientes['Pechugas de pollo'] ?? PRODUCTO_PECHUGAS_POLLO;
    cambiadas = true;
  }

  if (cambiadas) guardarAsociacionesIngredientes(siguientes);
}

/**
 * La receta histórica del cocido guarda "2 muslos". Mercadona vende los
 * jamoncitos por peso, no por unidades, de modo que tratarlos como 2 bandejas
 * inflaría la compra. Conservamos la intención de la receta y aproximamos cada
 * jamoncito a 180 g para convertir correctamente la necesidad a bandejas.
 *
 * "Pollo" en arroz con pollo es deliberadamente ambiguo: lo separamos del alias
 * antiguo y lo convertimos a gramos para que cualquier corte elegido después se
 * calcule por peso y nunca por número de bandejas.
 */
function normalizarCortePolloParaCompra(
  receta: Receta,
  ingrediente: Ingrediente,
): Ingrediente {
  const nombreReceta = normalizarTexto(receta.nombre);
  const nombreIngrediente = normalizarTexto(ingrediente.nombre);
  const unidad = normalizarTexto(ingrediente.unidad);

  if (
    nombreReceta === 'cocido de garbanzos' &&
    nombreIngrediente === 'pollo' &&
    (unidad === 'muslo' || unidad === 'muslos')
  ) {
    return {
      ...ingrediente,
      nombre: 'Jamoncitos de pollo',
      cantidad: redondearCantidad(
        ingrediente.cantidad * GRAMOS_APROXIMADOS_POR_JAMONCITO,
      ),
      unidad: 'g',
    };
  }

  if (
    nombreReceta === 'arroz con pollo' &&
    nombreIngrediente === 'pollo'
  ) {
    return {
      ...ingrediente,
      nombre: 'Pollo para arroz',
      cantidad: redondearCantidad(
        ingrediente.cantidad * GRAMOS_POLLO_POR_RACION_ARROZ,
      ),
      unidad: 'g',
    };
  }

  return ingrediente;
}

/**
 * Las recetas guardadas son la referencia familiar. Al usarlas en un servicio
 * concreto, la compra debe adaptarse a quienes realmente comen ese día.
 *
 * - Si el ingrediente está en ajuste automático y existe una regla específica
 *   (carne, pescado, pasta, arroz, legumbres, fajitas...), usamos esa regla.
 * - Si la cantidad fue editada manualmente o no existe una regla específica,
 *   conservamos esa referencia y la escalamos por número real de comensales.
 *
 * Así una receta de referencia para 4 personas puede producir correctamente
 * una compra para 3 comensales al mediodía sin perder las preferencias
 * personalizadas de la receta.
 */
export function ajustarRecetasAComensalesServicio(
  recetas: Receta[],
  perfilReferencia: PerfilFamiliar,
  perfilServicio: PerfilFamiliar,
): Receta[] {
  const comensalesReferencia = Math.max(1, calcularComensales(perfilReferencia));
  const comensalesServicio = calcularComensales(perfilServicio);
  const factor = comensalesServicio / comensalesReferencia;

  return recetas.map((receta) => ({
    ...receta,
    ingredientes: receta.ingredientes.map((ingrediente) => {
      const sugerencia = ingrediente.ajusteAutomatico === true
        ? obtenerSugerenciaIngrediente(ingrediente, receta, perfilServicio)
        : null;

      if (sugerencia) {
        return {
          ...ingrediente,
          cantidad: sugerencia.cantidad,
          unidad: sugerencia.unidad,
        };
      }

      return {
        ...ingrediente,
        cantidad: redondearCantidad(ingrediente.cantidad * factor),
      };
    }),
  }));
}

function ingredientePostreSinReceta(
  nombre: string,
  perfil: PerfilFamiliar,
): Ingrediente[] {
  if (!nombre || nombre === 'Sin postre') return [];

  const normalizado = nombre.toLocaleLowerCase('es');
  const comensales = calcularComensales(perfil);
  if (comensales === 0) return [];

  return [
    {
      nombre,
      cantidad: comensales,
      unidad: 'ud',
      seccion: normalizado.includes('yogur')
        ? 'Lácteos y huevos'
        : 'Fruta y verdura',
      ajusteAutomatico: true,
    },
  ];
}

function esFinDeSemana(dia: string): boolean {
  const normalizado = dia
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  return normalizado === 'sabado' || normalizado === 'domingo';
}

function crearMenuDeServicio(
  menu: DiaMenu[],
  servicio: 'comidaLaborable' | 'comidaFinSemana' | 'cena',
): DiaMenu[] {
  return menu.map((dia) => {
    const finDeSemana = esFinDeSemana(dia.dia);
    return {
      ...dia,
      comida:
        servicio === 'comidaLaborable'
          ? finDeSemana ? [] : dia.comida
          : servicio === 'comidaFinSemana' && finDeSemana
            ? dia.comida
            : [],
      cena: servicio === 'cena' ? dia.cena : [],
    };
  });
}

function obtenerPostresDeServicio(
  menu: DiaMenu[],
  servicio: 'comidaLaborable' | 'comidaFinSemana' | 'cena',
): string[] {
  return menu.flatMap((dia) => {
    if (servicio === 'cena') {
      return [obtenerRecetaPostre(dia, 'cena')];
    }

    const finDeSemana = esFinDeSemana(dia.dia);
    const corresponde = servicio === 'comidaFinSemana'
      ? finDeSemana
      : !finDeSemana;
    return corresponde ? [obtenerRecetaPostre(dia, 'comida')] : [];
  });
}

export function generarListaCompra(
  menu: DiaMenu[],
): Ingrediente[] {
  prepararAsociacionesCompra();

  const perfil = cargarPerfil();
  const recetasBase = cargarRecetas();
  const esLegumbreCocinada = (nombre: string): boolean => {
    const receta = recetasBase.find((candidata) => candidata.nombre === nombre);
    return receta?.categoria.toLocaleLowerCase('es') === 'legumbres';
  };
  const servicios = [
    {
      clave: 'comidaLaborable' as const,
      perfil: crearPerfilParaMomento(perfil, 'comida', 'Lunes'),
    },
    {
      clave: 'comidaFinSemana' as const,
      perfil: crearPerfilParaMomento(perfil, 'comida', 'Sábado'),
    },
    {
      clave: 'cena' as const,
      perfil: crearPerfilParaMomento(perfil, 'cena', 'Lunes'),
    },
  ];

  const ingredientes = servicios.flatMap((servicio) => {
    if (calcularComensales(servicio.perfil) === 0) return [];

    const recetas = ajustarRecetasAComensalesServicio(
      recetasBase,
      perfil,
      servicio.perfil,
    );
    const buscarReceta = (nombre: string) =>
      recetas.find((receta) => receta.nombre === nombre);
    const ingredientesPlato = (nombre: string): Ingrediente[] => {
      const receta = buscarReceta(nombre);
      return receta?.ingredientes.map((ingrediente) =>
        normalizarCortePolloParaCompra(receta, ingrediente),
      ) ?? [];
    };
    const menuServicio = crearMenuDeServicio(menu, servicio.clave);
    const platos = listarPlatosParaCompra(
      menuServicio,
      esLegumbreCocinada,
    );
    const postres = obtenerPostresDeServicio(menu, servicio.clave);

    return [
      ...platos.flatMap(ingredientesPlato),
      ...postres.flatMap((nombre) => {
        const receta = buscarReceta(nombre);
        return receta?.ingredientes ?? ingredientePostreSinReceta(
          nombre,
          servicio.perfil,
        );
      }),
    ];
  });

  return unirIngredientes(ingredientes);
}
