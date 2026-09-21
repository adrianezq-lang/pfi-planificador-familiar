import type { DiaMenu } from '../data/Menusemanal';
import type { Receta } from '../data/Recetas';
import type { ResultadoCompra } from '../motor/compra';
import type { ProductoDespensa } from './despensa';
import type { ResumenAprendizaje } from './aprendizaje';
import type { PerfilFamiliar } from './perfil';
import { cargarAsociacionesIngredientes } from './asociacionesIngredientes';
import { esRecetaPostre } from './recetas';

export type DestinoAsistente =
  | 'menu'
  | 'compra'
  | 'despensa'
  | 'recetas'
  | 'perfil'
  | 'catalogo';

export type RespuestaAsistentePFI = {
  titulo: string;
  resumen: string;
  puntos: string[];
  accion?: {
    etiqueta: string;
    destino: DestinoAsistente;
  };
  tono?: 'normal' | 'positivo' | 'atencion';
};

export type ContextoAsistentePFI = {
  menuSemana: DiaMenu[];
  menuMes: DiaMenu[];
  menusSemanas: DiaMenu[][];
  semanaActiva: number;
  mesActivo: string;
  compraSemana: ResultadoCompra | null;
  compraMes: ResultadoCompra | null;
  comprasSemanas: ResultadoCompra[];
  despensa: ProductoDespensa[];
  recetas: Receta[];
  aprendizaje: ResumenAprendizaje;
  perfil: PerfilFamiliar;
};

export type ResumenProactivoAsistente = {
  hoy: string;
  compra: string;
  despensa: string;
  presupuesto: string;
  alertas: string[];
};

const DIAS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const;

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function euros(valor: number): string {
  return valor.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
}

function listaCorta(valores: string[], maximo = 4): string {
  const limpios = valores.map((valor) => valor.trim()).filter(Boolean);
  if (limpios.length <= maximo) return limpios.join(', ');
  return `${limpios.slice(0, maximo).join(', ')} y ${limpios.length - maximo} más`;
}

function diaActual(menu: DiaMenu[]): DiaMenu | undefined {
  const nombre = DIAS[new Date().getDay()];
  return menu.find((dia) => normalizar(dia.dia) === normalizar(nombre));
}

function platosSemana(menu: DiaMenu[]): string[] {
  return menu.flatMap((dia) => [...dia.comida, ...dia.cena]);
}

function productosReposicion(despensa: ProductoDespensa[]): ProductoDespensa[] {
  return despensa
    .filter(
      (producto) =>
        producto.frecuencia !== 'manual' &&
        producto.stockMinimo > 0 &&
        producto.stockActual < producto.stockMinimo,
    )
    .sort((a, b) => {
      const proporcionA = a.stockMinimo > 0 ? a.stockActual / a.stockMinimo : 1;
      const proporcionB = b.stockMinimo > 0 ? b.stockActual / b.stockMinimo : 1;
      return proporcionA - proporcionB;
    });
}

function previsionMes(contexto: ContextoAsistentePFI): number {
  const semanal = contexto.comprasSemanas.reduce(
    (total, compra) => total + compra.total,
    0,
  );
  return semanal + (contexto.compraMes?.total ?? 0);
}

function platosQuePuedeCocinar(
  contexto: ContextoAsistentePFI,
): Array<{ nombre: string; cobertura: number; faltan: string[] }> {
  const asociaciones = cargarAsociacionesIngredientes();
  const stockPorProducto = new Map(
    contexto.despensa.map((producto) => [
      producto.productoId,
      producto.stockActual,
    ]),
  );

  return contexto.recetas
    .filter((receta) => !esRecetaPostre(receta))
    .map((receta) => {
      const ingredientesConProducto = receta.ingredientes
        .map((ingrediente) => ({
          nombre: ingrediente.nombre,
          productoId: asociaciones[ingrediente.nombre],
        }))
        .filter(
          (
            ingrediente,
          ): ingrediente is { nombre: string; productoId: string } =>
            typeof ingrediente.productoId === 'string' &&
            ingrediente.productoId.length > 0,
        );

      if (ingredientesConProducto.length === 0) {
        return { nombre: receta.nombre, cobertura: 0, faltan: [] };
      }

      const disponibles = ingredientesConProducto.filter(
        (ingrediente) => (stockPorProducto.get(ingrediente.productoId) ?? 0) > 0,
      );
      const faltan = ingredientesConProducto
        .filter(
          (ingrediente) =>
            (stockPorProducto.get(ingrediente.productoId) ?? 0) <= 0,
        )
        .map((ingrediente) => ingrediente.nombre);

      return {
        nombre: receta.nombre,
        cobertura: disponibles.length / ingredientesConProducto.length,
        faltan,
      };
    })
    .filter((resultado) => resultado.cobertura > 0)
    .sort(
      (a, b) =>
        b.cobertura - a.cobertura ||
        a.faltan.length - b.faltan.length ||
        a.nombre.localeCompare(b.nombre, 'es'),
    )
    .slice(0, 5);
}

