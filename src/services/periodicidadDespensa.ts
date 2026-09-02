const CLAVE_DESPENSA = 'pfi-despensa-productos';
const CLAVE_MIGRACION_V3 = 'pfi-migracion-periodicidad-despensa-v3';
const EVENTO_DESPENSA = 'pfi:despensa-actualizada';

let escuchaInstalada = false;

function normalizarTexto(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function esCharcuteriaOQuesoMensual(nombre: string): boolean {
  const texto = normalizarTexto(nombre);
  return /\b(chorizo|jamon|bacon|fuet|salchichon|mortadela|salami|embutido|salchichas?|queso)\b/.test(
    texto,
  );
}

function esPanaderiaMensual(nombre: string): boolean {
  const texto = normalizarTexto(nombre);
  return /\b(pan(?:es)?|burger bun|hot dog|tortillas? de trigo|wraps?|bases? de pizza)\b/.test(
    texto,
  );
}

/**
 * Respaldo para reparar altas antiguas creadas desde secciones del catálogo.
 * Solo se usa para reconocer frescos inequívocos; procesados y conservas se
 * excluyen antes de aplicar los patrones de fruta/verdura/carne/pescado.
 */
function esFrescoSemanalPorNombre(nombre: string): boolean {
  const texto = normalizarTexto(nombre);
  if (
    /\b(tomate (?:frito|triturado|para pizza)|ajo (?:en polvo|granulado)|patatas? fritas?|snacks?|embutido|jamon|chorizo|bacon|fuet|salchichon|mortadela|salami|salchichas?|queso)\b/.test(
      texto,
    )
  ) {
    return false;
  }

  return /\b(platano|manzana|pera|naranja|sandia|melon|tomate|patata|cebolla|ajos?|calabacin|zanahoria|pepino|pimiento|berenjena|fruta|verdura|pollo|pechuga|jamoncito|pavo|ternera|vacuno|cerdo|carne|filete|chuleta|costilla|solomillo|hamburguesa|lomo|salmon|bacalao|lubina|dorada|pescado|marisco|gamba|langostino|almeja|calamar|sepia)\b/.test(
    texto,
  );
}

function numeroNoNegativo(valor: unknown): number {
  return typeof valor === 'number' && Number.isFinite(valor)
    ? Math.max(0, valor)
    : 0;
}

/**
 * Repara estados heredados de la despensa para que coincidan con la regla de
 * compra del PFI: fruta/verdura, carne y pescado son semanales; todo lo demás
 * forma parte de la compra mensual.
 *
 * - Una frecuencia `manual` siempre se conserva.
 * - Un `cuando-falte` con reserva > 0 se considera una elección útil del usuario
 *   y se conserva.
 * - La conversión genérica de antiguos `cuando-falte` sin reserva solo se hace
 *   una vez (V3), porque era el valor automático de versiones anteriores.
 */
export function normalizarPeriodicidadDespensa(): number {
  try {
    const raw = localStorage.getItem(CLAVE_DESPENSA);
    const migracionV3Pendiente = localStorage.getItem(CLAVE_MIGRACION_V3) !== '1';

    if (!raw) {
      if (migracionV3Pendiente) localStorage.setItem(CLAVE_MIGRACION_V3, '1');
      return 0;
    }

    const datos = JSON.parse(raw) as unknown;
    if (!Array.isArray(datos)) {
      if (migracionV3Pendiente) localStorage.setItem(CLAVE_MIGRACION_V3, '1');
      return 0;
    }

    let cambios = 0;
    const normalizados = datos.map((valor) => {
      if (typeof valor !== 'object' || valor === null) return valor;
      const producto = valor as Record<string, unknown>;
      const nombre = typeof producto.nombre === 'string' ? producto.nombre : '';
      const frecuencia = producto.frecuencia;
      const stockMinimo = numeroNoNegativo(producto.stockMinimo ?? producto.umbralAviso);
      const esFresco = esFrescoSemanalPorNombre(nombre);
      const esMensualConocido =
        esCharcuteriaOQuesoMensual(nombre) || esPanaderiaMensual(nombre);
      const siguientes = { ...producto };

      if (esFresco) {
        // Versiones antiguas podían marcar "Carne" como despensa porque solo
        // buscaban la palabra "carnicería" en el nombre de la sección.
        if (siguientes.tipo === 'despensa' && frecuencia === 'cuando-falte' && stockMinimo <= 0) {
          siguientes.tipo = 'perecedero';
          cambios += 1;
        }
        if (frecuencia === 'cuando-falte' && stockMinimo <= 0) {
          siguientes.frecuencia = 'semanal';
          cambios += 1;
        }
        return siguientes;
      }

      if (esMensualConocido) {
        if (siguientes.tipo === 'perecedero') {
          siguientes.tipo = 'despensa';
          cambios += 1;
        }
        if (frecuencia === 'semanal') {
          siguientes.frecuencia = 'mensual';
          cambios += 1;
        }
      }

      // El valor automático histórico para cualquier no fresco era
      // despensa + cuando-falte + reserva 0. Es funcionalmente inerte para la
      // compra mensual, por eso lo migramos una sola vez a mensual.
      if (
        migracionV3Pendiente &&
        siguientes.tipo !== 'perecedero' &&
        siguientes.frecuencia === 'cuando-falte' &&
        stockMinimo <= 0
      ) {
        siguientes.tipo = 'despensa';
        siguientes.frecuencia = 'mensual';
        cambios += 1;
      }

      // Otra firma antigua: panadería/charcutería se creaba como perecedero
      // semanal. Los casos conocidos se corrigen aunque V3 ya se hubiera hecho.
      if (esMensualConocido && siguientes.tipo === 'despensa' && siguientes.frecuencia === 'semanal') {
        siguientes.frecuencia = 'mensual';
        cambios += 1;
      }

      return siguientes;
    });

    if (cambios > 0) {
      localStorage.setItem(CLAVE_DESPENSA, JSON.stringify(normalizados));
    }
    if (migracionV3Pendiente) {
      localStorage.setItem(CLAVE_MIGRACION_V3, '1');
    }
    return cambios;
  } catch {
    return 0;
  }
}

export function instalarNormalizacionPeriodicidadDespensa(): void {
  normalizarPeriodicidadDespensa();
  if (escuchaInstalada) return;
  escuchaInstalada = true;
  window.addEventListener(EVENTO_DESPENSA, () => {
    normalizarPeriodicidadDespensa();
  });
}
