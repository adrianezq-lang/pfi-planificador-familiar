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

const fmtMes = (mes: string) => {
  const [anio, numero] = mes.split('-').map(Number);
  return new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(anio, numero - 1, 1));
};

const fmtRango = (semana: SemanaMenu) => {
  if (!semana.inicio || !semana.fin) return semana.nombre;
  const [anio, mes] = semana.inicio.split('-').map(Number);
  const inicio = Number(semana.inicio.slice(8, 10));
  const fin = Number(semana.fin.slice(8, 10));
  const abreviatura = new Intl.DateTimeFormat('es-ES', { month: 'short' })
    .format(new Date(anio, mes - 1, 1))
    .replace('.', '')
    .toUpperCase();
  return `${inicio}–${fin} ${abreviatura}`;
};

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function etiquetaExcepcion(
  excepcion: ExcepcionesCalendario[string] | undefined,
): string {
  if (!excepcion) return '';
  if (excepcion.noEnCasa || (excepcion.sinComida && excepcion.sinCena)) {
    return 'Fuera';
  }
  const partes = [
    excepcion.sinComida ? 'Sin comida' : '',
    excepcion.sinCena ? 'Sin cena' : '',
    excepcion.sinNinos ? 'Solo adultos' : '',
  ].filter(Boolean);
  return partes.join(' · ');
}

function tipoPostreManual(nombre: string): PostreMenu {
  if (nombre === 'Sin postre') return 'Sin postre';
  return normalizar(nombre).includes('yogur') ? 'Yogur' : 'Fruta';
}

