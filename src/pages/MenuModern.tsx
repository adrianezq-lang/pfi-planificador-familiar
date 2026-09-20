import { useEffect, useMemo, useState } from 'react';
import type { DiaMenu, MomentoPostre, PostreMenu } from '../data/Menusemanal';
import type { SemanaMenu } from '../data/MenuMensual';
import { useRecetas } from '../hooks/useRecetas';
import {
  obtenerComplementosSugeridos,
  obtenerSugerenciasMenu,
  obtenerValoracionComida,
  registrarEleccionMenu,
  registrarResultadoComida,
  type MomentoMenu,
  type ResultadoComida,
} from '../services/aprendizaje';
import { crearCopiaAutomaticaSiNecesaria } from '../services/copiasSeguridad';
import {
  cargarExcepciones,
  EVENTO_EXCEPCIONES,
  fechasFinDeSemana,
  fechasSemana,
  finDeSemanaSinNinos,
  guardarExcepcion,
  guardarFinDeSemanaSinNinos,
  indiceDiaSemana,
  type ExcepcionesCalendario,
} from '../services/excepcionesCalendario';
import {
  formatearPostreMenu,
  iconoRecetaPostre,
  obtenerOpcionesEspeciales,
} from '../services/menu';
import { esRecetaPostre } from '../services/recetas';

type MenuProps = {
  menu: DiaMenu[];
  planMensual: SemanaMenu[];
  semanaActiva: number;
  guardar: (nuevoMenu: DiaMenu[]) => void;
  seleccionarSemana: (indice: number) => void;
  mesActivo: string;
  cambiarMes: (desplazamiento: number) => void;
  excluirSemana: (indice: number, excluida?: boolean) => void;
  generarNuevoMes: () => void;
  reiniciarMes: () => void;
};

const RESULTADOS: Array<{
  valor: ResultadoComida;
  icono: string;
  texto: string;
}> = [
  { valor: 'gusto', icono: '😍', texto: 'Gustó' },
  { valor: 'sobro', icono: '🍽️', texto: 'Sobró' },
  { valor: 'falto', icono: '📈', texto: 'Faltó' },
  { valor: 'no_gusto', icono: '🙅', texto: 'No gustó' },
];

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function fmtMes(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number);
  return new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(anio, numero - 1, 1));
}

function fmtRango(semana: SemanaMenu): string {
  if (!semana.inicio || !semana.fin) return semana.nombre;
  const [anio, mes] = semana.inicio.split('-').map(Number);
  const inicio = Number(semana.inicio.slice(8, 10));
  const fin = Number(semana.fin.slice(8, 10));
  const abreviatura = new Intl.DateTimeFormat('es-ES', { month: 'short' })
    .format(new Date(anio, mes - 1, 1))
    .replace('.', '')
    .toUpperCase();
  return `${inicio}–${fin} ${abreviatura}`;
}

