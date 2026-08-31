export type TramoMes = { id: string; inicio: string; fin: string; nombre: string; dias: string[] };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function obtenerTramosMes(year: number, month: number): TramoMes[] {
  const inicioMes = new Date(year, month - 1, 1);
  const finMes = new Date(year, month, 0);
  const tramos: TramoMes[] = [];
  let cursor = new Date(inicioMes);
  let n = 1;
  while (cursor <= finMes) {
    const inicio = new Date(cursor);
    const fin = new Date(cursor);
    const diaSemana = fin.getDay();
    const diasHastaDomingo = diaSemana === 0 ? 0 : 7 - diaSemana;
    fin.setDate(Math.min(fin.getDate() + diasHastaDomingo, finMes.getDate()));
    const dias: string[] = [];
    const d = new Date(inicio);
    while (d <= fin) { dias.push(iso(d)); d.setDate(d.getDate() + 1); }
    tramos.push({ id: `${year}-${String(month).padStart(2,'0')}-${n}`, inicio: iso(inicio), fin: iso(fin), nombre: `${inicio.getDate()}–${fin.getDate()}`, dias });
    cursor = new Date(fin); cursor.setDate(cursor.getDate() + 1); n += 1;
  }
  return tramos;
}

export function etiquetaMes(year: number, month: number): string {
  return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}
