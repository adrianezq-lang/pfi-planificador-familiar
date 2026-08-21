import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import SelectorProductoIngrediente from '../components/SelectorProductoIngrediente';
import ProductoDetalleModal from '../components/ProductoDetalleModal';
import Card from '../components/ui/Card';
import Title from '../components/ui/Title';
import type { Ingrediente, Receta, TipoReceta } from '../data/Recetas';
import { calcularCosteProporcionalIngrediente } from '../motor/compra';
import { useRecetas } from '../hooks/useRecetas';
import {
  asociarProductoAIngrediente,
  EVENTO_ASOCIACIONES,
  obtenerProductoAsociado,
  obtenerProductoIdAsociado,
} from '../services/asociacionesIngredientes';
import type { ProductoMercadonaCatalogo } from '../services/catalogoMercadona';
import { registrarAjustePorcion } from '../services/aprendizaje';
import {
  actualizarNombreRecetaEnMenu,
  eliminarRecetaDelMenu,
  recalcularRecetasParaPerfil,
  esRecetaPostre,
} from '../services/recetas';
import {
  calcularRacionesEquivalentes,
  cargarPerfil,
  describirFamilia,
  EVENTO_PERFIL,
  type PerfilFamiliar,
} from '../services/perfil';
import {
  obtenerSugerenciaBaseIngrediente,
  obtenerSugerenciaIngrediente,
} from '../services/porciones';

type ProductosPorIngrediente = Record<
  string,
  ProductoMercadonaCatalogo | null
>;

type IngredienteEditor = Ingrediente & {
  idEditor: string;
  nombreOriginal: string | null;
};

type RecetaEditor = Omit<Receta, 'ingredientes'> & {
  ingredientes: IngredienteEditor[];
};

type EditorReceta = {
  nombreOriginal: string | null;
  receta: RecetaEditor;
};

const CATEGORIAS_SUGERIDAS = [
  'Arroz',
  'Carne',
  'Cremas',
  'Legumbres',
  'Pasta',
  'Pescado',
  'Pizza',
  'Pollo',
  'Postres',
  'Otros',
];

const SECCIONES_SUGERIDAS = [
  'Carnicería',
  'Charcutería',
  'Congelados',
  'Despensa',
  'Fruta y verdura',
  'Lácteos y huevos',
  'Panadería',
  'Pescadería',
];

const UNIDADES_SUGERIDAS = [
  'ud',
  'g',
  'kg',
  'ml',
  'l',
  'lata',
  'bote',
  'bolsa',
  'paquete',
  'brick',
  'ración',
];

