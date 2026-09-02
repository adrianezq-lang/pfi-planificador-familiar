const CLAVE_DESPENSA = 'pfi-despensa-productos';
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

/**
 * Versiones anteriores podían crear productos de charcutería y quesos como
 * perecederos semanales solo por el nombre de la sección del catálogo. La
 * planificación familiar los compra junto con la despensa mensual.
 *
 * Solo corregimos el antiguo estado "perecedero + semanal". Frecuencias
 * configuradas de forma explícita como manual, cuando-falte o mensual se
 * conservan.
 */
export function normalizarPeriodicidadDespensa(): number {
  try {
    const raw = localStorage.getItem(CLAVE_DESPENSA);
    if (!raw) return 0;
    const datos = JSON.parse(raw) as unknown;
    if (!Array.isArray(datos)) return 0;

    let cambios = 0;
    const normalizados = datos.map((valor) => {
      if (typeof valor !== 'object' || valor === null) return valor;
      const producto = valor as Record<string, unknown>;
      const nombre = typeof producto.nombre === 'string' ? producto.nombre : '';
      if (!esCharcuteriaOQuesoMensual(nombre)) return valor;

      const siguientes = { ...producto };
      if (siguientes.tipo === 'perecedero') {
        siguientes.tipo = 'despensa';
        cambios += 1;
      }
      if (siguientes.frecuencia === 'semanal') {
        siguientes.frecuencia = 'mensual';
        cambios += 1;
      }
      return siguientes;
    });

    if (cambios > 0) {
      localStorage.setItem(CLAVE_DESPENSA, JSON.stringify(normalizados));
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