function revisionSemana(contexto: ContextoAsistentePFI): string[] {
  const platos = platosSemana(contexto.menuSemana);
  const normalizados = platos.map(normalizar);
  const contar = (patron: RegExp) =>
    normalizados.filter((plato) => patron.test(plato)).length;

  const legumbres = contar(/lentej|garbanz|alubia/);
  const pescado = contar(/salmon|lubina|dorada|bacalao|atun|pescad/);
  const ensaladaPasta = normalizados.some((plato) =>
    plato.startsWith('ensalada de pasta'),
  );
  const viernes = contexto.menuSemana.find(
    (dia) => normalizar(dia.dia) === 'viernes',
  );
  const pizzaViernes = Boolean(
    viernes?.cena.some((plato) => normalizar(plato).includes('pizza')),
  );

  return [
    `${legumbres} comida${legumbres === 1 ? '' : 's'} con legumbres esta semana.`,
    `${pescado} comida${pescado === 1 ? '' : 's'} con pescado o atún.`,
    ensaladaPasta
      ? 'La ensalada de pasta semanal está incluida.'
      : 'No veo la ensalada de pasta semanal.',
    pizzaViernes
      ? 'La pizza del viernes está respetada.'
      : 'El viernes no aparece pizza en la cena.',
  ];
}

function preparacionesSemana(menu: DiaMenu[]): string[] {
  const preparaciones = menu
    .map((dia) => dia.preparar?.trim())
    .filter((valor): valor is string => Boolean(valor))
    .filter((valor) => normalizar(valor) !== 'nada');

  return Array.from(new Set(preparaciones));
}

export function obtenerResumenProactivo(
  contexto: ContextoAsistentePFI,
): ResumenProactivoAsistente {
  const hoy = diaActual(contexto.menuSemana);
  const reposicion = productosReposicion(contexto.despensa);
  const compra = contexto.compraSemana;
  const prevision = previsionMes(contexto);
  const alertas: string[] = [];

  if ((compra?.productosSinSeleccionar.length ?? 0) > 0) {
    alertas.push(
      `${compra?.productosSinSeleccionar.length ?? 0} producto(s) de la compra necesitan una asociación.`,
    );
  }
  if ((compra?.productosSinPrecio.length ?? 0) > 0) {
    alertas.push(
      `${compra?.productosSinPrecio.length ?? 0} producto(s) no tienen precio actualizado.`,
    );
  }
  if (reposicion.length > 0) {
    alertas.push(
      `${reposicion.length} producto(s) están por debajo del stock mínimo.`,
    );
  }

  return {
    hoy: hoy
      ? `Comida: ${hoy.comida.join(' + ')} · Cena: ${hoy.cena.join(' + ')}`
      : 'No encuentro el día actual en el menú activo.',
    compra: compra
      ? `${compra.lineas.length} productos · ${euros(compra.total)} estimados`
      : 'Calculando la compra actual…',
    despensa:
      reposicion.length === 0
        ? 'No hay avisos de stock mínimo.'
        : `${reposicion.length} producto(s) necesitan reposición.`,
    presupuesto:
      prevision > 0
        ? `${euros(prevision)} previstos este mes · objetivo ${euros(
            contexto.perfil.presupuesto,
          )}`
        : `Objetivo mensual: ${euros(contexto.perfil.presupuesto)}`,
    alertas,
  };
}

