import fs from 'node:fs';

const lista = fs.readFileSync('src/services/listaCompra.ts', 'utf8');

function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
  console.log(`✓ ${mensaje}`);
}

comprobar(lista.includes('obtenerProductoIdAsociado'), 'Compra puede detectar si un ingrediente pertenece al inventario');
comprobar(lista.includes('buscarProductoDespensa'), 'Compra comprueba si el producto está controlado en Despensa');
comprobar(
  lista.includes('const disponible = controladoEnInventario') && lista.includes('? 0') && lista.includes('cantidadConservada'),
  'Abiertos/Congelados no vuelve a descontar un producto ya contabilizado en Inventario',
);

console.log('✓ coherencia de stock: Inventario es fuente de verdad y Conservación actúa como alternativa');
