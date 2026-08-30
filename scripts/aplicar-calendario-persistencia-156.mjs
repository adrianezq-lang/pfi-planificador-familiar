import fs from 'node:fs';
const path = 'src/hooks/useMenu.ts';
let hook = fs.readFileSync(path, 'utf8');
hook = hook.replace(
  "    localStorage.setItem(CLAVE_PLAN_MENSUAL, JSON.stringify(normalizado));\n    localStorage.setItem(CLAVE_SEMANA_ACTIVA, String(indiceSeguro));",
  "    localStorage.setItem(clavePlanMes(mesActivo), JSON.stringify(normalizado));\n    localStorage.setItem(CLAVE_PLAN_MENSUAL, JSON.stringify(normalizado));\n    localStorage.setItem(CLAVE_SEMANA_ACTIVA, String(indiceSeguro));",
);
hook = hook.replace(
  "      setPlanMensual(cargarPlan());\n      setSemanaActiva(cargarIndiceSemana());",
  "      setPlanMensual(cargarPlanParaMes(mesActivo));\n      setSemanaActiva(cargarIndiceSemana());",
);
fs.writeFileSync(path, hook);
console.log('✓ persistencia mensual real corregida');
