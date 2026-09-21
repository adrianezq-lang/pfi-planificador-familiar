import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { SemanaMenu } from '../data/MenuMensual';
import type { DiaMenu } from '../data/Menusemanal';
import AppIcon from '../components/AppIcon';
import {
  EVENTO_APRENDIZAJE,
  obtenerResumenAprendizaje,
} from '../services/aprendizaje';
import {
  EVENTO_DESPENSA,
  cargarDespensa,
} from '../services/despensa';
import {
  EVENTO_PERFIL,
  cargarPerfil,
} from '../services/perfil';
import {
  EVENTO_RECETAS,
  cargarRecetas,
} from '../services/recetas';
import {
  generarCompraMensual,
  generarCompraSemanalProyectada,
} from '../services/planificacionCompra';
import {
  obtenerResumenProactivo,
  responderAsistente,
  type DestinoAsistente,
  type RespuestaAsistentePFI,
} from '../services/asistentePFI';
import {
  detectarAccionAsistente,
  type PropuestaAccionAsistente,
} from '../services/accionesAsistente';
import type { ResultadoCompra } from '../motor/compra';
import {
  cargarClavesGuardadas,
  crearClavesEstadoCompra,
} from '../services/registroCompra';
import {
  añadirProductoManualCompra,
  cargarProductosManualesCompra,
  crearPeriodoIdCompraManual,
} from '../services/productosManualesCompra';
import {
  cargarExcepciones,
  fechasSemana,
  guardarExcepcion,
  guardarFinDeSemanaSinNinos,
  indiceDiaSemana,
} from '../services/excepcionesCalendario';
import { crearCopiaAutomaticaSiNecesaria } from '../services/copiasSeguridad';

type Props = {
  menu: DiaMenu[];
  menuEditable: DiaMenu[];
  menuMes: DiaMenu[];
  menusSemanas: DiaMenu[][];
  planMensual: SemanaMenu[];
  semanaActiva: number;
  mesActivo: string;
  guardarMenu: (menu: DiaMenu[]) => void;
  navegar: (destino: DestinoAsistente) => void;
};

type Conversacion = {
  id: string;
  pregunta: string;
  respuesta: RespuestaAsistentePFI;
  fecha: string;
};

const CLAVE_HISTORIAL = 'pfi-asistente-historial-v1';
const MAX_HISTORIAL = 12;

const PREGUNTAS_RAPIDAS = [
  { icono: 'utensils' as const, texto: '¿Qué toca hoy?' },
  { icono: 'cart' as const, texto: '¿Qué tengo que comprar?' },
  { icono: 'wallet' as const, texto: '¿Cómo voy de presupuesto?' },
  { icono: 'box' as const, texto: '¿Qué falta en despensa?' },
  { icono: 'sparkles' as const, texto: '¿Qué puedo cocinar con lo que tengo?' },
  { icono: 'calendar' as const, texto: 'Revisa mi semana' },
] as const;

const ACCIONES_RAPIDAS = [
  'Añade leche a la compra',
  'Este finde no están los niños',
  'Pon salmón el sábado',
  'El domingo comemos fuera',
] as const;

function cargarHistorial(): Conversacion[] {
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE_HISTORIAL) ?? '[]') as unknown;
    if (!Array.isArray(valor)) return [];
    return valor
      .filter(
        (item): item is Conversacion =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Conversacion).pregunta === 'string' &&
          typeof (item as Conversacion).fecha === 'string' &&
          typeof (item as Conversacion).respuesta === 'object' &&
          (item as Conversacion).respuesta !== null,
      )
      .slice(-MAX_HISTORIAL);
  } catch {
    return [];
  }
}

function guardarHistorial(historial: Conversacion[]): void {
  localStorage.setItem(
    CLAVE_HISTORIAL,
    JSON.stringify(historial.slice(-MAX_HISTORIAL)),
  );
}

function crearId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function platosDeMomento(
  menu: DiaMenu[],
  diaBuscado: string,
  momento: 'comida' | 'cena',
): string[] | null {
  const dia = menu.find(
    (item) => normalizar(item.dia) === normalizar(diaBuscado),
  );
  if (!dia) return null;
  return momento === 'comida' ? dia.comida : dia.cena;
}

