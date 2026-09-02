const PATRON_CLAVE_RESCATE = /(asoci|despensa|receta|inventario|stock|producto|mercadona|necesidad|mensual)/i;

function recopilarDatosRescate(): Record<string, string> {
  const datos: Record<string, string> = {};

  for (let indice = 0; indice < localStorage.length; indice += 1) {
    const clave = localStorage.key(indice);
    if (!clave || !clave.startsWith('pfi-') || !PATRON_CLAVE_RESCATE.test(clave)) {
      continue;
    }

    const valor = localStorage.getItem(clave);
    if (valor !== null) datos[clave] = valor;
  }

  return datos;
}

/**
 * Exporta únicamente los datos locales que pueden ayudar a reconstruir
 * asociaciones, recetas, despensa, inventario y necesidades de compra mensual.
 * No incluye el perfil familiar.
 */
export function descargarDiagnosticoRescate(): void {
  const contenido = {
    tipo: 'pfi-diagnostico-rescate-asociaciones',
    version: 1,
    creado: new Date().toISOString(),
    origen: window.location.origin,
    claves: recopilarDatosRescate(),
  };

  const blob = new Blob([JSON.stringify(contenido, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `pfi-diagnostico-rescate-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