function SemanasDelMes({
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
    <section className="monthly-menu-overview" aria-label="Semanas del menú mensual">
      <header className="monthly-menu-overview__header">
        <div>
          <h3>Semanas del mes</h3>
        </div>
      </header>

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
                  const soloAdultos = !fueraTodoElDia && excepcion?.sinNinos;
                  const comida = fueraTodoElDia
                    ? 'Fuera de casa'
                    : excepcion?.sinComida
                      ? 'Sin comida en casa'
                      : dia?.comida.join(' + ') || 'Sin plan';
                  const cena = fueraTodoElDia
                    ? 'Fuera de casa'
                    : excepcion?.sinCena
                      ? 'Sin cena en casa'
                      : dia?.cena.join(' + ') || 'Sin plan';

                  return (
                    <button
                      type="button"
                      key={fecha}
                      className={`monthly-week-day${fueraTodoElDia ? ' monthly-week-day--away' : ''}${soloAdultos ? ' monthly-week-day--adults' : ''}`}
                      onClick={() => onAbrirDia(indiceSemana, fecha)}
                      aria-label={`Abrir ${dia?.dia ?? fecha}, ${fecha.slice(8, 10)}: comida ${comida}; cena ${cena}${soloAdultos ? '; solo adultos en casa' : ''}`}
                    >
                      <span className="monthly-week-day__date">
                        <b>{dia?.dia?.slice(0, 3) ?? 'Día'}</b>
                        <strong>{fecha.slice(8, 10)}</strong>
                      </span>
                      <span className="monthly-week-day__meals">
                        {soloAdultos && <small className="monthly-week-day__exception">👧👦 Solo adultos</small>}
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
    </section>
  );
}

function Valoracion({
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
  const actual = obtenerValoracionComida(dia, momento, platos)?.resultado ?? null;

  return (
    <div style={estiloValoracion} aria-label={`Valorar ${momento}`}>
      <span style={estiloValoracionTitulo}>¿Cómo fue?</span>
      <div style={estiloValoracionBotones}>
        {RESULTADOS.map((resultado) => (
          <button
            key={resultado.valor}
            type="button"
            aria-pressed={actual === resultado.valor}
            onClick={() => onValorar(resultado.valor)}
            style={botonValoracion(actual === resultado.valor)}
          >
            <span aria-hidden="true">{resultado.icono}</span> {resultado.texto}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Menu({
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
    if (!termino) return platosDisponibles.slice(0, 80);
    return platosDisponibles
      .filter((nombre) => normalizar(nombre).includes(termino))
      .slice(0, 80);
  }, [busquedaEditor, platosDisponibles]);
  const sugerencias = useMemo(
    () => {
      void revisionAprendizaje;
      return editorMomento && dia
        ? obtenerSugerenciasMenu(
            dia.dia,
            editorMomento,
            editorMomento === 'comida' ? dia.comida : dia.cena,
            3,
          )
        : [];
    },
    [dia, editorMomento, revisionAprendizaje],
  );
  const complementos = useMemo(() => {
    void revisionAprendizaje;
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

  const alternarFinDeSemanaSinNinos = () => {
    if (!semana) return;
    guardarFinDeSemanaSinNinos(semana, !ninosFueraElFinDeSemana);
  };

  const abrirDiaResumen = (indiceSemana: number, fecha: string) => {
    const semanaDestino = planMensual[indiceSemana];
    const fechasDestino = semanaDestino ? fechasSemana(semanaDestino) : [];
    const indiceFecha = fechasDestino.indexOf(fecha);
    seleccionarSemana(indiceSemana);
    setDiaActivo(Math.max(0, indiceFecha));
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
    const actualizado = menu.map((elemento, indice) =>
      indice === indiceMenu
        ? { ...elemento, [editorMomento]: seleccion }
        : elemento,
    );
    guardar(actualizado);
    registrarEleccionMenu(dia.dia, editorMomento, seleccion);
    setRevisionAprendizaje((valor) => valor + 1);
    setEditorMomento(null);
    setMensaje(
      `${editorMomento === 'comida' ? 'Comida' : 'Cena'} actualizada. La compra se recalculará automáticamente.`,
    );
  };

  const cambiarPostre = (momento: MomentoPostre, receta: string) => {
    if (!dia) return;
    crearCopiaAutomaticaSiNecesaria('antes de cambiar un postre del menú');
    const tipo = tipoPostreManual(receta);
    const actualizado = menu.map((elemento, indice) => {
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
    });
    guardar(actualizado);
    setMensaje('Postre actualizado. La compra se recalculará automáticamente.');
  };

  const valorar = (momento: MomentoMenu, resultado: ResultadoComida) => {
    if (!dia) return;
    const platos = momento === 'comida' ? dia.comida : dia.cena;
    registrarResultadoComida(dia.dia, momento, platos, resultado);
    setRevisionAprendizaje((valor) => valor + 1);
    setMensaje('Valoración guardada. PFI la usará para afinar futuras sugerencias y cantidades.');
  };

  const generarMesProtegido = () => {
    const confirmado = window.confirm(
      `Se generará un menú nuevo para ${mesBonito} y se sustituirán los cambios manuales de este mes. Antes se guardará una copia automática. ¿Continuar?`,
    );
    if (!confirmado) return;
    crearCopiaAutomaticaSiNecesaria('antes de generar un nuevo menú mensual');
    generarNuevoMes();
    setDiaActivo(0);
    setMensaje('Nuevo menú mensual generado.');
  };

  const reiniciarMesProtegido = () => {
    const confirmado = window.confirm(
      `Se restaurará el menú base de ${mesBonito} y se perderán los cambios manuales de este mes. Antes se guardará una copia automática. ¿Continuar?`,
    );
    if (!confirmado) return;
    crearCopiaAutomaticaSiNecesaria('antes de reiniciar el menú mensual');
    reiniciarMes();
    setDiaActivo(0);
    setMensaje('Menú mensual reiniciado.');
  };

  return (
    <main className="page menu-page">
      <section className="page-intro page-intro--compact menu-intro">
        <h2>Menú</h2>
        <p style={{ margin: '6px 0 0', color: '#647066' }}>
          Edita cualquier comida, valora lo que funciona y PFI ajustará compra y sugerencias.
        </p>
        {mensaje && <p role="status" style={estiloMensaje}>{mensaje}</p>}
      </section>

      <section className="month-switcher month-switcher--compact" aria-label="Navegación mensual">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(82px,1fr) minmax(140px,2fr) minmax(82px,1fr)', gap: '10px', alignItems: 'stretch' }}>
          <button type="button" onClick={() => cambiar(-1)} style={{ minHeight: '48px', fontWeight: 800, fontSize: '15px' }}>
            ‹ Anterior
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <strong style={{ textTransform: 'capitalize' }}>{mesBonito}</strong>
          </div>
          <button type="button" onClick={() => cambiar(1)} style={{ minHeight: '48px', fontWeight: 800, fontSize: '15px' }}>
            Siguiente ›
          </button>
        </div>

        <div className="month-week-tabs">
          {planMensual.map((s, indice) => (
            <button
              key={s.id}
              type="button"
              className={`month-week-tab${indice === indiceSemanaSeguro ? ' month-week-tab--active' : ''}${s.excluida ? ' month-week-tab--excluded' : ''}`}
              onClick={() => {
                seleccionarSemana(indice);
                setDiaActivo(0);
                setEditorMomento(null);
              }}
            >
              <span>{fmtRango(s)}</span>
              {s.excluida && <small>Fuera de casa</small>}
            </button>
          ))}
        </div>

        <div className="month-week-actions">
          <button type="button" onClick={() => excluirSemana(indiceSemanaSeguro, !semana?.excluida)}>
            {semana?.excluida ? '↩ Incluir esta semana' : '🏖️ No estamos en casa esta semana'}
          </button>
          {tieneFinDeSemana && !semana?.excluida && (
            <button
              type="button"
              className={ninosFueraElFinDeSemana ? 'month-week-action--active' : undefined}
              onClick={alternarFinDeSemanaSinNinos}
              aria-pressed={ninosFueraElFinDeSemana}
            >
              {ninosFueraElFinDeSemana
                ? '↩ Niños en casa este finde'
                : '👧👦 Niños fuera este finde'}
            </button>
          )}
          <button type="button" onClick={generarMesProtegido}>✨ Generar nuevo mes</button>
          <button type="button" onClick={reiniciarMesProtegido}>↺ Reiniciar mes</button>
        </div>
      </section>

      {semana?.excluida ? (
        <section className="active-day active-day--today menu-excluded-state">
          <div className="menu-excluded-state__icon">🏖️</div>
          <h3>Semana fuera de casa</h3>
        </section>
      ) : dia ? (
        <>
          <nav
            className="week-switcher"
            aria-label="Elegir día"
            style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, fechas.length)}, minmax(0, 1fr))`, gap: '10px' }}
          >
            {fechas.map((fecha, i) => {
              const d = menu[indiceDiaSemana(fecha)];
              const fuera = excepciones[fecha];
              return (
                <button
                  key={fecha}
                  type="button"
                  className={i === diaActivo ? 'week-day-button week-day-button--active' : 'week-day-button'}
                  onClick={() => {
                    setDiaActivo(i);
                    setEditorMomento(null);
                    setMensaje('');
                  }}
                >
                  <span>{d?.dia ?? fecha}</span>
                  {fuera && (
                    <small style={{ display: 'block' }}>
                      {etiquetaExcepcion(fuera)}
                    </small>
                  )}
                </button>
              );
            })}
          </nav>

          <section className="active-day active-day--today">
            <header className="active-day__header">
              <div>
                <span className="active-day__eyebrow">
                  MENÚ DEL DÍA · {fechaActiva?.slice(8, 10)}/{fechaActiva?.slice(5, 7)}
                </span>
                <h3>{dia.dia}</h3>
              </div>
            </header>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <button type="button" onClick={() => marcar('sinComida')} aria-pressed={excepcion?.sinComida === true}>
                {excepcion?.sinComida ? '↩ Recuperar comida' : '🍽️ No comemos en casa'}
              </button>
              <button type="button" onClick={() => marcar('sinCena')} aria-pressed={excepcion?.sinCena === true}>
                {excepcion?.sinCena ? '↩ Recuperar cena' : '🌙 No cenamos en casa'}
              </button>
              <button type="button" onClick={() => marcar('noEnCasa')} aria-pressed={excepcion?.noEnCasa === true}>
                {excepcion?.noEnCasa ? '↩ Volvemos a estar en casa' : '🏖️ Fuera todo el día'}
              </button>
              {diaEsFinDeSemana && !excepcion?.noEnCasa && (
                <button type="button" onClick={() => marcar('sinNinos')} aria-pressed={excepcion?.sinNinos === true}>
                  {excepcion?.sinNinos ? '↩ Niños en casa este día' : '👧👦 Niños fuera este día'}
                </button>
              )}
            </div>

            {excepcion?.sinNinos && !excepcion.noEnCasa && (
              <p className="menu-adults-only" role="status">
                👧👦 Solo adultos · cantidades ajustadas
              </p>
            )}

            {excepcion?.noEnCasa ? (
              <div className="menu-excluded-state">
                <div className="menu-excluded-state__icon">🏖️</div>
                <h3>Fuera de casa este día</h3>
              </div>
            ) : (
              <div className="active-day__meals">
                <article className="meal-panel">
                  <header className="meal-panel__header" style={estiloCabeceraComida}>
                    <h4>🍽️ Comida</h4>
                    {!excepcion?.sinComida && (
                      <button type="button" onClick={() => abrirEditor('comida')} style={estiloBotonEditar}>
                        ✏️ Editar
                      </button>
                    )}
                  </header>
                  {excepcion?.sinComida ? (
                    <p>No comemos en casa.</p>
                  ) : (
                    <>
                      <div className="meal-composition">
                        {dia.comida.map((p) => (
                          <div className="meal-dish-card meal-dish-card--primary" key={p}><strong>{p}</strong></div>
                        ))}
                      </div>
                      <label className="daily-dessert" style={estiloPostreEditable}>
                        <strong>
                          {iconoRecetaPostre(formatearPostreMenu(dia, 'comida'))}{' '}
                          {formatearPostreMenu(dia, 'comida')}
                        </strong>
                        <select
                          value={formatearPostreMenu(dia, 'comida')}
                          onChange={(evento) => cambiarPostre('comida', evento.target.value)}
                          aria-label="Cambiar postre de la comida"
                          style={estiloSelectPostre}
                        >
                          {postres.map((postre) => <option key={postre} value={postre}>{postre}</option>)}
                        </select>
                      </label>
                      <Valoracion
                        dia={dia.dia}
                        momento="comida"
                        platos={dia.comida}
                        revision={revisionAprendizaje}
                        onValorar={(resultado) => valorar('comida', resultado)}
                      />
                    </>
                  )}
                </article>

                <article className="meal-panel">
                  <header className="meal-panel__header" style={estiloCabeceraComida}>
                    <h4>🌙 Cena</h4>
                    {!excepcion?.sinCena && (
                      <button type="button" onClick={() => abrirEditor('cena')} style={estiloBotonEditar}>
                        ✏️ Editar
                      </button>
                    )}
                  </header>
                  {excepcion?.sinCena ? (
                    <p>No cenamos en casa.</p>
                  ) : (
                    <>
                      <div className="meal-composition">
                        {dia.cena.map((p) => (
                          <div className="meal-dish-card meal-dish-card--primary" key={p}><strong>{p}</strong></div>
                        ))}
                      </div>
                      <label className="daily-dessert" style={estiloPostreEditable}>
                        <strong>
                          {iconoRecetaPostre(formatearPostreMenu(dia, 'cena'))}{' '}
                          {formatearPostreMenu(dia, 'cena')}
                        </strong>
                        <select
                          value={formatearPostreMenu(dia, 'cena')}
                          onChange={(evento) => cambiarPostre('cena', evento.target.value)}
                          aria-label="Cambiar postre de la cena"
                          style={estiloSelectPostre}
                        >
                          {postres.map((postre) => <option key={postre} value={postre}>{postre}</option>)}
                        </select>
                      </label>
                      <Valoracion
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

      <SemanasDelMes
        planMensual={planMensual}
        excepciones={excepciones}
        semanaActiva={indiceSemanaSeguro}
        onAbrirDia={abrirDiaResumen}
      />

      {editorMomento && dia && (
        <div style={estiloFondoEditor} role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Editar ${editorMomento} de ${dia.dia}`}
            style={estiloEditor}
          >
            <header style={estiloEditorCabecera}>
              <div>
                <small style={estiloEyebrow}>EDITAR MENÚ</small>
                <h3 style={{ margin: '4px 0 0', color: '#344d39' }}>
                  {editorMomento === 'comida' ? '🍽️ Comida' : '🌙 Cena'} · {dia.dia}
                </h3>
              </div>
              <button type="button" onClick={() => setEditorMomento(null)} style={estiloCerrarEditor} aria-label="Cerrar editor">
                ×
              </button>
            </header>

            <div style={estiloSeleccionEditor}>
              <strong>Tu selección</strong>
              <div style={estiloChips}>
                {seleccionEditor.map((plato) => (
                  <button
                    type="button"
                    key={plato}
                    onClick={() => alternarPlato(plato)}
                    style={estiloChipSeleccionado}
                    aria-label={`Quitar ${plato}`}
                  >
                    {plato} ×
                  </button>
                ))}
                {seleccionEditor.length === 0 && <span style={{ color: '#777' }}>Aún no hay platos.</span>}
              </div>
            </div>

            {sugerencias.length > 0 && (
              <section style={estiloBloqueSugerencias}>
                <strong>🧠 Sugerencias aprendidas</strong>
                <div style={estiloSugerenciasGrid}>
                  {sugerencias.map((sugerencia) => (
                    <button
                      type="button"
                      key={sugerencia.platos.join('|')}
                      onClick={() => setSeleccionEditor([...sugerencia.platos])}
                      style={estiloSugerencia}
                    >
                      <b>{sugerencia.platos.join(' + ')}</b>
                      <small>{sugerencia.explicacion}</small>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {complementos.length > 0 && (
              <section style={estiloBloqueSugerencias}>
                <strong>＋ Puede encajar bien</strong>
                <div style={estiloChips}>
                  {complementos.map((sugerencia) => (
                    <button
                      type="button"
                      key={sugerencia.plato}
                      onClick={() => alternarPlato(sugerencia.plato)}
                      style={estiloChipSugerencia}
                      title={sugerencia.explicacion}
                    >
                      ＋ {sugerencia.plato}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <label style={estiloBuscadorEditor}>
              <span>Buscar en el recetario</span>
              <input
                type="search"
                value={busquedaEditor}
                onChange={(evento) => setBusquedaEditor(evento.target.value)}
                placeholder="Ej. salmón, tortilla, lentejas…"
                autoFocus
                style={estiloInputEditor}
              />
            </label>

            <div style={estiloListaRecetas}>
              {resultadosBusqueda.map((plato) => {
                const seleccionado = seleccionEditor.includes(plato);
                return (
                  <button
                    type="button"
                    key={plato}
                    aria-pressed={seleccionado}
                    onClick={() => alternarPlato(plato)}
                    style={botonReceta(seleccionado)}
                  >
                    <span>{seleccionado ? '✓' : '＋'}</span>
                    <strong>{plato}</strong>
                  </button>
                );
              })}
              {resultadosBusqueda.length === 0 && (
                <p style={{ color: '#777' }}>No hay recetas con esa búsqueda.</p>
              )}
            </div>

            {errorEditor && <p role="alert" style={estiloError}>{errorEditor}</p>}

            <footer style={estiloPieEditor}>
              <button type="button" onClick={() => setEditorMomento(null)} style={estiloCancelar}>
                Cancelar
              </button>
              <button type="button" onClick={guardarEdicion} style={estiloGuardar}>
                Guardar {editorMomento}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}

const estiloMensaje = {
  margin: '12px 0 0',
  padding: '10px 12px',
  borderRadius: 12,
  background: '#edf5ea',
  color: '#3f6245',
  fontWeight: 750,
} as const;

const estiloCabeceraComida = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
} as const;

const estiloBotonEditar = {
  border: '1px solid #d5dfd2',
  background: '#f7faf5',
  color: '#4f6f52',
  borderRadius: 10,
  padding: '7px 10px',
  fontWeight: 800,
  cursor: 'pointer',
} as const;

const estiloPostreEditable = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  flexWrap: 'wrap',
} as const;

const estiloSelectPostre = {
  minWidth: 150,
  maxWidth: '100%',
  border: '1px solid #d8dfd5',
  borderRadius: 9,
  padding: '7px 9px',
  background: '#fff',
  color: '#3d4c40',
  font: 'inherit',
} as const;

const estiloValoracion = {
  marginTop: 12,
  paddingTop: 12,
  borderTop: '1px solid #e7ece5',
} as const;

const estiloValoracionTitulo = {
  display: 'block',
  marginBottom: 8,
  fontSize: 12,
  fontWeight: 850,
  color: '#667067',
} as const;

const estiloValoracionBotones = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 7,
} as const;

const botonValoracion = (activo: boolean) => ({
  border: activo ? '1px solid #66836a' : '1px solid #d9e0d7',
  background: activo ? '#e4eee1' : '#fff',
  color: activo ? '#35543a' : '#5e685f',
  borderRadius: 999,
  padding: '7px 9px',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
});

const estiloFondoEditor = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(27, 36, 29, 0.58)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  padding: '18px 12px',
  overflowY: 'auto',
} as const;

const estiloEditor = {
  width: 'min(760px, 100%)',
  maxHeight: '92vh',
  overflowY: 'auto',
  background: '#fbfaf6',
  borderRadius: 22,
  boxShadow: '0 24px 70px rgba(0,0,0,.25)',
  padding: 18,
} as const;

const estiloEditorCabecera = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
  position: 'sticky',
  top: -18,
  zIndex: 3,
  background: '#fbfaf6',
  padding: '18px 0 12px',
} as const;

const estiloEyebrow = {
  color: '#7b887c',
  fontWeight: 900,
  letterSpacing: '.08em',
} as const;

const estiloCerrarEditor = {
  width: 38,
  height: 38,
  borderRadius: 999,
  border: '1px solid #d8dfd5',
  background: '#fff',
  fontSize: 25,
  lineHeight: 1,
  cursor: 'pointer',
} as const;

const estiloSeleccionEditor = {
  padding: 12,
  borderRadius: 14,
  background: '#eef4eb',
  marginBottom: 12,
} as const;

const estiloChips = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 7,
  marginTop: 8,
} as const;

const estiloChipSeleccionado = {
  border: '1px solid #79917b',
  background: '#fff',
  color: '#3d5b42',
  borderRadius: 999,
  padding: '7px 10px',
  fontWeight: 800,
  cursor: 'pointer',
} as const;

const estiloBloqueSugerencias = {
  margin: '12px 0',
} as const;

const estiloSugerenciasGrid = {
  display: 'grid',
  gap: 8,
  marginTop: 8,
} as const;

const estiloSugerencia = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 3,
  width: '100%',
  border: '1px solid #d9e3d6',
  background: '#f6faf4',
  color: '#3f5743',
  borderRadius: 12,
  padding: '10px 12px',
  textAlign: 'left',
  cursor: 'pointer',
} as const;

const estiloChipSugerencia = {
  border: '1px solid #ded9c9',
  background: '#fffaf0',
  color: '#665937',
  borderRadius: 999,
  padding: '7px 10px',
  fontWeight: 800,
  cursor: 'pointer',
} as const;

const estiloBuscadorEditor = {
  display: 'grid',
  gap: 6,
  margin: '14px 0 10px',
  color: '#526055',
  fontWeight: 800,
  fontSize: 13,
} as const;

const estiloInputEditor = {
  width: '100%',
  border: '1px solid #ccd6ca',
  borderRadius: 12,
  padding: '12px 13px',
  background: '#fff',
  font: 'inherit',
  boxSizing: 'border-box',
} as const;

const estiloListaRecetas = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
  gap: 8,
  maxHeight: '38vh',
  overflowY: 'auto',
  padding: '2px 2px 8px',
} as const;

const botonReceta = (activo: boolean) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  textAlign: 'left' as const,
  border: activo ? '1px solid #66836a' : '1px solid #e0e4dd',
  background: activo ? '#e5efe2' : '#fff',
  color: '#34463a',
  borderRadius: 12,
  padding: '10px 11px',
  cursor: 'pointer',
});

const estiloError = {
  padding: '9px 11px',
  borderRadius: 10,
  background: '#fff0ed',
  color: '#8a3f35',
  fontWeight: 750,
} as const;

const estiloPieEditor = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 9,
  position: 'sticky',
  bottom: -18,
  background: '#fbfaf6',
  padding: '12px 0 18px',
  marginTop: 10,
} as const;

const estiloCancelar = {
  border: '1px solid #d8dfd5',
  background: '#fff',
  color: '#59625a',
  borderRadius: 11,
  padding: '10px 13px',
  fontWeight: 800,
  cursor: 'pointer',
} as const;

const estiloGuardar = {
  border: 0,
  background: '#4f6f52',
  color: '#fff',
  borderRadius: 11,
  padding: '10px 14px',
  fontWeight: 900,
  cursor: 'pointer',
} as const;