function mismosPlatos(a: string[] | null, b: string[]): boolean {
  return (
    a !== null &&
    a.length === b.length &&
    a.every((plato, indice) => plato === b[indice])
  );
}

function conMomento(
  dia: DiaMenu,
  momento: 'comida' | 'cena',
  platos: string[],
): DiaMenu {
  return momento === 'comida'
    ? { ...dia, comida: [...platos] }
    : { ...dia, cena: [...platos] };
}

function destinoAccion(propuesta: PropuestaAccionAsistente): DestinoAsistente {
  switch (propuesta.accion.tipo) {
    case 'cambiar-menu':
    case 'copiar-menu':
    case 'mover-menu':
    case 'intercambiar-menu':
    case 'fin-semana-sin-ninos':
    case 'excepcion-dia':
      return 'menu';
    case 'anadir-compra':
      return 'compra';
  }
}

export default function Asistente({
  menu,
  menuEditable,
  menuMes,
  menusSemanas,
  planMensual,
  semanaActiva,
  mesActivo,
  guardarMenu,
  navegar,
}: Props) {
  const [consulta, setConsulta] = useState('');
  const [historial, setHistorial] = useState<Conversacion[]>(cargarHistorial);
  const [despensa, setDespensa] = useState(cargarDespensa);
  const [recetas, setRecetas] = useState(cargarRecetas);
  const [perfil, setPerfil] = useState(cargarPerfil);
  const [aprendizaje, setAprendizaje] = useState(obtenerResumenAprendizaje);
  const [compraSemana, setCompraSemana] = useState<ResultadoCompra | null>(null);
  const [compraMes, setCompraMes] = useState<ResultadoCompra | null>(null);
  const [comprasSemanas, setComprasSemanas] = useState<ResultadoCompra[]>([]);
  const [calculando, setCalculando] = useState(true);
  const [propuestaPendiente, setPropuestaPendiente] =
    useState<PropuestaAccionAsistente | null>(null);
  const [resultadoAccion, setResultadoAccion] = useState('');
  const [destinoResultado, setDestinoResultado] = useState<DestinoAsistente | null>(null);
  const [revisionAcciones, setRevisionAcciones] = useState(0);
  const finalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const actualizarDespensa = () => setDespensa(cargarDespensa());
    const actualizarRecetas = () => setRecetas(cargarRecetas());
    const actualizarPerfil = () => setPerfil(cargarPerfil());
    const actualizarAprendizaje = () =>
      setAprendizaje(obtenerResumenAprendizaje());

    window.addEventListener(EVENTO_DESPENSA, actualizarDespensa);
    window.addEventListener(EVENTO_RECETAS, actualizarRecetas);
    window.addEventListener(EVENTO_PERFIL, actualizarPerfil);
    window.addEventListener(EVENTO_APRENDIZAJE, actualizarAprendizaje);

    return () => {
      window.removeEventListener(EVENTO_DESPENSA, actualizarDespensa);
      window.removeEventListener(EVENTO_RECETAS, actualizarRecetas);
      window.removeEventListener(EVENTO_PERFIL, actualizarPerfil);
      window.removeEventListener(EVENTO_APRENDIZAJE, actualizarAprendizaje);
    };
  }, []);

  useEffect(() => {
    let activo = true;
    setCalculando(true);

    Promise.all([
      generarCompraSemanalProyectada(menusSemanas, semanaActiva),
      generarCompraMensual(menuMes),
      Promise.all(
        menusSemanas.map((_, indice) =>
          generarCompraSemanalProyectada(menusSemanas, indice),
        ),
      ),
    ])
      .then(([semana, mes, semanas]) => {
        if (!activo) return;
        setCompraSemana(semana);
        setCompraMes(mes);
        setComprasSemanas(semanas);
      })
      .catch(() => {
        if (!activo) return;
        setCompraSemana(null);
        setCompraMes(null);
        setComprasSemanas([]);
      })
      .finally(() => {
        if (activo) setCalculando(false);
      });

    return () => {
      activo = false;
    };
  }, [menuMes, menusSemanas, semanaActiva, revisionAcciones]);

  const estadoCompra = useMemo(() => {
    void revisionAcciones;
    const compra = compraSemana;
    if (!compra) {
      return {
        nombres: [] as string[],
        total: 0,
        cantidad: 0,
      };
    }

    const claves = crearClavesEstadoCompra('semana', mesActivo, semanaActiva);
    const completadas = new Set([
      ...cargarClavesGuardadas(claves.marcados),
      ...cargarClavesGuardadas(claves.registrados),
    ]);
    const automaticos = compra.lineas.filter(
      (linea) => !completadas.has(linea.clave),
    );
    const periodoManual = crearPeriodoIdCompraManual(
      'semana',
      mesActivo,
      semanaActiva,
    );
    const manuales = cargarProductosManualesCompra().filter(
      (producto) =>
        producto.periodoId === periodoManual &&
        !producto.comprado &&
        !producto.guardadoEnDespensa,
    );

    return {
      nombres: [
        ...automaticos.map(
          (linea) => linea.producto?.nombre ?? linea.ingrediente.nombre,
        ),
        ...manuales.map((producto) => producto.nombre),
      ],
      total:
        automaticos.reduce(
          (suma, linea) => suma + (linea.subtotal ?? 0),
          0,
        ) +
        manuales.reduce(
          (suma, producto) => suma + (producto.precioTotal ?? 0),
          0,
        ),
      cantidad: automaticos.length + manuales.length,
    };
  }, [compraSemana, mesActivo, revisionAcciones, semanaActiva]);

  const contexto = useMemo(
    () => ({
      menuSemana: menu,
      menuMes,
      menusSemanas,
      semanaActiva,
      mesActivo,
      compraSemana,
      compraPendienteNombres: estadoCompra.nombres,
      compraPendienteTotal: estadoCompra.total,
      compraPendienteCantidad: estadoCompra.cantidad,
      compraMes,
      comprasSemanas,
      despensa,
      recetas,
      aprendizaje,
      perfil,
    }),
    [
      aprendizaje,
      compraMes,
      compraSemana,
      comprasSemanas,
      estadoCompra,
      despensa,
      menu,
      menuMes,
      menusSemanas,
      mesActivo,
      perfil,
      recetas,
      semanaActiva,
    ],
  );

  const resumen = useMemo(
    () => obtenerResumenProactivo(contexto),
    [contexto],
  );

  const agregarConversacion = (
    pregunta: string,
    respuesta: RespuestaAsistentePFI,
  ) => {
    const siguiente = [
      ...historial,
      {
        id: crearId(),
        pregunta,
        respuesta,
        fecha: new Date().toISOString(),
      },
    ].slice(-MAX_HISTORIAL);

    setHistorial(siguiente);
    guardarHistorial(siguiente);
  };

  const preguntar = (texto: string) => {
    const limpio = texto.trim();
    if (!limpio) return;

    setResultadoAccion('');
    setDestinoResultado(null);
    const deteccion = detectarAccionAsistente(
      limpio,
      menuEditable,
      recetas,
      planMensual[semanaActiva],
    );

    if (deteccion?.propuesta) {
      setPropuestaPendiente(deteccion.propuesta);
      agregarConversacion(limpio, {
        titulo: 'He preparado el cambio',
        resumen: deteccion.propuesta.resumen,
        puntos: deteccion.propuesta.cambios,
        tono: 'atencion',
      });
    } else if (deteccion?.aclaracion) {
      setPropuestaPendiente(null);
      agregarConversacion(limpio, {
        titulo: 'Necesito un detalle',
        resumen: deteccion.aclaracion,
        puntos: [
          'No haré ningún cambio hasta que quede claro qué quieres modificar.',
        ],
        tono: 'atencion',
      });
    } else {
      setPropuestaPendiente(null);
      agregarConversacion(limpio, responderAsistente(limpio, contexto));
    }

    setConsulta('');
    window.setTimeout(() => {
      finalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 40);
  };

  const ejecutarPropuesta = () => {
    const propuesta = propuestaPendiente;
    if (!propuesta) return;

    crearCopiaAutomaticaSiNecesaria('antes de una acción del Asistente PFI');
    setDestinoResultado(destinoAccion(propuesta));

    try {
      switch (propuesta.accion.tipo) {
        case 'cambiar-menu': {
          const accion = propuesta.accion;
          const actual = platosDeMomento(menuEditable, accion.dia, accion.momento);
          if (!mismosPlatos(actual, accion.platosAnteriores)) {
            throw new Error(
              'El menú ha cambiado desde que preparé la propuesta. Vuelve a pedirme el cambio para enseñarte una vista previa actualizada.',
            );
          }

          const menuActualizado = menuEditable.map((dia) => {
            if (normalizar(dia.dia) !== normalizar(accion.dia)) return dia;
            return conMomento(dia, accion.momento, [accion.platoNuevo]);
          });
          guardarMenu(menuActualizado);
          setResultadoAccion(
            `He cambiado la ${accion.momento} del ${accion.dia.toLocaleLowerCase('es')} por ${accion.platoNuevo}. La compra se recalculará con el nuevo menú.`,
          );
          break;
        }

        case 'copiar-menu': {
          const accion = propuesta.accion;
          const destinoActual = platosDeMomento(
            menuEditable,
            accion.diaDestino,
            accion.momentoDestino,
          );
          const origenActual = platosDeMomento(
            menuEditable,
            accion.diaOrigen,
            accion.momentoOrigen,
          );
          if (
            !mismosPlatos(destinoActual, accion.platosAnteriores) ||
            !mismosPlatos(origenActual, accion.platosNuevos)
          ) {
            throw new Error(
              'El origen o el destino han cambiado desde la vista previa. Vuelve a pedirme el cambio para no sobrescribir un menú más reciente.',
            );
          }

          const menuActualizado = menuEditable.map((dia) => {
            if (normalizar(dia.dia) !== normalizar(accion.diaDestino)) return dia;
            return conMomento(dia, accion.momentoDestino, accion.platosNuevos);
          });
          guardarMenu(menuActualizado);
          setResultadoAccion(
            `He copiado la ${accion.momentoOrigen} de ${accion.etiquetaOrigen} en la ${accion.momentoDestino} de ${accion.etiquetaDestino}: ${accion.platosNuevos.join(' + ')}. El origen se mantiene igual y la compra se recalculará.`,
          );
          break;
        }

        case 'mover-menu': {
          const accion = propuesta.accion;
          const destinoActual = platosDeMomento(
            menuEditable,
            accion.diaDestino,
            accion.momentoDestino,
          );
          const origenActual = platosDeMomento(
            menuEditable,
            accion.diaOrigen,
            accion.momentoOrigen,
          );
          if (
            !mismosPlatos(destinoActual, accion.platosDestinoAntes) ||
            !mismosPlatos(origenActual, accion.platosOrigenAntes)
          ) {
            throw new Error(
              'El origen o el destino han cambiado desde la vista previa. Vuelve a pedirme el movimiento para no perder ningún plato.',
            );
          }

          const menuActualizado = menuEditable.map((dia) => {
            let actualizado = dia;
            if (normalizar(dia.dia) === normalizar(accion.diaDestino)) {
              actualizado = conMomento(
                actualizado,
                accion.momentoDestino,
                accion.platosOrigenAntes,
              );
            }
            if (normalizar(dia.dia) === normalizar(accion.diaOrigen)) {
              actualizado = conMomento(actualizado, accion.momentoOrigen, []);
            }
            return actualizado;
          });
          guardarMenu(menuActualizado);
          setResultadoAccion(
            `He movido ${accion.platosOrigenAntes.join(' + ')} de ${accion.etiquetaOrigen} a ${accion.etiquetaDestino}. El hueco de origen queda vacío y la compra se recalculará.`,
          );
          break;
        }

        case 'intercambiar-menu': {
          const accion = propuesta.accion;
          const destinoActual = platosDeMomento(
            menuEditable,
            accion.diaDestino,
            accion.momentoDestino,
          );
          const origenActual = platosDeMomento(
            menuEditable,
            accion.diaOrigen,
            accion.momentoOrigen,
          );
          if (
            !mismosPlatos(destinoActual, accion.platosDestinoAntes) ||
            !mismosPlatos(origenActual, accion.platosOrigenAntes)
          ) {
            throw new Error(
              'Uno de los dos huecos ha cambiado desde la vista previa. Vuelve a pedirme el intercambio para usar el menú actual.',
            );
          }

          const menuActualizado = menuEditable.map((dia) => {
            let actualizado = dia;
            if (normalizar(dia.dia) === normalizar(accion.diaDestino)) {
              actualizado = conMomento(
                actualizado,
                accion.momentoDestino,
                accion.platosOrigenAntes,
              );
            }
            if (normalizar(dia.dia) === normalizar(accion.diaOrigen)) {
              actualizado = conMomento(
                actualizado,
                accion.momentoOrigen,
                accion.platosDestinoAntes,
              );
            }
            return actualizado;
          });
          guardarMenu(menuActualizado);
          setResultadoAccion(
            `He intercambiado ${accion.etiquetaDestino} y ${accion.etiquetaOrigen}. Ningún plato se pierde y la compra se recalculará con el nuevo orden.`,
          );
          break;
        }

        case 'anadir-compra': {
          const accion = propuesta.accion;
          const periodoId = crearPeriodoIdCompraManual(
            'semana',
            mesActivo,
            semanaActiva,
          );
          const duplicado = cargarProductosManualesCompra().some(
            (producto) =>
              producto.periodoId === periodoId &&
              normalizar(producto.nombre) === normalizar(accion.nombre) &&
              !producto.comprado &&
              !producto.guardadoEnDespensa,
          );

          if (duplicado) {
            setResultadoAccion(
              `${accion.nombre} ya estaba en la compra semanal, así que no lo he duplicado.`,
            );
          } else {
            añadirProductoManualCompra({
              periodoId,
              nombre: accion.nombre,
              cantidad: accion.cantidad,
              unidad: accion.unidad,
              tienda: accion.tienda,
              precioTotal: null,
            });
            setResultadoAccion(
              `He añadido ${accion.cantidad.toLocaleString('es-ES')} ${accion.unidad} de ${accion.nombre} a Compra.`,
            );
          }
          break;
        }

        case 'fin-semana-sin-ninos': {
          const semana = planMensual[semanaActiva];
          if (!semana) throw new Error('No encuentro la semana activa.');
          guardarFinDeSemanaSinNinos(
            semana,
            propuesta.accion.sinNinos,
          );
          setResultadoAccion(
            propuesta.accion.sinNinos
              ? 'He marcado sábado y domingo sin niños. PFI recalculará las cantidades.'
              : 'He vuelto a incluir a los niños en sábado y domingo.',
          );
          break;
        }

        case 'excepcion-dia': {
          const accion = propuesta.accion;
          const semana = planMensual[semanaActiva];
          if (!semana) throw new Error('No encuentro la semana activa.');
          const fecha = fechasSemana(semana).find((fechaIso) => {
            const dia = semana.menu[indiceDiaSemana(fechaIso)];
            return dia && normalizar(dia.dia) === normalizar(accion.dia);
          });
          if (!fecha) throw new Error(`No encuentro ${accion.dia} en la semana activa.`);

          const excepciones = cargarExcepciones();
          guardarExcepcion(fecha, {
            ...excepciones[fecha],
            [accion.excepcion]: accion.activa,
          });
          setResultadoAccion(
            accion.excepcion === 'noEnCasa'
              ? `He marcado el ${accion.dia.toLocaleLowerCase('es')} como fuera de casa.`
              : accion.excepcion === 'sinComida'
                ? `He quitado la comida del ${accion.dia.toLocaleLowerCase('es')} del cálculo.`
                : `He quitado la cena del ${accion.dia.toLocaleLowerCase('es')} del cálculo.`,
          );
          break;
        }
      }

      setRevisionAcciones((valor) => valor + 1);
      setPropuestaPendiente(null);
    } catch (error) {
      setDestinoResultado(null);
      setResultadoAccion(
        error instanceof Error
          ? error.message
          : 'No he podido aplicar el cambio. No se ha modificado nada.',
      );
    }
  };

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    preguntar(consulta);
  };

  const borrarHistorial = () => {
    setHistorial([]);
    setPropuestaPendiente(null);
    setResultadoAccion('');
    setDestinoResultado(null);
    localStorage.removeItem(CLAVE_HISTORIAL);
  };

  return (
    <main className="page assistant-page">
      <section className="assistant-hero">
        <div className="assistant-hero__icon" aria-hidden="true">
          <AppIcon name="sparkles" size={27} />
        </div>
        <div className="assistant-hero__copy">
          <span>ASISTENTE PFI</span>
          <h2>¿Qué necesitas?</h2>
          <p>
            Cruzo tu menú, compra, despensa y presupuesto. También entiendo cambios entre días: puedo copiar, mover o intercambiar comidas y cenas, siempre con vista previa y confirmación.
          </p>
        </div>
        <div className="assistant-live-badge">
          <span aria-hidden="true" />
          {calculando ? 'Actualizando datos' : 'Datos conectados'}
        </div>
      </section>

      <section className="assistant-snapshot" aria-label="Resumen actual">
        <article className="assistant-snapshot-card assistant-snapshot-card--today">
          <span className="assistant-snapshot-card__icon"><AppIcon name="utensils" size={18} /></span>
          <div>
            <small>HOY</small>
            <strong>{resumen.hoy}</strong>
          </div>
        </article>
        <article className="assistant-snapshot-card">
          <span className="assistant-snapshot-card__icon"><AppIcon name="cart" size={18} /></span>
          <div>
            <small>COMPRA</small>
            <strong>{resumen.compra}</strong>
          </div>
        </article>
        <article className="assistant-snapshot-card">
          <span className="assistant-snapshot-card__icon"><AppIcon name="box" size={18} /></span>
          <div>
            <small>DESPENSA</small>
            <strong>{resumen.despensa}</strong>
          </div>
        </article>
        <article className="assistant-snapshot-card">
          <span className="assistant-snapshot-card__icon"><AppIcon name="wallet" size={18} /></span>
          <div>
            <small>MES</small>
            <strong>{resumen.presupuesto}</strong>
          </div>
        </article>
      </section>

      {resumen.alertas.length > 0 && (
        <section className="assistant-alerts" aria-label="Avisos útiles">
          <header>
            <AppIcon name="alert" size={18} />
            <strong>Hay algo que merece tu atención</strong>
          </header>
          <div>
            {resumen.alertas.map((alerta) => (
              <span key={alerta}>{alerta}</span>
            ))}
          </div>
        </section>
      )}

      <section className="assistant-quick">
        <div className="assistant-section-heading">
          <div>
            <span>ACCESOS RÁPIDOS</span>
            <h3>Pregúntame o pídeme cambios</h3>
          </div>
        </div>
        <div className="assistant-quick-grid">
          {PREGUNTAS_RAPIDAS.map((pregunta) => (
            <button
              key={pregunta.texto}
              type="button"
              onClick={() => preguntar(pregunta.texto)}
            >
              <AppIcon name={pregunta.icono} size={18} />
              <span>{pregunta.texto}</span>
              <b aria-hidden="true">›</b>
            </button>
          ))}
        </div>
        <div className="assistant-action-examples">
          <small>PRUEBA TAMBIÉN</small>
          <div>
            {ACCIONES_RAPIDAS.map((accion) => (
              <button key={accion} type="button" onClick={() => preguntar(accion)}>
                {accion}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="assistant-conversation">
        <div className="assistant-section-heading assistant-section-heading--conversation">
          <div>
            <span>CONVERSACIÓN</span>
            <h3>Asistente contextual</h3>
          </div>
          {historial.length > 0 && (
            <button type="button" onClick={borrarHistorial}>
              Borrar
            </button>
          )}
        </div>

        {historial.length === 0 ? (
          <div className="assistant-empty">
            <div aria-hidden="true"><AppIcon name="sparkles" size={24} /></div>
            <strong>No necesitas aprender comandos.</strong>
            <p>
              Puedes preguntar o dar órdenes normales: “añade leche a la compra”,
              “pon salmón el sábado” o “este finde no están los niños”.
            </p>
          </div>
        ) : (
          <div className="assistant-thread">
            {historial.map((item) => (
              <article key={item.id} className="assistant-exchange">
                <div className="assistant-user-message">{item.pregunta}</div>
                <div
                  className={`assistant-answer assistant-answer--${item.respuesta.tono ?? 'normal'}`}
                >
                  <div className="assistant-answer__head">
                    <span aria-hidden="true"><AppIcon name="sparkles" size={17} /></span>
                    <div>
                      <small>PFI</small>
                      <strong>{item.respuesta.titulo}</strong>
                    </div>
                  </div>
                  <p>{item.respuesta.resumen}</p>
                  {item.respuesta.puntos.length > 0 && (
                    <ul>
                      {item.respuesta.puntos.map((punto) => (
                        <li key={punto}>{punto}</li>
                      ))}
                    </ul>
                  )}
                  {item.respuesta.accion && (
                    <button
                      type="button"
                      className="assistant-answer__action"
                      onClick={() => navegar(item.respuesta.accion!.destino)}
                    >
                      {item.respuesta.accion.etiqueta}
                      <span aria-hidden="true">›</span>
                    </button>
                  )}
                </div>
              </article>
            ))}
            <div ref={finalRef} />
          </div>
        )}

        {propuestaPendiente && (
          <aside className="assistant-confirm" aria-label="Confirmar cambio">
            <div className="assistant-confirm__head">
              <span aria-hidden="true"><AppIcon name="alert" size={18} /></span>
              <div>
                <small>CONFIRMACIÓN NECESARIA</small>
                <strong>{propuestaPendiente.titulo}</strong>
              </div>
            </div>
            <p>{propuestaPendiente.resumen}</p>
            <div className="assistant-confirm__changes">
              {propuestaPendiente.cambios.map((cambio) => (
                <span key={cambio}>{cambio}</span>
              ))}
            </div>
            <div className="assistant-confirm__actions">
              <button
                type="button"
                className="assistant-confirm__cancel"
                onClick={() => {
                  setPropuestaPendiente(null);
                  setDestinoResultado(null);
                  setResultadoAccion('Cambio cancelado. No he modificado nada.');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="assistant-confirm__apply"
                onClick={ejecutarPropuesta}
              >
                <AppIcon name="check" size={17} />
                {propuestaPendiente.confirmar}
              </button>
            </div>
          </aside>
        )}

        {resultadoAccion && (
          <aside className="assistant-action-result" role="status">
            <span aria-hidden="true"><AppIcon name="check" size={17} /></span>
            <div>
              <strong>{resultadoAccion}</strong>
              {destinoResultado && (
                <button type="button" onClick={() => navegar(destinoResultado)}>
                  Ver resultado
                  <span aria-hidden="true">›</span>
                </button>
              )}
            </div>
          </aside>
        )}

        <form className="assistant-composer" onSubmit={enviar}>
          <label>
            <span className="sr-only">Pregunta al Asistente PFI</span>
            <input
              value={consulta}
              onChange={(evento) => setConsulta(evento.target.value)}
              placeholder="Pregunta o pide un cambio…"
              autoComplete="off"
            />
          </label>
          <button type="submit" disabled={!consulta.trim()}>
            <AppIcon name="sparkles" size={18} />
            <span>Enviar</span>
          </button>
        </form>
        <small className="assistant-privacy">
          PFI nunca aplica un cambio desde el asistente sin enseñártelo antes y pedirte confirmación.
        </small>
      </section>
    </main>
  );
}
