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
  const instrucciones = producto?.price_instructions ?? {};
  const totalUnidades = Number(instrucciones.total_units ?? 0);
  const unidad = normalizar(instrucciones.unit_name ?? '');
  const formato = normalizar(
    instrucciones.size_format ?? instrucciones.reference_format ?? '',
  );

  return {
    nombre,
    seccion,
    subcategoria,
    envase,
    totalUnidades: Number.isFinite(totalUnidades) ? totalUnidades : 0,
    contexto: `${nombre} ${seccion} ${subcategoria} ${envase} ${unidad} ${formato} ${totalUnidades}`.trim(),
  };
}

function esFrutaOVerdura(seccion, subcategoria) {
  return contiene(`${seccion} ${subcategoria}`, [
    'fruta',
    'verdura',
    'hortaliza',
  ]);
}

/**
 * Evita aceptar coincidencias léxicas que pertenecen a otro tipo de producto.
 * Ante la duda devuelve false: es preferible dejar un precio pendiente antes
 * que contaminar presupuesto/compra con un producto incorrecto.
 */
export function esProductoSeguro(objetivo, producto) {
  const ingrediente = normalizar(objetivo?.ingrediente ?? objetivo?.buscar ?? '');
  const busqueda = normalizar(objetivo?.buscar ?? objetivo?.ingrediente ?? '');
  const {
    nombre,
    seccion,
    subcategoria,
    envase,
    totalUnidades,
    contexto,
  } = datosProducto(producto);

  if (!ingrediente || !nombre) return false;

  if (ingrediente === 'huevos') {
    return (
      nombre.includes('huevo') &&
      contiene(`${seccion} ${subcategoria}`, ['huevo'])
    );
  }

  if (ingrediente === 'patatas') {
    return (
      nombre.includes('patata') &&
      esFrutaOVerdura(seccion, subcategoria) &&
      !contiene(contexto, ['frita', 'snack', 'chips'])
    );
  }

  if (ingrediente === 'cebolla') {
    return nombre.includes('cebolla') && esFrutaOVerdura(seccion, subcategoria);
  }

  if (ingrediente === 'zanahorias') {
    return nombre.includes('zanahoria') && esFrutaOVerdura(seccion, subcategoria);
  }

  if (ingrediente === 'ajo') {
    return (
      nombre.includes('ajo') &&
      esFrutaOVerdura(seccion, subcategoria) &&
      !contiene(contexto, ['granulado', 'polvo', 'especia'])
    );
  }

  if (ingrediente === 'salmon') {
    return (
      nombre.includes('salmon') &&
      contiene(`${seccion} ${subcategoria}`, ['pescado', 'marisco']) &&
      !contiene(contexto, ['perro', 'gato', 'mascota', 'compy', 'listo para comer'])
    );
  }

  if (ingrediente === 'almejas') {
    return (
      nombre.includes('almeja') &&
      contiene(`${seccion} ${subcategoria}`, ['marisco', 'pescado'])
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
      contiene(nombre, ['polvo', 'granulado']) &&
      contiene(`${seccion} ${subcategoria}`, ['especia']) &&
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
      (
        totalUnidades === 6 ||
        envase.includes('pack 6') ||
        contiene(contexto, ['6 latas', 'pack 6'])
      )
    );
  }

  return true;
}
