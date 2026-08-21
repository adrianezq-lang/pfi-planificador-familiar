import fs from 'node:fs';

function leer(ruta) {
  if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);
  return fs.readFileSync(ruta, 'utf8');
}

function guardar(ruta, contenido) {
  fs.writeFileSync(ruta, contenido, 'utf8');
}

function insertarUna(contenido, marcador, nuevo, etiqueta) {
  if (contenido.includes(nuevo)) return contenido;
  if (!contenido.includes(marcador)) throw new Error(`No se pudo insertar ${etiqueta}`);
  return contenido.replace(marcador, `${marcador}${nuevo}`);
}

function reemplazarUna(contenido, anterior, nuevo, etiqueta) {
  if (contenido.includes(nuevo)) return contenido;
  if (!contenido.includes(anterior)) throw new Error(`No se pudo aplicar ${etiqueta}`);
  return contenido.replace(anterior, nuevo);
}

function escribirListaCompraAvanzada() {
  const contenido = `import type { DiaMenu } from '../data/Menusemanal';
import type { Ingrediente } from '../data/Recetas';
import { cargarRecetas } from './recetas';
import { unirIngredientes } from './UnirIngredientes';
import { obtenerRecetaPostre } from './menu';
import { calcularComensales, cargarPerfil } from './perfil';
import { ajustarRecetasAlPerfil } from './porciones';
import {
  aplicarExcepcionesAlMenu,
  cargarExcepcionesSemana,
  perfilTemporalParaSemana,
} from './excepcionesSemana';
import { cantidadConservada } from './conservacion';

function ingredientePostreSinReceta(nombre: string, comensales: number): Ingrediente[] {
  if (!nombre || nombre === 'Sin postre') return [];
  const normalizado = nombre.toLocaleLowerCase('es');
  return [{
    nombre,
    cantidad: Math.max(1, comensales),
    unidad: 'ud',
    seccion: normalizado.includes('yogur') ? 'Lácteos y huevos' : 'Fruta y verdura',
    ajusteAutomatico: true,
  }];
}

function descontarConservacion(ingredientes: Ingrediente[]): Ingrediente[] {
  return ingredientes
    .map((ingrediente) => {
      const disponible = cantidadConservada(ingrediente.nombre, ingrediente.unidad);
      return disponible > 0
        ? { ...ingrediente, cantidad: Math.max(0, Number((ingrediente.cantidad - disponible).toFixed(2))) }
        : ingrediente;
    })
    .filter((ingrediente) => ingrediente.cantidad > 0);
}

export function generarListaCompra(menu: DiaMenu[]): Ingrediente[] {
  const excepciones = cargarExcepcionesSemana();
  const perfil = perfilTemporalParaSemana(cargarPerfil(), excepciones);
  const menuEfectivo = aplicarExcepcionesAlMenu(menu, excepciones);
  const recetas = ajustarRecetasAlPerfil(cargarRecetas(), perfil, false);
  const buscarReceta = (nombre: string) => recetas.find((receta) => receta.nombre === nombre);

  const platos = menuEfectivo.flatMap((dia) => [...dia.comida, ...dia.cena]);
  const postres = menuEfectivo.flatMap((dia) => [
    obtenerRecetaPostre(dia, 'comida'),
    obtenerRecetaPostre(dia, 'cena'),
  ]);

  const ingredientesPlatos = platos.flatMap(
    (nombre) => buscarReceta(nombre)?.ingredientes ?? [],
  );
  const comensales = calcularComensales(perfil);
  const ingredientesPostres = postres.flatMap((nombre) => {
    const receta = buscarReceta(nombre);
    return receta?.ingredientes ?? ingredientePostreSinReceta(nombre, comensales);
  });

  return descontarConservacion(
    unirIngredientes([...ingredientesPlatos, ...ingredientesPostres]),
  );
}
`;
  guardar('src/services/listaCompra.ts', contenido);
}

