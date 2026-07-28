import {
  recetas as recetasIniciales,
  type Ingrediente,
  type Receta,
} from '../data/Recetas';
import type { DiaMenu } from '../data/Menusemanal';
import {
  normalizarMenu,
  recalcularPreparacionesPlan,
  renombrarPlatoEnLista,
} from './menu';
import { menuSemanal } from '../data/Menusemanal';
import { normalizarPlanMensual } from './planMensual';
import { cargarPerfil, type PerfilFamiliar } from './perfil';
import { ajustarRecetasAlPerfil } from './porciones';
import {
  aplicarConfiguracionPostresAlPlan,
  crearConfiguracionPostresDesdeRecetas,
  guardarConfiguracionPostres,
  quitarRecetaPostreConfigurada,
  renombrarRecetaPostreConfigurada,
} from './postres';

const CLAVE_RECETAS = 'pfi-recetas';
const CLAVE_MENU = 'pfi-menu';
const CLAVE_PLAN_MENSUAL = 'pfi-menu-mensual-v1';
const CLAVE_SEMANA_ACTIVA = 'pfi-semana-activa';
const CLAVE_MIGRACION_PORCIONES = 'pfi-migracion-porciones-v090';
const CLAVE_MIGRACION_RECETAS_V095 = 'pfi-migracion-recetas-v095';
const CLAVE_MIGRACION_POSTRES_V0910 = 'pfi-migracion-postres-v0910';
const CLAVE_MIGRACION_POSTRES_V0911 = 'pfi-migracion-postres-v0911';
const CLAVE_FIRMA_POSTRES_V0913 = 'pfi-firma-postres-recetario-v0913';
const CLAVE_MIGRACION_POSTRES_V0912 = 'pfi-migracion-postres-v0912';
const CLAVE_MIGRACION_POSTRES_V0913 = 'pfi-migracion-postres-v0913';

export const EVENTO_RECETAS = 'pfi-recetas-actualizadas';

function copiarIngrediente(ingrediente: Ingrediente): Ingrediente {
  return {
    nombre: ingrediente.nombre,
    cantidad: ingrediente.cantidad,
    unidad: ingrediente.unidad,
    seccion: ingrediente.seccion,
    ajusteAutomatico: ingrediente.ajusteAutomatico,
  };
}

function copiarReceta(receta: Receta): Receta {
  return {
    nombre: receta.nombre,
    categoria: receta.categoria,
    tipo: receta.tipo ?? (esCategoriaPostre(receta.categoria) ? 'postre' : 'plato'),
    ingredientes: receta.ingredientes.map(copiarIngrediente),
  };
}

