import { useState } from 'react';
import type { DiaMenu } from '../data/Menusemanal';
import type { SemanaMenu } from '../data/MenuMensual';

type MenuProps = {
  menu: DiaMenu[];
  guardarMenu?: (nuevoMenu: DiaMenu[]) => void;
  planMensual: SemanaMenu[];
  guardarPlan?: (nuevoPlan: SemanaMenu[], indice?: number) => void;
  semanaActiva: number;
  seleccionarSemana: (indice: number) => void;
  mesActivo?: string;
  cambiarMes?: (desplazamiento: number) => void;
  excluirSemana?: (indice: number, excluida?: boolean) => void;
};

const fmtMes = (mes: string) => {
  const [anio, numero] = mes.split('-').map(Number);
  return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(anio, numero - 1, 1));
};

export default function Menu({ menu, planMensual, semanaActiva, seleccionarSemana, mesActivo = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`, cambiarMes, excluirSemana }: MenuProps) {
  const [diaActivo, setDiaActivo] = useState(0);
  const dia = menu[diaActivo] ?? menu[0];
  const mesBonito = fmtMes(mesActivo);

  if (!dia) return null;

  return (
    <main className="page menu-page">
      <section className="page-intro page-intro--compact menu-intro">
        <div><span className="menu-intro__eyebrow">PLANIFICADOR FAMILIAR</span><h2>Menú</h2><p>{mesBonito}</p></div>
      </section>

      <section className="month-switcher month-switcher--compact" aria-label="Navegación mensual">
        <div className="month-switcher__heading">
          <button type="button" onClick={() => cambiarMes?.(-1)} aria-label="Mes anterior">‹</button>
          <div><span>MENÚ DEL MES</span><strong>{mesBonito}</strong></div>
          <button type="button" onClick={() => cambiarMes?.(1)} aria-label="Mes siguiente">›</button>
        </div>
        <div className="month-week-tabs">
          {planMensual.map((semana, indice) => {
            const rango = semana.inicio && semana.fin
              ? `${Number(semana.inicio.slice(8, 10))}–${Number(semana.fin.slice(8, 10))} SEP`
              : semana.nombre;
            return (
              <button
                key={semana.id}
                type="button"
                className={`month-week-tab${indice === semanaActiva ? ' month-week-tab--active' : ''}${semana.excluida ? ' month-week-tab--excluded' : ''}`}
                onClick={() => { seleccionarSemana(indice); setDiaActivo(0); }}
              >
                <span>{rango}</span>
                {semana.excluida && <small>Fuera de casa</small>}
              </button>
            );
          })}
        </div>
        <div className="month-week-actions">
          <button type="button" onClick={() => excluirSemana?.(semanaActiva, !planMensual[semanaActiva]?.excluida)}>
            {planMensual[semanaActiva]?.excluida ? '↩ Incluir esta semana' : '🏖️ No estamos en casa esta semana'}
          </button>
        </div>
      </section>

      {!planMensual[semanaActiva]?.excluida && (
        <>
          <nav className="week-switcher" aria-label="Elegir día">
            {menu.map((d, i) => <button key={d.dia} type="button" className={i === diaActivo ? 'week-day-button week-day-button--active' : 'week-day-button'} onClick={() => setDiaActivo(i)}>{d.dia}</button>)}
          </nav>
          <section className="active-day active-day--today">
            <header className="active-day__header"><div><span className="active-day__eyebrow">MENÚ DEL DÍA</span><h3>{dia.dia}</h3></div></header>
            <div className="active-day__meals">
              <article className="meal-panel"><header className="meal-panel__header"><h4>🍽️ Comida</h4></header><div className="meal-composition">{dia.comida.map((p) => <div className="meal-dish-card meal-dish-card--primary" key={p}><strong>{p}</strong></div>)}</div><div className="daily-dessert"><strong>🍓 {dia.postreComida ?? 'Sin postre'}</strong></div></article>
              <article className="meal-panel"><header className="meal-panel__header"><h4>🌙 Cena</h4></header><div className="meal-composition">{dia.cena.map((p) => <div className="meal-dish-card meal-dish-card--primary" key={p}><strong>{p}</strong></div>)}</div><div className="daily-dessert"><strong>🥛 {dia.postreCena ?? 'Sin postre'}</strong></div></article>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
