const presupuesto = await import(
  new URL('../src/services/presupuestoMensual.ts', import.meta.url).href
);

const semanas = [
  { totalSemanal: 80, totalDespensa: 120 },
  { totalSemanal: 75, totalDespensa: 15 },
  { totalSemanal: 90, totalDespensa: 8 },
  { totalSemanal: 70, totalDespensa: 10 },
];

const primera = presupuesto.calcularResumenPresupuestoMensual(semanas, 0);
if (
  primera.presupuestoSemanal !== 80 ||
  primera.presupuestoMensual !== 120 ||
  primera.totalAcumulado !== 200 ||
  !primera.mostrarPresupuestoMensual
) {
  throw new Error('La primera semana no calcula correctamente el presupuesto');
}

const tercera = presupuesto.calcularResumenPresupuestoMensual(semanas, 2);
if (
  tercera.presupuestoSemanal !== 90 ||
  tercera.presupuestoMensual !== 120 ||
  tercera.totalAcumulado !== 365 ||
  tercera.mostrarPresupuestoMensual
) {
  throw new Error('El acumulado mensual no se mantiene correctamente');
}

console.log('✓ presupuesto mensual visible únicamente en la primera semana');
console.log('✓ total acumulado suma despensa mensual y semanas transcurridas');
