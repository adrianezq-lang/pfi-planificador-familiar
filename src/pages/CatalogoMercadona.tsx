import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import ProductoDetalleModal from '../components/ProductoDetalleModal';
import Card from '../components/ui/Card';
import Title from '../components/ui/Title';
import { useRecetas } from '../hooks/useRecetas';
import {
  asociarProductoAIngrediente,
  buscarIngredientesAsociadosAProducto,
  cargarAsociacionesIngredientes,
  quitarAsociacionIngrediente,
  type AsociacionesIngredientes,
} from '../services/asociacionesIngredientes';
import {
  alternarProductoSeleccionado,
  cargarCatalogoMercadona,
  cargarIdsMisProductos,
  type ProductoMercadonaCatalogo,
} from '../services/catalogoMercadona';
import {
  cargarDespensa,
  crearProductoDespensaDesdeCatalogo,
} from '../services/despensa';

type VistaCatalogo =
  | 'todos'
  | 'mis-productos'
  | 'asociaciones';

const LIMITE_INICIAL = 120;

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function coincideBusqueda(
  producto: ProductoMercadonaCatalogo,
  busqueda: string,
): boolean {
  const termino = normalizar(busqueda);

  if (!termino) return true;

  const contenido = normalizar(
    [
      producto.nombre,
      producto.formato,
      producto.seccion,
      producto.subcategoria,
    ].join(' '),
  );

  return termino
    .split(' ')
    .filter(Boolean)
    .every((palabra) => contenido.includes(palabra));
}

