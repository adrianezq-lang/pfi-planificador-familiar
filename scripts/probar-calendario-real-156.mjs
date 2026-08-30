import fs from 'node:fs';
import { semanasRealesDelMes } from '../src/services/calendarioMensual.ts';

const semanas = semanasRealesDelMes('2026-09');
if (semanas.length !== 5) throw new Error(`Septiembre 2026 debe tener 5 semanas, obtuvo ${semanas.length}`);
if (semanas[0].inicio !== '2026-09-01' || semanas[0].fin !== '2026-09-06') {
  throw new Error(`Primera semana de septiembre incorrecta: ${semanas[0].inicio}–${semanas[0].fin}`);
}
if (semanas[4].inicio !== '2026-09-28' || semanas[4].fin !== '2026-09-30') {
  throw new Error(`Última semana de septiembre incorrecta: ${semanas[4].inicio}–${semanas[4].fin}`);
}
const hook = fs.readFileSync('src/hooks/useMenu.ts', 'utf8');
const menu = fs.readFileSync('src/pages/Menu.tsx', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
if (!hook.includes('alternarSemanaExcluida') || !hook.includes('cargarPlanParaMes')) throw new Error('Falta lógica de exclusión o carga por mes');
if (!menu.includes('No estamos en casa esta semana') || !menu.includes('cambiarMes')) throw new Error('Falta UI de calendario real');
if (!app.includes('mesActivo={mesActivo}')) throw new Error('App no conecta el calendario');
console.log('✓ calendario real y exclusión semanal validados');