function crearIdEditor(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function crearIngredienteVacio(): IngredienteEditor {
  return {
    idEditor: crearIdEditor(),
    nombreOriginal: null,
    nombre: '',
    cantidad: 1,
    unidad: 'ud',
    seccion: 'Despensa',
    ajusteAutomatico: false,
  };
}

function crearRecetaEditor(receta: Receta): RecetaEditor {
  return {
    nombre: receta.nombre,
    categoria: receta.categoria,
    tipo: esRecetaPostre(receta) ? 'postre' : 'plato',
    ingredientes: receta.ingredientes.map((ingrediente) => ({
      ...ingrediente,
      idEditor: crearIdEditor(),
      nombreOriginal: ingrediente.nombre,
    })),
  };
}

function formatearMoneda(valor: number): string {
  return valor.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
}

function calcularResumenCosteReceta(
  receta: Receta,
  productos: ProductosPorIngrediente,
): { total: number; completos: number; estimado: boolean } {
  let total = 0;
  let completos = 0;
  let estimado = false;

  receta.ingredientes.forEach((ingrediente) => {
    const producto = productos[ingrediente.nombre];
    if (!producto) return;
    const calculo = calcularCosteProporcionalIngrediente(ingrediente, producto);
    if (calculo.coste === null) return;
    total += calculo.coste;
    completos += 1;
    estimado ||= calculo.estimado;
  });

  return { total, completos, estimado };
}

function Recetas() {
  const { recetas, guardar, restaurar } = useRecetas();
  const [perfil, setPerfil] = useState<PerfilFamiliar>(cargarPerfil);
  const [productosPorIngrediente, setProductosPorIngrediente] =
    useState<ProductosPorIngrediente>({});
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState('');
  const [ingredienteSelector, setIngredienteSelector] =
    useState<string | null>(null);
  const [modoPendientes, setModoPendientes] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [errorEditor, setErrorEditor] = useState('');
  const [editor, setEditor] = useState<EditorReceta | null>(null);
  const [productoAbierto, setProductoAbierto] =
    useState<ProductoMercadonaCatalogo | null>(null);
  const [selectorEditorIndice, setSelectorEditorIndice] =
    useState<number | null>(null);

  const nombresIngredientes = useMemo(() => {
    return Array.from(
      new Set(
        recetas.flatMap((receta) =>
          receta.ingredientes.map((ingrediente) => ingrediente.nombre),
        ),
      ),
    );
  }, [recetas]);

  const relacionarProductos = useCallback(async () => {
    try {
      setCargandoProductos(true);
      setErrorCatalogo('');

      const resultados = await Promise.all(
        nombresIngredientes.map(async (nombreIngrediente) => {
          const producto = await obtenerProductoAsociado(
            nombreIngrediente,
          );

          return [nombreIngrediente, producto ?? null] as const;
        }),
      );

      setProductosPorIngrediente(Object.fromEntries(resultados));
    } catch (errorDesconocido) {
      setErrorCatalogo(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se han podido cargar los productos seleccionados.',
      );
    } finally {
      setCargandoProductos(false);
    }
  }, [nombresIngredientes]);

  useEffect(() => {
    void relacionarProductos();
  }, [relacionarProductos]);

  useEffect(() => {
    const actualizar = () => {
      void relacionarProductos();
    };

    window.addEventListener(EVENTO_ASOCIACIONES, actualizar);
    return () => {
      window.removeEventListener(EVENTO_ASOCIACIONES, actualizar);
    };
  }, [relacionarProductos]);

  useEffect(() => {
    const actualizarPerfil = () => setPerfil(cargarPerfil());
    window.addEventListener(EVENTO_PERFIL, actualizarPerfil);
    return () => window.removeEventListener(EVENTO_PERFIL, actualizarPerfil);
  }, []);

  const ingredientesPendientes = useMemo(
    () =>
      nombresIngredientes.filter(
        (nombre) => !productosPorIngrediente[nombre],
      ),
    [nombresIngredientes, productosPorIngrediente],
  );

  const abrirSelector = (
    ingrediente: string,
    recorrerPendientes = false,
  ) => {
    setMensaje('');
    setModoPendientes(recorrerPendientes);
    setIngredienteSelector(ingrediente);
  };

  const cerrarSelector = useCallback(() => {
    setIngredienteSelector(null);
    setModoPendientes(false);
  }, []);

  const manejarAsociado = (
    ingrediente: string,
    producto: ProductoMercadonaCatalogo,
  ) => {
    const productosActualizados = {
      ...productosPorIngrediente,
      [ingrediente]: producto,
    };

    setProductosPorIngrediente(productosActualizados);
    setMensaje(`${ingrediente} asociado a ${producto.nombre}.`);

    if (!modoPendientes) {
      cerrarSelector();
      return;
    }

    const siguiente = nombresIngredientes.find(
      (nombre) =>
        nombre !== ingrediente && !productosActualizados[nombre],
    );

    if (siguiente) {
      setIngredienteSelector(siguiente);
    } else {
      cerrarSelector();
      setMensaje('Todos los ingredientes están asociados.');
    }
  };

  const abrirEditor = (receta: Receta) => {
    setMensaje('');
    setErrorEditor('');
    setEditor({
      nombreOriginal: receta.nombre,
      receta: crearRecetaEditor(receta),
    });
  };

  const crearReceta = () => {
    setMensaje('');
    setErrorEditor('');
    setEditor({
      nombreOriginal: null,
      receta: {
        nombre: '',
        categoria: 'Otros',
        tipo: 'plato',
        ingredientes: [crearIngredienteVacio()],
      },
    });
    setSelectorEditorIndice(0);
  };

  const actualizarCampoReceta = (
    campo: 'nombre' | 'categoria' | 'tipo',
    valor: string,
  ) => {
    setEditor((actual) => {
      if (!actual) return actual;

      if (campo === 'tipo') {
        const tipo = valor as TipoReceta;
        return {
          ...actual,
          receta: {
            ...actual.receta,
            tipo,
            categoria:
              tipo === 'postre' &&
              (!actual.receta.categoria || actual.receta.categoria === 'Otros')
                ? 'Postres'
                : actual.receta.categoria,
          },
        };
      }

      return {
        ...actual,
        receta: {
          ...actual.receta,
          [campo]: valor,
        },
      };
    });
  };

  const actualizarIngrediente = (
    indice: number,
    campo: keyof Ingrediente,
    valor: string | number,
  ) => {
    setEditor((actual) => {
      if (!actual) return actual;

      return {
        ...actual,
        receta: {
          ...actual.receta,
          ingredientes: actual.receta.ingredientes.map(
            (ingrediente, posicion) =>
              posicion === indice
                ? {
                    ...ingrediente,
                    [campo]: valor,
                    ajusteAutomatico:
                      campo === 'cantidad' || campo === 'unidad'
                        ? false
                        : ingrediente.ajusteAutomatico,
                  }
                : ingrediente,
          ),
        },
      };
    });
  };

  const cambiarAjusteAutomatico = (
    indice: number,
    activar: boolean,
  ) => {
    setEditor((actual) => {
      if (!actual) return actual;

      const ingrediente = actual.receta.ingredientes[indice];
      const sugerencia = obtenerSugerenciaIngrediente(
        ingrediente,
        actual.receta,
        perfil,
      );

      return {
        ...actual,
        receta: {
          ...actual.receta,
          ingredientes: actual.receta.ingredientes.map(
            (elemento, posicion) =>
              posicion === indice
                ? {
                    ...elemento,
                    ajusteAutomatico: activar && Boolean(sugerencia),
                    cantidad:
                      activar && sugerencia
                        ? sugerencia.cantidad
                        : elemento.cantidad,
                    unidad:
                      activar && sugerencia
                        ? sugerencia.unidad
                        : elemento.unidad,
                  }
                : elemento,
          ),
        },
      };
    });
  };

  const recalcularCantidadesFamiliares = () => {
    recalcularRecetasParaPerfil(perfil, true);
    setMensaje(
      `Cantidades recalculadas para ${describirFamilia(perfil)}.`,
    );
  };

  const añadirIngrediente = () => {
    const nuevoIndice = editor?.receta.ingredientes.length ?? 0;
    setEditor((actual) =>
      actual
        ? {
            ...actual,
            receta: {
              ...actual.receta,
              ingredientes: [
                ...actual.receta.ingredientes,
                crearIngredienteVacio(),
              ],
            },
          }
        : actual,
    );
    setSelectorEditorIndice(nuevoIndice);
  };

  const seleccionarProductoParaIngrediente = (
    _ingredienteAnterior: string,
    producto: ProductoMercadonaCatalogo,
  ) => {
    if (selectorEditorIndice === null) return;

    const indice = selectorEditorIndice;
    setEditor((actual) => {
      if (!actual || !actual.receta.ingredientes[indice]) return actual;

      return {
        ...actual,
        receta: {
          ...actual.receta,
          ingredientes: actual.receta.ingredientes.map((ingrediente, posicion) =>
            posicion === indice
              ? {
                  ...ingrediente,
                  nombre: producto.nombre,
                  seccion: producto.seccion || ingrediente.seccion,
                }
              : ingrediente,
          ),
        },
      };
    });
    asociarProductoAIngrediente(producto.nombre, producto.productoId);
    setSelectorEditorIndice(null);
    setMensaje(`${producto.nombre} añadido a la receta y a la despensa.`);
  };

  const quitarIngrediente = (indice: number) => {
    setEditor((actual) => {
      if (!actual || actual.receta.ingredientes.length === 1) {
        return actual;
      }

      return {
        ...actual,
        receta: {
          ...actual.receta,
          ingredientes: actual.receta.ingredientes.filter(
            (_, posicion) => posicion !== indice,
          ),
        },
      };
    });
  };

  const guardarEdicion = () => {
    if (!editor) return;

    const recetaOriginal = editor.nombreOriginal
      ? recetas.find((receta) => receta.nombre === editor.nombreOriginal)
      : undefined;
    const referenciaReceta = {
      nombre: editor.receta.nombre.trim(),
      categoria: editor.receta.categoria.trim(),
    };


    const recetaBase: Receta = {
      nombre: editor.receta.nombre.trim(),
      categoria: editor.receta.categoria.trim(),
      tipo: editor.receta.tipo ?? 'plato',
      ingredientes: editor.receta.ingredientes.map((ingrediente) => ({
        nombre: ingrediente.nombre.trim(),
        cantidad: Number(ingrediente.cantidad),
        unidad: ingrediente.unidad.trim(),
        seccion: ingrediente.seccion.trim(),
        ajusteAutomatico: ingrediente.ajusteAutomatico === true,
      })),
    };

    const recetaLimpia: Receta = {
      ...recetaBase,
      ingredientes: recetaBase.ingredientes.map((ingrediente) => {
        const sugerencia = obtenerSugerenciaIngrediente(
          ingrediente,
          recetaBase,
          perfil,
        );

        return ingrediente.ajusteAutomatico && sugerencia
          ? {
              ...ingrediente,
              cantidad: sugerencia.cantidad,
              unidad: sugerencia.unidad,
            }
          : ingrediente;
      }),
    };

    if (!recetaLimpia.nombre) {
      setErrorEditor('Escribe el nombre de la receta.');
      return;
    }

    if (!recetaLimpia.categoria) {
      setErrorEditor('Escribe una categoría.');
      return;
    }

    const ingredienteInvalido = recetaLimpia.ingredientes.some(
      (ingrediente) =>
        !ingrediente.nombre ||
        !ingrediente.unidad ||
        !ingrediente.seccion ||
        !Number.isFinite(ingrediente.cantidad) ||
        ingrediente.cantidad <= 0,
    );

    if (ingredienteInvalido) {
      setErrorEditor(
        'Completa todos los ingredientes con una cantidad mayor que cero.',
      );
      return;
    }

    const nombreDuplicado = recetas.some(
      (receta) =>
        receta.nombre.toLocaleLowerCase('es') ===
          recetaLimpia.nombre.toLocaleLowerCase('es') &&
        receta.nombre !== editor.nombreOriginal,
    );

    if (nombreDuplicado) {
      setErrorEditor('Ya existe una receta con ese nombre.');
      return;
    }

    editor.receta.ingredientes.forEach((ingredienteEditor) => {
      if (ingredienteEditor.ajusteAutomatico === true) return;

      const original = recetaOriginal?.ingredientes.find(
        (ingrediente) =>
          ingrediente.nombre === ingredienteEditor.nombreOriginal,
      );
      const cantidadCambiada =
        original &&
        (original.cantidad !== Number(ingredienteEditor.cantidad) ||
          original.unidad !== ingredienteEditor.unidad.trim());

      if (!cantidadCambiada) return;

      const sugerenciaBase = obtenerSugerenciaBaseIngrediente(
        ingredienteEditor,
        referenciaReceta,
        perfil,
      );

      if (!sugerenciaBase) return;

      registrarAjustePorcion({
        receta: referenciaReceta.nombre,
        ingrediente: ingredienteEditor.nombre.trim(),
        cantidadBase: sugerenciaBase.cantidad,
        unidadBase: sugerenciaBase.unidad,
        cantidadManual: Number(ingredienteEditor.cantidad),
        unidadManual: ingredienteEditor.unidad.trim(),
      });
    });

    editor.receta.ingredientes.forEach((ingrediente) => {
      const nombreAnterior = ingrediente.nombreOriginal;
      const nombreNuevo = ingrediente.nombre.trim();

      if (!nombreAnterior || nombreAnterior === nombreNuevo) {
        return;
      }

      const productoAnterior = obtenerProductoIdAsociado(nombreAnterior);
      const productoNuevo = obtenerProductoIdAsociado(nombreNuevo);

      if (productoAnterior && !productoNuevo) {
        asociarProductoAIngrediente(nombreNuevo, productoAnterior);
      }
    });

    const nuevasRecetas = editor.nombreOriginal
      ? recetas.map((receta) =>
          receta.nombre === editor.nombreOriginal
            ? recetaLimpia
            : receta,
        )
      : [...recetas, recetaLimpia];

    guardar(nuevasRecetas);

    if (editor.nombreOriginal) {
      actualizarNombreRecetaEnMenu(
        editor.nombreOriginal,
        recetaLimpia.nombre,
      );
    }

    setEditor(null);
    setErrorEditor('');
    setMensaje(
      editor.nombreOriginal
        ? `Receta «${recetaLimpia.nombre}» actualizada.`
        : `Receta «${recetaLimpia.nombre}» creada.`,
    );
  };

  const eliminarReceta = (nombreReceta: string) => {
    const confirmado = window.confirm(
      `Se eliminará «${nombreReceta}» y se quitará de las cuatro semanas del menú. ¿Continuar?`,
    );
    if (!confirmado) return;

    guardar(recetas.filter((receta) => receta.nombre !== nombreReceta));
    eliminarRecetaDelMenu(nombreReceta);
    if (editor?.nombreOriginal === nombreReceta) setEditor(null);
    setMensaje(`Receta «${nombreReceta}» eliminada del recetario y del menú.`);
  };

  const restaurarOriginales = () => {
    const confirmado = window.confirm(
      'Se restaurarán las recetas y el menú original. ¿Continuar?',
    );

    if (!confirmado) return;

    restaurar();
    setMensaje('Recetas y menú original restaurados.');
  };

  const productoActual = ingredienteSelector
    ? productosPorIngrediente[ingredienteSelector] ?? null
    : null;

  return (
    <main className="page legacy-page" style={estiloPagina}>
      <Card className="page-hero-card page-hero-card--compact recipes-intro-card">
        <div>
          <Title style={{ color: '#4f6f52' }}>📖 Recetas</Title>
          <p className="recipes-intro-copy" style={estiloIntroduccion}>
            Platos y postres calculados para {describirFamilia(perfil)} ({calcularRacionesEquivalentes(perfil).toLocaleString('es-ES')} raciones equivalentes).
          </p>
        </div>

        {mensaje && <p style={estiloMensajeExito}>{mensaje}</p>}
      </Card>

      <section className="recipes-sticky-actions" aria-label="Acciones del recetario">
        <button
          type="button"
          onClick={crearReceta}
          style={estiloBotonPrincipal}
        >
          ＋ Nueva receta
        </button>

        <button
          type="button"
          onClick={recalcularCantidadesFamiliares}
          style={estiloBotonSecundario}
        >
          ⚖️ Recalcular para mi familia
        </button>

        {ingredientesPendientes.length > 0 && (
          <button
            type="button"
            onClick={() =>
              abrirSelector(ingredientesPendientes[0], true)
            }
            style={estiloBotonSecundario}
          >
            Asociar pendientes ({ingredientesPendientes.length})
          </button>
        )}

        <button
          type="button"
          onClick={restaurarOriginales}
          style={estiloBotonDiscreto}
        >
          Restaurar originales
        </button>
      </section>

      {cargandoProductos && (
        <Card>
          <p style={estiloMensaje}>
            Cargando las asociaciones exactas del catálogo...
          </p>
        </Card>
      )}

      {errorCatalogo && (
        <Card style={estiloAvisoError}>
          <Title style={{ color: '#806718', fontSize: '20px' }}>
            ⚠️ No se pudo cargar el catálogo
          </Title>
          <p style={{ marginBottom: 0, color: '#6b5b26' }}>
            {errorCatalogo}
          </p>
        </Card>
      )}

      <section style={estiloCuadricula}>
        {recetas.map((receta) => {
          const costeReceta = calcularResumenCosteReceta(
            receta,
            productosPorIngrediente,
          );

          return (
          <Card key={receta.nombre} style={{ marginBottom: 0 }}>
            <div style={estiloCabeceraReceta}>
              <div>
                <Title
                  style={{
                    marginBottom: '5px',
                    color: '#4f6f52',
                    fontSize: '21px',
                  }}
                >
                  {receta.nombre}
                </Title>

                <span style={estiloCategoria}>{receta.categoria}</span>
                <span style={estiloCosteReceta}>
                  {costeReceta.completos === 0
                    ? 'Coste pendiente de asociaciones'
                    : `${costeReceta.estimado ? '≈ ' : ''}${formatearMoneda(costeReceta.total)} usados${
                        costeReceta.completos < receta.ingredientes.length
                          ? ` · faltan ${receta.ingredientes.length - costeReceta.completos} asociaciones/precios`
                          : ' en la receta'
                      }`}
                </span>
              </div>

              <div style={estiloAccionesReceta}>
                <span style={estiloContador}>
                  {receta.ingredientes.length}
                </span>
                <button
                  type="button"
                  onClick={() => abrirEditor(receta)}
                  style={estiloBotonEditar}
                >
                  ✏️ Editar
                </button>
                <button
                  type="button"
                  onClick={() => eliminarReceta(receta.nombre)}
                  style={estiloBotonEliminarReceta}
                  aria-label={`Eliminar ${receta.nombre}`}
                >
                  🗑️
                </button>
              </div>
            </div>

            <div style={estiloListaIngredientes}>
              {receta.ingredientes.map((ingrediente, indice) => {
                const producto =
                  productosPorIngrediente[ingrediente.nombre];
                const costeProporcional = producto
                  ? calcularCosteProporcionalIngrediente(ingrediente, producto)
                  : null;

                return (
                  <article
                    key={`${receta.nombre}-${ingrediente.nombre}-${ingrediente.unidad}-${indice}`}
                    style={estiloIngrediente}
                  >
                    <div style={estiloDatoIngrediente}>
                      <span style={{ minWidth: 0 }}>
                        <strong
                          style={{ display: 'block', color: '#263229' }}
                        >
                          {ingrediente.nombre}
                        </strong>
                        <span style={estiloCantidad}>
                          {ingrediente.cantidad} {ingrediente.unidad}
                        </span>
                        {ingrediente.ajusteAutomatico && (
                          <span style={estiloEtiquetaAutomatica}>
                            ⚖️ Ajustado a la familia
                          </span>
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={() => abrirSelector(ingrediente.nombre)}
                        style={
                          producto
                            ? estiloBotonCambiar
                            : estiloBotonAsociar
                        }
                      >
                        {producto ? 'Cambiar' : 'Asociar'}
                      </button>
                    </div>

                    {producto ? (
                      <div style={estiloProducto}>
                        <button
                          type="button"
                          onClick={() => setProductoAbierto(producto)}
                          style={estiloBotonFotoProducto}
                          aria-label={`Editar ${producto.nombre}`}
                        >
                          {producto.imagen ? (
                            <img
                              src={producto.imagen}
                              alt=""
                              style={estiloImagen}
                            />
                          ) : (
                            <span style={estiloSinImagen}>🛒</span>
                          )}
                        </button>

                        <div style={{ flex: 1 }}>
                          <strong style={estiloNombreProducto}>
                            {producto.nombre}
                          </strong>
                          <span style={estiloDetalle}>
                            {producto.formato}
                          </span>
                          <strong style={estiloPrecio}>
                            {costeProporcional?.coste === null ||
                            costeProporcional === null
                              ? 'Coste proporcional no disponible'
                              : `${costeProporcional.estimado ? '≈ ' : ''}${formatearMoneda(costeProporcional.coste)} usados`}
                          </strong>
                          {producto.precio !== null && (
                            <small style={estiloPrecioEnvase}>
                              Envase completo: {formatearMoneda(producto.precio)}
                            </small>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={estiloProductoPendiente}>
                        <span>⚠️</span>
                        <span>
                          Pulsa «Asociar» y elige una coincidencia.
                        </span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </Card>
          );
        })}
      </section>

      <SelectorProductoIngrediente
        ingrediente={ingredienteSelector}
        productoActual={productoActual}
        pendientesRestantes={
          modoPendientes ? ingredientesPendientes.length : undefined
        }
        añadirADespensaAlSeleccionar
        onCerrar={cerrarSelector}
        onAsociado={manejarAsociado}
      />

      <SelectorProductoIngrediente
        ingrediente={
          selectorEditorIndice === null
            ? null
            : editor?.receta.ingredientes[selectorEditorIndice]?.nombre ?? ''
        }
        busquedaInicial={
          selectorEditorIndice === null
            ? undefined
            : editor?.receta.ingredientes[selectorEditorIndice]?.nombre ?? ''
        }
        añadirADespensaAlSeleccionar
        asociarAutomaticamente={false}
        onCerrar={() => setSelectorEditorIndice(null)}
        onAsociado={seleccionarProductoParaIngrediente}
      />

      <ProductoDetalleModal
        productoId={productoAbierto?.productoId ?? null}
        productoInicial={productoAbierto}
        onCerrar={() => setProductoAbierto(null)}
        onActualizado={() => void relacionarProductos()}
      />

      {editor && (
        <div style={estiloFondoModal} role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Editar receta"
            style={estiloModalEditor}
          >
            <div style={estiloCabeceraModal}>
              <div>
                <Title style={{ color: '#4f6f52', marginBottom: '4px' }}>
                  {editor.nombreOriginal
                    ? '✏️ Editar receta'
                    : '＋ Nueva receta'}
                </Title>
                <p style={estiloTextoModal}>
                  La compra se recalculará con estas cantidades. Los ingredientes automáticos parten de raciones estándar y se afinan con tus correcciones.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setEditor(null); setSelectorEditorIndice(null); }}
                style={estiloBotonCerrar}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div style={estiloCuadriculaCampos}>
              <label style={estiloEtiquetaCampo}>
                Nombre
                <input
                  value={editor.receta.nombre}
                  onChange={(evento) =>
                    actualizarCampoReceta('nombre', evento.target.value)
                  }
                  style={estiloCampo}
                  autoFocus
                />
              </label>

              <label style={estiloEtiquetaCampo}>
                Tipo
                <select
                  value={editor.receta.tipo ?? 'plato'}
                  onChange={(evento) =>
                    actualizarCampoReceta('tipo', evento.target.value)
                  }
                  style={estiloCampo}
                >
                  <option value="plato">Plato</option>
                  <option value="postre">Postre</option>
                </select>
              </label>

              <label style={estiloEtiquetaCampo}>
                Categoría
                <input
                  value={editor.receta.categoria}
                  onChange={(evento) =>
                    actualizarCampoReceta(
                      'categoria',
                      evento.target.value,
                    )
                  }
                  list="categorias-receta"
                  style={estiloCampo}
                />
              </label>
            </div>

            <datalist id="categorias-receta">
              {CATEGORIAS_SUGERIDAS.map((categoria) => (
                <option key={categoria} value={categoria} />
              ))}
            </datalist>

            <div style={estiloTituloIngredientes}>
              <strong>Ingredientes</strong>
              <button
                type="button"
                onClick={añadirIngrediente}
                style={estiloBotonAñadirIngrediente}
              >
                ＋ Añadir ingrediente
              </button>
            </div>

            <div style={estiloListaEditor}>
              {editor.receta.ingredientes.map((ingrediente, indice) => {
                const sugerencia = obtenerSugerenciaIngrediente(
                  ingrediente,
                  editor.receta,
                  perfil,
                );

                return (
                <div key={ingrediente.idEditor} style={estiloFilaEditor}>
                  <label style={estiloEtiquetaCampo}>
                    Ingrediente
                    <input
                      value={ingrediente.nombre}
                      onChange={(evento) =>
                        actualizarIngrediente(
                          indice,
                          'nombre',
                          evento.target.value,
                        )
                      }
                      style={estiloCampo}
                    />
                    <button
                      type="button"
                      onClick={() => setSelectorEditorIndice(indice)}
                      style={estiloBotonElegirProducto}
                    >
                      📦 Elegir del catálogo
                    </button>
                  </label>

                  <label style={estiloEtiquetaCampo}>
                    Cantidad
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={ingrediente.cantidad}
                      onChange={(evento) =>
                        actualizarIngrediente(
                          indice,
                          'cantidad',
                          Number(evento.target.value),
                        )
                      }
                      style={estiloCampo}
                    />
                  </label>

                  <label style={estiloEtiquetaCampo}>
                    Unidad
                    <input
                      value={ingrediente.unidad}
                      onChange={(evento) =>
                        actualizarIngrediente(
                          indice,
                          'unidad',
                          evento.target.value,
                        )
                      }
                      list="unidades-receta"
                      style={estiloCampo}
                    />
                  </label>

                  <label style={estiloEtiquetaCampo}>
                    Sección
                    <input
                      value={ingrediente.seccion}
                      onChange={(evento) =>
                        actualizarIngrediente(
                          indice,
                          'seccion',
                          evento.target.value,
                        )
                      }
                      list="secciones-receta"
                      style={estiloCampo}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => quitarIngrediente(indice)}
                    disabled={editor.receta.ingredientes.length === 1}
                    style={{
                      ...estiloBotonQuitar,
                      opacity:
                        editor.receta.ingredientes.length === 1 ? 0.4 : 1,
                    }}
                    aria-label="Quitar ingrediente"
                  >
                    🗑️
                  </button>

                  <div style={estiloAjusteAutomaticoEditor}>
                    <label style={estiloInterruptorAutomatico}>
                      <input
                        type="checkbox"
                        checked={ingrediente.ajusteAutomatico === true}
                        disabled={!sugerencia}
                        onChange={(evento) =>
                          cambiarAjusteAutomatico(
                            indice,
                            evento.target.checked,
                          )
                        }
                      />
                      Cálculo automático para la familia
                    </label>
                    <small style={estiloExplicacionAutomatica}>
                      {sugerencia
                        ? `${sugerencia.explicacion.includes('Aprendido') ? '🧠 ' : ''}${sugerencia.cantidad} ${sugerencia.unidad} · ${sugerencia.explicacion}`
                        : 'Sin regla estándar: conserva la cantidad que indiques.'}
                    </small>
                  </div>
                </div>
                );
              })}
            </div>

            <datalist id="unidades-receta">
              {UNIDADES_SUGERIDAS.map((unidad) => (
                <option key={unidad} value={unidad} />
              ))}
            </datalist>

            <datalist id="secciones-receta">
              {SECCIONES_SUGERIDAS.map((seccion) => (
                <option key={seccion} value={seccion} />
              ))}
            </datalist>

            {errorEditor && <p style={estiloErrorEditor}>{errorEditor}</p>}

            <div style={estiloPieModal}>
              {editor.nombreOriginal && (
                <button
                  type="button"
                  onClick={() => eliminarReceta(editor.nombreOriginal!)}
                  style={estiloBotonEliminarModal}
                >
                  Eliminar receta
                </button>
              )}
              <button
                type="button"
                onClick={() => { setEditor(null); setSelectorEditorIndice(null); }}
                style={estiloBotonCancelar}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarEdicion}
                style={estiloBotonGuardar}
              >
                Guardar receta
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

const estiloPagina = {
  maxWidth: '1050px',
  margin: '0 auto',
  padding: '20px 20px 110px',
};

const estiloIntroduccion = {
  maxWidth: '590px',
  marginBottom: 0,
  color: '#667067',
};

const estiloBotonBase = {
  border: 0,
  borderRadius: '11px',
  padding: '9px 12px',
  fontFamily: 'inherit',
  fontWeight: 800,
  cursor: 'pointer',
};

const estiloBotonPrincipal = {
  ...estiloBotonBase,
  background: '#4f6f52',
  color: '#fff',
};

const estiloBotonSecundario = {
  ...estiloBotonBase,
  background: '#dfe8dc',
  color: '#4f6f52',
};

const estiloBotonDiscreto = {
  ...estiloBotonBase,
  border: '1px solid #d7dfd4',
  background: '#fff',
  color: '#667067',
};

const estiloBotonAsociar = {
  ...estiloBotonBase,
  flexShrink: 0,
  background: '#4f6f52',
  color: '#fff',
};

const estiloBotonCambiar = {
  ...estiloBotonBase,
  flexShrink: 0,
  background: '#e7eee4',
  color: '#4f6f52',
};

const estiloBotonEditar = {
  ...estiloBotonBase,
  padding: '8px 10px',
  background: '#fff4df',
  color: '#8a5a1f',
};

const estiloBotonEliminarReceta = {
  ...estiloBotonBase,
  padding: '8px 9px',
  border: '1px solid #edd3cf',
  background: '#fff5f3',
  color: '#9b3f35',
};

const estiloBotonEliminarModal = {
  ...estiloBotonBase,
  marginRight: 'auto',
  border: '1px solid #e9c7c1',
  background: '#fff2ef',
  color: '#9b3f35',
};

const estiloCosteReceta = {
  display: 'block',
  marginTop: '7px',
  color: '#49644d',
  fontSize: '12px',
  fontWeight: 850,
};

const estiloPrecioEnvase = {
  display: 'block',
  marginTop: '3px',
  color: '#7a827b',
  fontSize: '10px',
  fontWeight: 700,
};

const estiloMensajeExito = {
  marginBottom: 0,
  padding: '10px 12px',
  borderRadius: '10px',
  background: '#eef5ed',
  color: '#4f6f52',
  fontWeight: 700,
};

const estiloMensaje = {
  margin: 0,
  color: '#667067',
  textAlign: 'center' as const,
};

const estiloAvisoError = {
  background: '#fff7dc',
  border: '1px solid #ead58d',
};

const estiloCuadricula = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '14px',
};

const estiloCabeceraReceta = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '12px',
  marginBottom: '15px',
};

const estiloAccionesReceta = {
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
};

const estiloCategoria = {
  display: 'inline-block',
  padding: '5px 9px',
  borderRadius: '999px',
  background: '#eef2ec',
  color: '#4f6f52',
  fontSize: '12px',
  fontWeight: 800,
};

const estiloContador = {
  display: 'grid',
  placeItems: 'center',
  width: '35px',
  height: '35px',
  flexShrink: 0,
  borderRadius: '50%',
  background: '#dfe8dc',
  color: '#4f6f52',
  fontWeight: 800,
};

const estiloListaIngredientes = {
  display: 'grid',
  gap: '11px',
};

const estiloIngrediente = {
  overflow: 'hidden',
  border: '1px solid #e1e6df',
  borderRadius: '14px',
  background: '#fff',
};

const estiloDatoIngrediente = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  padding: '11px 12px',
  background: '#f8f6f2',
};

const estiloCantidad = {
  display: 'block',
  marginTop: '3px',
  color: '#667067',
  fontSize: '14px',
};

const estiloEtiquetaAutomatica = {
  display: 'inline-block',
  marginTop: '5px',
  padding: '3px 7px',
  borderRadius: '999px',
  background: '#e5efe2',
  color: '#4f6f52',
  fontSize: '11px',
  fontWeight: 800,
};

const estiloProducto = {
  display: 'flex',
  alignItems: 'center',
  gap: '11px',
  padding: '11px 12px',
};

const estiloBotonFotoProducto = {
  flex: '0 0 auto',
  display: 'grid',
  placeItems: 'center',
  border: 0,
  padding: 0,
  borderRadius: '12px',
  background: 'transparent',
  cursor: 'pointer',
};

const estiloImagen = {
  width: '58px',
  height: '58px',
  flexShrink: 0,
  objectFit: 'contain' as const,
  borderRadius: '10px',
  background: 'white',
};

const estiloSinImagen = {
  display: 'grid',
  placeItems: 'center',
  width: '58px',
  height: '58px',
  flexShrink: 0,
  borderRadius: '10px',
  background: '#eef2ec',
  fontSize: '25px',
};

const estiloNombreProducto = {
  display: 'block',
  color: '#263229',
  fontSize: '14px',
  lineHeight: 1.3,
};

const estiloDetalle = {
  display: 'block',
  marginTop: '3px',
  color: '#667067',
  fontSize: '13px',
};

const estiloPrecio = {
  display: 'block',
  marginTop: '5px',
  color: '#4f6f52',
  fontSize: '14px',
};

const estiloProductoPendiente = {
  display: 'flex',
  gap: '8px',
  padding: '10px 12px',
  background: '#fff8e7',
  color: '#806718',
  fontSize: '13px',
};

const estiloFondoModal = {
  position: 'fixed' as const,
  inset: 0,
  zIndex: 200,
  display: 'grid',
  placeItems: 'center',
  padding: '18px',
  background: 'rgba(25, 34, 28, 0.6)',
};

const estiloModalEditor = {
  width: 'min(920px, 100%)',
  maxHeight: '90vh',
  overflowY: 'auto' as const,
  boxSizing: 'border-box' as const,
  padding: '20px',
  borderRadius: '18px',
  background: '#fff',
  boxShadow: '0 22px 70px rgba(0, 0, 0, 0.28)',
};

const estiloCabeceraModal = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '14px',
  marginBottom: '18px',
};

const estiloTextoModal = {
  margin: 0,
  color: '#667067',
};

const estiloBotonCerrar = {
  display: 'grid',
  placeItems: 'center',
  width: '38px',
  height: '38px',
  flexShrink: 0,
  border: 0,
  borderRadius: '50%',
  background: '#eef2ec',
  color: '#4f6f52',
  fontSize: '25px',
  cursor: 'pointer',
};

const estiloCuadriculaCampos = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px',
};

const estiloEtiquetaCampo = {
  display: 'grid',
  gap: '6px',
  color: '#4c594e',
  fontSize: '12px',
  fontWeight: 800,
};

const estiloCampo = {
  minWidth: 0,
  width: '100%',
  boxSizing: 'border-box' as const,
  border: '1px solid #cfd8cd',
  borderRadius: '10px',
  padding: '10px',
  background: '#fbfaf8',
  color: '#263229',
  fontFamily: 'inherit',
  fontSize: '14px',
};

const estiloTituloIngredientes = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap' as const,
  gap: '10px',
  marginTop: '20px',
  marginBottom: '10px',
  color: '#263229',
};

const estiloBotonAñadirIngrediente = {
  ...estiloBotonBase,
  background: '#e7eee4',
  color: '#4f6f52',
};

const estiloListaEditor = {
  display: 'grid',
  gap: '10px',
};

const estiloFilaEditor = {
  display: 'grid',
  gridTemplateColumns: 'minmax(180px, 2fr) minmax(90px, .7fr) minmax(100px, .8fr) minmax(160px, 1.3fr) 44px',
  alignItems: 'end',
  gap: '9px',
  padding: '12px',
  border: '1px solid #e1e6df',
  borderRadius: '13px',
  background: '#f8f6f2',
};

const estiloAjusteAutomaticoEditor = {
  gridColumn: '1 / -1',
  display: 'grid',
  gap: '4px',
  paddingTop: '2px',
};

const estiloInterruptorAutomatico = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: '#4f6f52',
  fontSize: '13px',
  fontWeight: 800,
};

const estiloExplicacionAutomatica = {
  color: '#667067',
  lineHeight: 1.35,
};

const estiloBotonElegirProducto = {
  marginTop: '7px',
  padding: '8px 10px',
  border: '1px solid #cfd9cc',
  borderRadius: '10px',
  background: '#f4f7f2',
  color: '#4f6f52',
  fontFamily: 'inherit',
  fontSize: '12px',
  fontWeight: 800,
  cursor: 'pointer',
};

const estiloBotonQuitar = {
  display: 'grid',
  placeItems: 'center',
  width: '42px',
  height: '42px',
  border: 0,
  borderRadius: '10px',
  background: '#fde9e5',
  cursor: 'pointer',
};

const estiloErrorEditor = {
  marginBottom: 0,
  padding: '10px 12px',
  borderRadius: '10px',
  background: '#fde9e5',
  color: '#9c3f34',
  fontWeight: 700,
};

const estiloPieModal = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '9px',
  marginTop: '18px',
};

const estiloBotonCancelar = {
  ...estiloBotonBase,
  border: '1px solid #d7dfd4',
  background: '#fff',
  color: '#667067',
};

const estiloBotonGuardar = {
  ...estiloBotonBase,
  background: '#4f6f52',
  color: '#fff',
};

export default Recetas;
