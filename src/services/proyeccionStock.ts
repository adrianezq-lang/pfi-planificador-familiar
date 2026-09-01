export type ProyeccionStock = {
  compras: number[];
  sobrante: number;
};

export function proyectarComprasEnvases(
  necesidadesExactas: number[],
  stockInicial = 0,
): ProyeccionStock {
  let stock = Math.max(0, stockInicial);
  const compras = necesidadesExactas.map((necesidadOriginal) => {
    const necesidad = Math.max(0, necesidadOriginal);
    const envases = Math.max(0, Math.ceil(necesidad - stock - 0.000001));
    stock = Math.max(0, stock + envases - necesidad);
    return envases;
  });
  return { compras, sobrante: stock };
}
