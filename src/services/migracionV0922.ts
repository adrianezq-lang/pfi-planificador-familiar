import { recetasVariedadV0922 } from '../data/RecetasV0922';
import {
  asociarProductoAIngrediente,
  obtenerProductoIdAsociado,
} from './asociacionesIngredientes';
import { cargarPerfil } from './perfil';
import { ajustarRecetasAlPerfil } from './porciones';
import { cargarRecetas, guardarRecetas } from './recetas';

const CLAVE_MIGRACION_RECETAS = 'pfi-migracion-variedad-v0922';
const CLAVE_CORRECCION_MENU = 'pfi-migracion-menu-v0922b';
const PREFIJO_PLAN_MES = 'pfi-menu-mes-';

function corregirPlanGuardado(valor: unknown): { valor: unknown; cambiado: boolean } {
  if (!valor || typeof valor !== 'object') return { valor, cambiado: false };

  const objeto = valor as { semanas?: unknown };
  if (!Array.isArray(objeto.semanas)) return { valor, cambiado: false };

  let cambiado = false;
  const semanas = objeto.semanas.map((semana, indiceSemana) => {
    if (!semana || typeof semana !== 'object') return semana;
    const semanaObjeto = semana as { menu?: unknown };
    if (!Array.isArray(semanaObjeto.menu)) return semana;

    const menu = semanaObjeto.menu.map((dia) => {
      if (!dia || typeof dia !== 'object') return dia;
      const diaObjeto = dia as { dia?: unknown; cena?: unknown };
      if (
        indiceSemana === 4 &&
        diaObjeto.dia === 'Miércoles' &&
        Array.isArray(diaObjeto.cena) &&
        diaObjeto.cena.length === 1 &&
        diaObjeto.cena[0] === 'Fajitas'
      ) {
        cambiado = true;
        return {
          ...diaObjeto,
          cena: ['Pechugas de pollo', 'Patatas'],
        };
      }
      return dia;
    });

    return cambiado ? { ...semanaObjeto, menu } : semana;
  });

  return cambiado
    ? { valor: { ...(valor as Record<string, unknown>), semanas }, cambiado: true }
    : { valor, cambiado: false };
}

function corregirPlanesGuardadosV0922(): void {
  if (localStorage.getItem(CLAVE_CORRECCION_MENU) === '1') return;

  const claves = new Set<string>();
  const mesActivo = localStorage.getItem('pfi-mes-activo');
  if (mesActivo) claves.add(`${PREFIJO_PLAN_MES}${mesActivo}`);

  if (
    typeof localStorage.length === 'number' &&
    typeof localStorage.key === 'function'
  ) {
    for (let indice = 0; indice < localStorage.length; indice += 1) {
      const clave = localStorage.key(indice);
      if (clave?.startsWith(PREFIJO_PLAN_MES)) claves.add(clave);
    }
  }

  claves.forEach((clave) => {
    const guardado = localStorage.getItem(clave);
    if (!guardado) return;

    try {
      const parsed = JSON.parse(guardado) as unknown;
      const corregido = corregirPlanGuardado(parsed);
      if (corregido.cambiado) {
        localStorage.setItem(clave, JSON.stringify(corregido.valor));
      }
    } catch {
      // Si una copia local está dañada, useMenu ya aplicará su recuperación normal.
    }
  });

  localStorage.setItem(CLAVE_CORRECCION_MENU, '1');
}

/**
 * Añade las recetas nuevas sin sustituir ni borrar las recetas que el usuario
 * ya tenga guardadas. Además corrige la plantilla intermedia de v0.9.22 que
 * podía conservar una segunda noche de fajitas y elevar la compra a 20 tortillas.
 */
export function aplicarMigracionVariedadV0922(): void {
  if (localStorage.getItem(CLAVE_MIGRACION_RECETAS) !== '1') {
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

    localStorage.setItem(CLAVE_MIGRACION_RECETAS, '1');
  }

  corregirPlanesGuardadosV0922();
}
