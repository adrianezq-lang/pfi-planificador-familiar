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

const PRODUCTO_POLLO_ENTERO = '2781';
const PRODUCTO_JAMONCITOS_POLLO = '2778';
const GRAMOS_APROXIMADOS_POR_JAMONCITO = 180;

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
 * Corrige una asociación histórica demasiado genérica: "Pollo" quedó ligado al
 * producto de pollo entero, aunque se reutiliza en recetas que piden otros
 * cortes. El cocido sí tiene un corte concreto y estable en el catálogo actual.
 */
function prepararAsociacionesCortesPollo(): void {
  const actuales = cargarAsociacionesIngredientes();
  const siguientes = { ...actuales };
  let cambiadas = false;

  if (siguientes.Pollo === PRODUCTO_POLLO_ENTERO) {
    delete siguientes.Pollo;
    cambiadas = true;
  }

  if (!siguientes['Jamoncitos de pollo']) {
    siguientes['Jamoncitos de pollo'] = PRODUCTO_JAMONCITOS_POLLO;
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
 * antiguo para que nunca vuelva a resolverse como pollo entero por accidente.
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
  prepararAsociacionesCortesPollo();

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
