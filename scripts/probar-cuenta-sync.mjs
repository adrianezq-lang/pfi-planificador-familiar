import assert from 'node:assert/strict';

class LocalStoragePruebas {
  datos = new Map();

  get length() {
    return this.datos.size;
  }

  clear() {
    this.datos.clear();
  }

  getItem(clave) {
    return this.datos.has(clave) ? this.datos.get(clave) : null;
  }

  key(indice) {
    return [...this.datos.keys()][indice] ?? null;
  }

  removeItem(clave) {
    this.datos.delete(clave);
  }

  setItem(clave, valor) {
    this.datos.set(String(clave), String(valor));
  }
}

globalThis.localStorage = new LocalStoragePruebas();

const {
  aplicarDatosSincronizados,
  obtenerCopiasAutomaticas,
  recopilarDatosPFI,
} = await import('../src/services/copiasSeguridad.ts');

localStorage.setItem('pfi-perfil', '{"nombre":"Local"}');
localStorage.setItem('pfi-sync-sesion-v1', '{"access_token":"no-exportar"}');
localStorage.setItem('pfi-copias-automaticas-v1', JSON.stringify([{
  id: 'antigua',
  creadaEn: '2026-08-02T14:09:25.624Z',
  motivo: 'copia antigua',
  datos: {
    'pfi-perfil': '{"nombre":"Local"}',
    'pfi-sync-sesion-v1': '{"access_token":"tambien-borrar"}',
  },
  resumen: {},
  huella: 'anterior',
}]));
localStorage.setItem('otra-app', 'ignorar');

assert.deepEqual(recopilarDatosPFI(), {
  'pfi-perfil': '{"nombre":"Local"}',
});
assert.equal(obtenerCopiasAutomaticas().length, 1);
assert.equal(
  localStorage.getItem('pfi-copias-automaticas-v1')?.includes('access_token'),
  false,
);

const resumen = aplicarDatosSincronizados({
  'pfi-recetas': '[]',
  'pfi-sync-sesion-v1': '{"access_token":"no-importar"}',
}, '2026-08-03T14:19:26.599Z');

assert.equal(resumen.recetas, 0);
assert.equal(localStorage.getItem('pfi-recetas'), '[]');
assert.equal(
  localStorage.getItem('pfi-sync-sesion-v1'),
  '{"access_token":"no-exportar"}',
);
assert.ok(localStorage.getItem('pfi-copias-automaticas-v1'));

console.log('✓ La sincronización excluye credenciales y protege los datos locales.');