function CatalogoMercadona() {
  const { recetas } = useRecetas();
  const [catalogo, setCatalogo] = useState<
    ProductoMercadonaCatalogo[]
  >([]);
  const [fechaCatalogo, setFechaCatalogo] = useState('');
  const [codigoPostalCatalogo, setCodigoPostalCatalogo] = useState('');
  const [almacenCatalogo, setAlmacenCatalogo] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [vista, setVista] =
    useState<VistaCatalogo>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [seccionActiva, setSeccionActiva] =
    useState('Todas');
  const [limite, setLimite] = useState(LIMITE_INICIAL);
  const [misProductos, setMisProductos] = useState<
    string[]
  >(cargarIdsMisProductos);
  const [asociaciones, setAsociaciones] = useState<
    AsociacionesIngredientes
  >(cargarAsociacionesIngredientes);
  const [idsDespensa, setIdsDespensa] = useState<string[]>(
    () =>
      cargarDespensa().map(
        (producto) => producto.productoId,
      ),
  );
  const [productoAbierto, setProductoAbierto] =
    useState<ProductoMercadonaCatalogo | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [actualizandoCatalogo, setActualizandoCatalogo] = useState(false);
  const [productoConfiguracion, setProductoConfiguracion] =
    useState<ProductoMercadonaCatalogo | null>(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        setError('');
        const resultado = await cargarCatalogoMercadona();
        setCatalogo(resultado.productos);
        setFechaCatalogo(resultado.actualizado);
        setCodigoPostalCatalogo(resultado.codigoPostal);
        setAlmacenCatalogo(resultado.almacen);
      } catch (errorDesconocido) {
        setError(
          errorDesconocido instanceof Error
            ? errorDesconocido.message
            : 'No se ha podido cargar el catálogo.',
        );
      } finally {
        setCargando(false);
      }
    };

    void cargar();
  }, []);

  useEffect(() => {
    setLimite(LIMITE_INICIAL);
  }, [vista, busqueda, seccionActiva]);

  const ingredientesDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          recetas.flatMap((receta) =>
            receta.ingredientes.map(
              (ingrediente) => ingrediente.nombre,
            ),
          ),
        ),
      ).sort((a, b) => a.localeCompare(b, 'es')),
    [recetas],
  );

  const productosPorId = useMemo(
    () =>
      new Map(
        catalogo.map((producto) => [
          producto.productoId,
          producto,
        ]),
      ),
    [catalogo],
  );

  const secciones = useMemo(
    () => [
      'Todas',
      ...Array.from(
        new Set(catalogo.map((producto) => producto.seccion)),
      ).sort((a, b) => a.localeCompare(b, 'es')),
    ],
    [catalogo],
  );

  const productosFiltrados = useMemo(() => {
    const idsFavoritos = new Set(misProductos);

    return catalogo.filter((producto) => {
      if (
        vista === 'mis-productos' &&
        !idsFavoritos.has(producto.productoId)
      ) {
        return false;
      }

      if (
        seccionActiva !== 'Todas' &&
        producto.seccion !== seccionActiva
      ) {
        return false;
      }

      return coincideBusqueda(producto, busqueda);
    });
  }, [
    catalogo,
    misProductos,
    busqueda,
    seccionActiva,
    vista,
  ]);

  const productosVisibles = productosFiltrados.slice(
    0,
    limite,
  );

  const asociacionesOrdenadas = useMemo(
    () =>
      Object.entries(asociaciones).sort(([a], [b]) =>
        a.localeCompare(b, 'es'),
      ),
    [asociaciones],
  );

  const ingredientesProductoAbierto = productoAbierto
    ? buscarIngredientesAsociadosAProducto(
        productoAbierto.productoId,
      )
    : [];

  const alternarFavorito = (
    producto: ProductoMercadonaCatalogo,
  ) => {
    const nuevosIds = alternarProductoSeleccionado(
      producto.productoId,
    );
    setMisProductos(nuevosIds);

    const añadido = nuevosIds.includes(producto.productoId);
    setMensaje(
      añadido
        ? 'Producto añadido a Mis productos.'
        : 'Producto quitado de Mis productos.',
    );
  };

  const añadirADespensa = (
    producto: ProductoMercadonaCatalogo,
  ) => {
    const productos = crearProductoDespensaDesdeCatalogo(
      producto,
    );
    setIdsDespensa(
      productos.map((elemento) => elemento.productoId),
    );
    setMensaje('Producto añadido a la despensa.');
  };

  const cambiarAsociacion = (ingrediente: string) => {
    if (!productoAbierto) return;

    const yaAsociado =
      asociaciones[ingrediente] ===
      productoAbierto.productoId;

    const nuevas = yaAsociado
      ? quitarAsociacionIngrediente(ingrediente)
      : asociarProductoAIngrediente(
          ingrediente,
          productoAbierto.productoId,
        );

    setAsociaciones(nuevas);
    setMensaje(
      yaAsociado
        ? 'Asociación eliminada.'
        : 'Ingrediente asociado al producto.',
    );
  };

  const eliminarAsociacion = (ingrediente: string) => {
    setAsociaciones(
      quitarAsociacionIngrediente(ingrediente),
    );
    setMensaje('Asociación eliminada.');
  };

  const actualizarCatalogoCompleto = async () => {
    try {
      setActualizandoCatalogo(true);
      setMensaje('Comprobando el catálogo publicado más reciente…');

      if (import.meta.env.DEV) {
        const respuesta = await fetch('/api/pfi/mercadona/actualizar-completo', {
          method: 'POST',
        });
        const resultado = (await respuesta.json()) as { ok?: boolean; error?: string };

        if (!respuesta.ok || !resultado.ok) {
          throw new Error(resultado.error ?? 'No se pudo regenerar el catálogo local.');
        }
      }

      const nuevoCatalogo = await cargarCatalogoMercadona(true);
      setCatalogo(nuevoCatalogo.productos);
      setFechaCatalogo(nuevoCatalogo.actualizado);
      setCodigoPostalCatalogo(nuevoCatalogo.codigoPostal);
      setAlmacenCatalogo(nuevoCatalogo.almacen);
      setMensaje(
        `Catálogo comprobado: ${nuevoCatalogo.productos.length.toLocaleString('es-ES')} productos · ${formatearFechaCatalogo(nuevoCatalogo.actualizado)}.`,
      );
    } catch (errorDesconocido) {
      setMensaje(
        errorDesconocido instanceof Error
          ? `No se pudo actualizar: ${errorDesconocido.message}`
          : 'No se pudo actualizar el catálogo completo.',
      );
    } finally {
      setActualizandoCatalogo(false);
    }
  };

  return (
    <main className="page legacy-page" style={estiloPagina}>
      <Card className="page-hero-card">
        <Title style={{ color: '#4f6f52' }}>
          🏪 Catálogo Mercadona
        </Title>
        <p style={estiloSubtitulo}>
          Elige tus productos, añádelos a la despensa y
          asócialos a uno o varios ingredientes.
        </p>

        <div style={estiloResumenGrid}>
          <Resumen
            numero={catalogo.length.toLocaleString('es-ES')}
            texto="productos"
          />
          <Resumen
            numero={misProductos.length}
            texto="mis productos"
          />
          <Resumen
            numero={idsDespensa.length}
            texto="en despensa"
          />
          <Resumen
            numero={asociacionesOrdenadas.length}
            texto="asociaciones"
          />
        </div>

        <div className="catalog-zone-status">
          <strong>📍 Zona Mercadona: CP {codigoPostalCatalogo || '48950'}</strong>
          <span>
            {almacenCatalogo
              ? `Catálogo local ${almacenCatalogo}`
              : 'Ejecuta la actualización para descargar el catálogo local'}
          </span>
          {fechaCatalogo && (
            <small>Actualizado: {formatearFechaCatalogo(fechaCatalogo)}</small>
          )}
          <small>Productos y precios se renuevan automáticamente cada día para esta zona.</small>
          <button
            type="button"
            className="catalog-update-button"
            onClick={() => void actualizarCatalogoCompleto()}
            disabled={actualizandoCatalogo}
          >
            {actualizandoCatalogo
              ? '↻ Comprobando catálogo…'
              : '↻ Comprobar actualización'}
          </button>
        </div>
        {mensaje && (
          <p className="catalog-success-message" style={estiloMensajeExito}>
            {mensaje}
          </p>
        )}
      </Card>

      <Card>
        <div style={estiloPestañas}>
          <Pestana
            activa={vista === 'todos'}
            texto="Todos"
            onClick={() => setVista('todos')}
          />
          <Pestana
            activa={vista === 'mis-productos'}
            texto="Mis productos"
            onClick={() => setVista('mis-productos')}
          />
          <Pestana
            activa={vista === 'asociaciones'}
            texto="Asociaciones"
            onClick={() => setVista('asociaciones')}
          />
        </div>

        {vista !== 'asociaciones' && (
          <div style={estiloFiltros}>
            <input
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(evento.target.value)
              }
              placeholder="Buscar leche, salmón, pasta…"
              style={estiloInput}
            />
            <select
              value={seccionActiva}
              onChange={(evento) =>
                setSeccionActiva(evento.target.value)
              }
              style={estiloSelect}
            >
              {secciones.map((seccion) => (
                <option key={seccion} value={seccion}>
                  {seccion}
                </option>
              ))}
            </select>
          </div>
        )}
      </Card>

      {cargando && (
        <Card>
          <p style={estiloMensajeVacio}>
            Cargando catálogo…
          </p>
        </Card>
      )}

      {error && (
        <Card style={estiloAviso}>
          <Title style={{ color: '#806718' }}>
            ⚠️ Catálogo no disponible
          </Title>
          <p style={{ marginBottom: 0 }}>{error}</p>
        </Card>
      )}

      {!cargando && !error && vista === 'asociaciones' && (
        <section style={estiloCuadriculaAsociaciones}>
          {asociacionesOrdenadas.map(
            ([ingrediente, productoId]) => {
              const producto = productosPorId.get(productoId);

              return (
                <Card
                  key={ingrediente}
                  style={{ marginBottom: 0 }}
                >
                  <strong style={estiloIngrediente}>
                    {ingrediente}
                  </strong>
                  {producto ? (
                    <ProductoCompacto
                      producto={producto}
                      onAbrir={() => setProductoAbierto(producto)}
                    />
                  ) : (
                    <p style={estiloPendiente}>
                      El producto ya no existe en el catálogo.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      eliminarAsociacion(ingrediente)
                    }
                    style={estiloBotonEliminar}
                  >
                    Quitar asociación
                  </button>
                </Card>
              );
            },
          )}

          {asociacionesOrdenadas.length === 0 && (
            <Card>
              <p style={estiloMensajeVacio}>
                Todavía no has asociado ingredientes.
              </p>
            </Card>
          )}
        </section>
      )}

      {!cargando && !error && vista !== 'asociaciones' && (
        <>
          <p style={estiloContador}>
            {productosFiltrados.length.toLocaleString('es-ES')}{' '}
            resultados
          </p>

          <section style={estiloCuadriculaProductos}>
            {productosVisibles.map((producto) => {
              const favorito = misProductos.includes(
                producto.productoId,
              );
              const enDespensa = idsDespensa.includes(
                producto.productoId,
              );
              const numeroAsociaciones =
                buscarIngredientesAsociadosAProducto(
                  producto.productoId,
                ).length;

              return (
                <article
                  key={producto.productoId}
                  style={{
                    ...estiloProducto,
                    border: favorito
                      ? '2px solid #4f6f52'
                      : '1px solid #d7dfd4',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setProductoAbierto(producto)}
                    style={estiloZonaProducto}
                  >
                    <ImagenProducto producto={producto} />
                    <span style={{ minWidth: 0 }}>
                      <span style={estiloSeccion}>
                        {producto.seccion}
                      </span>
                      <strong style={estiloNombre}>
                        {producto.nombre}
                      </strong>
                      <span style={estiloDetalle}>
                        {producto.formato}
                      </span>
                      <strong style={estiloPrecio}>
                        {formatearPrecio(producto.precio)}
                      </strong>
                      {numeroAsociaciones > 0 && (
                        <span style={estiloEtiqueta}>
                          🔗 {numeroAsociaciones}{' '}
                          {numeroAsociaciones === 1
                            ? 'ingrediente'
                            : 'ingredientes'}
                        </span>
                      )}
                    </span>
                  </button>

                  <div style={estiloAccionesProducto}>
                    <button
                      type="button"
                      onClick={() => alternarFavorito(producto)}
                      style={{
                        ...estiloBotonAccion,
                        background: favorito
                          ? '#e2eadf'
                          : '#4f6f52',
                        color: favorito ? '#4f6f52' : 'white',
                      }}
                    >
                      {favorito ? '✓ Favorito' : '☆ Favorito'}
                    </button>
                    <button
                      type="button"
                      disabled={enDespensa}
                      onClick={() => añadirADespensa(producto)}
                      style={{
                        ...estiloBotonAccion,
                        background: enDespensa
                          ? '#eef2ec'
                          : '#dce8ef',
                        color: enDespensa
                          ? '#738073'
                          : '#315d74',
                        cursor: enDespensa
                          ? 'default'
                          : 'pointer',
                      }}
                    >
                      {enDespensa
                        ? '✓ En despensa'
                        : '+ Despensa'}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          {limite < productosFiltrados.length && (
            <button
              type="button"
              onClick={() => setLimite((valor) => valor + 120)}
              style={estiloMostrarMas}
            >
              Mostrar más productos
            </button>
          )}
        </>
      )}

      {productoAbierto && (
        <div style={estiloFondoModal}>
          <section style={estiloModal}>
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setProductoAbierto(null)}
              style={estiloCerrar}
            >
              ×
            </button>

            <ImagenProducto
              producto={productoAbierto}
              grande
            />
            <Title style={{ color: '#4f6f52' }}>
              {productoAbierto.nombre}
            </Title>
            <p style={estiloSubtitulo}>
              {productoAbierto.formato} ·{' '}
              {productoAbierto.seccion}
            </p>
            <strong style={estiloPrecioGrande}>
              {formatearPrecio(productoAbierto.precio)}
            </strong>

            <div style={estiloAccionesModal}>
              {productoAbierto.url && (
                <a
                  href={productoAbierto.url}
                  target="_blank"
                  rel="noreferrer"
                  style={estiloEnlaceMercadona}
                >
                  🛒 Abrir en Mercadona
                </a>
              )}
              <button
                type="button"
                onClick={() => alternarFavorito(productoAbierto)}
                style={estiloBotonPrincipal}
              >
                {misProductos.includes(
                  productoAbierto.productoId,
                )
                  ? 'Quitar de Mis productos'
                  : 'Añadir a Mis productos'}
              </button>
              <button
                type="button"
                disabled={idsDespensa.includes(
                  productoAbierto.productoId,
                )}
                onClick={() => añadirADespensa(productoAbierto)}
                style={estiloBotonSecundario}
              >
                {idsDespensa.includes(
                  productoAbierto.productoId,
                )
                  ? 'Ya está en despensa'
                  : 'Añadir a despensa'}
              </button>
              {idsDespensa.includes(productoAbierto.productoId) && (
                <button
                  type="button"
                  onClick={() => setProductoConfiguracion(productoAbierto)}
                  style={estiloBotonSecundario}
                >
                  ⚙️ Editar stock y reposición
                </button>
              )}
            </div>

            <div style={estiloBloqueAsociacion}>
              <Title style={estiloTituloPequeno}>
                🔗 Ingredientes asociados
              </Title>
              <p style={estiloSubtitulo}>
                Un mismo producto puede servir para varios
                ingredientes. Marca todos los que correspondan.
              </p>

              <div style={estiloListaIngredientes}>
                {ingredientesDisponibles.map((ingrediente) => {
                  const asociadoAqui =
                    asociaciones[ingrediente] ===
                    productoAbierto.productoId;
                  const asociadoOtro = Boolean(
                    asociaciones[ingrediente] && !asociadoAqui,
                  );

                  return (
                    <label
                      key={ingrediente}
                      style={{
                        ...estiloOpcionIngrediente,
                        opacity: asociadoOtro ? 0.62 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={asociadoAqui}
                        onChange={() =>
                          cambiarAsociacion(ingrediente)
                        }
                      />
                      <span style={{ flex: 1 }}>
                        {ingrediente}
                      </span>
                      {asociadoOtro && (
                        <small>cambiará el producto actual</small>
                      )}
                    </label>
                  );
                })}
              </div>

              {ingredientesProductoAbierto.length > 0 && (
                <p style={estiloMensajeExito}>
                  Asociado a{' '}
                  {ingredientesProductoAbierto.length}{' '}
                  {ingredientesProductoAbierto.length === 1
                    ? 'ingrediente'
                    : 'ingredientes'}.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      <ProductoDetalleModal
        productoId={productoConfiguracion?.productoId ?? null}
        productoInicial={productoConfiguracion}
        onCerrar={() => setProductoConfiguracion(null)}
        onActualizado={() =>
          setIdsDespensa(
            cargarDespensa().map((producto) => producto.productoId),
          )
        }
      />
    </main>
  );
}

function formatearFechaCatalogo(fecha: string): string {
  const valor = new Date(fecha);

  return Number.isNaN(valor.getTime())
    ? fecha
    : valor.toLocaleString('es-ES', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
}

function formatearPrecio(precio: number | null): string {
  return precio === null
    ? 'Sin precio'
    : precio.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
      });
}

function ImagenProducto({
  producto,
  grande = false,
}: {
  producto: ProductoMercadonaCatalogo;
  grande?: boolean;
}) {
  if (!producto.imagen) {
    return (
      <div
        style={grande ? estiloSinImagenGrande : estiloSinImagen}
      >
        🛒
      </div>
    );
  }

  return (
    <img
      src={producto.imagen}
      alt=""
      style={grande ? estiloImagenGrande : estiloImagen}
    />
  );
}

function ProductoCompacto({
  producto,
  onAbrir,
}: {
  producto: ProductoMercadonaCatalogo;
  onAbrir: () => void;
}) {
  return (
    <div style={estiloCompacto}>
      <button
        type="button"
        onClick={onAbrir}
        style={estiloBotonFotoCompacta}
        aria-label={`Abrir ${producto.nombre}`}
      >
        <ImagenProducto producto={producto} />
      </button>
      <span style={{ flex: 1 }}>
        <strong style={estiloNombre}>{producto.nombre}</strong>
        <span style={estiloDetalle}>{producto.formato}</span>
      </span>
      <strong style={estiloPrecio}>
        {formatearPrecio(producto.precio)}
      </strong>
    </div>
  );
}

function Resumen({
  numero,
  texto,
}: {
  numero: number | string;
  texto: string;
}) {
  return (
    <div style={estiloResumen}>
      <strong style={estiloNumero}>{numero}</strong>
      <span>{texto}</span>
    </div>
  );
}

function Pestana({
  activa,
  texto,
  onClick,
}: {
  activa: boolean;
  texto: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...estiloPestaña,
        background: activa ? '#4f6f52' : '#eef2ec',
        color: activa ? 'white' : '#4f6f52',
      }}
    >
      {texto}
    </button>
  );
}

const estiloPagina = {
  maxWidth: '1180px',
  margin: '0 auto',
  padding: '20px 20px 118px',
};

const estiloSubtitulo = {
  marginTop: 0,
  color: '#667067',
  lineHeight: 1.5,
};

const estiloResumenGrid = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(135px, 1fr))',
  gap: '10px',
};

const estiloResumen = {
  display: 'grid',
  gap: '3px',
  padding: '12px',
  borderRadius: '12px',
  background: '#f8f6f2',
  color: '#667067',
  textAlign: 'center' as const,
};

const estiloNumero = {
  color: '#4f6f52',
  fontSize: '22px',
};


const estiloMensajeExito = {
  marginBottom: 0,
  padding: '10px 12px',
  borderRadius: '10px',
  background: '#eef5ed',
  color: '#4f6f52',
  fontWeight: 700,
};

const estiloPestañas = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '10px',
};

const estiloPestaña = {
  border: 0,
  borderRadius: '12px',
  padding: '12px',
  fontFamily: 'inherit',
  fontWeight: 800,
  cursor: 'pointer',
};

const estiloFiltros = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '10px',
  marginTop: '14px',
};

const estiloInput = {
  width: '100%',
  boxSizing: 'border-box' as const,
  border: '1px solid #cfd8cd',
  borderRadius: '12px',
  padding: '12px',
  fontFamily: 'inherit',
};

const estiloSelect = {
  ...estiloInput,
  background: 'white',
};

const estiloCuadriculaProductos = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fill, minmax(245px, 1fr))',
  gap: '14px',
};