function normalizarTexto(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function esCategoriaPostre(categoria: string): boolean {
  return normalizarTexto(categoria).includes('postre');
}

export function esRecetaPostre(receta: Pick<Receta, 'categoria' | 'tipo'>): boolean {
  return receta.tipo === 'postre' || esCategoriaPostre(receta.categoria);
}

function esIngredienteValido(valor: unknown): valor is Ingrediente {
  if (typeof valor !== 'object' || valor === null) return false;

  const ingrediente = valor as Partial<Ingrediente>;

  return (
    typeof ingrediente.nombre === 'string' &&
    ingrediente.nombre.trim().length > 0 &&
    typeof ingrediente.cantidad === 'number' &&
    Number.isFinite(ingrediente.cantidad) &&
    ingrediente.cantidad > 0 &&
    typeof ingrediente.unidad === 'string' &&
    ingrediente.unidad.trim().length > 0 &&
    typeof ingrediente.seccion === 'string' &&
    ingrediente.seccion.trim().length > 0 &&
    (ingrediente.ajusteAutomatico === undefined ||
      typeof ingrediente.ajusteAutomatico === 'boolean')
  );
}

function esRecetaValida(valor: unknown): valor is Receta {
  if (typeof valor !== 'object' || valor === null) return false;

  const receta = valor as Partial<Receta>;

  return (
    typeof receta.nombre === 'string' &&
    receta.nombre.trim().length > 0 &&
    typeof receta.categoria === 'string' &&
    receta.categoria.trim().length > 0 &&
    (receta.tipo === undefined || receta.tipo === 'plato' || receta.tipo === 'postre') &&
    Array.isArray(receta.ingredientes) &&
    receta.ingredientes.length > 0 &&
    receta.ingredientes.every(esIngredienteValido)
  );
}

function seleccionarIngredientes(
  receta: Receta,
  nombres: string[],
  factor = 1,
): Ingrediente[] {
  const seleccionados = new Set(nombres);

  return receta.ingredientes
    .filter((ingrediente) => seleccionados.has(ingrediente.nombre))
    .map((ingrediente) => ({
      ...copiarIngrediente(ingrediente),
      cantidad: ingrediente.cantidad * factor,
    }));
}

function excluirIngredientes(
  receta: Receta,
  nombres: string[],
): Ingrediente[] {
  const excluidos = new Set(nombres);

  return receta.ingredientes
    .filter((ingrediente) => !excluidos.has(ingrediente.nombre))
    .map(copiarIngrediente);
}

function crearParte(
  nombre: string,
  categoria: string,
  ingredientes: Ingrediente[],
): Receta {
  return {
    nombre,
    categoria,
    tipo: 'plato',
    ingredientes,
  };
}

function ingredientesPizzaCompartidos(
  receta: Receta,
): Ingrediente[] {
  return seleccionarIngredientes(
    receta,
    [
      'Bases de pizza',
      'Tomate para pizza',
      'Mozzarella rallada',
      'Queso rallado',
    ],
    0.5,
  );
}

function dividirRecetaCompuesta(receta: Receta): Receta[] {
  switch (receta.nombre) {
    case 'Lomo + ensalada':
      return [
        crearParte(
          'Lomo',
          'Carne',
          seleccionarIngredientes(receta, ['Lomo']),
        ),
        crearParte(
          'Ensalada',
          'Ensaladas',
          excluirIngredientes(receta, ['Lomo']),
        ),
      ];

    case 'Pollo al horno + patatas':
      return [
        crearParte(
          'Pollo al horno',
          'Pollo',
          seleccionarIngredientes(receta, ['Pollo entero']),
        ),
        crearParte(
          'Patatas',
          'Guarniciones',
          seleccionarIngredientes(receta, ['Patatas']),
        ),
      ];

    case 'Crema de calabacín + tortilla francesa':
      return [
        crearParte(
          'Crema de calabacín',
          'Cremas',
          excluirIngredientes(receta, ['Huevos']),
        ),
        crearParte(
          'Tortilla francesa',
          'Huevos',
          seleccionarIngredientes(receta, ['Huevos']),
        ),
      ];

    case 'Crema de verduras + tortilla de patata':
      return [
        crearParte(
          'Crema de verduras',
          'Cremas',
          excluirIngredientes(receta, ['Patatas', 'Huevos']),
        ),
        crearParte(
          'Tortilla de patata',
          'Huevos',
          seleccionarIngredientes(receta, ['Patatas', 'Huevos']),
        ),
      ];

    case 'Crema de calabaza + tortilla francesa':
      return [
        crearParte(
          'Crema de calabaza',
          'Cremas',
          excluirIngredientes(receta, ['Huevos']),
        ),
        crearParte(
          'Tortilla francesa',
          'Huevos',
          seleccionarIngredientes(receta, ['Huevos']),
        ),
      ];

    case 'Fajitas + nachos + guacamole':
      return [
        crearParte(
          'Fajitas',
          'Pollo',
          excluirIngredientes(receta, ['Nachos', 'Guacamole']),
        ),
        crearParte(
          'Nachos',
          'Aperitivos',
          seleccionarIngredientes(receta, ['Nachos']),
        ),
        crearParte(
          'Guacamole',
          'Salsas',
          seleccionarIngredientes(receta, ['Guacamole']),
        ),
      ];

    case 'Garbanzos fritos + arroz':
      return [
        crearParte(
          'Garbanzos fritos',
          'Legumbres',
          excluirIngredientes(receta, ['Arroz']),
        ),
        crearParte(
          'Arroz blanco',
          'Guarniciones',
          seleccionarIngredientes(receta, ['Arroz']),
        ),
      ];

    case 'Filete de ternera + patatas':
      return [
        crearParte(
          'Filete de ternera',
          'Carne',
          seleccionarIngredientes(receta, ['Filetes de ternera']),
        ),
        crearParte(
          'Patatas',
          'Guarniciones',
          seleccionarIngredientes(receta, ['Patatas']),
        ),
      ];

    case 'Pechugas de pavo + ensalada':
      return [
        crearParte(
          'Pechugas de pavo',
          'Carne',
          seleccionarIngredientes(
            receta,
            ['Pechugas de pavo fileteadas'],
          ),
        ),
        crearParte(
          'Ensalada',
          'Ensaladas',
          excluirIngredientes(
            receta,
            ['Pechugas de pavo fileteadas'],
          ),
        ),
      ];

    case 'Pechugas de pavo + patatas':
      return [
        crearParte(
          'Pechugas de pavo',
          'Carne',
          seleccionarIngredientes(
            receta,
            ['Pechugas de pavo fileteadas'],
          ),
        ),
        crearParte(
          'Patatas',
          'Guarniciones',
          seleccionarIngredientes(receta, ['Patatas']),
        ),
      ];

    case 'Pechugas de pollo + arroz':
      return [
        crearParte(
          'Pechugas de pollo',
          'Pollo',
          seleccionarIngredientes(receta, ['Pechugas de pollo']),
        ),
        crearParte(
          'Arroz blanco',
          'Guarniciones',
          seleccionarIngredientes(receta, ['Arroz']),
        ),
      ];

    case 'Pizza jamón y queso + BBQ': {
      const compartidos = ingredientesPizzaCompartidos(receta);

      return [
        crearParte('Pizza jamón y queso', 'Pizza', [
          ...compartidos.map(copiarIngrediente),
          ...seleccionarIngredientes(receta, ['Jamón cocido']),
        ]),
        crearParte('Pizza BBQ', 'Pizza', [
          ...compartidos.map(copiarIngrediente),
          ...seleccionarIngredientes(receta, [
            'Bacon',
            'Carne picada',
            'Salsa BBQ',
          ]),
        ]),
      ];
    }

    case 'Pizza BBQ + cuatro quesos': {
      const compartidos = ingredientesPizzaCompartidos(receta);

      return [
        crearParte('Pizza BBQ', 'Pizza', [
          ...compartidos.map(copiarIngrediente),
          ...seleccionarIngredientes(receta, [
            'Bacon',
            'Carne picada',
            'Salsa BBQ',
          ]),
        ]),
        crearParte('Pizza 4 quesos', 'Pizza', [
          ...compartidos.map(copiarIngrediente),
          ...seleccionarIngredientes(receta, [
            'Mezcla cuatro quesos',
            'Queso roquefort',
          ]),
        ]),
      ];
    }

    case 'Salmón + arroz':
      return [
        crearParte(
          'Salmón',
          'Pescado',
          seleccionarIngredientes(receta, ['Salmón']),
        ),
        crearParte(
          'Arroz blanco',
          'Guarniciones',
          seleccionarIngredientes(receta, ['Arroz']),
        ),
      ];

    case 'Salmón + patatas':
      return [
        crearParte(
          'Salmón',
          'Pescado',
          seleccionarIngredientes(receta, ['Salmón']),
        ),
        crearParte(
          'Patatas',
          'Guarniciones',
          seleccionarIngredientes(receta, ['Patatas']),
        ),
      ];

    case 'Lubina + patatas':
      return [
        crearParte(
          'Lubina',
          'Pescado',
          seleccionarIngredientes(receta, ['Lubina']),
        ),
        crearParte(
          'Patatas',
          'Guarniciones',
          seleccionarIngredientes(receta, ['Patatas']),
        ),
      ];

    case 'Dorada + patatas':
      return [
        crearParte(
          'Dorada',
          'Pescado',
          seleccionarIngredientes(receta, ['Dorada']),
        ),
        crearParte(
          'Patatas',
          'Guarniciones',
          seleccionarIngredientes(receta, ['Patatas']),
        ),
      ];

    case 'Bacalao + patatas':
      return [
        crearParte(
          'Bacalao',
          'Pescado',
          seleccionarIngredientes(receta, ['Bacalao']),
        ),
        crearParte(
          'Patatas',
          'Guarniciones',
          seleccionarIngredientes(receta, ['Patatas']),
        ),
      ];

    default:
      return [copiarReceta(receta)];
  }
}

function normalizarRecetas(recetas: Receta[]): Receta[] {
  const resultado: Receta[] = [];
  const nombres = new Set<string>();

  recetas
    .flatMap(dividirRecetaCompuesta)
    .filter((receta) => receta.ingredientes.length > 0)
    .forEach((receta) => {
      const clave = receta.nombre
        .trim()
        .toLocaleLowerCase('es');

      if (nombres.has(clave)) return;

      nombres.add(clave);
      resultado.push(copiarReceta(receta));
    });

  return resultado;
}

function aplicarMigracionPorciones(recetas: Receta[]): Receta[] {
  const migrada = localStorage.getItem(CLAVE_MIGRACION_PORCIONES);
  if (migrada === '1') return recetas;

  const ajustadas = ajustarRecetasAlPerfil(recetas, cargarPerfil(), true);
  localStorage.setItem(CLAVE_MIGRACION_PORCIONES, '1');
  localStorage.setItem(CLAVE_RECETAS, JSON.stringify(ajustadas));
  return ajustadas;
}

function aplicarMigracionRecetasV095(recetas: Receta[]): Receta[] {
  if (localStorage.getItem(CLAVE_MIGRACION_RECETAS_V095) === '1') {
    return recetas;
  }

  const nombres = new Set(
    recetas.map((receta) => receta.nombre.trim().toLocaleLowerCase('es')),
  );
  const nuevas = normalizarRecetas(recetasIniciales)
    .filter((receta) => receta.nombre === 'Kebab')
    .filter(
      (receta) => !nombres.has(receta.nombre.trim().toLocaleLowerCase('es')),
    );
  const nuevasAjustadas = ajustarRecetasAlPerfil(
    nuevas,
    cargarPerfil(),
    true,
  );
  const resultado = [...recetas, ...nuevasAjustadas];

  localStorage.setItem(CLAVE_MIGRACION_RECETAS_V095, '1');
  localStorage.setItem(CLAVE_RECETAS, JSON.stringify(resultado));
  return resultado;
}


function aplicarMigracionPostresV0910(recetas: Receta[]): Receta[] {
  if (localStorage.getItem(CLAVE_MIGRACION_POSTRES_V0910) === '1') {
    return recetas;
  }

  const nombres = new Set(
    recetas.map((receta) => normalizarTexto(receta.nombre)),
  );
  const postresIniciales = normalizarRecetas(recetasIniciales)
    .filter(esRecetaPostre)
    .filter((receta) => !nombres.has(normalizarTexto(receta.nombre)));
  const postresAjustados = ajustarRecetasAlPerfil(
    postresIniciales,
    cargarPerfil(),
    false,
  );
  const resultado = [
    ...recetas.map((receta) => ({
      ...receta,
      tipo: esRecetaPostre(receta) ? 'postre' as const : 'plato' as const,
    })),
    ...postresAjustados,
  ];

  localStorage.setItem(CLAVE_MIGRACION_POSTRES_V0910, '1');
  localStorage.setItem(CLAVE_RECETAS, JSON.stringify(resultado));
  return resultado;
}

export function cargarRecetas(): Receta[] {
  try {
    const guardadas = localStorage.getItem(CLAVE_RECETAS);
    const origen = guardadas
      ? (JSON.parse(guardadas) as unknown)
      : recetasIniciales;

    if (!Array.isArray(origen) || !origen.every(esRecetaValida)) {
      return aplicarMigracionPostresV0910(
        aplicarMigracionRecetasV095(
          aplicarMigracionPorciones(normalizarRecetas(recetasIniciales)),
        ),
      );
    }

    const normalizadas = normalizarRecetas(origen);

    if (guardadas) {
      const serializadas = JSON.stringify(normalizadas);
      if (serializadas !== guardadas) {
        localStorage.setItem(CLAVE_RECETAS, serializadas);
      }
    }

    return aplicarMigracionPostresV0910(
      aplicarMigracionRecetasV095(
        aplicarMigracionPorciones(normalizadas),
      ),
    );
  } catch {
    return aplicarMigracionPostresV0910(
      aplicarMigracionRecetasV095(
        aplicarMigracionPorciones(normalizarRecetas(recetasIniciales)),
      ),
    );
  }
}

export function guardarRecetas(nuevasRecetas: Receta[]): void {
  const recetasLimpias = normalizarRecetas(
    nuevasRecetas.map((receta) => ({
      nombre: receta.nombre.trim(),
      categoria: receta.categoria.trim(),
      tipo: receta.tipo ?? (esCategoriaPostre(receta.categoria) ? 'postre' : 'plato'),
      ingredientes: receta.ingredientes.map((ingrediente) => ({
        nombre: ingrediente.nombre.trim(),
        cantidad: ingrediente.cantidad,
        unidad: ingrediente.unidad.trim(),
        seccion: ingrediente.seccion.trim(),
        ajusteAutomatico: ingrediente.ajusteAutomatico === true,
      })),
    })),
  );

  localStorage.setItem(CLAVE_RECETAS, JSON.stringify(recetasLimpias));
  sincronizarPostresRecetarioConPlan(recetasLimpias);
  window.dispatchEvent(new CustomEvent(EVENTO_RECETAS));
}

function sincronizarPostresRecetarioConPlan(recetasActuales: Receta[]): void {
  const recetasPostre = recetasActuales.filter(esRecetaPostre);
  const nombresPostres = recetasPostre.map((receta) => receta.nombre);
  const configuracion = crearConfiguracionPostresDesdeRecetas(recetasPostre);
  const firma = JSON.stringify({ nombresPostres, configuracion });

  if (localStorage.getItem(CLAVE_FIRMA_POSTRES_V0913) === firma) return;

  localStorage.setItem(CLAVE_FIRMA_POSTRES_V0913, firma);
  guardarConfiguracionPostres(configuracion);

  try {
    const planGuardado = localStorage.getItem(CLAVE_PLAN_MENSUAL);
    if (!planGuardado) return;

    const permitidos = new Set([...nombresPostres, 'Sin postre']);
    const planBase = normalizarPlanMensual(
      JSON.parse(planGuardado) as unknown,
    ).map((semana) => ({
      ...semana,
      menu: semana.menu.map((dia) => ({
        ...dia,
        postreComidaManual:
          dia.postreComidaManual === true &&
          permitidos.has(dia.postreComidaReceta ?? '')
            ? true
            : false,
        postreCenaManual:
          dia.postreCenaManual === true &&
          permitidos.has(dia.postreCenaReceta ?? '')
            ? true
            : false,
      })),
    }));
    const plan = aplicarConfiguracionPostresAlPlan(
      planBase,
      configuracion,
      { respetarEdicionesManuales: true },
    );
    const indiceGuardado = Number(localStorage.getItem(CLAVE_SEMANA_ACTIVA));
    const indice = Number.isInteger(indiceGuardado)
      ? Math.max(0, Math.min(indiceGuardado, plan.length - 1))
      : 0;

    localStorage.setItem(CLAVE_PLAN_MENSUAL, JSON.stringify(plan));
    localStorage.setItem(CLAVE_MENU, JSON.stringify(plan[indice]?.menu ?? []));
    window.dispatchEvent(new CustomEvent('pfi-menu-actualizado'));
  } catch {
    // El menú conservará su última versión válida si el guardado está dañado.
  }
}


export function recalcularRecetasParaPerfil(
  perfil: PerfilFamiliar,
  activarAutomatico = false,
): Receta[] {
  const actuales = cargarRecetas();
  const ajustadas = ajustarRecetasAlPerfil(
    actuales,
    perfil,
    activarAutomatico,
  );
  localStorage.setItem(CLAVE_RECETAS, JSON.stringify(ajustadas));
  localStorage.setItem(CLAVE_MIGRACION_PORCIONES, '1');
  window.dispatchEvent(new CustomEvent(EVENTO_RECETAS));
  return ajustadas;
}

export function restaurarRecetasOriginales(): void {
  localStorage.removeItem(CLAVE_RECETAS);
  localStorage.removeItem(CLAVE_MENU);
  localStorage.removeItem(CLAVE_PLAN_MENSUAL);
  localStorage.removeItem(CLAVE_SEMANA_ACTIVA);
  localStorage.removeItem(CLAVE_MIGRACION_PORCIONES);
  localStorage.removeItem(CLAVE_MIGRACION_RECETAS_V095);
  localStorage.removeItem(CLAVE_MIGRACION_POSTRES_V0910);
  localStorage.removeItem(CLAVE_MIGRACION_POSTRES_V0911);
  localStorage.removeItem(CLAVE_FIRMA_POSTRES_V0913);
  localStorage.removeItem(CLAVE_MIGRACION_POSTRES_V0912);
  localStorage.removeItem(CLAVE_MIGRACION_POSTRES_V0913);
  window.dispatchEvent(new CustomEvent(EVENTO_RECETAS));
  window.dispatchEvent(new CustomEvent('pfi-menu-actualizado'));
}

export function actualizarNombreRecetaEnMenu(
  nombreAnterior: string,
  nombreNuevo: string,
): void {
  if (nombreAnterior === nombreNuevo) return;
  renombrarRecetaPostreConfigurada(nombreAnterior, nombreNuevo);

  try {
    const planGuardado = localStorage.getItem(CLAVE_PLAN_MENSUAL);

    if (planGuardado) {
      const plan = normalizarPlanMensual(
        JSON.parse(planGuardado) as unknown,
      ).map((semana) => ({
        ...semana,
        menu: semana.menu.map((dia) => ({
          ...dia,
          comida: renombrarPlatoEnLista(
            dia.comida,
            nombreAnterior,
            nombreNuevo,
          ),
          cena: renombrarPlatoEnLista(
            dia.cena,
            nombreAnterior,
            nombreNuevo,
          ),
          postreComidaReceta:
            dia.postreComidaReceta === nombreAnterior
              ? nombreNuevo
              : dia.postreComidaReceta,
          postreCenaReceta:
            dia.postreCenaReceta === nombreAnterior
              ? nombreNuevo
              : dia.postreCenaReceta,
        })),
      }));
      const indiceGuardado = Number(
        localStorage.getItem(CLAVE_SEMANA_ACTIVA),
      );
      const indice = Number.isInteger(indiceGuardado)
        ? Math.max(0, Math.min(indiceGuardado, plan.length - 1))
        : 0;

      localStorage.setItem(CLAVE_PLAN_MENSUAL, JSON.stringify(plan));
      localStorage.setItem(CLAVE_MENU, JSON.stringify(plan[indice].menu));
      window.dispatchEvent(new CustomEvent('pfi-menu-actualizado'));
      return;
    }

    const menuGuardado = localStorage.getItem(CLAVE_MENU);
    const menu = menuGuardado
      ? normalizarMenu(
          JSON.parse(menuGuardado) as unknown,
          menuSemanal,
        )
      : normalizarMenu(menuSemanal, menuSemanal);

    const actualizado: DiaMenu[] = menu.map((dia) => ({
      ...dia,
      comida: renombrarPlatoEnLista(
        dia.comida,
        nombreAnterior,
        nombreNuevo,
      ),
      cena: renombrarPlatoEnLista(
        dia.cena,
        nombreAnterior,
        nombreNuevo,
      ),
      postreComidaReceta:
        dia.postreComidaReceta === nombreAnterior
          ? nombreNuevo
          : dia.postreComidaReceta,
      postreCenaReceta:
        dia.postreCenaReceta === nombreAnterior
          ? nombreNuevo
          : dia.postreCenaReceta,
    }));

    localStorage.setItem(CLAVE_MENU, JSON.stringify(actualizado));
    window.dispatchEvent(new CustomEvent('pfi-menu-actualizado'));
  } catch {
    // useMenu recuperará un plan válido si el guardado no es correcto.
  }
}

export function eliminarRecetaDelMenu(nombreReceta: string): void {
  quitarRecetaPostreConfigurada(nombreReceta);

  try {
    const planGuardado = localStorage.getItem(CLAVE_PLAN_MENSUAL);

    if (planGuardado) {
      const planBase = normalizarPlanMensual(
        JSON.parse(planGuardado) as unknown,
      ).map((semana) => ({
        ...semana,
        menu: semana.menu.map((dia) => ({
          ...dia,
          comida: dia.comida.filter((plato) => plato !== nombreReceta),
          cena: dia.cena.filter((plato) => plato !== nombreReceta),
          postreComidaReceta:
            dia.postreComidaReceta === nombreReceta
              ? 'Sin postre'
              : dia.postreComidaReceta,
          postreCenaReceta:
            dia.postreCenaReceta === nombreReceta
              ? 'Sin postre'
              : dia.postreCenaReceta,
        })),
      }));
      const plan = recalcularPreparacionesPlan(planBase);
      const indiceGuardado = Number(localStorage.getItem(CLAVE_SEMANA_ACTIVA));
      const indice = Number.isInteger(indiceGuardado)
        ? Math.max(0, Math.min(indiceGuardado, plan.length - 1))
        : 0;

      localStorage.setItem(CLAVE_PLAN_MENSUAL, JSON.stringify(plan));
      localStorage.setItem(CLAVE_MENU, JSON.stringify(plan[indice]?.menu ?? []));
      window.dispatchEvent(new CustomEvent('pfi-menu-actualizado'));
      return;
    }

    const menuGuardado = localStorage.getItem(CLAVE_MENU);
    const menu = menuGuardado
      ? normalizarMenu(JSON.parse(menuGuardado) as unknown, menuSemanal)
      : normalizarMenu(menuSemanal, menuSemanal);
    const actualizado = menu.map((dia) => ({
      ...dia,
      comida: dia.comida.filter((plato) => plato !== nombreReceta),
      cena: dia.cena.filter((plato) => plato !== nombreReceta),
      postreComidaReceta:
        dia.postreComidaReceta === nombreReceta
          ? 'Sin postre'
          : dia.postreComidaReceta,
      postreCenaReceta:
        dia.postreCenaReceta === nombreReceta
          ? 'Sin postre'
          : dia.postreCenaReceta,
    }));

    localStorage.setItem(CLAVE_MENU, JSON.stringify(actualizado));
    window.dispatchEvent(new CustomEvent('pfi-menu-actualizado'));
  } catch {
    // useMenu recuperará un plan válido si el guardado no es correcto.
  }
}
