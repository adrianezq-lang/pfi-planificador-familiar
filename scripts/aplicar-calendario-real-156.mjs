import fs from 'node:fs';

const hookPath = 'src/hooks/useMenu.ts';
const menuPath = 'src/pages/Menu.tsx';
const typePath = 'src/data/MenuMensual.ts';

let hook = fs.readFileSync(hookPath, 'utf8');
let menu = fs.readFileSync(menuPath, 'utf8');
let type = fs.readFileSync(typePath, 'utf8');

if (!hook.includes("../services/calendarioMensual")) {
  hook = hook.replace(
    "import { registrarMenuSemanal } from '../services/aprendizaje';",
    "import { registrarMenuSemanal } from '../services/aprendizaje';\nimport { claveMesActual, desplazarMes } from '../services/calendarioMensual';",
  );
}
if (!type.includes('excluida?: boolean')) {
  type = type.replace(
    "  menu: DiaMenu[];\n};",
    "  menu: DiaMenu[];\n  excluida?: boolean;\n};",
  );
}

hook = hook.replace(
  "const CLAVE_PLAN_MENSUAL = 'pfi-menu-mensual-v1';",
  "const CLAVE_PLAN_MENSUAL = 'pfi-menu-mensual-v1';\nconst CLAVE_MES_ACTIVO = 'pfi-mes-activo';\nconst PREFIJO_PLAN_MES = 'pfi-menu-mensual-real-v1-';\nconst PREFIJO_BACKUP_SEMANA = 'pfi-semana-backup-v1-';",
);
hook = hook.replace(
  "function cargarIndiceSemana(): number {",
  "function asegurarCincoSemanas(plan: SemanaMenu[]): SemanaMenu[] {\n  if (plan.length >= 5) return plan;\n  const base = plan[plan.length - 1] ?? plan[0];\n  return [...plan, ...Array.from({ length: 5 - plan.length }, (_, i) => ({\n    ...(base ?? { id: `semana-${plan.length + i + 1}`, nombre: `Semana ${plan.length + i + 1}`, menu: [] }),\n    id: `semana-${plan.length + i + 1}`,\n    nombre: `Semana ${plan.length + i + 1}`,\n    menu: (base?.menu ?? []).map((dia) => ({ ...dia, comida: [...dia.comida], cena: [...dia.cena] })),\n  }))];\n}\n\nfunction clavePlanMes(mes: string): string {\n  return `${PREFIJO_PLAN_MES}${mes}`;\n}\n\nfunction cargarMesActivo(): string {\n  return localStorage.getItem(CLAVE_MES_ACTIVO) || claveMesActual();\n}\n\nfunction cargarPlanParaMes(mes: string): SemanaMenu[] {\n  try {\n    const guardado = localStorage.getItem(clavePlanMes(mes));\n    if (guardado) return asegurarCincoSemanas(aplicarMigraciones(normalizarPlanMensual(JSON.parse(guardado) as unknown)));\n    const plan = asegurarCincoSemanas(copiarPlanMensual(menuMensualInicial));\n    localStorage.setItem(clavePlanMes(mes), JSON.stringify(plan));\n    return plan;\n  } catch {\n    return asegurarCincoSemanas(copiarPlanMensual(menuMensualInicial));\n  }\n}\n\nfunction cargarIndiceSemana(): number {",
);
hook = hook.replace(
  "    return Number.isInteger(guardado) && guardado >= 0 && guardado <= 3",
  "    return Number.isInteger(guardado) && guardado >= 0 && guardado <= 4",
);
hook = hook.replace(
  "  const [planMensual, setPlanMensual] = useState<SemanaMenu[]>(cargarPlan);\n  const [semanaActiva, setSemanaActiva] = useState(cargarIndiceSemana);",
  "  const [mesActivo, setMesActivo] = useState(cargarMesActivo);\n  const [planMensual, setPlanMensual] = useState<SemanaMenu[]>(() => cargarPlanParaMes(cargarMesActivo()));\n  const [semanaActiva, setSemanaActiva] = useState(cargarIndiceSemana);",
);
hook = hook.replace(
  "    localStorage.setItem(CLAVE_PLAN_MENSUAL, JSON.stringify(normalizado));",
  "    localStorage.setItem(CLAVE_PLAN_MES(mesActivo), JSON.stringify(normalizado));\n    localStorage.setItem(CLAVE_PLAN_MENSUAL, JSON.stringify(normalizado));",
);
hook = hook.replace(
  "  function seleccionarSemana(indice: number): void {",
  "  function cambiarMes(delta: number): void {\n    const nuevoMes = desplazarMes(mesActivo, delta);\n    const nuevoPlan = cargarPlanParaMes(nuevoMes);\n    setMesActivo(nuevoMes);\n    setPlanMensual(nuevoPlan);\n    setSemanaActiva(0);\n    localStorage.setItem(CLAVE_MES_ACTIVO, nuevoMes);\n    localStorage.setItem(CLAVE_SEMANA_ACTIVA, '0');\n    guardarCompatibilidad(nuevoPlan[0]?.menu ?? []);\n    window.dispatchEvent(new CustomEvent(EVENTO_MENU));\n  }\n\n  function alternarSemanaExcluida(indice: number): void {\n    const semana = planMensual[indice];\n    if (!semana) return;\n    const backupKey = `${PREFIJO_BACKUP_SEMANA}${mesActivo}-${semana.id}`;\n    let nuevoPlan = [...planMensual];\n    if (semana.excluida) {\n      const backup = localStorage.getItem(backupKey);\n      const menuRestaurado = backup ? JSON.parse(backup) as DiaMenu[] : semana.menu;\n      nuevoPlan[indice] = { ...semana, excluida: false, menu: menuRestaurado };\n      localStorage.removeItem(backupKey);\n    } else {\n      localStorage.setItem(backupKey, JSON.stringify(semana.menu));\n      nuevoPlan[indice] = {\n        ...semana,\n        excluida: true,\n        menu: semana.menu.map((dia) => ({\n          ...dia, comida: [], cena: [], postreComida: 'Sin postre', postreCena: 'Sin postre',\n          postreComidaReceta: 'Sin postre', postreCenaReceta: 'Sin postre',\n          cantidadPostreComida: 0, cantidadPostreCena: 0, preparar: '',\n        })),\n      };\n    }\n    persistir(nuevoPlan, indice);\n  }\n\n  function seleccionarSemana(indice: number): void {",
);
hook = hook.replace(
  "    seleccionarSemana,\n  };",
  "    seleccionarSemana,\n    mesActivo,\n    cambiarMes,\n    alternarSemanaExcluida,\n  };",
);

