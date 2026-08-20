function normalizar(texto = '') {
  return String(texto)
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function contiene(texto, expresiones) {
  return expresiones.some((expresion) => texto.includes(expresion));
}

function datosProducto(producto) {
  const nombre = normalizar(
    producto?.display_name ?? producto?.name ?? '',
  );
  const seccion = normalizar(
    producto?.__seccion ?? producto?.category_name ?? '',
  );
  const subcategoria = normalizar(
    producto?.__subcategoria ?? producto?.subcategory_name ?? '',
  );
  const envase = normalizar(producto?.packaging ?? '');

  return {
    nombre,
    seccion,
    subcategoria,
    envase,
    contexto: `${nombre} ${seccion} ${subcategoria} ${envase}`.trim(),
  };
}

/**
 * Evita aceptar coincidencias léxicas que pertenecen a otro tipo de producto.
 * Ante la duda devuelve false: es preferible dejar un precio pendiente antes
 * que contaminar presupuesto/compra con un producto incorrecto.
 */
export function esProductoSeguro(objetivo, producto) {
  const ingrediente = normalizar(objetivo?.ingrediente ?? objetivo?.buscar ?? '');
  const busqueda = normalizar(objetivo?.buscar ?? objetivo?.ingrediente ?? '');
  const { nombre, seccion, subcategoria, envase, contexto } = datosProducto(producto);

  if (!ingrediente || !nombre) return false;

  if (ingrediente === 'salmon') {
    return (
      nombre.includes('salmon') &&
      contiene(`${seccion} ${subcategoria}`, ['pescado', 'marisco']) &&
      !contiene(contexto, ['perro', 'gato', 'mascota', 'compy'])
    );
  }

  if (ingrediente === 'hamburguesas') {
    return (
      contiene(nombre, ['hamburguesa', 'burger']) &&
      contiene(`${seccion} ${subcategoria}`, ['carne', 'hamburgues'])
    );
  }

  if (ingrediente === 'pan de hamburguesa') {
    return (
      nombre.includes('pan') &&
      contiene(nombre, ['hamburguesa', 'burger']) &&
      !contiene(contexto, ['merluza', 'pescado', 'empanad'])
    );
  }

  if (ingrediente === 'pan de perrito') {
    return (
      nombre.includes('pan') &&
      contiene(nombre, ['perrito', 'hot dog', 'hotdog']) &&
      !contiene(contexto, ['merluza', 'pescado', 'empanad'])
    );
  }

  if (ingrediente === 'ajo en polvo') {
    return (
      nombre.includes('ajo') &&
      nombre.includes('polvo') &&
      !nombre.includes('cebolla')
    );
  }

  if (ingrediente === 'mozzarella rallada') {
    return nombre.includes('mozzarella') && nombre.includes('rallad');
  }

  if (ingrediente === 'mezcla cuatro quesos') {
    return (
      contiene(nombre, ['cuatro quesos', '4 quesos']) &&
      nombre.includes('rallad')
    );
  }

  if (ingrediente === 'garbanzos secos') {
    return (
      nombre.includes('garbanzo') &&
      !contiene(contexto, ['cocido', 'cocida', 'tarro'])
    );
  }

  if (ingrediente === 'alubias blancas secas') {
    return (
      nombre.includes('alubia') &&
      nombre.includes('blanca') &&
      !contiene(contexto, ['cocido', 'cocida', 'tarro'])
    );
  }

  if (ingrediente === 'alubias rojas secas') {
    return (
      nombre.includes('alubia') &&
      nombre.includes('roja') &&
      !contiene(contexto, ['cocido', 'cocida', 'tarro'])
    );
  }

  if (ingrediente === 'garbanzos cocidos') {
    return nombre.includes('garbanzo') && contiene(contexto, ['cocido', 'tarro']);
  }

  if (ingrediente === 'atun' && busqueda.includes('pack 6')) {
    return (
      nombre.includes('atun') &&
      (envase.includes('pack 6') || contiene(contexto, ['6 latas', 'pack 6']))
    );
  }

  return true;
}