function etiquetaExcepcion(
  excepcion: ExcepcionesCalendario[string] | undefined,
): string {
  if (!excepcion) return '';
  if (excepcion.noEnCasa || (excepcion.sinComida && excepcion.sinCena)) {
    return 'Fuera';
  }
  return [
    excepcion.sinComida ? 'Sin comida' : '',
    excepcion.sinCena ? 'Sin cena' : '',
    excepcion.sinNinos ? 'Solo adultos' : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

function tipoPostreManual(nombre: string): PostreMenu {
  if (nombre === 'Sin postre') return 'Sin postre';
  return normalizar(nombre).includes('yogur') ? 'Yogur' : 'Fruta';
}

function ValoracionPlegable({
  dia,
  momento,
  platos,
  revision,
  onValorar,
}: {
  dia: string;
  momento: MomentoMenu;
  platos: string[];
  revision: number;
  onValorar: (resultado: ResultadoComida) => void;
}) {
  void revision;
  const [abierto, setAbierto] = useState(false);
  const actual = obtenerValoracionComida(dia, momento, platos)?.resultado ?? null;
  const resultadoActual = RESULTADOS.find((resultado) => resultado.valor === actual);

  return (
    <details
      className="meal-feedback"
      open={abierto}
      onToggle={(evento) => setAbierto(evento.currentTarget.open)}
    >
      <summary>
        <span>
          {resultadoActual
            ? `${resultadoActual.icono} ${resultadoActual.texto}`
            : '✨ Valorar este menú'}
        </span>
        <small>{resultadoActual ? 'Cambiar valoración' : 'Opcional · ayuda a PFI a aprender'}</small>
      </summary>
      <div className="meal-feedback__options" aria-label={`Valorar ${momento}`}>
        {RESULTADOS.map((resultado) => (
          <button
            key={resultado.valor}
            type="button"
            aria-pressed={actual === resultado.valor}
            onClick={() => {
              onValorar(resultado.valor);
              setAbierto(false);
            }}
          >
            <span aria-hidden="true">{resultado.icono}</span>
            {resultado.texto}
          </button>
        ))}
      </div>
    </details>
  );
}

function ResumenMes({
  planMensual,
  excepciones,
  semanaActiva,
  onAbrirDia,
}: {
  planMensual: SemanaMenu[];
  excepciones: ExcepcionesCalendario;
  semanaActiva: number;
  onAbrirDia: (indiceSemana: number, fecha: string) => void;
}) {
  return (
    <details className="month-overview-details">
      <summary>
        <span>🗓️ Ver mes completo</span>
        <small>Consulta cualquier día sin perder la semana actual</small>
      </summary>
      <div className="monthly-week-rail">
        {planMensual.map((semana, indiceSemana) => {
          const fechas = fechasSemana(semana);
          return (
            <article
              key={semana.id}
              className={`monthly-week-column${indiceSemana === semanaActiva ? ' monthly-week-column--active' : ''}${semana.excluida ? ' monthly-week-column--away' : ''}`}
            >
              <header className="monthly-week-column__header">
                <span>Semana {indiceSemana + 1}</span>
                <strong>{fmtRango(semana)}</strong>
                {semana.excluida && <small>Fuera de casa</small>}
              </header>
              <div className="monthly-week-column__days">
                {fechas.map((fecha) => {
                  const dia = semana.menu[indiceDiaSemana(fecha)];
                  const excepcion = excepciones[fecha];
                  const fueraTodoElDia = semana.excluida || excepcion?.noEnCasa;
                  const comida = fueraTodoElDia
                    ? 'Fuera de casa'
                    : excepcion?.sinComida
                      ? 'Sin comida'
                      : dia?.comida.join(' + ') || 'Sin plan';
                  const cena = fueraTodoElDia
                    ? 'Fuera de casa'
                    : excepcion?.sinCena
                      ? 'Sin cena'
                      : dia?.cena.join(' + ') || 'Sin plan';

                  return (
                    <button
                      type="button"
                      key={fecha}
                      className={`monthly-week-day${fueraTodoElDia ? ' monthly-week-day--away' : ''}`}
                      onClick={() => onAbrirDia(indiceSemana, fecha)}
                    >
                      <span className="monthly-week-day__date">
                        <b>{dia?.dia?.slice(0, 3) ?? 'Día'}</b>
                        <strong>{fecha.slice(8, 10)}</strong>
                      </span>
                      <span className="monthly-week-day__meals">
                        <small>🍽️ {comida}</small>
                        <small>🌙 {cena}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </details>
  );
}

export default function MenuModern({
  menu,
  planMensual,
  semanaActiva,
  guardar,
  seleccionarSemana,
  mesActivo,
  cambiarMes,
  excluirSemana,
  generarNuevoMes,
  reiniciarMes,
}: MenuProps) {
  const { recetas } = useRecetas();
  const [diaActivo, setDiaActivo] = useState(0);
  const [, setRevisionExcepciones] = useState(0);
  const [revisionAprendizaje, setRevisionAprendizaje] = useState(0);
  const [editorMomento, setEditorMomento] = useState<MomentoMenu | null>(null);
  const [seleccionEditor, setSeleccionEditor] = useState<string[]>([]);
  const [busquedaEditor, setBusquedaEditor] = useState('');
  const [errorEditor, setErrorEditor] = useState('');
  const [mensaje, setMensaje] = useState('');

  const indiceSemanaSeguro = planMensual.length === 0
    ? 0
    : Math.max(0, Math.min(semanaActiva, planMensual.length - 1));
  const semana = planMensual[indiceSemanaSeguro];
  const fechas = useMemo(() => (semana ? fechasSemana(semana) : []), [semana]);
  const excepciones = cargarExcepciones();
  const fechaActiva = fechas[diaActivo] ?? fechas[0];
  const indiceMenu = fechaActiva ? indiceDiaSemana(fechaActiva) : diaActivo;
  const dia = menu[indiceMenu] ?? menu[0];
  const excepcion = fechaActiva ? excepciones[fechaActiva] : undefined;
  const mesBonito = fmtMes(mesActivo);
  const tieneFinDeSemana = Boolean(semana && fechasFinDeSemana(semana).length);
  const ninosFueraElFinDeSemana = finDeSemanaSinNinos(semana, excepciones);
  const diaEsFinDeSemana = Boolean(fechaActiva && indiceDiaSemana(fechaActiva) >= 5);
  const preparacionesSemana = fechas.flatMap((fecha) => {
    const diaSemana = menu[indiceDiaSemana(fecha)];
    const excepcionFecha = excepciones[fecha];
    const preparacion = diaSemana?.preparar?.trim() ?? '';
    if (
      !preparacion ||
      /nada pendiente/i.test(preparacion) ||
      excepcionFecha?.noEnCasa
    ) {
      return [];
    }
    return [{
      fecha,
      dia: diaSemana?.dia ?? 'Día',
      texto: preparacion,
    }];
  });

  const recetasPlato = useMemo(
    () =>
      recetas
        .filter((receta) => !esRecetaPostre(receta))
        .map((receta) => receta.nombre)
        .sort((a, b) => a.localeCompare(b, 'es')),
    [recetas],
  );
  const postres = useMemo(
    () => [
      'Sin postre',
      ...recetas
        .filter(esRecetaPostre)
        .map((receta) => receta.nombre)
        .sort((a, b) => a.localeCompare(b, 'es')),
    ],
    [recetas],
  );
  const platosDisponibles = useMemo(
    () => Array.from(new Set([...recetasPlato, ...obtenerOpcionesEspeciales()])),
    [recetasPlato],
  );
  const resultadosBusqueda = useMemo(() => {
    const termino = normalizar(busquedaEditor);
    return platosDisponibles
      .filter((nombre) => !termino || normalizar(nombre).includes(termino))
      .slice(0, 80);
  }, [busquedaEditor, platosDisponibles]);
  const sugerencias = useMemo(
    () =>
      editorMomento && dia
        ? obtenerSugerenciasMenu(
            dia.dia,
            editorMomento,
            editorMomento === 'comida' ? dia.comida : dia.cena,
            3,
          )
        : [],
    [dia, editorMomento, revisionAprendizaje],
  );
  const complementos = useMemo(() => {
    if (!editorMomento || seleccionEditor.length === 0) return [];
    return obtenerComplementosSugeridos(
      seleccionEditor[0],
      editorMomento,
      seleccionEditor,
      recetasPlato,
      3,
    );
  }, [editorMomento, recetasPlato, revisionAprendizaje, seleccionEditor]);

  useEffect(() => {
    const actualizar = () => setRevisionExcepciones((valor) => valor + 1);
    window.addEventListener(EVENTO_EXCEPCIONES, actualizar);
    return () => window.removeEventListener(EVENTO_EXCEPCIONES, actualizar);
  }, []);

  useEffect(() => {
    if (diaActivo >= fechas.length && fechas.length > 0) setDiaActivo(0);
  }, [diaActivo, fechas.length]);

  const cambiar = (delta: number) => {
    cambiarMes(delta);
    setDiaActivo(0);
    setEditorMomento(null);
    setMensaje('');
  };

  const marcar = (tipo: 'sinComida' | 'sinCena' | 'noEnCasa' | 'sinNinos') => {
    if (!fechaActiva) return;
    if (tipo === 'noEnCasa') {
      guardarExcepcion(
        fechaActiva,
        excepcion?.noEnCasa ? null : { noEnCasa: true },
      );
      return;
    }
    guardarExcepcion(fechaActiva, {
      ...excepcion,
      noEnCasa: false,
      [tipo]: !excepcion?.[tipo],
    });
  };

  const abrirDiaResumen = (indiceSemana: number, fecha: string) => {
    const semanaDestino = planMensual[indiceSemana];
    const fechasDestino = semanaDestino ? fechasSemana(semanaDestino) : [];
    seleccionarSemana(indiceSemana);
    setDiaActivo(Math.max(0, fechasDestino.indexOf(fecha)));
    setEditorMomento(null);
    document.querySelector('.week-switcher')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const abrirEditor = (momento: MomentoMenu) => {
    if (!dia) return;
    setEditorMomento(momento);
    setSeleccionEditor([...(momento === 'comida' ? dia.comida : dia.cena)]);
    setBusquedaEditor('');
    setErrorEditor('');
  };

  const alternarPlato = (plato: string) => {
    setSeleccionEditor((actual) =>
      actual.includes(plato)
        ? actual.filter((elemento) => elemento !== plato)
        : [...actual, plato],
    );
    setErrorEditor('');
  };

  const guardarEdicion = () => {
    if (!editorMomento || !dia) return;
    const seleccion = Array.from(
      new Set(seleccionEditor.map((plato) => plato.trim()).filter(Boolean)),
    );
    if (seleccion.length === 0) {
      setErrorEditor('Elige al menos un plato.');
      return;
    }

    crearCopiaAutomaticaSiNecesaria('antes de editar una comida del menú');
    guardar(
      menu.map((elemento, indice) =>
        indice === indiceMenu
          ? { ...elemento, [editorMomento]: seleccion }
          : elemento,
      ),
    );
    registrarEleccionMenu(dia.dia, editorMomento, seleccion);
    setRevisionAprendizaje((valor) => valor + 1);
    setEditorMomento(null);
    setMensaje('Menú actualizado · la compra se ha recalculado.');
  };

  const cambiarPostre = (momento: MomentoPostre, receta: string) => {
    if (!dia) return;
    crearCopiaAutomaticaSiNecesaria('antes de cambiar un postre del menú');
    const tipo = tipoPostreManual(receta);
    guardar(
      menu.map((elemento, indice) => {
        if (indice !== indiceMenu) return elemento;
        if (momento === 'comida') {
          return {
            ...elemento,
            postreComida: tipo,
            postreComidaReceta: receta,
            detallePostreComida: receta,
            cantidadPostreComida: tipo === 'Sin postre' ? 0 : 1,
            postreComidaManual: true,
          };
        }
        return {
          ...elemento,
          postreCena: tipo,
          postreCenaReceta: receta,
          detallePostreCena: receta,
          cantidadPostreCena: tipo === 'Sin postre' ? 0 : 1,
          postreCenaManual: true,
        };
      }),
    );
    setMensaje('Postre actualizado · la compra se ha recalculado.');
  };

  const valorar = (momento: MomentoMenu, resultado: ResultadoComida) => {
    if (!dia) return;
    const platos = momento === 'comida' ? dia.comida : dia.cena;
    registrarResultadoComida(dia.dia, momento, platos, resultado);
    setRevisionAprendizaje((valor) => valor + 1);
    setMensaje('Valoración guardada.');
  };

  const generarMesProtegido = () => {
    if (!window.confirm(
      `Se generará un menú nuevo para ${mesBonito}. Antes se guardará una copia. ¿Continuar?`,
    )) return;
    crearCopiaAutomaticaSiNecesaria('antes de generar un nuevo menú mensual');
    generarNuevoMes();
    setDiaActivo(0);
    setMensaje('Nuevo menú mensual generado.');
  };

  const reiniciarMesProtegido = () => {
    if (!window.confirm(
      `Se restaurará el menú base de ${mesBonito}. Antes se guardará una copia. ¿Continuar?`,
    )) return;
    crearCopiaAutomaticaSiNecesaria('antes de reiniciar el menú mensual');
    reiniciarMes();
    setDiaActivo(0);
    setMensaje('Menú mensual reiniciado.');
  };

  return (
    <main className="page menu-page menu-page--modern">
      <section className="modern-page-heading">
        <div>
          <span className="modern-page-heading__eyebrow">PLANIFICACIÓN</span>
          <h2>Menú</h2>
          <p>Tu semana de un vistazo. Toca cualquier comida para cambiarla.</p>
        </div>
        {mensaje && <span className="modern-status" role="status">✓ {mensaje}</span>}
      </section>

      <section className="modern-month-card" aria-label="Navegación mensual">
        <div className="modern-month-nav">
          <button type="button" onClick={() => cambiar(-1)} aria-label="Mes anterior">‹</button>
          <div>
            <small>MES ACTIVO</small>
            <strong>{mesBonito}</strong>
          </div>
          <button type="button" onClick={() => cambiar(1)} aria-label="Mes siguiente">›</button>
        </div>

        <div className="month-week-tabs">
          {planMensual.map((semanaPlan, indice) => (
            <button
              key={semanaPlan.id}
              type="button"
              className={`month-week-tab${indice === indiceSemanaSeguro ? ' month-week-tab--active' : ''}${semanaPlan.excluida ? ' month-week-tab--excluded' : ''}`}
              onClick={() => {
                seleccionarSemana(indice);
                setDiaActivo(0);
                setEditorMomento(null);
              }}
            >
              <span>{fmtRango(semanaPlan)}</span>
              {semanaPlan.excluida && <small>Fuera de casa</small>}
            </button>
          ))}
        </div>

        <details className="menu-options">
          <summary>⚙️ Opciones de esta semana</summary>
          <div className="menu-options__grid">
            <button type="button" onClick={() => excluirSemana(indiceSemanaSeguro, !semana?.excluida)}>
              {semana?.excluida ? '↩ Incluir esta semana' : '🏖️ Semana fuera de casa'}
            </button>
            {tieneFinDeSemana && !semana?.excluida && (
              <button
                type="button"
                className={ninosFueraElFinDeSemana ? 'is-active' : undefined}
                onClick={() => {
                  if (!semana) return;
                  guardarFinDeSemanaSinNinos(semana, !ninosFueraElFinDeSemana);
                }}
                aria-pressed={ninosFueraElFinDeSemana}
              >
                {ninosFueraElFinDeSemana ? '↩ Niños en casa este finde' : '👧👦 Niños fuera este finde'}
              </button>
            )}
            <button type="button" onClick={generarMesProtegido}>✨ Generar otro menú</button>
            <button type="button" onClick={reiniciarMesProtegido}>↺ Reiniciar mes</button>
          </div>
        </details>
      </section>

      {semana?.excluida ? (
        <section className="modern-empty-state">
          <span>🏖️</span>
          <h3>Semana fuera de casa</h3>
          <p>No se generará compra para estos días.</p>
        </section>
      ) : dia ? (
        <>
          <nav className="week-switcher modern-day-tabs" aria-label="Elegir día">
            {fechas.map((fecha, indice) => {
              const diaFecha = menu[indiceDiaSemana(fecha)];
              const fuera = excepciones[fecha];
              return (
                <button
                  key={fecha}
                  type="button"
                  className={indice === diaActivo ? 'week-day-button week-day-button--active' : 'week-day-button'}
                  onClick={() => {
                    setDiaActivo(indice);
                    setEditorMomento(null);
                    setMensaje('');
                  }}
                >
                  <span>{diaFecha?.dia?.slice(0, 3) ?? fecha}</span>
                  <strong>{fecha.slice(8, 10)}</strong>
                  {fuera && <small>{etiquetaExcepcion(fuera)}</small>}
                </button>
              );
            })}
          </nav>

          <details className="modern-week-prep">
            <summary>
              <span>
                <strong>Preparar con antelación</strong>
                <small>
                  {preparacionesSemana.length > 0
                    ? `${preparacionesSemana.length} tarea${preparacionesSemana.length === 1 ? '' : 's'} esta semana`
                    : 'No hay preparaciones pendientes'}
                </small>
              </span>
              <span aria-hidden="true">›</span>
            </summary>
            {preparacionesSemana.length > 0 ? (
              <div className="modern-week-prep__timeline">
                {preparacionesSemana.map((preparacion) => (
                  <article key={`${preparacion.fecha}-${preparacion.texto}`}>
                    <span>
                      <strong>{preparacion.dia}</strong>
                      <small>{preparacion.fecha.slice(8, 10)}/{preparacion.fecha.slice(5, 7)}</small>
                    </span>
                    <p>{preparacion.texto}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="modern-week-prep__empty">
                Esta semana no necesitas adelantar nada.
              </p>
            )}
          </details>

          <section className="modern-day-card">
            <header className="modern-day-card__header">
              <div>
                <span>HOY EN EL MENÚ</span>
                <h3>{dia.dia}</h3>
                <small>{fechaActiva?.slice(8, 10)}/{fechaActiva?.slice(5, 7)}</small>
              </div>
              {excepcion?.sinNinos && !excepcion.noEnCasa && (
                <span className="modern-pill">👧👦 Solo adultos</span>
              )}
            </header>

            <details className="day-adjustments">
              <summary>＋ Ajustar este día</summary>
              <div className="day-adjustments__actions">
                <button type="button" onClick={() => marcar('sinComida')} aria-pressed={excepcion?.sinComida === true}>
                  {excepcion?.sinComida ? '↩ Recuperar comida' : '🍽️ No comemos en casa'}
                </button>
                <button type="button" onClick={() => marcar('sinCena')} aria-pressed={excepcion?.sinCena === true}>
                  {excepcion?.sinCena ? '↩ Recuperar cena' : '🌙 No cenamos en casa'}
                </button>
                <button type="button" onClick={() => marcar('noEnCasa')} aria-pressed={excepcion?.noEnCasa === true}>
                  {excepcion?.noEnCasa ? '↩ Estamos en casa' : '🏖️ Fuera todo el día'}
                </button>
                {diaEsFinDeSemana && !excepcion?.noEnCasa && (
                  <button type="button" onClick={() => marcar('sinNinos')} aria-pressed={excepcion?.sinNinos === true}>
                    {excepcion?.sinNinos ? '↩ Niños en casa' : '👧👦 Niños fuera'}
                  </button>
                )}
              </div>
            </details>

            {excepcion?.noEnCasa ? (
              <div className="modern-empty-state modern-empty-state--inside">
                <span>🏖️</span>
                <h3>Fuera de casa este día</h3>
              </div>
            ) : (
              <div className="modern-meal-grid">
                <article className="modern-meal-card">
                  <header>
                    <div>
                      <span className="modern-meal-card__icon">🍽️</span>
                      <div><small>COMIDA</small><h4>Mediodía</h4></div>
                    </div>
                    {!excepcion?.sinComida && (
                      <button type="button" className="modern-edit-button" onClick={() => abrirEditor('comida')}>Editar</button>
                    )}
                  </header>
                  {excepcion?.sinComida ? (
                    <p className="modern-muted">No comemos en casa.</p>
                  ) : (
                    <>
                      <div className="modern-dish-list">
                        {dia.comida.map((plato) => <strong key={plato}>{plato}</strong>)}
                      </div>
                      <label className="modern-dessert-select">
                        <span>Postre</span>
                        <select
                          value={formatearPostreMenu(dia, 'comida')}
                          onChange={(evento) => cambiarPostre('comida', evento.target.value)}
                          aria-label="Cambiar postre de la comida"
                        >
                          {postres.map((postre) => <option key={postre} value={postre}>{iconoRecetaPostre(postre)} {postre}</option>)}
                        </select>
                      </label>
                      <ValoracionPlegable
                        dia={dia.dia}
                        momento="comida"
                        platos={dia.comida}
                        revision={revisionAprendizaje}
                        onValorar={(resultado) => valorar('comida', resultado)}
                      />
                    </>
                  )}
                </article>

                <article className="modern-meal-card">
                  <header>
                    <div>
                      <span className="modern-meal-card__icon">🌙</span>
                      <div><small>CENA</small><h4>Noche</h4></div>
                    </div>
                    {!excepcion?.sinCena && (
                      <button type="button" className="modern-edit-button" onClick={() => abrirEditor('cena')}>Editar</button>
                    )}
                  </header>
                  {excepcion?.sinCena ? (
                    <p className="modern-muted">No cenamos en casa.</p>
                  ) : (
                    <>
                      <div className="modern-dish-list">
                        {dia.cena.map((plato) => <strong key={plato}>{plato}</strong>)}
                      </div>
                      <label className="modern-dessert-select">
                        <span>Postre</span>
                        <select
                          value={formatearPostreMenu(dia, 'cena')}
                          onChange={(evento) => cambiarPostre('cena', evento.target.value)}
                          aria-label="Cambiar postre de la cena"
                        >
                          {postres.map((postre) => <option key={postre} value={postre}>{iconoRecetaPostre(postre)} {postre}</option>)}
                        </select>
                      </label>
                      <ValoracionPlegable
                        dia={dia.dia}
                        momento="cena"
                        platos={dia.cena}
                        revision={revisionAprendizaje}
                        onValorar={(resultado) => valorar('cena', resultado)}
                      />
                    </>
                  )}
                </article>
              </div>
            )}
          </section>
        </>
      ) : null}

      <ResumenMes
        planMensual={planMensual}
        excepciones={excepciones}
        semanaActiva={indiceSemanaSeguro}
        onAbrirDia={abrirDiaResumen}
      />

      {editorMomento && dia && (
        <div className="modern-modal-backdrop" role="presentation">
          <section className="modern-menu-editor" role="dialog" aria-modal="true" aria-label={`Editar ${editorMomento} de ${dia.dia}`}>
            <header className="modern-menu-editor__header">
              <div>
                <small>EDITAR MENÚ</small>
                <h3>{editorMomento === 'comida' ? '🍽️ Comida' : '🌙 Cena'} · {dia.dia}</h3>
              </div>
              <button type="button" onClick={() => setEditorMomento(null)} aria-label="Cerrar editor">×</button>
            </header>

            <div className="modern-menu-editor__selection">
              <span>Seleccionado</span>
              <div>
                {seleccionEditor.map((plato) => (
                  <button type="button" key={plato} onClick={() => alternarPlato(plato)}>{plato} ×</button>
                ))}
                {seleccionEditor.length === 0 && <small>Aún no hay platos.</small>}
              </div>
            </div>

            {sugerencias.length > 0 && (
              <section className="modern-suggestions">
                <span>🧠 PFI te sugiere</span>
                <div>
                  {sugerencias.map((sugerencia) => (
                    <button
                      type="button"
                      key={sugerencia.platos.join('|')}
                      onClick={() => setSeleccionEditor([...sugerencia.platos])}
                    >
                      <strong>{sugerencia.platos.join(' + ')}</strong>
                      <small>{sugerencia.explicacion}</small>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {complementos.length > 0 && (
              <section className="modern-complements">
                <span>Puede encajar bien</span>
                <div>
                  {complementos.map((sugerencia) => (
                    <button type="button" key={sugerencia.plato} onClick={() => alternarPlato(sugerencia.plato)}>
                      ＋ {sugerencia.plato}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <label className="modern-search-field">
              <span>Buscar en tus recetas</span>
              <input
                type="search"
                value={busquedaEditor}
                onChange={(evento) => setBusquedaEditor(evento.target.value)}
                placeholder="Salmón, tortilla, lentejas…"
                autoFocus
              />
            </label>

            <div className="modern-recipe-picker">
              {resultadosBusqueda.map((plato) => {
                const seleccionado = seleccionEditor.includes(plato);
                return (
                  <button
                    type="button"
                    key={plato}
                    aria-pressed={seleccionado}
                    onClick={() => alternarPlato(plato)}
                  >
                    <span>{seleccionado ? '✓' : '＋'}</span>
                    <strong>{plato}</strong>
                  </button>
                );
              })}
              {resultadosBusqueda.length === 0 && <p>No hay recetas con esa búsqueda.</p>}
            </div>

            {errorEditor && <p className="modern-form-error" role="alert">{errorEditor}</p>}

            <footer className="modern-menu-editor__footer">
              <button type="button" onClick={() => setEditorMomento(null)}>Cancelar</button>
              <button type="button" className="is-primary" onClick={guardarEdicion}>Guardar cambios</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
