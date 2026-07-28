import type { DiaMenu } from '../data/Menusemanal';

export type MomentoMenu = 'comida' | 'cena';
export type ResultadoComida = 'gusto' | 'sobro' | 'falto' | 'no_gusto';

export type RegistroMenuAprendido = {
  dia: string;
  momento: MomentoMenu;
  platos: string[];
  fecha: string;
};

export type ValoracionComidaAprendida = {
  dia: string;
  momento: MomentoMenu;
  platos: string[];
  resultado: ResultadoComida;
  fecha: string;
};

export type AjustePorcionAprendido = {
  receta: string;
  ingrediente: string;
  unidad: string;
  factor: number;
  muestras: number;
  actualizadoEn: string;
};

export type AjusteRecetaAprendido = {
  receta: string;
  factor: number;
  muestras: number;
  sobras: number;
  faltas: number;
  actualizadoEn: string;
};

type EstadoAprendizaje = {
  version: 2;
  menu: RegistroMenuAprendido[];
  valoraciones: ValoracionComidaAprendida[];
  porciones: Record<string, AjustePorcionAprendido>;
  recetas: Record<string, AjusteRecetaAprendido>;
};

export type SugerenciaMenuAprendida = {
  platos: string[];
  puntuacion: number;
  repeticiones: number;
  explicacion: string;
  confianza: 'inicial' | 'media' | 'alta';
};

export type SugerenciaComplemento = {
  plato: string;
  puntuacion: number;
  explicacion: string;
  origen: 'aprendido' | 'contextual';
};

export type ResumenAprendizaje = {
  eleccionesMenu: number;
  combinacionesMenu: number;
  valoraciones: number;
  ajustesPorciones: number;
  ajustesRecetas: number;
};

const CLAVE_APRENDIZAJE = 'pfi-aprendizaje-v1';
export const EVENTO_APRENDIZAJE = 'pfi-aprendizaje-actualizado';
const MAX_REGISTROS_MENU = 260;
const MAX_VALORACIONES = 260;
const OPCIONES_ESPECIALES = new Set([
  'comemos fuera',
  'cola cao y galletas',
]);

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function clavePorcion(receta: string, ingrediente: string): string {
  return `${normalizar(receta)}::${normalizar(ingrediente)}`;
}

function claveReceta(receta: string): string {
  return normalizar(receta);
}

function claveCombinacion(platos: string[]): string {
  return [...platos]
    .map((plato) => plato.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'es'))
    .join('||');
}

function estadoVacio(): EstadoAprendizaje {
  return {
    version: 2,
    menu: [],
    valoraciones: [],
    porciones: {},
    recetas: {},
  };
}

function esRegistroMenu(valor: unknown): valor is RegistroMenuAprendido {
  if (typeof valor !== 'object' || valor === null) return false;
  const registro = valor as Partial<RegistroMenuAprendido>;
  return (
    typeof registro.dia === 'string' &&
    (registro.momento === 'comida' || registro.momento === 'cena') &&
    Array.isArray(registro.platos) &&
    registro.platos.every((plato) => typeof plato === 'string') &&
    typeof registro.fecha === 'string'
  );
}

function esResultadoComida(valor: unknown): valor is ResultadoComida {
  return (
    valor === 'gusto' ||
    valor === 'sobro' ||
    valor === 'falto' ||
    valor === 'no_gusto'
  );
}

function esValoracion(
  valor: unknown,
): valor is ValoracionComidaAprendida {
  if (typeof valor !== 'object' || valor === null) return false;
  const registro = valor as Partial<ValoracionComidaAprendida>;
  return (
    typeof registro.dia === 'string' &&
    (registro.momento === 'comida' || registro.momento === 'cena') &&
    Array.isArray(registro.platos) &&
    registro.platos.every((plato) => typeof plato === 'string') &&
    esResultadoComida(registro.resultado) &&
    typeof registro.fecha === 'string'
  );
}

