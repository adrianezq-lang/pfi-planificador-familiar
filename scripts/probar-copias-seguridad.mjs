import { createServer } from 'vite';

class StorageMock {
  data = new Map();

  get length() { return this.data.size; }
  getItem(clave) { return this.data.get(clave) ?? null; }
  key(indice) { return Array.from(this.data.keys())[indice] ?? null; }
  setItem(clave, valor) { this.data.set(clave, String(valor)); }
  removeItem(clave) { this.data.delete(clave); }
}

globalThis.localStorage = new StorageMock();
globalThis.window = {
  location: { origin: 'https://pfi.test' },
  dispatchEvent() {},
};
globalThis.CustomEvent = class {
  constructor(type) { this.type = type; }
};

const vite = await createServer({
  configFile: false,
  server: { middlewareMode: true },
  appType: 'custom',
});

const {
  analizarCopiaCompleta,
  aplicarCopiaCompleta,
  crearCopiaAutomaticaSiNecesaria,
  crearCopiaCompleta,
  obtenerCopiasAutomaticas,
  obtenerEstadoSaludDatos,
  recopilarDatosPFI,
  restaurarCopiaAutomatica,
} = await vite.ssrLoadModule('/src/services/copiasSeguridad.ts');

localStorage.setItem('pfi-recetas', JSON.stringify([
  { nombre: 'Lentejas' },
  { nombre: 'Salmón' },
]));
localStorage.setItem('pfi-asociaciones-ingredientes-mercadona', JSON.stringify({
  Lentejas: '15604',
  Salmón: '2750',
}));
localStorage.setItem('pfi-despensa-productos', JSON.stringify([{ id: '15604' }]));
localStorage.setItem('pfi-inventario-movimientos', JSON.stringify([{ id: 'mov-1' }]));
localStorage.setItem('pfi-menu-mes-2026-09', JSON.stringify({
  mes: '2026-09',
  semanas: [{ id: 's1' }, { id: 's2' }, { id: 's3' }, { id: 's4' }],
}));
localStorage.setItem('pfi-perfil', JSON.stringify({ nombre: 'Familia' }));
localStorage.setItem('otra-app', 'no debe copiarse');

const primera = crearCopiaAutomaticaSiNecesaria('estado inicial');
if (!primera || primera.resumen.recetas !== 2) {
  throw new Error('No se creó la primera copia automática completa.');
}
if (crearCopiaAutomaticaSiNecesaria('duplicada') !== null) {
  throw new Error('Se guardó una copia duplicada sin cambios.');
}
if ('otra-app' in recopilarDatosPFI()) {
  throw new Error('La copia incluyó datos ajenos a PFI.');
}
if ('pfi-copias-automaticas-v1' in crearCopiaCompleta().datos) {
  throw new Error('La copia completa se incluyó recursivamente a sí misma.');
}

const salud = obtenerEstadoSaludDatos();
if (salud.nivel !== 'correcto' || salud.copiasAutomaticas !== 1) {
  throw new Error(`Estado de salud inesperado: ${JSON.stringify(salud)}.`);
}

localStorage.setItem('pfi-perfil', JSON.stringify({ nombre: 'Familia actualizada' }));
if (!crearCopiaAutomaticaSiNecesaria('perfil actualizado')) {
  throw new Error('Un cambio real no generó una nueva copia automática.');
}

const legado = {
  formato: 'pfi-copia-seguridad',
  versionFormato: 2,
  versionApp: 'v1.0 integral 1.5',
  creadaEn: '2026-08-02T14:09:25.624Z',
  origen: 'https://pfi-planificador-familiar-i6ch.vercel.app',
  datos: {
    'pfi-recetas': JSON.stringify([
      { nombre: 'Lentejas antiguas' },
      { nombre: 'Salmón antiguo' },
      { nombre: 'Pizza antigua' },
    ]),
    'pfi-asociaciones-ingredientes-mercadona': JSON.stringify({
      Lentejas: '15604',
      Salmón: '2750',
      Pizza: '6101',
    }),
    'pfi-despensa-productos': JSON.stringify([{ id: '15604' }, { id: '2750' }]),
    'pfi-menu-mensual-v1': JSON.stringify([
      { id: 's1' }, { id: 's2' }, { id: 's3' }, { id: 's4' },
    ]),
  },
  integridad: { algoritmo: 'fnv1a-32', huella: 'huella-del-formato-antiguo' },
};

const revisada = analizarCopiaCompleta(JSON.stringify(legado));
if (
  revisada.resumen.recetas !== 3 ||
  revisada.resumen.asociaciones !== 3 ||
  revisada.resumen.semanasMenu !== 4
) {
  throw new Error(`La copia antigua no se interpretó bien: ${JSON.stringify(revisada.resumen)}.`);
}
if (
  revisada.datos['pfi-mes-activo'] !== '2026-08' ||
  !revisada.datos['pfi-menu-mes-2026-08']
) {
  throw new Error('El plan mensual antiguo no se migró al calendario actual.');
}

localStorage.setItem('pfi-ajuste-nuevo-v0918', 'conservar');
aplicarCopiaCompleta(revisada);
if (JSON.parse(localStorage.getItem('pfi-recetas')).length !== 3) {
  throw new Error('La restauración completa no aplicó el recetario de la copia.');
}
if (localStorage.getItem('pfi-ajuste-nuevo-v0918') !== 'conservar') {
  throw new Error('La restauración eliminó una clave local más nueva.');
}
if (localStorage.getItem('pfi-mes-activo') !== '2026-08') {
  throw new Error('PFI no activó el mes recuperado de la copia antigua.');
}

const copiaV3 = crearCopiaCompleta();
const manipulada = structuredClone(copiaV3);
manipulada.datos['pfi-recetas'] = JSON.stringify([{ nombre: 'Copia manipulada' }]);
let rechazoIntegridad = false;
try {
  analizarCopiaCompleta(JSON.stringify(manipulada));
} catch {
  rechazoIntegridad = true;
}
if (!rechazoIntegridad) {
  throw new Error('Una copia v3 manipulada superó el control de integridad.');
}

const masAntigua = obtenerCopiasAutomaticas().at(-1);
if (!masAntigua) throw new Error('No quedó ninguna copia automática para restaurar.');
restaurarCopiaAutomatica(masAntigua.id);
if (JSON.parse(localStorage.getItem('pfi-recetas')).length !== 2) {
  throw new Error('La restauración automática no recuperó el estado elegido.');
}

for (let indice = 0; indice < 12; indice += 1) {
  localStorage.setItem('pfi-contador-prueba', String(indice));
  crearCopiaAutomaticaSiNecesaria(`cambio ${indice}`);
}
if (obtenerCopiasAutomaticas().length > 8) {
  throw new Error('El historial automático superó su límite de ocho copias.');
}

console.log('✓ la copia automática protege todos los datos PFI sin duplicados');
console.log('✓ el centro reconoce copias completas antiguas de formato 2');
console.log('✓ restaurar combina datos y conserva ajustes locales más nuevos');
console.log('✓ la integridad v3 impide aplicar una copia manipulada');
console.log('✓ las copias automáticas se pueden restaurar y quedan limitadas a ocho');

await vite.close();
