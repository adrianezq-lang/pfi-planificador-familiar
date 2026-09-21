const CLAVE_NOTAS_SEMANA = 'pfi-notas-semana-v1';
const MAX_NOTA = 2400;

type NotasSemana = Record<string, string>;

function cargarTodas(): NotasSemana {
  try {
    const guardado = localStorage.getItem(CLAVE_NOTAS_SEMANA);
    if (!guardado) return {};
    const parsed = JSON.parse(guardado) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([, valor]) => typeof valor === 'string')
        .map(([clave, valor]) => [clave, String(valor).slice(0, MAX_NOTA)]),
    );
  } catch {
    return {};
  }
}

function claveNota(mes: string, semana: number): string {
  return `${mes}::${Math.max(0, Math.round(semana))}`;
}

export function cargarNotaSemana(mes: string, semana: number): string {
  return cargarTodas()[claveNota(mes, semana)] ?? '';
}

export function guardarNotaSemana(
  mes: string,
  semana: number,
  nota: string,
): string {
  const todas = cargarTodas();
  const clave = claveNota(mes, semana);
  const normalizada = nota.slice(0, MAX_NOTA);

  if (normalizada.trim()) {
    todas[clave] = normalizada;
  } else {
    delete todas[clave];
  }

  localStorage.setItem(CLAVE_NOTAS_SEMANA, JSON.stringify(todas));
  return normalizada;
}
