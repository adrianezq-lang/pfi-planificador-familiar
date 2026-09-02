import type { DiaMenu } from '../data/Menusemanal';
import type { Ingrediente, Receta } from '../data/Recetas';
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

function redondearCantidad(valor: number): number {
  return Math.round(valor * 100) / 100;
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
    const ingredientesPlato = (nombre: string): Ingrediente[] =>
      buscarReceta(nombre)?.ingredientes ?? [];
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
