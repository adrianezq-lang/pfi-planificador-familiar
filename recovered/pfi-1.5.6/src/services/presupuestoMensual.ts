export type TotalesCompraSemana = {
  totalSemanal: number;
  totalDespensa: number;
};

export type ResumenPresupuestoMensual = {
  presupuestoSemanal: number;
  presupuestoMensual: number;
  totalAcumulado: number;
  mostrarPresupuestoMensual: boolean;
};

export function calcularResumenPresupuestoMensual(
  semanas: TotalesCompraSemana[],
  semanaActiva: number,
): ResumenPresupuestoMensual {
  if (semanas.length === 0) {
    return {
      presupuestoSemanal: 0,
      presupuestoMensual: 0,
      totalAcumulado: 0,
      mostrarPresupuestoMensual: semanaActiva === 0,
    };
  }

  const indiceSeguro = Math.max(
    0,
    Math.min(semanaActiva, semanas.length - 1),
  );
  const presupuestoMensual = semanas[0]?.totalDespensa ?? 0;
  const presupuestoSemanal = semanas[indiceSeguro]?.totalSemanal ?? 0;
  const totalSemanas = semanas
    .slice(0, indiceSeguro + 1)
    .reduce((total, semana) => total + semana.totalSemanal, 0);

  return {
    presupuestoSemanal,
    presupuestoMensual,
    totalAcumulado: presupuestoMensual + totalSemanas,
    mostrarPresupuestoMensual: indiceSeguro === 0,
  };
}