export function responderAsistente(
  pregunta: string,
  contexto: ContextoAsistentePFI,
): RespuestaAsistentePFI {
  const consulta = normalizar(pregunta);
  const hoy = diaActual(contexto.menuSemana);
  const compra = contexto.compraSemana;
  const reposicion = productosReposicion(contexto.despensa);
  const presupuestoPrevisto = previsionMes(contexto);
  const preparaciones = preparacionesSemana(contexto.menuSemana);

  if (/hoy|comida|cena|cenar|comer/.test(consulta)) {
    if (!hoy) {
      return {
        titulo: 'No encuentro el día de hoy',
        resumen: 'El menú activo no contiene un día que coincida con la fecha actual.',
        puntos: ['Puedes revisar la semana activa y elegir el día correcto.'],
        accion: { etiqueta: 'Abrir Menú', destino: 'menu' },
        tono: 'atencion',
      };
    }

    return {
      titulo: `Plan de hoy · ${hoy.dia}`,
      resumen: `Tienes ${hoy.comida.join(' + ')} para comer y ${hoy.cena.join(
        ' + ',
      )} para cenar.`,
      puntos: [
        hoy.preparar
          ? `Para adelantar: ${hoy.preparar}.`
          : 'No hay una preparación adelantada marcada para hoy.',
        `Postre comida: ${hoy.postreComidaReceta ?? hoy.postreComida}.`,
        `Postre cena: ${hoy.postreCenaReceta ?? hoy.postreCena}.`,
      ],
      accion: { etiqueta: 'Ver el día en Menú', destino: 'menu' },
    };
  }

  if (/compr|falta|lista|supermercado|mercadona/.test(consulta)) {
    if (!compra) {
      return {
        titulo: 'Estoy calculando la compra',
        resumen: 'Todavía no tengo listo el cálculo de esta semana.',
        puntos: ['En unos segundos podré darte productos, total y avisos de datos.'],
        accion: { etiqueta: 'Abrir Compra', destino: 'compra' },
      };
    }

    const nombres = compra.lineas.map(
      (linea) => linea.producto?.nombre ?? linea.ingrediente.nombre,
    );
    return {
      titulo: 'Compra de esta semana',
      resumen: `Hay ${compra.lineas.length} productos por unos ${euros(
        compra.total,
      )}.`,
      puntos: [
        nombres.length > 0
          ? `Lo principal: ${listaCorta(nombres)}.`
          : 'No hay productos automáticos pendientes.',
        compra.productosSinSeleccionar.length > 0
          ? `${compra.productosSinSeleccionar.length} ingrediente(s) necesitan elegir producto.`
          : 'Todos los ingredientes tienen producto seleccionado.',
        compra.productosSinPrecio.length > 0
          ? `${compra.productosSinPrecio.length} producto(s) no tienen precio y no entran en el total.`
          : 'Los productos seleccionados tienen precio.',
      ],
      accion: { etiqueta: 'Ir a Compra', destino: 'compra' },
      tono:
        compra.productosSinSeleccionar.length + compra.productosSinPrecio.length >
        0
          ? 'atencion'
          : 'positivo',
    };
  }

  if (/presupuesto|gasto|dinero|ahorro|cuanto.*mes|coste.*mes/.test(consulta)) {
    const diferencia = contexto.perfil.presupuesto - presupuestoPrevisto;
    return {
      titulo: 'Previsión de gasto',
      resumen:
        presupuestoPrevisto > 0
          ? `PFI estima ${euros(presupuestoPrevisto)} para el mes frente a un objetivo de ${euros(
              contexto.perfil.presupuesto,
            )}.`
          : `Tu objetivo mensual configurado es ${euros(
              contexto.perfil.presupuesto,
            )}.`,
      puntos:
        presupuestoPrevisto > 0
          ? [
              diferencia >= 0
                ? `Ahora mismo estás ${euros(diferencia)} por debajo del objetivo previsto.`
                : `La previsión supera el objetivo en ${euros(Math.abs(diferencia))}.`,
              'La previsión combina la compra mensual y las compras semanales calculadas.',
              'Los productos sin precio pueden hacer que el total real sea algo mayor.',
            ]
          : ['Necesito que termine el cálculo de compra para comparar la previsión completa.'],
      accion: { etiqueta: 'Revisar Compra', destino: 'compra' },
      tono: diferencia >= 0 ? 'positivo' : 'atencion',
    };
  }

  if (/despensa|stock|reponer|reposicion|queda|tenemos/.test(consulta)) {
    return {
      titulo: 'Estado de la despensa',
      resumen:
        reposicion.length === 0
          ? 'No veo productos por debajo del stock mínimo configurado.'
          : `Hay ${reposicion.length} producto(s) que conviene reponer.`,
      puntos:
        reposicion.length === 0
          ? [
              `Tienes ${contexto.despensa.length} productos controlados en la despensa.`,
              'PFI seguirá descontando el stock cuando registres las compras.',
            ]
          : reposicion.slice(0, 5).map(
              (producto) =>
                `${producto.nombre}: ${producto.stockActual.toLocaleString(
                  'es-ES',
                )} de ${producto.stockMinimo.toLocaleString('es-ES')} ${producto.unidad}.`,
            ),
      accion: { etiqueta: 'Abrir Despensa', destino: 'despensa' },
      tono: reposicion.length > 0 ? 'atencion' : 'positivo',
    };
  }

  if (/cocinar|puedo hacer|que hago|con lo que tengo|receta/.test(consulta)) {
    const opciones = platosQuePuedeCocinar(contexto);
    if (opciones.length === 0) {
      return {
        titulo: 'Necesito más stock registrado',
        resumen:
          'No tengo suficiente información de despensa asociada a recetas para proponerte platos con confianza.',
        puntos: [
          'Añade o revisa el stock de los productos que sueles tener en casa.',
          'Cuantas más asociaciones de ingredientes estén completas, mejores serán estas propuestas.',
        ],
        accion: { etiqueta: 'Revisar Despensa', destino: 'despensa' },
        tono: 'atencion',
      };
    }

    return {
      titulo: 'Recetas cercanas a lo que tienes',
      resumen:
        'He comparado tus recetas con el stock registrado. Estas son las opciones con mejor cobertura.',
      puntos: opciones.slice(0, 4).map((opcion) => {
        const porcentaje = Math.round(opcion.cobertura * 100);
        return opcion.faltan.length === 0
          ? `${opcion.nombre}: cobertura registrada del ${porcentaje}%.`
          : `${opcion.nombre}: ${porcentaje}% · faltaría revisar ${listaCorta(
              opcion.faltan,
              2,
            )}.`;
      }),
      accion: { etiqueta: 'Ver Recetas', destino: 'recetas' },
    };
  }

  if (/adelantar|preparar|batch|cocinar antes|organizar semana/.test(consulta)) {
    return {
      titulo: 'Preparación semanal',
      resumen:
        preparaciones.length > 0
          ? `Hay ${preparaciones.length} preparación(es) que PFI ya tiene marcadas para adelantar.`
          : 'Esta semana no tiene preparaciones adelantadas definidas.',
      puntos:
        preparaciones.length > 0
          ? preparaciones.slice(0, 6).map((preparacion) => preparaciónTexto(preparacion))
          : ['Puedes añadir preparaciones desde Menú para que el asistente las tenga en cuenta.'],
      accion: { etiqueta: 'Ver preparación en Menú', destino: 'menu' },
    };
  }

  if (/revisa.*semana|equilibr|variedad|menu.*bien|como.*semana/.test(consulta)) {
    return {
      titulo: 'Revisión de la semana',
      resumen: 'He comprobado algunas reglas importantes del menú familiar.',
      puntos: revisionSemana(contexto),
      accion: { etiqueta: 'Abrir Menú', destino: 'menu' },
    };
  }

  if (/aprend|gusto|preferencia|valoracion|conoces/.test(consulta)) {
    const totalAjustes =
      contexto.aprendizaje.ajustesPorciones + contexto.aprendizaje.ajustesRecetas;
    return {
      titulo: 'Lo que PFI está aprendiendo',
      resumen: `Tengo ${contexto.aprendizaje.valoraciones} valoración(es) y ${contexto.aprendizaje.eleccionesMenu} elección(es) registradas.`,
      puntos: [
        `${contexto.aprendizaje.combinacionesMenu} combinaciones de menú conocidas.`,
        `${totalAjustes} ajuste(s) de cantidades aprendidos.`,
        'Valorar comidas como Gustó, Sobró, Faltó o No gustó mejora las siguientes propuestas.',
      ],
      accion: { etiqueta: 'Ir al Menú', destino: 'menu' },
    };
  }

  if (/precio|sin precio|dato|asociacion|producto.*elegir/.test(consulta)) {
    const sinProducto = compra?.productosSinSeleccionar.length ?? 0;
    const sinPrecio = compra?.productosSinPrecio.length ?? 0;
    return {
      titulo: 'Calidad de los datos',
      resumen:
        sinProducto + sinPrecio === 0
          ? 'La compra semanal no tiene avisos de producto o precio.'
          : 'Hay datos pendientes que pueden afectar a la precisión de la compra.',
      puntos: [
        `${sinProducto} ingrediente(s) sin producto seleccionado.`,
        `${sinPrecio} producto(s) sin precio.`,
        'Resolver estos avisos mejora tanto el presupuesto como las recomendaciones del asistente.',
      ],
      accion: {
        etiqueta: sinProducto > 0 ? 'Abrir Mercadona' : 'Abrir Compra',
        destino: sinProducto > 0 ? 'catalogo' : 'compra',
      },
      tono: sinProducto + sinPrecio > 0 ? 'atencion' : 'positivo',
    };
  }

  return {
    titulo: 'Puedo ayudarte con PFI',
    resumen:
      'Puedo cruzar el menú, la compra, la despensa, el presupuesto, tus recetas y el aprendizaje de la familia.',
    puntos: [
      'Prueba: “¿Qué toca hoy?” o “¿Qué tengo que comprar?”.',
      'También: “¿Cómo voy de presupuesto?” o “¿Qué puedo cocinar con lo que tengo?”.',
      'Puedo revisar la semana, el stock, los datos de Mercadona y lo que PFI está aprendiendo.',
    ],
  };
}

function preparaciónTexto(preparacion: string): string {
  return `Adelantar: ${preparacion}.`;
}