function cargarEstado(): EstadoAprendizaje {
  try {
    const guardado = localStorage.getItem(CLAVE_APRENDIZAJE);
    if (!guardado) return estadoVacio();

    const valor = JSON.parse(guardado) as Partial<EstadoAprendizaje>;
    const menu = Array.isArray(valor.menu)
      ? valor.menu.filter(esRegistroMenu)
      : [];
    const valoraciones = Array.isArray(valor.valoraciones)
      ? valor.valoraciones.filter(esValoracion)
      : [];
    const porciones =
      typeof valor.porciones === 'object' && valor.porciones !== null
        ? (valor.porciones as Record<string, AjustePorcionAprendido>)
        : {};
    const recetas =
      typeof valor.recetas === 'object' && valor.recetas !== null
        ? (valor.recetas as Record<string, AjusteRecetaAprendido>)
        : {};

    return {
      version: 2,
      menu: menu.slice(-MAX_REGISTROS_MENU),
      valoraciones: valoraciones.slice(-MAX_VALORACIONES),
      porciones,
      recetas,
    };
  } catch {
    return estadoVacio();
  }
}

function guardarEstado(estado: EstadoAprendizaje): void {
  localStorage.setItem(CLAVE_APRENDIZAJE, JSON.stringify(estado));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_APRENDIZAJE));
  }
}

function limpiarPlatos(platos: string[]): string[] {
  return Array.from(
    new Set(platos.map((plato) => plato.trim()).filter(Boolean)),
  );
}

function limitarFactorIngrediente(factor: number): number {
  return Math.min(2.5, Math.max(0.4, factor));
}

function limitarFactorReceta(factor: number): number {
  return Math.min(1.35, Math.max(0.75, factor));
}

function puntuacionResultado(resultado: ResultadoComida): number {
  switch (resultado) {
    case 'gusto':
      return 5;
    case 'no_gusto':
      return -8;
    case 'falto':
      return 1.25;
    case 'sobro':
      return 0.5;
  }
}

function etiquetaResultado(resultado: ResultadoComida): string {
  switch (resultado) {
    case 'gusto':
      return 'Gustó';
    case 'sobro':
      return 'Sobró';
    case 'falto':
      return 'Faltó';
    case 'no_gusto':
      return 'No gustó';
  }
}

function esPlatoAjustable(plato: string): boolean {
  return !OPCIONES_ESPECIALES.has(normalizar(plato));
}

export function registrarEleccionMenu(
  dia: string,
  momento: MomentoMenu,
  platos: string[],
): void {
  const limpios = limpiarPlatos(platos);
  if (limpios.length === 0) return;

  const estado = cargarEstado();
  const ahora = new Date();
  const indiceAnterior = estado.menu.findLastIndex(
    (registro) => registro.dia === dia && registro.momento === momento,
  );
  const anterior =
    indiceAnterior >= 0 ? estado.menu[indiceAnterior] : undefined;
  const diferenciaMinutos = anterior
    ? (ahora.getTime() - new Date(anterior.fecha).getTime()) / 60000
    : Number.POSITIVE_INFINITY;

  const nuevo: RegistroMenuAprendido = {
    dia,
    momento,
    platos: limpios,
    fecha: ahora.toISOString(),
  };

  const combinacionAnterior = anterior
    ? claveCombinacion(anterior.platos)
    : '';
  const combinacionNueva = claveCombinacion(limpios);
  const anteriorEsSubconjunto = anterior
    ? anterior.platos.every((plato) => limpios.includes(plato))
    : false;
  const nuevaEsSubconjunto = anterior
    ? limpios.every((plato) => anterior.platos.includes(plato))
    : false;
  const esEdicionContinua =
    combinacionAnterior === combinacionNueva ||
    anteriorEsSubconjunto ||
    nuevaEsSubconjunto;

  const mismaCombinacion = combinacionAnterior === combinacionNueva;
  const debeReemplazar =
    indiceAnterior >= 0 &&
    ((mismaCombinacion && diferenciaMinutos < 5 * 24 * 60) ||
      (!mismaCombinacion && diferenciaMinutos < 10 && esEdicionContinua));

  if (debeReemplazar) {
    estado.menu[indiceAnterior] = nuevo;
  } else {
    estado.menu.push(nuevo);
  }

  estado.menu = estado.menu.slice(-MAX_REGISTROS_MENU);
  guardarEstado(estado);
}

