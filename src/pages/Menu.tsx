import { useEffect, useMemo, useState } from 'react';
import type { DiaMenu } from '../data/Menusemanal';
import type { SemanaMenu } from '../data/MenuMensual';
import { cargarExcepciones, EVENTO_EXCEPCIONES, fechasSemana, guardarExcepcion, indiceDiaSemana } from '../services/excepcionesCalendario';

type MenuProps = { menu: DiaMenu[]; planMensual: SemanaMenu[]; semanaActiva: number; seleccionarSemana: (indice: number) => void; mesActivo: string; cambiarMes: (desplazamiento: number) => void; excluirSemana: (indice: number, excluida?: boolean) => void; generarNuevoMes: () => void; reiniciarMes: () => void; };
const fmtMes = (mes: string) => { const [anio, numero] = mes.split('-').map(Number); return new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(anio, numero - 1, 1)); };
const fmtRango = (semana: SemanaMenu) => { if (!semana.inicio || !semana.fin) return semana.nombre; const [anio, mes] = semana.inicio.split('-').map(Number); const inicio = Number(semana.inicio.slice(8, 10)); const fin = Number(semana.fin.slice(8, 10)); const abreviatura = new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(anio, mes - 1, 1)).replace('.', '').toUpperCase(); return `${inicio}–${fin} ${abreviatura}`; };

