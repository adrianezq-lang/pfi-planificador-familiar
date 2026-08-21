import { esProductoSeguro } from './matching-mercadona.mjs';

function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

function producto(nombre, seccion, subcategoria = '', packaging = '') {
  return {
    display_name: nombre,
    __seccion: seccion,
    __subcategoria: subcategoria,
    packaging,
  };
}

comprobar(
  !esProductoSeguro(
    { ingrediente: 'Salmón', buscar: 'salmón fresco porciones' },
    producto(
      'Comida perro adulto Supreme Compy salmón fresco con frutas y verduras',
      'Mascotas',
      'Perro',
      'Saco',
    ),
  ),
  'Salmón no puede asociarse a comida de perro',
);

comprobar(
  esProductoSeguro(
    { ingrediente: 'Salmón', buscar: 'salmón fresco porciones' },
    producto('Salmón en porciones', 'Marisco y pescado', 'Pescado fresco', 'Bandeja'),
  ),
  'Un salmón de pescadería debe ser válido',
);

comprobar(
  !esProductoSeguro(
    { ingrediente: 'Hamburguesas', buscar: 'hamburguesas vacuno cerdo bandeja 4' },
    producto('Arreglo para puchero vacuno, cerdo y pollo', 'Carne', 'Arreglos', 'Bandeja'),
  ),
  'Hamburguesas no puede asociarse a arreglo para puchero',
);

comprobar(
  esProductoSeguro(
    { ingrediente: 'Hamburguesas', buscar: 'hamburguesas vacuno cerdo bandeja 4' },
    producto('Hamburguesa de vacuno y cerdo', 'Carne', 'Hamburguesas y picadas', 'Bandeja'),
  ),
  'Una hamburguesa real debe ser válida',
);

for (const ingrediente of ['Pan de hamburguesa', 'Pan de perrito']) {
  comprobar(
    !esProductoSeguro(
      { ingrediente, buscar: ingrediente },
      producto('Merluza empanada pan fino Hacendado ultracongelada', 'Marisco y pescado', 'Pescado congelado', 'Paquete'),
    ),
    `${ingrediente} no puede asociarse a merluza empanada`,
  );
}

comprobar(
  !esProductoSeguro(
    { ingrediente: 'Ajo en polvo', buscar: 'ajo en polvo Hacendado' },
    producto('Cebolla en polvo Hacendado', 'Aceite, especias y salsas', 'Especias', 'Bote'),
  ),
  'Ajo en polvo no puede asociarse a cebolla en polvo',
);

comprobar(
  !esProductoSeguro(
    { ingrediente: 'Mozzarella rallada', buscar: 'mozzarella rallada Hacendado' },
    producto('Queso lonchas mozzarella de vaca Hacendado', 'Charcutería y quesos', 'Queso lonchas', 'Paquete'),
  ),
  'Mozzarella rallada no puede asociarse a mozzarella en lonchas',
);

for (const [ingrediente, nombreCocido] of [
  ['Garbanzos secos', 'Garbanzo cocido Hacendado'],
  ['Alubias blancas secas', 'Alubia cocida blanca Hacendado'],
  ['Alubias rojas secas', 'Alubia cocida roja Hacendado'],
]) {
  comprobar(
    !esProductoSeguro(
      { ingrediente, buscar: ingrediente },
      producto(nombreCocido, 'Arroz, legumbres y pasta', 'Legumbres', 'Tarro'),
    ),
    `${ingrediente} no puede asociarse a una legumbre cocida`,
  );
}

comprobar(
  !esProductoSeguro(
    { ingrediente: 'Atún', buscar: 'atún aceite girasol Hacendado pack 6 latas' },
    producto('Atún en aceite de girasol Hacendado', 'Conservas, caldos y cremas', 'Atún', 'Lata'),
  ),
  'El objetivo pack 6 de atún no puede resolverse con una lata grande individual',
);

comprobar(
  !esProductoSeguro(
    { ingrediente: 'Leche', buscar: 'leche proteínas Hacendado' },
    producto('Chocolate extrafino con leche Hacendado almendras enteras', 'Cacao, café e infusiones', 'Chocolate', 'Tableta'),
  ),
  'La leche con proteínas no puede asociarse a chocolate con leche',
);

comprobar(
  esProductoSeguro(
    { ingrediente: 'Leche', buscar: 'leche proteínas Hacendado' },
    producto('Bebida láctea +Proteínas Hacendado', 'Leche, huevos y mantequilla', 'Leche y bebidas vegetales', 'Brick'),
  ),
  'La bebida láctea con proteínas debe ser válida para la preferencia de leche',
);

comprobar(
  !esProductoSeguro(
    { ingrediente: 'Leche', buscar: 'leche entera sin lactosa Hacendado' },
    producto('Leche entera Hacendado', 'Leche, huevos y mantequilla', 'Leche y bebidas vegetales', 'Brick'),
  ),
  'La preferencia sin lactosa no puede resolverse con leche normal',
);

comprobar(
  !esProductoSeguro(
    { ingrediente: 'Atún', buscar: 'atún en aceite de oliva Hacendado pack 6 latas' },
    producto('Atún claro en aceite de girasol Hacendado', 'Conservas, caldos y cremas', 'Atún', 'Pack 6 latas'),
  ),
  'La preferencia de atún en oliva no puede resolverse con girasol',
);

comprobar(
  !esProductoSeguro(
    { ingrediente: 'Queso rallado', buscar: 'mezcla cuatro quesos rallados Hacendado' },
    producto('Queso rallado emmental Hacendado', 'Charcutería y quesos', 'Queso lonchas, rallado y en porciones', 'Bolsa'),
  ),
  'La preferencia cuatro quesos no puede resolverse con emmental',
);

comprobar(
  !esProductoSeguro(
    { ingrediente: 'Garbanzos secos', buscar: 'garbanzo pedrosillano seco Hacendado' },
    producto('Garbanzo Hacendado', 'Arroz, legumbres y pasta', 'Legumbres', 'Paquete'),
  ),
  'La preferencia de garbanzo pedrosillano seco exige pedrosillano',
);

comprobar(
  !esProductoSeguro(
    { ingrediente: 'Garbanzos cocidos', buscar: 'garbanzo pedrosillano cocido Hacendado tarro' },
    producto('Garbanzo cocido Hacendado', 'Conservas', 'Legumbres', 'Tarro'),
  ),
  'La preferencia de garbanzo pedrosillano cocido exige pedrosillano',
);

console.log('✓ salmón protegido frente a mascotas');
console.log('✓ hamburguesas protegidas frente a preparados de carne');
console.log('✓ panes protegidos frente a pescado empanado');
console.log('✓ ajo en polvo y mozzarella rallada distinguen el formato correcto');
console.log('✓ legumbres secas distinguen producto seco/cocido');
console.log('✓ preferencias de leche, atún, cuatro quesos y pedrosillano protegidas');