export function registrarMenuSemanal(menu: DiaMenu[]): void {
  menu.forEach((dia) => {
    registrarEleccionMenu(dia.dia, 'comida', dia.comida);
    registrarEleccionMenu(dia.dia, 'cena', dia.cena);
  });
}

export function registrarResultadoComida(
  dia: string,
  momento: MomentoMenu,
  platos: string[],
  resultado: ResultadoComida,
): void {
  const limpios = limpiarPlatos(platos);
  if (limpios.length === 0) return;

  const estado = cargarEstado();
  const ahora = new Date();
  const clave = claveCombinacion(limpios);

  const indiceAnterior = estado.valoraciones.findLastIndex(
    (valoracion) =>
      valoracion.dia === dia &&
      valoracion.momento === momento &&
      claveCombinacion(valoracion.platos) === clave,
  );

  const anterior =
    indiceAnterior >= 0 ? estado.valoraciones[indiceAnterior] : undefined;
  const diferenciaHoras = anterior
    ? (ahora.getTime() - new Date(anterior.fecha).getTime()) / 3600000
    : Number.POSITIVE_INFINITY;

  const nuevaValoracion: ValoracionComidaAprendida = {
    dia,
    momento,
    platos: limpios,
    resultado,
    fecha: ahora.toISOString(),
  };

  if (indiceAnterior >= 0 && diferenciaHoras < 36) {
    estado.valoraciones[indiceAnterior] = nuevaValoracion;
  } else {
    estado.valoraciones.push(nuevaValoracion);
  }

  if (resultado === 'sobro' || resultado === 'falto') {
    limpios.filter(esPlatoAjustable).forEach((plato) => {
      const clavePlato = claveReceta(plato);
      const anteriorAjuste = estado.recetas[clavePlato];
      const factorAnterior = anteriorAjuste?.factor ?? 1;
      const multiplicador = resultado === 'sobro' ? 0.95 : 1.06;
      const factor = limitarFactorReceta(factorAnterior * multiplicador);

      estado.recetas[clavePlato] = {
        receta: plato,
        factor: Math.round(factor * 1000) / 1000,
        muestras: (anteriorAjuste?.muestras ?? 0) + 1,
        sobras: (anteriorAjuste?.sobras ?? 0) + (resultado === 'sobro' ? 1 : 0),
        faltas: (anteriorAjuste?.faltas ?? 0) + (resultado === 'falto' ? 1 : 0),
        actualizadoEn: ahora.toISOString(),
      };
    });
  }

  estado.valoraciones = estado.valoraciones.slice(-MAX_VALORACIONES);
  guardarEstado(estado);
}

export function obtenerValoracionComida(
  dia: string,
  momento: MomentoMenu,
  platos: string[],
): ValoracionComidaAprendida | null {
  const clave = claveCombinacion(platos);
  if (!clave) return null;

  return (
    cargarEstado().valoraciones.findLast(
      (valoracion) =>
        valoracion.dia === dia &&
        valoracion.momento === momento &&
        claveCombinacion(valoracion.platos) === clave,
    ) ?? null
  );
}

export function obtenerFactorReceta(receta: string): AjusteRecetaAprendido | null {
  return cargarEstado().recetas[claveReceta(receta)] ?? null;
}

