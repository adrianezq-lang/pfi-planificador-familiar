export type ConfiguracionComensales = {
  adultos: number;
  ninos: boolean[];
  bebes: number;
};

export type PlanComensales = {
  comidaLaborable: ConfiguracionComensales;
  comidaFinSemana: ConfiguracionComensales;
  cena: ConfiguracionComensales;
};

export type MomentoComida = 'comida' | 'cena';

export type PerfilFamiliar = {
  nombre: string;
  adultos: number;
  ninos: number;
  edadesNinos: number[];
  bebes: number;
  bebesComenMenu: boolean;
  comensales: PlanComensales;
  supermercado: string;
  presupuesto: number;
};

const CLAVE_PERFIL = 'pfi-perfil';

export const EVENTO_PERFIL = 'pfi-perfil-actualizado';

const comensalesIniciales: PlanComensales = {
  comidaLaborable: {
    adultos: 2,
    ninos: [true, false],
    bebes: 0,
  },
  comidaFinSemana: {
    adultos: 2,
    ninos: [true, true],
    bebes: 0,
  },
  cena: {
    adultos: 2,
    ninos: [true, true],
    bebes: 0,
  },
};

export const perfilInicial: PerfilFamiliar = {
  nombre: 'Adrián',
  adultos: 2,
  ninos: 2,
  edadesNinos: [12, 6],
  bebes: 1,
  bebesComenMenu: false,
  comensales: comensalesIniciales,
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

function limitarEntero(valor: unknown, alternativa: number, maximo: number): number {
  return Math.min(maximo, Math.round(numeroSeguro(valor, alternativa)));
}

function crearPlanComensalesPredeterminado(
  adultos: number,
  edadesNinos: number[],
  bebes: number,
  bebesComenMenu: boolean,
): PlanComensales {
  const ninosLaborables = edadesNinos.map((edad) => edad >= 12);
  const todosLosNinos = edadesNinos.map(() => true);
  const bebesIncluidos = bebesComenMenu ? bebes : 0;

  return {
    comidaLaborable: {
      adultos,
      ninos: ninosLaborables,
      bebes: bebesIncluidos,
    },
    comidaFinSemana: {
      adultos,
      ninos: todosLosNinos,
      bebes: bebesIncluidos,
    },
    cena: {
      adultos,
      ninos: todosLosNinos,
      bebes: bebesIncluidos,
    },
  };
}

function normalizarConfiguracionComensales(
  valor: unknown,
  alternativa: ConfiguracionComensales,
  adultosFamilia: number,
  cantidadNinos: number,
  bebesFamilia: number,
  bebesComenMenu: boolean,
): ConfiguracionComensales {
  const parcial =
    typeof valor === 'object' && valor !== null
      ? valor as Partial<ConfiguracionComensales>
      : {};
  const seleccionNinos = Array.isArray(parcial.ninos)
    ? parcial.ninos
    : alternativa.ninos;

  return {
    adultos: limitarEntero(
      parcial.adultos,
      alternativa.adultos,
      adultosFamilia,
    ),
    ninos: Array.from({ length: cantidadNinos }, (_, indice) =>
      typeof seleccionNinos[indice] === 'boolean'
        ? seleccionNinos[indice]
        : alternativa.ninos[indice] ?? false,
    ),
    bebes: bebesComenMenu
      ? limitarEntero(parcial.bebes, alternativa.bebes, bebesFamilia)
      : 0,
  };
}

function normalizarPlanComensales(
  valor: unknown,
  alternativa: PlanComensales,
  adultos: number,
  cantidadNinos: number,
  bebes: number,
  bebesComenMenu: boolean,
): PlanComensales {
  const parcial =
    typeof valor === 'object' && valor !== null
      ? valor as Partial<PlanComensales>
      : {};
  const normalizar = (
    clave: keyof PlanComensales,
  ): ConfiguracionComensales =>
    normalizarConfiguracionComensales(
      parcial[clave],
      alternativa[clave],
      adultos,
      cantidadNinos,
      bebes,
      bebesComenMenu,
    );

  return {
    comidaLaborable: normalizar('comidaLaborable'),
    comidaFinSemana: normalizar('comidaFinSemana'),
    cena: normalizar('cena'),
  };
}

export function normalizarPerfil(valor: unknown): PerfilFamiliar {
  if (typeof valor !== 'object' || valor === null) {
    return normalizarPerfil(perfilInicial);
  }

  const parcial = valor as Partial<PerfilFamiliar>;
  const adultos = Math.max(1, Math.round(numeroSeguro(parcial.adultos, 2)));
  const ninos = Math.round(numeroSeguro(parcial.ninos, 2));
  const bebes = Math.round(numeroSeguro(parcial.bebes, 1));
  const edadesNinos = ajustarEdades(parcial.edadesNinos, ninos);
  const bebesComenMenu =
    typeof parcial.bebesComenMenu === 'boolean'
      ? parcial.bebesComenMenu
      : false;
  const planPredeterminado = crearPlanComensalesPredeterminado(
    adultos,
    edadesNinos,
    bebes,
    bebesComenMenu,
  );

  return {
    nombre:
      typeof parcial.nombre === 'string' && parcial.nombre.trim()
        ? parcial.nombre.trim()
        : perfilInicial.nombre,
    adultos,
    ninos,
    edadesNinos,
    bebes,
    bebesComenMenu,
    comensales: normalizarPlanComensales(
      parcial.comensales,
      planPredeterminado,
      adultos,
      ninos,
      bebes,
      bebesComenMenu,
    ),
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

function esFinDeSemana(dia: string): boolean {
  const normalizado = dia
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  return normalizado === 'sabado' || normalizado === 'domingo';
}

export function obtenerConfiguracionComensales(
  perfil: PerfilFamiliar,
  momento: MomentoComida,
  dia: string,
): ConfiguracionComensales {
  if (momento === 'cena') return perfil.comensales.cena;
  return esFinDeSemana(dia)
    ? perfil.comensales.comidaFinSemana
    : perfil.comensales.comidaLaborable;
}

export function crearPerfilParaMomento(
  perfil: PerfilFamiliar,
  momento: MomentoComida,
  dia: string,
): PerfilFamiliar {
  const configuracion = obtenerConfiguracionComensales(perfil, momento, dia);
  const edadesNinos = perfil.edadesNinos.filter(
    (_, indice) => configuracion.ninos[indice] === true,
  );

  return {
    ...perfil,
    adultos: configuracion.adultos,
    ninos: edadesNinos.length,
    edadesNinos,
    bebes: configuracion.bebes,
    bebesComenMenu: perfil.bebesComenMenu && configuracion.bebes > 0,
  };
}

export function calcularComensalesMomento(
  perfil: PerfilFamiliar,
  momento: MomentoComida,
  dia: string,
): number {
  return calcularComensales(crearPerfilParaMomento(perfil, momento, dia));
}

export function calcularRacionesMomento(
  perfil: PerfilFamiliar,
  momento: MomentoComida,
  dia: string,
): number {
  return calcularRacionesEquivalentes(
    crearPerfilParaMomento(perfil, momento, dia),
  );
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
