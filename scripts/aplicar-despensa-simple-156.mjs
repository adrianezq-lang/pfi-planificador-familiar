import fs from 'node:fs';

const ruta = 'src/pages/Despensa.tsx';
if (!fs.existsSync(ruta)) throw new Error(`Falta ${ruta}`);

let contenido = fs.readFileSync(ruta, 'utf8');

const anterior = `        <div className="pantry-summary-grid">\n          <Resumen\n            numero={productos.length}\n            texto="productos controlados"\n            activo={filtro === 'todos' && vista === 'inventario'}\n            onClick={() => abrirResumen('todos')}\n          />\n          <Resumen\n            numero={productosReposicion.length}\n            texto="faltan en reposición automática"\n            activo={filtro === 'reposicion' && vista === 'inventario'}\n            onClick={() => abrirResumen('reposicion')}\n          />\n          <Resumen\n            numero={productosSegunMenuOManual.length}\n            texto="según menú o manuales"\n            activo={filtro === 'menu-manual' && vista === 'inventario'}\n            onClick={() => abrirResumen('menu-manual')}\n          />\n          <Resumen\n            numero={totalReposicion.toLocaleString('es-ES', {\n              style: 'currency',\n              currency: 'EUR',\n            })}\n            texto="coste de reposición automática"\n            onClick={() => {\n              setVista('reposicion');\n              setFiltro('reposicion');\n            }}\n          />\n          <Resumen\n            numero={valorInventario.toLocaleString('es-ES', {\n              style: 'currency',\n              currency: 'EUR',\n            })}\n            texto="valor aproximado en casa"\n            onClick={() => abrirResumen('todos')}\n          />\n        </div>`;

const nuevo = `        <div className="pantry-summary-grid">\n          <Resumen\n            numero={totalReposicion.toLocaleString('es-ES', {\n              style: 'currency',\n              currency: 'EUR',\n            })}\n            texto="Reposición automática"\n            onClick={() => {\n              setVista('reposicion');\n              setFiltro('reposicion');\n            }}\n          />\n          <Resumen\n            numero={valorInventario.toLocaleString('es-ES', {\n              style: 'currency',\n              currency: 'EUR',\n            })}\n            texto="Valor en casa"\n            onClick={() => abrirResumen('todos')}\n          />\n        </div>`;

if (!contenido.includes(nuevo)) {
  if (!contenido.includes(anterior)) {
    throw new Error('No se ha encontrado el bloque de resumen de despensa esperado.');
  }
  contenido = contenido.replace(anterior, nuevo);
}

fs.writeFileSync(ruta, contenido, 'utf8');
console.log('✓ despensa simplificada: solo se muestran los dos botones con importes');