function parchearMenu() {
  const ruta = 'src/pages/Menu.tsx';
  let contenido = leer(ruta);
  contenido = insertarUna(
    contenido,
    "import { useEffect, useMemo, useState } from 'react';",
    "\nimport ExcepcionesSemanaPanel from '../components/ExcepcionesSemanaPanel';",
    'import ExcepcionesSemanaPanel',
  );
  const marcador = `      <div className="dessert-auto-note">\n        🍓 En la comida rota la fruta del recetario y en la cena rota el yogur del recetario. Los domingos quedan vacíos por defecto.\n      </div>`;
  contenido = insertarUna(
    contenido,
    marcador,
    `\n\n      <ExcepcionesSemanaPanel semanaActiva={semanaActiva} />`,
    'panel de excepciones semanales',
  );
  guardar(ruta, contenido);
}

function parchearApp() {
  const ruta = 'src/App.tsx';
  let contenido = leer(ruta);
  contenido = insertarUna(
    contenido,
    "import BottomNav from './components/NavegacionInferior';",
    "\nimport AsistentePfiPanel from './components/AsistentePfiPanel';",
    'import Asistente PFI',
  );
  contenido = reemplazarUna(
    contenido,
    `      <BottomNav\n        pantallaActual={pantalla}\n        cambiarPantalla={cambiarPantalla}\n      />`,
    `      <AsistentePfiPanel\n        menu={menu}\n        guardarMenu={guardar}\n        semanaActiva={semanaActiva}\n      />\n\n      <BottomNav\n        pantallaActual={pantalla}\n        cambiarPantalla={cambiarPantalla}\n      />`,
    'asistente global',
  );
  guardar(ruta, contenido);
}

function parchearDespensa() {
  const ruta = 'src/pages/Despensa.tsx';
  let contenido = leer(ruta);
  contenido = insertarUna(
    contenido,
    "import ProductoDetalleModal from '../components/ProductoDetalleModal';",
    "\nimport ConservacionPanel from '../components/ConservacionPanel';",
    'import ConservacionPanel',
  );
  contenido = reemplazarUna(
    contenido,
    "type VistaDespensa = 'inventario' | 'reposicion' | 'historial';",
    "type VistaDespensa = 'inventario' | 'reposicion' | 'historial' | 'conservacion';",
    'vista de conservación',
  );
  const tabHistorial = `          <Pestana\n            activa={vista === 'historial'}\n            texto="Historial"\n            onClick={() => setVista('historial')}\n          />`;
  contenido = insertarUna(
    contenido,
    tabHistorial,
    `\n          <Pestana\n            activa={vista === 'conservacion'}\n            texto="Abiertos y sobras"\n            onClick={() => setVista('conservacion')}\n          />`,
    'pestaña de conservación',
  );
  contenido = reemplazarUna(
    contenido,
    `      <ProductoDetalleModal\n        productoId={productoAbierto}`,
    `      {vista === 'conservacion' && (\n        <Card>\n          <ConservacionPanel />\n        </Card>\n      )}\n\n      <ProductoDetalleModal\n        productoId={productoAbierto}`,
    'panel de conservación',
  );
  guardar(ruta, contenido);
}

function corregirUnidadAsistente() {
  const ruta = 'src/services/asistentePfi.ts';
  let contenido = leer(ruta);
  const anterior = `      const cantidad = extraerCantidad(texto);\n      const unidad = tipoConservacion === 'sobra' ? 'ración' : 'ud';`;
  const nuevo = `      const cantidad = extraerCantidad(texto);\n      const unidad = /\\braciones?\\b/.test(texto)\n        ? 'ración'\n        : /\\bkg\\b/.test(texto)\n          ? 'kg'\n          : /\\bgramos?|\\bg\\b/.test(texto)\n            ? 'g'\n            : /\\blitros?|\\bl\\b/.test(texto)\n              ? 'l'\n              : /\\bml\\b/.test(texto)\n                ? 'ml'\n                : tipoConservacion === 'sobra' ? 'ración' : 'ud';`;
  contenido = reemplazarUna(contenido, anterior, nuevo, 'unidad natural del asistente');
  guardar(ruta, contenido);
}

escribirListaCompraAvanzada();
parchearMenu();
parchearApp();
parchearDespensa();
corregirUnidadAsistente();
console.log('✓ funciones avanzadas 1.5.6 aplicadas: excepciones, conservación y asistente');
