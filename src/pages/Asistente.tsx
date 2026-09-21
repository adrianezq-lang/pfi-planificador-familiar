import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
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
import type { ResultadoCompra } from '../motor/compra';

type Props = {
  menu: DiaMenu[];
  menuMes: DiaMenu[];
  menusSemanas: DiaMenu[][];
  semanaActiva: number;
  mesActivo: string;
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

export default function Asistente({
  menu,
  menuMes,
  menusSemanas,
  semanaActiva,
  mesActivo,
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
  }, [menuMes, menusSemanas, semanaActiva]);

  const contexto = useMemo(
    () => ({
      menuSemana: menu,
      menuMes,
      menusSemanas,
      semanaActiva,
      mesActivo,
      compraSemana,
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

  const preguntar = (texto: string) => {
    const limpio = texto.trim();
    if (!limpio) return;

    const respuesta = responderAsistente(limpio, contexto);
    const siguiente = [
      ...historial,
      {
        id: crearId(),
        pregunta: limpio,
        respuesta,
        fecha: new Date().toISOString(),
      },
    ].slice(-MAX_HISTORIAL);

    setHistorial(siguiente);
    guardarHistorial(siguiente);
    setConsulta('');

    window.setTimeout(() => {
      finalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 40);
  };

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    preguntar(consulta);
  };

  const borrarHistorial = () => {
    setHistorial([]);
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
            Cruzo tu menú, compra, despensa, presupuesto y lo que PFI aprende de la familia.
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
            <h3>Pregúntame directamente</h3>
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
              Escribe como hablarías normalmente: “¿qué cenamos?”, “¿qué falta?”,
              “¿puedo cocinar algo con lo que tengo?” o “revisa el menú”.
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

        <form className="assistant-composer" onSubmit={enviar}>
          <label>
            <span className="sr-only">Pregunta al Asistente PFI</span>
            <input
              value={consulta}
              onChange={(evento) => setConsulta(evento.target.value)}
              placeholder="Pregunta algo sobre tu planificación…"
              autoComplete="off"
            />
          </label>
          <button type="submit" disabled={!consulta.trim()}>
            <AppIcon name="sparkles" size={18} />
            <span>Preguntar</span>
          </button>
        </form>
        <small className="assistant-privacy">
          Funciona con los datos guardados en PFI. No modifica nada sin que tú vayas a la sección correspondiente.
        </small>
      </section>
    </main>
  );
}