export function obtenerSugerenciasMenu(
  dia: string,
  momento: MomentoMenu,
  seleccionActual: string[],
  limite = 3,
): SugerenciaMenuAprendida[] {
  const estado = cargarEstado();
  const actual = claveCombinacion(seleccionActual);
  const ahora = Date.now();
  const agrupadas = new Map<
    string,
    {
      platos: string[];
      puntuacion: number;
      repeticiones: number;
      mismoDia: number;
      ultimaFecha: number;
      gustos: number;
      rechazos: number;
    }
  >();

  estado.menu.forEach((registro) => {
    if (registro.momento !== momento) return;

    const clave = claveCombinacion(registro.platos);
    if (!clave || clave === actual) return;

    const fecha = new Date(registro.fecha).getTime();
    const dias = Math.max(0, (ahora - fecha) / 86400000);
    const pesoRecencia = Math.max(0.2, 1 - dias / 150);
    const mismoDia = registro.dia === dia ? 1 : 0;
    const penalizacionRepeticion = dias < 3 ? 4.5 : dias < 7 ? 1.75 : 0;
    const anterior = agrupadas.get(clave) ?? {
      platos: registro.platos,
      puntuacion: 0,
      repeticiones: 0,
      mismoDia: 0,
      ultimaFecha: 0,
      gustos: 0,
      rechazos: 0,
    };

    anterior.repeticiones += 1;
    anterior.mismoDia += mismoDia;
    anterior.ultimaFecha = Math.max(anterior.ultimaFecha, fecha);
    anterior.puntuacion +=
      1.4 + pesoRecencia + mismoDia * 2.3 - penalizacionRepeticion;
    agrupadas.set(clave, anterior);
  });

  estado.valoraciones.forEach((valoracion) => {
    if (valoracion.momento !== momento) return;
    const clave = claveCombinacion(valoracion.platos);
    const agrupada = agrupadas.get(clave);
    if (!agrupada) return;

    agrupada.puntuacion += puntuacionResultado(valoracion.resultado);
    if (valoracion.resultado === 'gusto') agrupada.gustos += 1;
    if (valoracion.resultado === 'no_gusto') agrupada.rechazos += 1;
  });

  return [...agrupadas.values()]
    .filter((sugerencia) => sugerencia.puntuacion > -2)
    .sort((a, b) => b.puntuacion - a.puntuacion)
    .slice(0, limite)
    .map((sugerencia) => {
      const confianza =
        sugerencia.repeticiones >= 4 || sugerencia.gustos >= 2
          ? 'alta'
          : sugerencia.repeticiones >= 2 || sugerencia.gustos >= 1
            ? 'media'
            : 'inicial';
      let explicacion = `La has usado ${sugerencia.repeticiones} ${sugerencia.repeticiones === 1 ? 'vez' : 'veces'}`;

      if (sugerencia.gustos > 0) {
        explicacion = `Ha gustado ${sugerencia.gustos} ${sugerencia.gustos === 1 ? 'vez' : 'veces'} en casa`;
      } else if (sugerencia.mismoDia > 0) {
        explicacion += ` y suele encajar con ${dia}`;
      } else {
        explicacion += ` en ${momento}`;
      }

      return {
        platos: sugerencia.platos,
        puntuacion: sugerencia.puntuacion,
        repeticiones: sugerencia.repeticiones,
        explicacion,
        confianza,
      };
    });
}

const REGLAS_COMPLEMENTOS: Array<{
  coincide: RegExp;
  opciones: string[];
  motivo: string;
}> = [
  {
    coincide: /(lomo|filete|ternera|pollo|pavo|hamburgues)/,
    opciones: ['Patatas', 'Arroz blanco', 'Ensalada'],
    motivo: 'acompañamiento habitual para carne',
  },
  {
    coincide: /(salmon|lubina|dorada|bacalao|pescado)/,
    opciones: ['Arroz blanco', 'Patatas', 'Ensalada'],
    motivo: 'acompañamiento equilibrado para pescado',
  },
  {
    coincide: /(garbanzo|lenteja|alubia)/,
    opciones: ['Arroz blanco'],
    motivo: 'combinación habitual con legumbres',
  },
  {
    coincide: /(crema|pure)/,
    opciones: ['Tortilla francesa', 'Tortilla de patata'],
    motivo: 'completa una cena ligera',
  },
  {
    coincide: /(fajita)/,
    opciones: ['Nachos', 'Guacamole'],
    motivo: 'combinación habitual para fajitas',
  },
];

