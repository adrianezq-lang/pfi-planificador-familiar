import { recetasVariedadV0922 } from '../data/RecetasV0922';
import { recetasVariedadV0923 } from '../data/RecetasV0923';
import { recetasVariedadV0924 } from '../data/RecetasV0924';
import { recetasVariedadV0927 } from '../data/RecetasV0927';
import {
  asociarProductoAIngrediente,
  obtenerProductoIdAsociado,
} from './asociacionesIngredientes';
import { cargarPerfil } from './perfil';
import { ajustarRecetasAlPerfil } from './porciones';
import {
  cargarRecetas,
  EVENTO_RECETAS,
  guardarRecetas,
} from './recetas';

let aplicando = false;
let instalado = false;

function normalizar(texto: string): string {
  return texto.trim().toLocaleLowerCase('es');
}

/** Mantiene las recetas modernas y corrige el kebab histórico. */
export function aplicarMigracionV0923(): void {
  if (aplicando) return;
  aplicando = true;

  try {
    const actuales = cargarRecetas();
    let cambiadas = false;

    const reparadas = actuales.map((receta) => {
      if (normalizar(receta.nombre) !== 'kebab') return receta;

      let recetaCambiada = false;
      const ingredientes = receta.ingredientes.map((ingrediente) => {
        if (normalizar(ingrediente.nombre) !== 'tortillas de trigo') return ingrediente;
        recetaCambiada = true;
        return { ...ingrediente, nombre: 'Pan de pita', seccion: 'Panadería' };
      });

      if (!recetaCambiada) return receta;
      cambiadas = true;
      return { ...receta, ingredientes };
    });

    const nombres = new Set(reparadas.map((receta) => normalizar(receta.nombre)));
    const faltantes = [
      ...recetasVariedadV0922,
      ...recetasVariedadV0923,
      ...recetasVariedadV0924,
      ...recetasVariedadV0927,
    ]
      .filter((receta) => !nombres.has(normalizar(receta.nombre)));

    if (faltantes.length > 0) {
      cambiadas = true;
      const ajustadas = ajustarRecetasAlPerfil(faltantes, cargarPerfil(), true);
      reparadas.push(...ajustadas);
    }

    if (cambiadas) guardarRecetas(reparadas);

    const pita = obtenerProductoIdAsociado('Pan de pita');
    if (!pita || pita === '80859') {
      asociarProductoAIngrediente('Pan de pita', '14378');
    }
    if (!obtenerProductoIdAsociado('Limón')) {
      asociarProductoAIngrediente('Limón', '3210');
    }
    if (!obtenerProductoIdAsociado('Judías verdes')) {
      asociarProductoAIngrediente('Judías verdes', '61282');
    }
    if (!obtenerProductoIdAsociado('Menestra de verduras')) {
      asociarProductoAIngrediente('Menestra de verduras', '52534');
    }
  } finally {
    aplicando = false;
  }
}

/**
 * Se instala una vez. El listener permite que «restaurar recetas» o importar
 * una copia antigua no deje fuera las recetas modernas ni recupere el kebab
 * con tortillas hasta la siguiente recarga. El nombre se conserva por
 * compatibilidad con los puntos de arranque y las pruebas de versiones previas.
 */
export function instalarMigracionV0923(): void {
  aplicarMigracionV0923();
  if (instalado) return;
  instalado = true;
  window.addEventListener(EVENTO_RECETAS, aplicarMigracionV0923);
}
