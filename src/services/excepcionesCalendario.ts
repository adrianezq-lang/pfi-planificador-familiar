const KEY = 'pfi-excepciones-calendario-v1';
export type ExcepcionCalendario = { noEnCasa: boolean };
export type ExcepcionesCalendario = Record<string, ExcepcionCalendario>;
export function cargarExcepciones(): ExcepcionesCalendario { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as ExcepcionesCalendario; } catch { return {}; } }
export function guardarExcepcion(id: string, excepcion: ExcepcionCalendario | null): void { const data = cargarExcepciones(); if (excepcion) data[id] = excepcion; else delete data[id]; localStorage.setItem(KEY, JSON.stringify(data)); window.dispatchEvent(new CustomEvent('pfi-calendario-actualizado')); }
