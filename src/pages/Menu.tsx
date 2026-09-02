import { useEffect, useMemo, useState } from 'react';
import type { DiaMenu } from '../data/Menusemanal';
import type { SemanaMenu } from '../data/MenuMensual';
import {
  cargarExcepciones,
  EVENTO_EXCEPCIONES,
  fechasSemana,
  guardarExcepcion,
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

type CeldaCalendario = {
  fecha: string;
  numero: number;
  indiceSemana: number;
  dia?: DiaMenu;
  excluida: boolean;
};

const DIAS_CALENDARIO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

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

function fechaIso(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function construirCalendario(
  mesActivo: string,
  planMensual: SemanaMenu[],
): Array<CeldaCalendario | null> {
  const [anio, mes] = mesActivo.split('-').map(Number);
  const diasMes = new Date(anio, mes, 0).getDate();
  const primerDia = new Date(anio, mes - 1, 1).getDay();
  const huecosIniciales = primerDia === 0 ? 6 : primerDia - 1;
  const celdas: Array<CeldaCalendario | null> = Array.from(
    { length: huecosIniciales },
    () => null,
  );

  for (let numero = 1; numero <= diasMes; numero += 1) {
    const fecha = fechaIso(anio, mes, numero);
    const indiceSemana = planMensual.findIndex(
      (semana) =>
        Boolean(semana.inicio && semana.fin) &&
        fecha >= semana.inicio &&
        fecha <= semana.fin,
    );
    const semana = planMensual[indiceSemana];
    const dia = semana?.menu[indiceDiaSemana(fecha)];
    celdas.push({
      fecha,
      numero,
      indiceSemana,
      dia,
      excluida: semana?.excluida === true,
    });
  }

  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
}

function CalendarioMensual({
  mesActivo,
  planMensual,
  excepciones,
  onAbrirDia,
}: {
  mesActivo: string;
  planMensual: SemanaMenu[];
  excepciones: ExcepcionesCalendario;
  onAbrirDia: (celda: CeldaCalendario) => void;
}) {
  const celdas = useMemo(
    () => construirCalendario(mesActivo, planMensual),
    [mesActivo, planMensual],
  );

  return (
    <section className="monthly-menu-overview" aria-label="Vista mensual de comidas y cenas">
      <header className="monthly-menu-overview__header">
        <div>
          <span className="monthly-menu-overview__eyebrow">TODO EL MES DE UN VISTAZO</span>
          <h3>Calendario mensual</h3>
          <p>Comidas y cenas de {fmtMes(mesActivo)}. Pulsa cualquier día para abrirlo arriba.</p>
        </div>
      </header>

      <div className="monthly-menu-overview__scroll">
        <div className="monthly-menu-calendar">
          {DIAS_CALENDARIO.map((dia) => (
            <div className="monthly-menu-calendar__weekday" key={dia}>
              {dia}
            </div>
          ))}

          {celdas.map((celda, indice) => {
            if (!celda) {
              return <div className="monthly-menu-calendar__empty" key={`vacio-${indice}`} />;
            }

            const excepcion = excepciones[celda.fecha];
            const fueraTodoElDia = celda.excluida || excepcion?.noEnCasa;
            const comida = fueraTodoElDia
              ? 'Fuera de casa'
              : excepcion?.sinComida
                ? 'No comemos en casa'
                : celda.dia?.comida.join(' + ') || 'Sin plan';
            const cena = fueraTodoElDia
              ? 'Fuera de casa'
              : excepcion?.sinCena
                ? 'No cenamos en casa'
                : celda.dia?.cena.join(' + ') || 'Sin plan';

            return (
              <button
                type="button"
                key={celda.fecha}
                className={`monthly-menu-calendar__day${fueraTodoElDia ? ' monthly-menu-calendar__day--away' : ''}`}
                onClick={() => onAbrirDia(celda)}
                disabled={celda.indiceSemana < 0}
                aria-label={`Abrir menú del ${celda.numero}: comida ${comida}; cena ${cena}`}
              >
                <span className="monthly-menu-calendar__date">{celda.numero}</span>
                <span className="monthly-menu-calendar__meal">
                  <b>🍽️</b>
                  <span>{comida}</span>
                </span>
                <span className="monthly-menu-calendar__meal">
                  <b>🌙</b>
                  <span>{cena}</span>
                </span>
              </button>
            );
          })}
        </div>
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
  const [revision, setRevision] = useState(0);
  const semana = planMensual[semanaActiva];
  const fechas = useMemo(() => (semana ? fechasSemana(semana) : []), [semana]);
  const excepciones = useMemo(
    () => cargarExcepciones(),
    [revision, semana, mesActivo],
  );
  const fechaActiva = fechas[diaActivo] ?? fechas[0];
  const indiceMenu = fechaActiva ? indiceDiaSemana(fechaActiva) : diaActivo;
  const dia = menu[indiceMenu] ?? menu[0];
  const excepcion = fechaActiva ? excepciones[fechaActiva] : undefined;
  const mesBonito = fmtMes(mesActivo);

  useEffect(() => {
    const actualizar = () => setRevision((valor) => valor + 1);
    window.addEventListener(EVENTO_EXCEPCIONES, actualizar);
    return () => window.removeEventListener(EVENTO_EXCEPCIONES, actualizar);
  }, []);

  const cambiar = (delta: number) => {
    cambiarMes(delta);
    setDiaActivo(0);
  };

  const marcar = (tipo: 'sinComida' | 'sinCena' | 'noEnCasa') => {
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

  const abrirDiaCalendario = (celda: CeldaCalendario) => {
    if (celda.indiceSemana < 0) return;
    const semanaDestino = planMensual[celda.indiceSemana];
    const fechasDestino = semanaDestino ? fechasSemana(semanaDestino) : [];
    const indiceFecha = fechasDestino.indexOf(celda.fecha);
    seleccionarSemana(celda.indiceSemana);
    setDiaActivo(Math.max(0, indiceFecha));
    document.querySelector('.week-switcher')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <main className="page menu-page">
      <section className="page-intro page-intro--compact menu-intro">
        <div>
          <span className="menu-intro__eyebrow">PLANIFICADOR FAMILIAR</span>
          <h2>Menú</h2>
        </div>
      </section>

      <section className="month-switcher month-switcher--compact" aria-label="Navegación mensual">
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(82px,1fr) minmax(140px,2fr) minmax(82px,1fr)', gap: '10px', alignItems: 'stretch' }}>
          <button type="button" onClick={() => cambiar(-1)} style={{ minHeight: '48px', fontWeight: 800, fontSize: '15px' }}>
            ‹ Anterior
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800 }}>MENÚ DEL MES</span>
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
          <button type="button" onClick={generarNuevoMes}>✨ Generar nuevo mes</button>
          <button type="button" onClick={reiniciarMes}>↺ Reiniciar mes</button>
        </div>
      </section>

      {semana?.excluida ? (
        <section className="active-day active-day--today menu-excluded-state">
          <div className="menu-excluded-state__icon">🏖️</div>
          <h3>No estamos en casa</h3>
          <p>Esta semana queda fuera de la compra y del presupuesto.</p>
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
                      {fuera.noEnCasa
                        ? 'Fuera'
                        : fuera.sinComida && fuera.sinCena
                          ? 'Fuera'
                          : fuera.sinComida
                            ? 'Sin comida'
                            : 'Sin cena'}
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
            </div>

            {excepcion?.noEnCasa ? (
              <div className="menu-excluded-state">
                <div className="menu-excluded-state__icon">🏖️</div>
                <h3>Fuera de casa este día</h3>
                <p>No contará ni en la compra semanal ni en la mensual.</p>
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

      <CalendarioMensual
        mesActivo={mesActivo}
        planMensual={planMensual}
        excepciones={excepciones}
        onAbrirDia={abrirDiaCalendario}
      />
    </main>
  );
}
