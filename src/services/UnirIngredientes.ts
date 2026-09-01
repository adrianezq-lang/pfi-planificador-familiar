import type { Ingrediente } from '../data/Recetas';

type ReglaConversion = {
  unidadDestino: string;
  factor: number;
};

const conversionesPorProducto: Record<
  string,
  Record<string, ReglaConversion>
> = {
  Patatas: {
    ud: {
      unidadDestino: 'kg',
      factor: 0.2,
    },
    kg: {
      unidadDestino: 'kg',
      factor: 1,
    },
  },

  Tomate: {
    ud: {
      unidadDestino: 'ud',
      factor: 1,
    },
  },

  Pepino: {
    ud: {
      unidadDestino: 'ud',
      factor: 1,
    },
  },

  Cebolla: {
    ud: {
      unidadDestino: 'ud',
      factor: 1,
    },
  },

  Ajo: {
    diente: {
      unidadDestino: 'g',
      factor: 5,
    },
    dientes: {
      unidadDestino: 'g',
      factor: 5,
    },
    cabeza: {
      unidadDestino: 'g',
      factor: 50,
    },
    cabezas: {
      unidadDestino: 'g',
      factor: 50,
    },
    g: {
      unidadDestino: 'g',
      factor: 1,
    },
  },

  Zanahorias: {
    ud: {
      unidadDestino: 'ud',
      factor: 1,
    },
  },

  Calabacín: {
    ud: {
      unidadDestino: 'ud',
      factor: 1,
    },
  },

  Huevos: {
    ud: {
      unidadDestino: 'ud',
      factor: 1,
    },
  },

  Atún: {
    lata: {
      unidadDestino: 'lata',
      factor: 1,
    },
    latas: {
      unidadDestino: 'lata',
      factor: 1,
    },
  },

  Arroz: {
    vaso: {
      unidadDestino: 'g',
      factor: 180,
    },
    vasos: {
      unidadDestino: 'g',
      factor: 180,
    },
    taza: {
      unidadDestino: 'g',
      factor: 180,
    },
    tazas: {
      unidadDestino: 'g',
      factor: 180,
    },
    'vaso pequeño': {
      unidadDestino: 'g',
      factor: 150,
    },
    'vaso grande': {
      unidadDestino: 'g',
      factor: 200,
    },
    g: {
      unidadDestino: 'g',
      factor: 1,
    },
    kg: {
      unidadDestino: 'g',
      factor: 1000,
    },
  },

  Bacon: {
    paquete: {
      unidadDestino: 'barqueta',
      factor: 1,
    },
    barqueta: {
      unidadDestino: 'barqueta',
      factor: 1,
    },
  },

  Chorizo: {
    sarta: {
      unidadDestino: 'ud',
      factor: 1,
    },
    ud: {
      unidadDestino: 'ud',
      factor: 1,
    },
  },

  Aceitunas: {
    ración: {
      unidadDestino: 'ración',
      factor: 1,
    },
  },
};

function normalizarTexto(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function normalizarIngrediente(
  ingrediente: Ingrediente,
): Ingrediente {
  const reglasProducto =
    conversionesPorProducto[ingrediente.nombre];

  if (!reglasProducto) {
    return { ...ingrediente };
  }

  const unidadNormalizada = normalizarTexto(
    ingrediente.unidad,
  );

  const regla =
    reglasProducto[unidadNormalizada];

  if (!regla) {
    return { ...ingrediente };
  }

  return {
    ...ingrediente,
    cantidad:
      ingrediente.cantidad * regla.factor,
    unidad: regla.unidadDestino,
  };
}

export function unirIngredientes(
  ingredientes: Ingrediente[],
): Ingrediente[] {
  const agrupados = new Map<string, Ingrediente>();

  ingredientes.forEach((ingredienteOriginal) => {
    const ingrediente =
      normalizarIngrediente(ingredienteOriginal);

    const clave = `${ingrediente.nombre}-${ingrediente.unidad}`;

    const existente = agrupados.get(clave);

    if (existente) {
      existente.cantidad += ingrediente.cantidad;
    } else {
      agrupados.set(clave, {
        ...ingrediente,
      });
    }
  });

  return Array.from(agrupados.values())
    .map((ingrediente) => ({
      ...ingrediente,
      cantidad: Number(
        ingrediente.cantidad.toFixed(2),
      ),
    }))
    .sort((a, b) => {
      if (a.seccion !== b.seccion) {
        return a.seccion.localeCompare(
          b.seccion,
          'es',
        );
      }

      return a.nombre.localeCompare(
        b.nombre,
        'es',
      );
    });
}
