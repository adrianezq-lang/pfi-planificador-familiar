export type SemanaCalendario = {
  indice: number;
  inicio: string;
  fin: string;
  etiqueta: string;
};

export function claveMesActual(fecha = new Date()): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
}

export function obtenerFechaMes(clave: string): Date {
  const [ano, mes] = clave.split('-').map(Number);
  return new Date(ano, mes - 1, 1);
}

export function desplazarMes(clave: string, delta: number): string {
  const fecha = obtenerFechaMes(clave);
  fecha.setMonth(fecha.getMonth() + delta);
  return claveMesActual(fecha);
}

export function nombreMes(clave: string): string {
  return obtenerFechaMes(clave).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  }).replace(/^./, (letra) => letra.toUpperCase());
}

export function semanasRealesDelMes(clave: string): SemanaCalendario[] {
  const fecha = obtenerFechaMes(clave);
  const ano = fecha.getFullYear();
  const mes = fecha.getMonth();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const primerDiaSemana = new Date(ano, mes, 1).getDay();
  const offsetLunes = (primerDiaSemana + 6) % 7;
  const cantidad = Math.ceil((offsetLunes + ultimoDia) / 7);
  const semanas: SemanaCalendario[] = [];

  for (let indice = 0; indice < cantidad; indice += 1) {
    const inicioDia = Math.max(1, indice * 7 - offsetLunes + 1);
    const finDia = Math.min(ultimoDia, inicioDia + 6);
    const inicio = new Date(ano, mes, inicioDia);
    const fin = new Date(ano, mes, finDia);
    semanas.push({
      indice,
      inicio: `${ano}-${String(mes + 1).padStart(2, '0')}-${String(inicioDia).padStart(2, '0')}`,
      fin: `${ano}-${String(mes + 1).padStart(2, '0')}-${String(finDia).padStart(2, '0')}`,
      etiqueta: `${inicio.getDate()}–${fin.getDate()} ${inicio.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}`,
    });
  }
  return semanas;
}

export function semanasMes(clave: string, total: number): SemanaCalendario[] {
  const reales = semanasRealesDelMes(clave);
  if (reales.length >= total) return reales.slice(0, total);
  const ultima = reales[reales.length - 1];
  return [...reales, ...Array.from({ length: total - reales.length }, (_, i) => ({
    indice: reales.length + i,
    inicio: ultima?.fin ?? '',
    fin: ultima?.fin ?? '',
    etiqueta: 'Sin días',
  }))];
}