export function obtenerComplementosSugeridos(
  platoBase: string,
  momento: MomentoMenu,
  seleccionActual: string[],
  recetasDisponibles: string[],
  limite = 3,
): SugerenciaComplemento[] {
  const base = normalizar(platoBase);
  if (!base) return [];

  const estado = cargarEstado();
  const seleccionNormalizada = new Set(seleccionActual.map(normalizar));
  const disponibles = new Map(
    recetasDisponibles.map((receta) => [normalizar(receta), receta]),
  );
  const sugerencias = new Map<string, SugerenciaComplemento>();

  estado.menu.forEach((registro) => {
    if (registro.momento !== momento) return;
    const normalizados = registro.platos.map(normalizar);
    if (!normalizados.includes(base)) return;

    registro.platos.forEach((plato) => {
      const clave = normalizar(plato);
      if (clave === base || seleccionNormalizada.has(clave)) return;
      const exacto = disponibles.get(clave);
      if (!exacto) return;

      const anterior = sugerencias.get(clave);
      const claveRegistro = claveCombinacion(registro.platos);
      const efectoValoraciones = estado.valoraciones
        .filter(
          (valoracion) =>
            valoracion.momento === momento &&
            claveCombinacion(valoracion.platos) === claveRegistro,
        )
        .reduce(
          (total, valoracion) =>
            total + puntuacionResultado(valoracion.resultado) * 0.55,
          0,
        );
      const puntos =
        3 + (registro.dia === 'Viernes' ? 0.1 : 0) + efectoValoraciones;
      if (puntos <= 0) return;

      sugerencias.set(clave, {
        plato: exacto,
        puntuacion: (anterior?.puntuacion ?? 0) + puntos,
        explicacion:
          efectoValoraciones > 1
            ? `Ha funcionado bien junto a ${platoBase}`
            : `Lo has combinado antes con ${platoBase}`,
        origen: 'aprendido',
      });
    });
  });

  const regla = REGLAS_COMPLEMENTOS.find((candidata) =>
    candidata.coincide.test(base),
  );

  regla?.opciones.forEach((opcion, indice) => {
    const exacto = disponibles.get(normalizar(opcion));
    const clave = normalizar(opcion);
    if (!exacto || seleccionNormalizada.has(clave) || clave === base) return;
    if (sugerencias.has(clave)) return;

    sugerencias.set(clave, {
      plato: exacto,
      puntuacion: 2.4 - indice * 0.2,
      explicacion: regla.motivo,
      origen: 'contextual',
    });
  });

  return [...sugerencias.values()]
    .sort((a, b) => b.puntuacion - a.puntuacion)
    .slice(0, limite);
}

export function registrarAjustePorcion({
  receta,
  ingrediente,
  cantidadBase,
  unidadBase,
  cantidadManual,
  unidadManual,
}: {
  receta: string;
  ingrediente: string;
  cantidadBase: number;
  unidadBase: string;
  cantidadManual: number;
  unidadManual: string;
}): void {
  if (
    !Number.isFinite(cantidadBase) ||
    cantidadBase <= 0 ||
    !Number.isFinite(cantidadManual) ||
    cantidadManual <= 0 ||
    normalizar(unidadBase) !== normalizar(unidadManual)
  ) {
    return;
  }

  const factorNuevo = limitarFactorIngrediente(cantidadManual / cantidadBase);
  const estado = cargarEstado();
  const clave = clavePorcion(receta, ingrediente);
  const anterior = estado.porciones[clave];
  const muestrasAnteriores = anterior?.muestras ?? 0;
  const muestras = Math.min(20, muestrasAnteriores + 1);
  const factor = anterior
    ? limitarFactorIngrediente(
        (anterior.factor * muestrasAnteriores + factorNuevo) /
          (muestrasAnteriores + 1),
      )
    : factorNuevo;

  estado.porciones[clave] = {
    receta,
    ingrediente,
    unidad: unidadManual,
    factor: Math.round(factor * 1000) / 1000,
    muestras,
    actualizadoEn: new Date().toISOString(),
  };

  guardarEstado(estado);
}

