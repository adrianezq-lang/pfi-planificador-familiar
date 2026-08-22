import fs from 'node:fs';

function leer(ruta) {
  if (!fs.existsSync(ruta)) throw new Error(`UI profesional: falta ${ruta}`);
  return fs.readFileSync(ruta, 'utf8');
}

function guardar(ruta, contenido) {
  fs.writeFileSync(ruta, contenido, 'utf8');
}

// El pulido visual elimina bloques informativos completos. Aquí retiramos
// únicamente referencias que dejan de tener uso para mantener TypeScript
// estricto sin alterar la lógica funcional.
{
  const ruta = 'src/pages/Menu.tsx';
  let c = leer(ruta);
  c = c.replace('  obtenerResumenAprendizaje,\n', '');
  c = c.replace('  const resumenAprendizaje = obtenerResumenAprendizaje();\n', '');
  c = c.replace('  const resumenSemana = calcularEquilibrioSemana(menu);\n', '');
  guardar(ruta, c);
}

{
  const ruta = 'src/pages/Compra.tsx';
  let c = leer(ruta);
  c = c.replace(
    'function BloqueCompra({\n  titulo,\n  descripcion,',
    'function BloqueCompra({\n  titulo,\n  descripcion: _descripcion,',
  );
  c = c.replace(
    '}) {\n  const secciones = Array.from(',
    '}) {\n  void _descripcion;\n  const secciones = Array.from(',
  );
  c = c.replace(/\nconst estiloSubtitulo = \{[\s\S]*?\n\};\n/, '\n');
  guardar(ruta, c);
}

{
  const ruta = 'src/pages/Perfil.tsx';
  let c = leer(ruta);
  c = c.replace(/\nconst estiloIntroduccion = \{[\s\S]*?\n\};\n/, '\n');
  guardar(ruta, c);
}

const menu = leer('src/pages/Menu.tsx');
const compra = leer('src/pages/Compra.tsx');
const perfil = leer('src/pages/Perfil.tsx');

if (menu.includes('const resumenAprendizaje =') || menu.includes('const resumenSemana =')) {
  throw new Error('UI profesional: quedaron resúmenes visuales sin uso en Menú.');
}
if (menu.includes('obtenerResumenAprendizaje,')) {
  throw new Error('UI profesional: quedó un import de aprendizaje sin uso.');
}
if (!compra.includes('descripcion: _descripcion') || !compra.includes('void _descripcion;')) {
  throw new Error('UI profesional: descripción de Compra no quedó neutralizada.');
}
if (compra.includes('const estiloSubtitulo =')) {
  throw new Error('UI profesional: quedó el estilo de subtítulo ya eliminado.');
}
if (perfil.includes('const estiloIntroduccion =')) {
  throw new Error('UI profesional: quedó el estilo de introducción ya eliminado.');
}

console.log('✓ UI profesional: referencias obsoletas retiradas para TypeScript estricto');