const estiloProducto = {
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden',
  borderRadius: '16px',
  background: 'white',
  boxShadow: '0 5px 15px rgba(38,50,41,.07)',
};

const estiloZonaProducto = {
  display: 'grid',
  gridTemplateColumns: '82px 1fr',
  gap: '12px',
  flex: 1,
  width: '100%',
  border: 0,
  padding: '14px',
  background: 'transparent',
  color: 'inherit',
  textAlign: 'left' as const,
  cursor: 'pointer',
};

const estiloImagen = {
  width: '82px',
  height: '82px',
  objectFit: 'contain' as const,
  borderRadius: '12px',
  background: '#fff',
};

const estiloSinImagen = {
  display: 'grid',
  placeItems: 'center',
  width: '82px',
  height: '82px',
  borderRadius: '12px',
  background: '#eef2ec',
  fontSize: '30px',
};

const estiloImagenGrande = {
  display: 'block',
  width: '180px',
  height: '180px',
  margin: '0 auto 14px',
  objectFit: 'contain' as const,
};

const estiloSinImagenGrande = {
  display: 'grid',
  placeItems: 'center',
  width: '180px',
  height: '180px',
  margin: '0 auto 14px',
  borderRadius: '18px',
  background: '#eef2ec',
  fontSize: '60px',
};

