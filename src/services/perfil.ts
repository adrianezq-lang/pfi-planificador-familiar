export type PerfilFamiliar = {
  nombre: string;
  adultos: number;
  ninos: number;
  edadesNinos: number[];
  bebes: number;
  bebesComenMenu: boolean;
  supermercado: string;
  presupuesto: number;
};

const CLAVE_PERFIL = 'pfi-perfil';

export const EVENTO_PERFIL = 'pfi-perfil-actualizado';

export const perfilInicial: PerfilFamiliar = {
  nombre: 'Adrián',
  adultos: 2,
  ninos: 2,
  edadesNinos: [12, 6],
  bebes: 1,
  bebesComenMenu: false,
  supermercado: 'Mercadona',
  presupuesto: 500,
};

function numeroSeguro(valor: unknown, alternativa: number): number {
  return typeof valor === 'number' && Number.isFinite(valor)
    ? Math.max(0, valor)
    : alternativa;
}

function ajustarEdades(edades: unknown, cantidadNinos: number): number[] {
  const validas = Array.isArray(edades)
    ? edades
        .filter((edad): edad is number =>
          typeof edad === 'number' && Number.isFinite(edad),
        )
        .map((edad) => Math.max(1, Math.round(edad)))
    : [];

  return Array.from({ length: cantidadNinos }, (_, indice) => {
    return validas[indice] ?? perfilInicial.edadesNinos[indice] ?? 8;
  });
}

export function normalizarPerfil(valor: unknown): PerfilFamiliar {
  if (typeof valor !== 'object' || valor === null) {
    return { ...perfilInicial, edadesNinos: [...perfilInicial.edadesNinos] };
  }

  const parcial = valor as Partial<PerfilFamiliar>;
  const adultos = Math.max(1, Math.round(numeroSeguro(parcial.adultos, 2)));
  const ninos = Math.round(numeroSeguro(parcial.ninos, 2));
  const bebes = Math.round(numeroSeguro(parcial.bebes, 1));

  return {
    nombre:
      typeof parcial.nombre === 'string' && parcial.nombre.trim()
        ? parcial.nombre.trim()
        : perfilInicial.nombre,
    adultos,
    ninos,
    edadesNinos: ajustarEdades(parcial.edadesNinos, ninos),
    bebes,
    bebesComenMenu:
      typeof parcial.bebesComenMenu === 'boolean'
        ? parcial.bebesComenMenu
        : false,
    supermercado:
      typeof parcial.supermercado === 'string' && parcial.supermercado.trim()
        ? parcial.supermercado.trim()
        : perfilInicial.supermercado,
    presupuesto: numeroSeguro(parcial.presupuesto, perfilInicial.presupuesto),
  };
}

export function cargarPerfil(): PerfilFamiliar {
  try {
    const guardado = localStorage.getItem(CLAVE_PERFIL);
    const perfil = guardado
      ? normalizarPerfil(JSON.parse(guardado) as unknown)
      : normalizarPerfil(perfilInicial);

    if (!guardado || JSON.stringify(perfil) !== guardado) {
      localStorage.setItem(CLAVE_PERFIL, JSON.stringify(perfil));
    }

    return perfil;
  } catch {
    return normalizarPerfil(perfilInicial);
  }
}

export function guardarPerfil(perfil: PerfilFamiliar): PerfilFamiliar {
  const normalizado = normalizarPerfil(perfil);
  localStorage.setItem(CLAVE_PERFIL, JSON.stringify(normalizado));
  window.dispatchEvent(new CustomEvent(EVENTO_PERFIL));
  return normalizado;
}

export function factorNinoPorEdad(edad: number): number {
  if (edad >= 16) return 1;
  if (edad >= 12) return 0.85;
  if (edad >= 8) return 0.7;
  if (edad >= 4) return 0.55;
  return 0.35;
}

export function calcularRacionesEquivalentes(perfil: PerfilFamiliar): number {
  const adultos = perfil.adultos;
  const ninos = perfil.edadesNinos.reduce(
    (total, edad) => total + factorNinoPorEdad(edad),
    0,
  );
  const bebes = perfil.bebesComenMenu ? perfil.bebes * 0.25 : 0;

  return Math.round((adultos + ninos + bebes) * 100) / 100;
}

export function calcularComensales(perfil: PerfilFamiliar): number {
  return perfil.adultos + perfil.ninos + (perfil.bebesComenMenu ? perfil.bebes : 0);
}

export function describirFamilia(perfil: PerfilFamiliar): string {
  const partes = [`${perfil.adultos} adulto${perfil.adultos === 1 ? '' : 's'}`];

  if (perfil.ninos > 0) {
    partes.push(
      `${perfil.ninos} niño${perfil.ninos === 1 ? '' : 's'} (${perfil.edadesNinos.join(' y ')} años)`,
    );
  }

  if (perfil.bebes > 0) {
    partes.push(
      perfil.bebesComenMenu
        ? `${perfil.bebes} bebé${perfil.bebes === 1 ? '' : 's'} incluido${perfil.bebes === 1 ? '' : 's'}`
        : `${perfil.bebes} bebé${perfil.bebes === 1 ? '' : 's'} sin contar todavía`,
    );
  }

  return partes.join(' · ');
}
