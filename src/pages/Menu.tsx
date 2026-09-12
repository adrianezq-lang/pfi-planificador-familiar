import { useEffect, useMemo, useState } from 'react';
import type { DiaMenu } from '../data/Menusemanal';
import type { SemanaMenu } from '../data/MenuMensual';
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
import { formatearPostreMenu, iconoRecetaPostre } from '../services/menu';

type MenuProps = {
  menu: DiaMenu[];
  planMensual: SemanaMenu[];
  semanaActiva: number;
  seleccionarSemana: (indice: number) => void;
  mesActivo: string;
  cambiarMes: (desplazamiento: number) => void;
  excluirSemana: (indice: number, excluida?: boolean) => void;
  generarNuevoMes: () => void;
  reiniciarMes: () => void;
};

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

export default function Menu({
  menu,
  planMensual,
  semanaActiva,
  seleccionarSemana,
  mesActivo,
  cambiarMes,
  excluirSemana,
  generarNuevoMes,
  reiniciarMes,
}: MenuProps) {
  const [diaActivo, setDiaActivo] = useState(0);
  const [, setRevision] = useState(0);
  const semana = planMensual[semanaActiva];
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

  useEffect(() => {
    const actualizar = () => setRevision((valor) => valor + 1);
    window.addEventListener(EVENTO_EXCEPCIONES, actualizar);
    return () => window.removeEventListener(EVENTO_EXCEPCIONES, actualizar);
  }, []);

  const cambiar = (delta: number) => {
    cambiarMes(delta);
    setDiaActivo(0);
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
    document.querySelector('.week-switcher')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <main className="page menu-page">
      <section className="page-intro page-intro--compact menu-intro">
        <h2>Menú</h2>
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
              className={`month-week-tab${indice === semanaActiva ? ' month-week-tab--active' : ''}${s.excluida ? ' month-week-tab--excluded' : ''}`}
              onClick={() => {
                seleccionarSemana(indice);
                setDiaActivo(0);
              }}
            >
              <span>{fmtRango(s)}</span>
              {s.excluida && <small>Fuera de casa</small>}
            </button>
          ))}
        </div>

        <div className="month-week-actions">
          <button type="button" onClick={() => excluirSemana(semanaActiva, !semana?.excluida)}>
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
          <button type="button" onClick={generarNuevoMes}>✨ Generar nuevo mes</button>
          <button type="button" onClick={reiniciarMes}>↺ Reiniciar mes</button>
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
                  onClick={() => setDiaActivo(i)}
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
                  <header className="meal-panel__header"><h4>🍽️ Comida</h4></header>
                  {excepcion?.sinComida ? (
                    <p>No comemos en casa.</p>
                  ) : (
                    <>
                      <div className="meal-composition">
                        {dia.comida.map((p) => (
                          <div className="meal-dish-card meal-dish-card--primary" key={p}><strong>{p}</strong></div>
                        ))}
                      </div>
                      <div className="daily-dessert">
                        <strong>
                          {iconoRecetaPostre(formatearPostreMenu(dia, 'comida'))}{' '}
                          {formatearPostreMenu(dia, 'comida')}
                        </strong>
                      </div>
                    </>
                  )}
                </article>

                <article className="meal-panel">
                  <header className="meal-panel__header"><h4>🌙 Cena</h4></header>
                  {excepcion?.sinCena ? (
                    <p>No cenamos en casa.</p>
                  ) : (
                    <>
                      <div className="meal-composition">
                        {dia.cena.map((p) => (
                          <div className="meal-dish-card meal-dish-card--primary" key={p}><strong>{p}</strong></div>
                        ))}
                      </div>
                      <div className="daily-dessert">
                        <strong>
                          {iconoRecetaPostre(formatearPostreMenu(dia, 'cena'))}{' '}
                          {formatearPostreMenu(dia, 'cena')}
                        </strong>
                      </div>
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
        semanaActiva={semanaActiva}
        onAbrirDia={abrirDiaResumen}
      />
    </main>
  );
}