const estiloSeccion = {
  display: 'block',
  marginBottom: '4px',
  color: '#7b847c',
  fontSize: '11px',
  textTransform: 'uppercase' as const,
};

const estiloNombre = {
  display: 'block',
  color: '#263229',
  lineHeight: 1.25,
};

const estiloDetalle = {
  display: 'block',
  marginTop: '4px',
  color: '#737b74',
  fontSize: '13px',
};

const estiloPrecio = {
  display: 'block',
  marginTop: '7px',
  color: '#4f6f52',
};

const estiloEtiqueta = {
  display: 'inline-block',
  marginTop: '8px',
  padding: '4px 7px',
  borderRadius: '999px',
  background: '#eef5ed',
  color: '#4f6f52',
  fontSize: '11px',
  fontWeight: 800,
};

const estiloAccionesProducto = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px',
  padding: '0 12px 12px',
};

const estiloBotonAccion = {
  border: 0,
  borderRadius: '10px',
  padding: '10px 8px',
  fontFamily: 'inherit',
  fontSize: '12px',
  fontWeight: 800,
  cursor: 'pointer',
};

const estiloContador = {
  color: '#667067',
  fontWeight: 700,
};

const estiloMostrarMas = {
  display: 'block',
  margin: '20px auto 0',
  border: 0,
  borderRadius: '12px',
  padding: '12px 20px',
  background: '#4f6f52',
  color: 'white',
  fontFamily: 'inherit',
  fontWeight: 800,
  cursor: 'pointer',
};

