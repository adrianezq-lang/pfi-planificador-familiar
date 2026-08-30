import fs from 'node:fs';
const path = 'src/App.tsx';
let app = fs.readFileSync(path, 'utf8');
if (!app.includes('mesActivo={mesActivo}')) {
  app = app.replace(
    "  const {\n    menu,\n    guardar,\n    planMensual,\n    guardarPlan,\n    semanaActiva,\n    seleccionarSemana,\n  } = useMenu();",
    "  const {\n    menu,\n    guardar,\n    planMensual,\n    guardarPlan,\n    semanaActiva,\n    seleccionarSemana,\n    mesActivo,\n    cambiarMes,\n    alternarSemanaExcluida,\n  } = useMenu();",
  );
  app = app.replace(
    "            seleccionarSemana={seleccionarSemana}\n          />",
    "            seleccionarSemana={seleccionarSemana}\n            mesActivo={mesActivo}\n            cambiarMes={cambiarMes}\n            alternarSemanaExcluida={alternarSemanaExcluida}\n          />",
  );
}
fs.writeFileSync(path, app);
console.log('✓ calendario conectado a App');
