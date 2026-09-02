import type { DiaMenu } from '../data/Menusemanal';
import type { Ingrediente } from '../data/Recetas';
import { cargarRecetas } from './recetas';
import { unirIngredientes } from './UnirIngredientes';
import { obtenerRecetaPostre } from './menu';
import {
  calcularComensales,
  cargarPerfil,
  crearPerfilParaMomento,
  type PerfilFamiliar,
} from './perfil';
import { ajustarRecetasAlPerfil } from './porciones';
import { listarPlatosParaCompra } from './reglasMenuMensual';

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

    const recetas = ajustarRecetasAlPerfil(
      recetasBase,
      servicio.perfil,
      false,
    );
    const buscarReceta = (nombre: string) =>
      recetas.find((receta) => receta.nombre === nombre);
    const ingredientesPlato = (nombre: string): Ingrediente[] => {
      const ingredientesReceta = buscarReceta(nombre)?.ingredientes ?? [];

      if (nombre !== 'Tortilla de patata') return ingredientesReceta;

      return ingredientesReceta.map((ingrediente) =>
        ingrediente.nombre === 'Huevos'
          ? { ...ingrediente, cantidad: 8, unidad: 'ud' }
          : ingrediente,
      );
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