// Fix accidental placeholder introduced above if needed.
hook = hook.replace(/localStorage\.setItem\(CLAVE_PLAN_MES\(mesActivo\),/g, 'localStorage.setItem(clavePlanMes(mesActivo),');

menu = menu.replace(
  "  seleccionarSemana: (indice: number) => void;\n};",
  "  seleccionarSemana: (indice: number) => void;\n  mesActivo: string;\n  cambiarMes: (delta: number) => void;\n  alternarSemanaExcluida: (indice: number) => void;\n};",
);
menu = menu.replace(
  "  seleccionarSemana,\n}: MenuProps) {",
  "  seleccionarSemana,\n  mesActivo,\n  cambiarMes,\n  alternarSemanaExcluida,\n}: MenuProps) {",
);
menu = menu.replace(
  "  const hoy = DIAS_SEMANA[new Date().getDay()];",
  "  const hoy = DIAS_SEMANA[new Date().getDay()];\n  const mesNombre = new Date(`${mesActivo}-01T12:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).replace(/^./, (letra) => letra.toUpperCase());",
);
menu = menu.replace(
  "          <p>Cuatro semanas editables con postres únicamente desde Recetas.</p>",
  "          <p>Plan mensual real · fechas y semanas del calendario.</p>",
);
menu = menu.replace(
  "        <section\n          className=\"month-switcher month-switcher--compact\"",
  "        <section\n          className=\"month-switcher month-switcher--compact\"",
);
menu = menu.replace(
  "              <span>SEMANA DEL MES</span>\n              <strong>\n                {planMensual[semanaActiva]?.nombre ?? `Semana ${semanaActiva + 1}`}\n              </strong>",
  "              <span>MES DEL MENÚ</span>\n              <strong>{mesNombre}</strong>",
);
menu = menu.replace(
  "          </div>\n          <div className=\"month-switcher__grid\">",
  "          </div>\n          <div className=\"month-switcher__arrows\">\n            <button type=\"button\" onClick={() => cambiarMes(-1)} aria-label=\"Mes anterior\">‹</button>\n            <button type=\"button\" onClick={() => cambiarMes(1)} aria-label=\"Mes siguiente\">›</button>\n          </div>\n          <div className=\"month-switcher__grid\">",
);
menu = menu.replace(
  "                  <span>{semana.nombre}</span>\n                  <strong>{equilibrio.puntuacion}%</strong>",
  "                  <span>{semana.nombre}</span>\n                  <small>{semana.id.replace('semana-', '')}</small>\n                  <strong>{semana.excluida ? 'Fuera de casa' : `${equilibrio.puntuacion}%`}</strong>",
);
menu = menu.replace(
  "              return (\n                <button",
  "              return (\n                <button",
);
// Add exclusion control immediately after the week grid.
const marker = "        </section>\n\n        <nav className=\"week-switcher\"";
if (menu.includes(marker) && !menu.includes('alternarSemanaExcluida(semanaActiva)')) {
  menu = menu.replace(
    marker,
    "        </section>\n        <div className=\"month-week-action\">\n          <button type=\"button\" onClick={() => alternarSemanaExcluida(semanaActiva)} className={planMensual[semanaActiva]?.excluida ? 'secondary-action' : 'danger-soft-action'}>\n            {planMensual[semanaActiva]?.excluida ? '↩ Volver a planificar esta semana' : '🏖️ No estamos en casa esta semana'}\n          </button>\n        </div>\n\n        <nav className=\"week-switcher\"",
  );
}

fs.writeFileSync(hookPath, hook);
fs.writeFileSync(menuPath, menu);
fs.writeFileSync(typePath, type);
console.log('✓ calendario mensual real integrado');
console.log('✓ navegación por mes real integrada');
console.log('✓ semanas fuera de casa excluibles sin generar compra');