export default function Menu({ menu, planMensual, semanaActiva, seleccionarSemana, mesActivo, cambiarMes, excluirSemana, generarNuevoMes, reiniciarMes }: MenuProps) {
  const [diaActivo, setDiaActivo] = useState(0);
  const [revision, setRevision] = useState(0);
  const semana = planMensual[semanaActiva];
  const fechas = useMemo(() => fechasSemana(semana), [semana]);
  const excepciones = useMemo(() => cargarExcepciones(), [revision, semana, mesActivo]);
  const fechaActiva = fechas[diaActivo] ?? fechas[0];
  const indiceMenu = fechaActiva ? indiceDiaSemana(fechaActiva) : diaActivo;
  const dia = menu[indiceMenu] ?? menu[0];
  const excepcion = fechaActiva ? excepciones[fechaActiva] : undefined;
  const mesBonito = fmtMes(mesActivo);

  useEffect(() => { const actualizar = () => setRevision((valor) => valor + 1); window.addEventListener(EVENTO_EXCEPCIONES, actualizar); return () => window.removeEventListener(EVENTO_EXCEPCIONES, actualizar); }, []);
  const cambiar = (delta: number) => { cambiarMes(delta); setDiaActivo(0); };
  const marcar = (tipo: 'sinComida' | 'sinCena' | 'noEnCasa') => {
    if (!fechaActiva) return;
    if (tipo === 'noEnCasa') { guardarExcepcion(fechaActiva, excepcion?.noEnCasa ? null : { noEnCasa: true }); return; }
    guardarExcepcion(fechaActiva, { ...excepcion, noEnCasa: false, [tipo]: !excepcion?.[tipo] });
  };

  return <main className="page menu-page">
    <section className="page-intro page-intro--compact menu-intro"><div><span className="menu-intro__eyebrow">PLANIFICADOR FAMILIAR</span><h2>Menú</h2></div></section>
    <section className="month-switcher month-switcher--compact" aria-label="Navegación mensual">
      <div style={{display:'grid',gridTemplateColumns:'minmax(82px,1fr) minmax(140px,2fr) minmax(82px,1fr)',gap:'10px',alignItems:'stretch'}}>
        <button type="button" onClick={() => cambiar(-1)} style={{minHeight:'48px',fontWeight:800,fontSize:'15px'}}>‹ Anterior</button>
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}><span style={{fontSize:'11px',fontWeight:800}}>MENÚ DEL MES</span><strong style={{textTransform:'capitalize'}}>{mesBonito}</strong></div>
        <button type="button" onClick={() => cambiar(1)} style={{minHeight:'48px',fontWeight:800,fontSize:'15px'}}>Siguiente ›</button>
      </div>
      <div className="month-week-tabs">{planMensual.map((s, indice) => <button key={s.id} type="button" className={`month-week-tab${indice === semanaActiva ? ' month-week-tab--active' : ''}${s.excluida ? ' month-week-tab--excluded' : ''}`} onClick={() => { seleccionarSemana(indice); setDiaActivo(0); }}><span>{fmtRango(s)}</span>{s.excluida && <small>Fuera de casa</small>}</button>)}</div>
      <div className="month-week-actions"><button type="button" onClick={() => excluirSemana(semanaActiva, !semana?.excluida)}>{semana?.excluida ? '↩ Incluir esta semana' : '🏖️ No estamos en casa esta semana'}</button><button type="button" onClick={generarNuevoMes}>✨ Generar nuevo mes</button><button type="button" onClick={reiniciarMes}>↺ Reiniciar mes</button></div>
    </section>
    {semana?.excluida ? <section className="active-day active-day--today menu-excluded-state"><div className="menu-excluded-state__icon">🏖️</div><h3>No estamos en casa</h3><p>Esta semana queda fuera de la compra y del presupuesto.</p></section> : dia ? <>
      <nav className="week-switcher" aria-label="Elegir día" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, fechas.length)}, minmax(0, 1fr))`, gap: '10px' }}>
        {fechas.map((fecha, i) => { const d = menu[indiceDiaSemana(fecha)]; const fuera = excepciones[fecha]; return <button key={fecha} type="button" className={i === diaActivo ? 'week-day-button week-day-button--active' : 'week-day-button'} onClick={() => setDiaActivo(i)}><span>{d?.dia ?? fecha}</span>{fuera && <small style={{display:'block'}}>{fuera.noEnCasa ? 'Fuera' : fuera.sinComida && fuera.sinCena ? 'Fuera' : fuera.sinComida ? 'Sin comida' : 'Sin cena'}</small>}</button>; })}
      </nav>
      <section className="active-day active-day--today">
        <header className="active-day__header"><div><span className="active-day__eyebrow">MENÚ DEL DÍA · {fechaActiva?.slice(8, 10)}/{fechaActiva?.slice(5, 7)}</span><h3>{dia.dia}</h3></div></header>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
          <button type="button" onClick={() => marcar('sinComida')} aria-pressed={excepcion?.sinComida === true}>{excepcion?.sinComida ? '↩ Recuperar comida' : '🍽️ No comemos en casa'}</button>
          <button type="button" onClick={() => marcar('sinCena')} aria-pressed={excepcion?.sinCena === true}>{excepcion?.sinCena ? '↩ Recuperar cena' : '🌙 No cenamos en casa'}</button>
          <button type="button" onClick={() => marcar('noEnCasa')} aria-pressed={excepcion?.noEnCasa === true}>{excepcion?.noEnCasa ? '↩ Volvemos a estar en casa' : '🏖️ Fuera todo el día'}</button>
        </div>
        {excepcion?.noEnCasa ? <div className="menu-excluded-state"><div className="menu-excluded-state__icon">🏖️</div><h3>Fuera de casa este día</h3><p>No contará ni en la compra semanal ni en la mensual.</p></div> : <div className="active-day__meals">
          <article className="meal-panel"><header className="meal-panel__header"><h4>🍽️ Comida</h4></header>{excepcion?.sinComida ? <p>No comemos en casa.</p> : <><div className="meal-composition">{dia.comida.map((p) => <div className="meal-dish-card meal-dish-card--primary" key={p}><strong>{p}</strong></div>)}</div><div className="daily-dessert"><strong>🍓 {dia.postreComida ?? 'Sin postre'}</strong></div></>}</article>
          <article className="meal-panel"><header className="meal-panel__header"><h4>🌙 Cena</h4></header>{excepcion?.sinCena ? <p>No cenamos en casa.</p> : <><div className="meal-composition">{dia.cena.map((p) => <div className="meal-dish-card meal-dish-card--primary" key={p}><strong>{p}</strong></div>)}</div><div className="daily-dessert"><strong>🥛 {dia.postreCena ?? 'Sin postre'}</strong></div></>}</article>
        </div>}
      </section>
    </> : null}
  </main>;
}
