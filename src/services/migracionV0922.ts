import { recetasVariedadV0922 } from '../data/RecetasV0922';
import {
  asociarProductoAIngrediente,
  obtenerProductoIdAsociado,
} from './asociacionesIngredientes';
import { cargarPerfil } from './perfil';
import { ajustarRecetasAlPerfil } from './porciones';
import { cargarRecetas, guardarRecetas } from './recetas';

const CLAVE_MIGRACION = 'pfi-migracion-variedad-v0922';

/**
 * Añade las recetas nuevas sin sustituir ni borrar las recetas que el usuario
 * ya tenga guardadas. Se ejecuta una sola vez antes de montar React.
 */
export function aplicarMigracionVariedadV0922(): void {
  if (localStorage.getItem(CLAVE_MIGRACION) === '1') return;

  const actuales = cargarRecetas();
  const nombres = new Set(
    actuales.map((receta) => receta.nombre.trim().toLocaleLowerCase('es')),
  );
  const nuevas = recetasVariedadV0922.filter(
    (receta) => !nombres.has(receta.nombre.trim().toLocaleLowerCase('es')),
  );

  if (nuevas.length > 0) {
    const ajustadas = ajustarRecetasAlPerfil(
      nuevas,
      cargarPerfil(),
      true,
    );
    guardarRecetas([...actuales, ...ajustadas]);
  }

  // SKU verificado en el catálogo Mercadona 48950. No pisa una asociación
  // elegida manualmente por el usuario si ya existe.
  if (!obtenerProductoIdAsociado('Judías verdes')) {
    asociarProductoAIngrediente('Judías verdes', '61282');
  }

  localStorage.setItem(CLAVE_MIGRACION, '1');
}