function redondearAprendido(cantidad: number, unidad: string): number {
  const unidadNormalizada = normalizar(unidad);

  if (['g', 'gramo', 'gramos'].includes(unidadNormalizada)) {
    return Math.max(25, Math.round(cantidad / 25) * 25);
  }

  if (['kg', 'l', 'litro', 'litros'].includes(unidadNormalizada)) {
    return Math.max(0.1, Math.round(cantidad * 10) / 10);
  }

  if (
    ['ud', 'unidad', 'unidades', 'huevo', 'huevos', 'lata', 'latas'].includes(
      unidadNormalizada,
    )
  ) {
    return Math.max(1, Math.round(cantidad));
  }

  return Math.max(0.1, Math.round(cantidad * 100) / 100);
}

export function aplicarAprendizajePorcion<T extends {
  cantidad: number;
  unidad: string;
  explicacion: string;
}>(
  receta: string,
  ingrediente: string,
  sugerenciaBase: T,
): T {
  const estado = cargarEstado();
  const ajusteIngrediente = estado.porciones[clavePorcion(receta, ingrediente)];
  const ajusteReceta = estado.recetas[claveReceta(receta)];
  const factorIngrediente =
    ajusteIngrediente &&
    normalizar(ajusteIngrediente.unidad) === normalizar(sugerenciaBase.unidad)
      ? ajusteIngrediente.factor
      : 1;
  const factorReceta = ajusteReceta?.factor ?? 1;
  const factorTotal = factorIngrediente * factorReceta;

  if (Math.abs(factorTotal - 1) < 0.001) return sugerenciaBase;

  const cantidad = redondearAprendido(
    sugerenciaBase.cantidad * factorTotal,
    sugerenciaBase.unidad,
  );
  const detalles: string[] = [];

  if (Math.abs(factorIngrediente - 1) >= 0.001 && ajusteIngrediente) {
    const porcentaje = Math.round((factorIngrediente - 1) * 100);
    detalles.push(
      `correcciones manuales ${porcentaje > 0 ? '+' : ''}${porcentaje}% (${ajusteIngrediente.muestras})`,
    );
  }

  if (Math.abs(factorReceta - 1) >= 0.001 && ajusteReceta) {
    const porcentaje = Math.round((factorReceta - 1) * 100);
    detalles.push(
      `resultado real ${porcentaje > 0 ? '+' : ''}${porcentaje}% (${ajusteReceta.muestras})`,
    );
  }

  return {
    ...sugerenciaBase,
    cantidad,
    explicacion: `${sugerenciaBase.explicacion}. PFI aplica ${detalles.join(' y ')}`,
  };
}

export function obtenerResumenAprendizaje(): ResumenAprendizaje {
  const estado = cargarEstado();
  const combinaciones = new Set(
    estado.menu.map(
      (registro) =>
        `${registro.momento}::${claveCombinacion(registro.platos)}`,
    ),
  );

  return {
    eleccionesMenu: estado.menu.length,
    combinacionesMenu: combinaciones.size,
    valoraciones: estado.valoraciones.length,
    ajustesPorciones: Object.keys(estado.porciones).length,
    ajustesRecetas: Object.keys(estado.recetas).length,
  };
}

export function describirValoracion(resultado: ResultadoComida): string {
  return etiquetaResultado(resultado);
}

export function reiniciarAprendizaje(): void {
  localStorage.removeItem(CLAVE_APRENDIZAJE);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_APRENDIZAJE));
  }
}