const estiloCuadriculaAsociaciones = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '14px',
};

const estiloIngrediente = {
  display: 'block',
  marginBottom: '12px',
  color: '#4f6f52',
  fontSize: '18px',
};

const estiloBotonFotoCompacta = {
  border: 0,
  padding: 0,
  borderRadius: '12px',
  background: 'transparent',
  cursor: 'pointer',
};

const estiloCompacto = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const estiloBotonEliminar = {
  width: '100%',
  marginTop: '12px',
  border: 0,
  borderRadius: '10px',
  padding: '10px',
  background: '#f5e7e2',
  color: '#914f3f',
  fontWeight: 800,
  cursor: 'pointer',
};

const estiloPendiente = {
  color: '#806718',
};

const estiloMensajeVacio = {
  marginBottom: 0,
  color: '#667067',
  textAlign: 'center' as const,
};

const estiloAviso = {
  background: '#fff9e8',
  border: '1px solid #ead58d',
  color: '#6b5b26',
};

const estiloFondoModal = {
  position: 'fixed' as const,
  inset: 0,
  zIndex: 300,
  display: 'grid',
  placeItems: 'center',
  padding: '20px',
  background: 'rgba(28,37,30,.64)',
};

const estiloModal = {
  position: 'relative' as const,
  width: 'min(650px, 100%)',
  maxHeight: '92vh',
  overflowY: 'auto' as const,
  borderRadius: '20px',
  padding: '24px',
  background: 'white',
  boxShadow: '0 24px 60px rgba(0,0,0,.28)',
};

