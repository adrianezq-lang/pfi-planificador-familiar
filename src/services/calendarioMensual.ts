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

/**
 * Divide el mes en semanas reales de calendario, de lunes a domingo,
 * pero recortadas en los límites del propio mes.
 * Ej.: septiembre de 2026 empieza martes, por lo que su primera semana
 * es 1–6, no 1–7.
 */
export function semanasRealesDelMes(clave: string): SemanaCalendario[] {
  const fecha = obtenerFechaMes(clave);
  const ano = fecha.getFullYear();
  const mes = fecha.getMonth();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const primerDiaSemana = new Date(ano, mes, 1).getDay();
  const offsetLunes = (primerDiaSemana + 6) % 7;
  const semanas: SemanaCalendario[] = [];

  let inicioDia = 1;
  let indice = 0;

  while (inicioDia <= ultimoDia) {
    const longitudPrimeraSemana = 7 - offsetLunes;
    const diasHastaDomingo = indice === 0 ? longitudPrimeraSemana : 7;
    const finDia = Math.min(ultimoDia, inicioDia + diasHastaDomingo - 1);
    const inicio = new Date(ano, mes, inicioDia);
    const fin = new Date(ano, mes, finDia);

    semanas.push({
      indice,
      inicio: `${ano}-${String(mes + 1).padStart(2, '0')}-${String(inicioDia).padStart(2, '0')}`,
      fin: `${ano}-${String(mes + 1).padStart(2, '0')}-${String(finDia).padStart(2, '0')}`,
      etiqueta: `${inicio.getDate()}–${fin.getDate()} ${inicio.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}`,
    });

    inicioDia = finDia + 1;
    indice += 1;
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