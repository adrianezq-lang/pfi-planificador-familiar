import type { DiaMenu } from '../data/Menusemanal';
import type { Ingrediente } from '../data/Recetas';
import { cargarRecetas } from './recetas';
import { unirIngredientes } from './UnirIngredientes';
import { obtenerRecetaPostre } from './menu';
import { calcularComensales, cargarPerfil } from './perfil';
import { ajustarRecetasAlPerfil } from './porciones';

function ingredientePostreSinReceta(nombre: string): Ingrediente[] {
  if (!nombre || nombre === 'Sin postre') return [];

  const normalizado = nombre.toLocaleLowerCase('es');
  const comensales = Math.max(1, calcularComensales(cargarPerfil()));

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

export function generarListaCompra(
  menu: DiaMenu[],
): Ingrediente[] {
  const perfil = cargarPerfil();
  const recetas = ajustarRecetasAlPerfil(cargarRecetas(), perfil, false);
  const buscarReceta = (nombre: string) =>
    recetas.find((receta) => receta.nombre === nombre);

  const platos = menu.flatMap((dia) => [
    ...dia.comida,
    ...dia.cena,
  ]);
  const postres = menu.flatMap((dia) => [
    obtenerRecetaPostre(dia, 'comida'),
    obtenerRecetaPostre(dia, 'cena'),
  ]);

  const ingredientesPlatos = platos.flatMap(
    (nombre) => buscarReceta(nombre)?.ingredientes ?? [],
  );
  const ingredientesPostres = postres.flatMap((nombre) => {
    const receta = buscarReceta(nombre);
    return receta?.ingredientes ?? ingredientePostreSinReceta(nombre);
  });

  return unirIngredientes([
    ...ingredientesPlatos,
    ...ingredientesPostres,
  ]);
}