const estiloCerrar = {
  position: 'absolute' as const,
  top: '10px',
  right: '12px',
  border: 0,
  background: 'transparent',
  color: '#667067',
  fontSize: '30px',
  cursor: 'pointer',
};

const estiloPrecioGrande = {
  display: 'block',
  color: '#4f6f52',
  fontSize: '25px',
};

const estiloAccionesModal = {
  display: 'grid',
  gridTemplateColumns:
    'repeat(auto-fit, minmax(190px, 1fr))',
  gap: '10px',
  marginTop: '16px',
};

const estiloEnlaceMercadona = {
  display: 'grid',
  placeItems: 'center',
  minHeight: '44px',
  borderRadius: '12px',
  padding: '10px 14px',
  background: '#0c7a45',
  color: 'white',
  textDecoration: 'none',
  fontWeight: 800,
};

const estiloBotonPrincipal = {
  border: 0,
  borderRadius: '12px',
  padding: '12px',
  background: '#4f6f52',
  color: 'white',
  fontFamily: 'inherit',
  fontWeight: 800,
  cursor: 'pointer',
};

const estiloBotonSecundario = {
  ...estiloBotonPrincipal,
  background: '#e4edf2',
  color: '#315d74',
};

const estiloBloqueAsociacion = {
  marginTop: '22px',
  paddingTop: '18px',
  borderTop: '1px solid #dfe5dd',
};

const estiloTituloPequeno = {
  color: '#4f6f52',
  fontSize: '20px',
};

const estiloListaIngredientes = {
  display: 'grid',
  maxHeight: '300px',
  overflowY: 'auto' as const,
  border: '1px solid #d7dfd4',
  borderRadius: '12px',
};

const estiloOpcionIngrediente = {
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
  padding: '10px 12px',
  borderBottom: '1px solid #edf0ec',
  color: '#39483b',
  cursor: 'pointer',
};

export default CatalogoMercadona;
