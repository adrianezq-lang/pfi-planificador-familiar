import fs from 'node:fs';

class MemoriaLocal {
  datos = new Map();
  get length() { return this.datos.size; }
  key(indice) { return Array.from(this.datos.keys())[indice] ?? null; }
  getItem(clave) { return this.datos.has(clave) ? this.datos.get(clave) : null; }
  setItem(clave, valor) { this.datos.set(String(clave), String(valor)); }
  removeItem(clave) { this.datos.delete(clave); }
  clear() { this.datos.clear(); }
}

globalThis.localStorage = new MemoriaLocal();

const backup = await import('../src/services/copiaSeguridad.ts');

function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
  console.log(`✓ ${mensaje}`);
}

localStorage.setItem('pfi-perfil-familiar', '{"nombre":"Familia"}');
localStorage.setItem('pfi-inventario-movimientos', '[{"id":"1"}]');
localStorage.setItem('otra-app', 'no-exportar');

const copia = backup.crearCopiaSeguridad();
comprobar(copia.tipo === 'pfi-backup' && copia.version === 1, 'la copia lleva identificador y versión');
comprobar(Object.keys(copia.datos).length === 2, 'solo se exportan datos propios de PFI');
comprobar(!('otra-app' in copia.datos), 'datos de otras aplicaciones no se incluyen');

const texto = backup.serializarCopiaSeguridad(copia);
const leida = backup.leerCopiaSeguridad(texto);
comprobar(leida.datos['pfi-perfil-familiar']?.includes('Familia'), 'la copia serializada se puede volver a leer');

localStorage.setItem('pfi-dato-nuevo', 'borrar al restaurar');
localStorage.setItem('otra-app', 'mantener');
const restaurados = backup.restaurarCopiaSeguridad(leida, true);
comprobar(restaurados === 2, 'la restauración informa de los bloques recuperados');
comprobar(localStorage.getItem('pfi-dato-nuevo') === null, 'la restauración reemplaza datos PFI antiguos');
comprobar(localStorage.getItem('otra-app') === 'mantener', 'la restauración no toca datos ajenos a PFI');

let rechazo = false;
try {
  backup.leerCopiaSeguridad('{"tipo":"otra-cosa","version":1,"creada":"x","datos":{}}');
} catch {
  rechazo = true;
}
comprobar(rechazo, 'archivos ajenos o manipulados se rechazan');

const perfil = fs.readFileSync('src/pages/Perfil.tsx', 'utf8');
comprobar(perfil.includes('<CopiaSeguridadPanel />'), 'Perfil muestra la copia de seguridad');

console.log('✓ Copia de seguridad PFI: exportación, validación y restauración comprobadas');
