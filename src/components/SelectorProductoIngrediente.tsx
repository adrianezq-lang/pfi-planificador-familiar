import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  buscarEnCatalogoMercadona,
  type ProductoMercadonaCatalogo,
} from '../services/catalogoMercadona';
import {
  asociarProductoAIngrediente,
} from '../services/asociacionesIngredientes';
import {
  cargarDespensa,
  crearProductoDespensaDesdeCatalogo,
  retirarReferenciaPrecioManualDespensa,
} from '../services/despensa';
import { crearCopiaAutomaticaSiNecesaria } from '../services/copiasSeguridad';
import {
  ETIQUETAS_NO_DISPONIBILIDAD,
  marcarIngredienteNoDisponible,
  obtenerEstadoDisponibilidadIngrediente,
  reactivarIngrediente,
  type EstadoDisponibilidadIngrediente,
  type MotivoNoDisponibilidadIngrediente,
} from '../services/disponibilidadIngredientes';
import {
  convertirPrecioManualAProducto,
  guardarPrecioManualIngrediente,
  obtenerPrecioManualIngrediente,
  quitarPrecioManualIngrediente,
  type UnidadEnvaseManual,
} from '../services/preciosManualesIngredientes';

type SelectorProductoIngredienteProps = {
  ingrediente: string | null;
  seccionIngrediente?: string;
  productoActual?: ProductoMercadonaCatalogo | null;
  pendientesRestantes?: number;
  busquedaInicial?: string;
  añadirADespensaAlSeleccionar?: boolean;
  asociarAutomaticamente?: boolean;
  onCerrar: () => void;
  onAsociado: (
    ingrediente: string,
    producto: ProductoMercadonaCatalogo,
  ) => void;
  onDisponibilidadCambiada?: (
    ingrediente: string,
    estado: EstadoDisponibilidadIngrediente | null,
  ) => void;
};


function SelectorProductoIngrediente({
  ingrediente,
  seccionIngrediente,
  productoActual = null,
  pendientesRestantes,
  busquedaInicial,
  añadirADespensaAlSeleccionar = false,
  asociarAutomaticamente = true,
  onCerrar,
  onAsociado,
  onDisponibilidadCambiada,
}: SelectorProductoIngredienteProps) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<ProductoMercadonaCatalogo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [mostrarOtrasSecciones, setMostrarOtrasSecciones] = useState(false);
  const [estadoDisponibilidad, setEstadoDisponibilidad] =
    useState<EstadoDisponibilidadIngrediente | null>(null);
  const [motivo, setMotivo] =
    useState<MotivoNoDisponibilidadIngrediente>('temporada');
  const [notaDisponibilidad, setNotaDisponibilidad] = useState('');
  const [precioManual, setPrecioManual] = useState('');
  const [cantidadEnvase, setCantidadEnvase] = useState('1');
  const [unidadEnvase, setUnidadEnvase] = useState<UnidadEnvaseManual>('ud');
  const [tienda, setTienda] = useState('');
  const [manualGuardado, setManualGuardado] = useState(false);
  const [errorAlternativa, setErrorAlternativa] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ingrediente === null) return;

    setBusqueda(busquedaInicial ?? ingrediente);
    setResultados([]);
    setError('');
    setMostrarOtrasSecciones(false);
    setErrorAlternativa('');

    const disponibilidad = obtenerEstadoDisponibilidadIngrediente(ingrediente);
    const manual = obtenerPrecioManualIngrediente(ingrediente);
    setEstadoDisponibilidad(disponibilidad);
    setMotivo(disponibilidad?.motivo ?? 'temporada');
    setNotaDisponibilidad(disponibilidad?.nota ?? '');
    setPrecioManual(manual ? String(manual.precioEnvase).replace('.', ',') : '');
    setCantidadEnvase(manual ? String(manual.cantidadEnvase).replace('.', ',') : '1');
    setUnidadEnvase(manual?.unidadEnvase ?? 'ud');
    setTienda(manual?.tienda ?? '');
    setManualGuardado(Boolean(manual));

    window.setTimeout(() => {
      inputRef.current?.focus();
      if (busquedaInicial === undefined) inputRef.current?.select();
    }, 0);
  }, [busquedaInicial, ingrediente]);

  useEffect(() => {
    if (ingrediente === null) return;

    let activo = true;
    const temporizador = window.setTimeout(() => {
      const buscar = async () => {
        try {
          setCargando(true);
          setError('');

          const productos = await buscarEnCatalogoMercadona(busqueda.trim(), {
            seccionPreferida: seccionIngrediente,
            incluirOtrasSecciones: mostrarOtrasSecciones,
          });
          if (activo) setResultados(productos.slice(0, 40));
        } catch (errorDesconocido) {
          if (!activo) return;
          setError(
            errorDesconocido instanceof Error
              ? errorDesconocido.message
              : 'No se ha podido buscar en el catálogo.',
          );
        } finally {
          if (activo) setCargando(false);
        }
      };

      void buscar();
    }, 180);

    return () => {
      activo = false;
      window.clearTimeout(temporizador);
    };
  }, [busqueda, ingrediente, mostrarOtrasSecciones, seccionIngrediente]);

  useEffect(() => {
    if (ingrediente === null) return;

    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrar();
    };

    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [ingrediente, onCerrar]);

  const resultadosCatalogo = resultados;

  if (ingrediente === null) return null;

  const añadirProductoADespensa = (producto: ProductoMercadonaCatalogo) => {
    if (
      añadirADespensaAlSeleccionar &&
      (producto.origenPrecio === 'manual' ||
        !cargarDespensa().some(
          (elemento) => elemento.productoId === producto.productoId,
        ))
    ) {
      crearProductoDespensaDesdeCatalogo(producto);
    }
  };

  const retirarPrecioManualActual = () => {
    const manual = obtenerPrecioManualIngrediente(ingrediente);
    if (manual) {
      retirarReferenciaPrecioManualDespensa(
        convertirPrecioManualAProducto(manual).productoId,
      );
    }
    quitarPrecioManualIngrediente(ingrediente);
    setManualGuardado(false);
  };

  const seleccionar = (producto: ProductoMercadonaCatalogo) => {
    crearCopiaAutomaticaSiNecesaria(`antes de asociar ${ingrediente}`);
    añadirProductoADespensa(producto);

    if (asociarAutomaticamente && ingrediente.trim()) {
      retirarPrecioManualActual();
      reactivarIngrediente(ingrediente);
      asociarProductoAIngrediente(ingrediente, producto.productoId);
    }
    onAsociado(ingrediente, producto);
  };

  const pausarIngrediente = () => {
    try {
      crearCopiaAutomaticaSiNecesaria(`antes de pausar ${ingrediente}`);
      const estado = marcarIngredienteNoDisponible(
        ingrediente,
        motivo,
        notaDisponibilidad,
      );
      setEstadoDisponibilidad(estado);
      onDisponibilidadCambiada?.(ingrediente, estado);
      onCerrar();
    } catch (errorDesconocido) {
      setErrorAlternativa(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se ha podido cambiar la disponibilidad.',
      );
    }
  };

  const volverAActivar = () => {
    crearCopiaAutomaticaSiNecesaria(`antes de reactivar ${ingrediente}`);
    reactivarIngrediente(ingrediente);
    setEstadoDisponibilidad(null);
    onDisponibilidadCambiada?.(ingrediente, null);
  };

  const usarPrecioManual = () => {
    try {
      const precio = Number(precioManual.replace(',', '.'));
      const cantidad = Number(cantidadEnvase.replace(',', '.'));
      crearCopiaAutomaticaSiNecesaria(`antes de fijar el precio de ${ingrediente}`);
      const guardado = guardarPrecioManualIngrediente({
        ingrediente,
        precioEnvase: precio,
        cantidadEnvase: cantidad,
        unidadEnvase,
        tienda,
        seccion: seccionIngrediente?.trim() || 'Otra tienda',
      });
      reactivarIngrediente(ingrediente);
      setManualGuardado(true);
      setEstadoDisponibilidad(null);
      const producto = convertirPrecioManualAProducto(guardado);
      añadirProductoADespensa(producto);
      onDisponibilidadCambiada?.(ingrediente, null);
      onAsociado(ingrediente, producto);
    } catch (errorDesconocido) {
      setErrorAlternativa(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se ha podido guardar el precio manual.',
      );
    }
  };

  const quitarPrecioManual = () => {
    crearCopiaAutomaticaSiNecesaria(`antes de retirar el precio de ${ingrediente}`);
    retirarPrecioManualActual();
    onCerrar();
  };

  const renderProducto = (producto: ProductoMercadonaCatalogo) => {
    const esActual = productoActual?.productoId === producto.productoId;

    return (
      <button
        type="button"
        key={producto.productoId}
        onClick={() => seleccionar(producto)}
        style={{
          ...estiloProducto,
          ...(esActual ? estiloProductoActual : {}),
        }}
      >
        {producto.imagen ? (
          <img src={producto.imagen} alt="" style={estiloImagen} />
        ) : (
          <span style={estiloSinImagen}>🛒</span>
        )}

        <span style={estiloInformacion}>
          <strong style={estiloNombre}>{producto.nombre}</strong>
          <span style={estiloDetalle}>
            {producto.formato} · {producto.seccion}
          </span>
          <strong style={estiloPrecio}>
            {producto.precio === null
              ? 'Precio no disponible'
              : producto.precio.toLocaleString('es-ES', {
                  style: 'currency',
                  currency: 'EUR',
                })}
          </strong>
        </span>

        <span
          style={estiloElegir}
        >
          {esActual ? 'Actual' : 'Añadir'}
        </span>
      </button>
    );
  };

  return (
    <div
      style={estiloFondo}
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-selector-producto"
        style={estiloModal}
      >
        <div style={estiloCabecera}>
          <div>
            <span style={estiloEtiqueta}>Elegir producto</span>
            <h2 id="titulo-selector-producto" style={estiloTitulo}>
              {ingrediente || 'Nuevo ingrediente'}
            </h2>
            {typeof pendientesRestantes === 'number' && (
              <p style={estiloPendientes}>
                {pendientesRestantes} por asociar contando este
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            style={estiloCerrar}
          >
            ×
          </button>
        </div>

        {productoActual && (
          <div style={estiloActual}>
            <span>Producto actual</span>
            <strong>{productoActual.nombre}</strong>
          </div>
        )}

        <div style={estiloBuscador}>
          <span aria-hidden="true">🔎</span>
          <input
            ref={inputRef}
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Buscar producto de Mercadona"
            aria-label="Buscar producto de Mercadona"
            style={estiloInput}
          />
          {busqueda && (
            <button type="button" onClick={() => setBusqueda('')} style={estiloLimpiar}>
              Limpiar
            </button>
          )}
        </div>

        <div style={estiloResultados}>
          <section style={estiloBloqueResultados}>
            <div style={estiloTituloBloque}>
              <strong>🛒 Catálogo Mercadona</strong>
              {!cargando && <span>{resultadosCatalogo.length}</span>}
            </div>
            {seccionIngrediente && (
              <div style={estiloFiltroSeccion}>
                <span>
                  {mostrarOtrasSecciones
                    ? 'Mostrando todo el catálogo'
                    : `Solo productos de ${seccionIngrediente}`}
                </span>
                {mostrarOtrasSecciones && (
                  <button
                    type="button"
                    onClick={() => setMostrarOtrasSecciones(false)}
                    style={estiloBotonAlternativo}
                  >
                    Volver a la sección
                  </button>
                )}
              </div>
            )}
            {cargando && <p style={estiloEstado}>Buscando productos…</p>}
            {error && <p style={estiloError}>{error}</p>}
            {!cargando && !error && resultadosCatalogo.length === 0 && (
              <div style={estiloEstadoVacio}>
                <p style={estiloEstado}>
                  No hay productos compatibles para esta búsqueda
                  {seccionIngrediente && !mostrarOtrasSecciones
                    ? ` en ${seccionIngrediente}`
                    : ''}. El surtido puede variar según la temporada y la zona.
                  Si no aparece el producto correcto, deja la asociación pendiente
                  para no falsear el presupuesto.
                </p>
                {seccionIngrediente && !mostrarOtrasSecciones && (
                  <button
                    type="button"
                    onClick={() => setMostrarOtrasSecciones(true)}
                    style={estiloBotonAlternativo}
                  >
                    Buscar en todo el catálogo
                  </button>
                )}
              </div>
            )}
            {!error &&
              resultadosCatalogo.map((producto) =>
                renderProducto(producto),
              )}
          </section>

          {asociarAutomaticamente && ingrediente.trim() && (
            <section style={estiloAlternativas} aria-labelledby="titulo-alternativas-producto">
              <div>
                <strong id="titulo-alternativas-producto">Alternativas seguras</strong>
                <p style={estiloAyudaAlternativa}>
                  Si no hay un producto exacto, pausa el ingrediente o usa un precio real de otra tienda. La asociación actual se conserva.
                </p>
              </div>

              {estadoDisponibilidad ? (
                <div style={estiloEstadoPausado}>
                  <div>
                    <strong>{ETIQUETAS_NO_DISPONIBILIDAD[estadoDisponibilidad.motivo]}</strong>
                    <span>
                      No se incluirá en compra ni presupuesto y tampoco contará como ahorro.
                    </span>
                    <small>
                      Pausado el {new Date(estadoDisponibilidad.deshabilitadoEn).toLocaleDateString('es-ES')}.
                    </small>
                    {estadoDisponibilidad.nota && <small>{estadoDisponibilidad.nota}</small>}
                  </div>
                  <button type="button" onClick={volverAActivar} style={estiloBotonPrincipal}>
                    Volver a activar
                  </button>
                </div>
              ) : (
                <div style={estiloFormularioAlternativa}>
                  <label style={estiloCampoAlternativa}>
                    <span>Motivo para pausarlo</span>
                    <select
                      value={motivo}
                      onChange={(evento) => setMotivo(evento.target.value as MotivoNoDisponibilidadIngrediente)}
                      style={estiloControlAlternativa}
                    >
                      {Object.entries(ETIQUETAS_NO_DISPONIBILIDAD).map(([valor, etiqueta]) => (
                        <option key={valor} value={valor}>{etiqueta}</option>
                      ))}
                    </select>
                  </label>
                  <label style={estiloCampoAlternativa}>
                    <span>Nota opcional</span>
                    <input
                      value={notaDisponibilidad}
                      onChange={(evento) => setNotaDisponibilidad(evento.target.value)}
                      placeholder="Ej. vuelve en junio"
                      style={estiloControlAlternativa}
                    />
                  </label>
                  <button type="button" onClick={pausarIngrediente} style={estiloBotonSecundario}>
                    Pausar ingrediente
                  </button>
                </div>
              )}

              <div style={estiloSeparadorAlternativa}><span>o indicar precio real</span></div>
              <div style={estiloFormularioPrecio}>
                <label style={estiloCampoAlternativa}>
                  <span>Precio del envase (€)</span>
                  <input
                    inputMode="decimal"
                    value={precioManual}
                    onChange={(evento) => setPrecioManual(evento.target.value)}
                    placeholder="4,50"
                    style={estiloControlAlternativa}
                  />
                </label>
                <label style={estiloCampoAlternativa}>
                  <span>Cantidad del envase</span>
                  <input
                    inputMode="decimal"
                    value={cantidadEnvase}
                    onChange={(evento) => setCantidadEnvase(evento.target.value)}
                    style={estiloControlAlternativa}
                  />
                </label>
                <label style={estiloCampoAlternativa}>
                  <span>Unidad</span>
                  <select
                    value={unidadEnvase}
                    onChange={(evento) => setUnidadEnvase(evento.target.value as UnidadEnvaseManual)}
                    style={estiloControlAlternativa}
                  >
                    <option value="ud">ud</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                  </select>
                </label>
                <label style={estiloCampoAlternativa}>
                  <span>Tienda o fuente</span>
                  <input
                    value={tienda}
                    onChange={(evento) => setTienda(evento.target.value)}
                    placeholder="Frutería local"
                    style={estiloControlAlternativa}
                  />
                </label>
                <button type="button" onClick={usarPrecioManual} style={estiloBotonPrincipal}>
                  {manualGuardado ? 'Actualizar este precio' : 'Usar este precio'}
                </button>
                {manualGuardado && (
                  <button type="button" onClick={quitarPrecioManual} style={estiloBotonSecundario}>
                    Quitar precio manual
                  </button>
                )}
              </div>
              <p style={estiloAyudaAlternativa}>
                El presupuesto guardará el precio, formato, tienda y fecha. Podrás sustituirlo después por un producto del catálogo.
              </p>
              {errorAlternativa && <p style={estiloError}>{errorAlternativa}</p>}
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

const estiloFondo = {
  position: 'fixed' as const,
  inset: 0,
  zIndex: 2000,
  display: 'grid',
  placeItems: 'center',
  padding: '18px',
  background: 'rgba(25, 34, 27, 0.58)',
};

const estiloModal = {
  display: 'flex',
  flexDirection: 'column' as const,
  width: 'min(760px, 100%)',
  maxHeight: 'min(820px, 92vh)',
  overflow: 'hidden',
  borderRadius: '22px',
  background: '#fff',
  boxShadow: '0 22px 70px rgba(20, 30, 22, 0.3)',
};

const estiloCabecera = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '16px',
  padding: '20px 20px 12px',
};

const estiloEtiqueta = {
  color: '#6e786f',
  fontSize: '12px',
  fontWeight: 800,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
};

const estiloTitulo = {
  margin: '4px 0 0',
  color: '#314934',
  fontSize: '24px',
};

const estiloPendientes = {
  margin: '5px 0 0',
  color: '#6e786f',
  fontSize: '13px',
};

const estiloCerrar = {
  display: 'grid',
  placeItems: 'center',
  width: '38px',
  height: '38px',
  flexShrink: 0,
  border: 0,
  borderRadius: '50%',
  background: '#eef2ec',
  color: '#4f6f52',
  fontSize: '27px',
  lineHeight: 1,
  cursor: 'pointer',
};

const estiloActual = {
  display: 'grid',
  gap: '3px',
  margin: '0 20px 12px',
  padding: '10px 12px',
  borderRadius: '12px',
  background: '#eef5ed',
  color: '#4f6f52',
  fontSize: '13px',
};

const estiloBuscador = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  margin: '0 20px',
  padding: '12px 14px',
  border: '1px solid #d8e0d6',
  borderRadius: '14px',
  background: '#fbfcfa',
};

const estiloInput = {
  minWidth: 0,
  flex: 1,
  border: 0,
  outline: 0,
  background: 'transparent',
  color: '#263229',
  fontFamily: 'inherit',
  fontSize: '16px',
};

const estiloLimpiar = {
  border: 0,
  background: 'transparent',
  color: '#4f6f52',
  fontFamily: 'inherit',
  fontWeight: 800,
  cursor: 'pointer',
};

const estiloResultados = {
  display: 'grid',
  gap: '16px',
  minHeight: 0,
  overflowY: 'auto' as const,
  padding: '0 20px 20px',
};

const estiloAlternativas = {
  display: 'grid',
  gap: '12px',
  padding: '15px',
  border: '1px solid #d8e0d6',
  borderRadius: '15px',
  background: '#f8faf7',
};

const estiloAyudaAlternativa = {
  margin: '4px 0 0',
  color: '#667068',
  fontSize: '12px',
  lineHeight: 1.45,
};

const estiloFormularioAlternativa = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  alignItems: 'end',
  gap: '9px',
};

const estiloFormularioPrecio = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  alignItems: 'end',
  gap: '9px',
};

const estiloCampoAlternativa = {
  display: 'grid',
  gap: '5px',
  color: '#4b554d',
  fontSize: '12px',
  fontWeight: 700,
};

const estiloControlAlternativa = {
  width: '100%',
  minWidth: 0,
  padding: '9px 10px',
  border: '1px solid #cfd8cc',
  borderRadius: '9px',
  background: '#fff',
  color: '#263229',
  font: 'inherit',
};

const estiloBotonPrincipal = {
  padding: '10px 12px',
  border: 0,
  borderRadius: '10px',
  background: '#4f6f52',
  color: '#fff',
  fontFamily: 'inherit',
  fontWeight: 800,
  cursor: 'pointer',
};

const estiloBotonSecundario = {
  ...estiloBotonPrincipal,
  border: '1px solid #8fa28e',
  background: '#fff',
  color: '#4f6f52',
};

const estiloEstadoPausado = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  padding: '11px',
  borderRadius: '11px',
  background: '#fff4df',
  color: '#684d1f',
};

const estiloSeparadorAlternativa = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#7a827b',
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const estiloBloqueResultados = {
  display: 'grid',
  gap: '9px',
};

const estiloTituloBloque = {
  position: 'sticky' as const,
  top: 0,
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 2px',
  background: '#fff',
  color: '#4f6f52',
  fontSize: '13px',
};

const estiloProducto = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  width: '100%',
  padding: '11px',
  border: '1px solid #e1e6df',
  borderRadius: '15px',
  background: '#fff',
  color: 'inherit',
  fontFamily: 'inherit',
  textAlign: 'left' as const,
  cursor: 'pointer',
};

const estiloProductoActual = {
  borderColor: '#7d9b7d',
  background: '#f3f7f1',
};

const estiloImagen = {
  width: '62px',
  height: '62px',
  flexShrink: 0,
  objectFit: 'contain' as const,
  borderRadius: '10px',
  background: '#fff',
};

const estiloSinImagen = {
  display: 'grid',
  placeItems: 'center',
  width: '62px',
  height: '62px',
  flexShrink: 0,
  borderRadius: '10px',
  background: '#eef2ec',
  fontSize: '25px',
};

const estiloInformacion = {
  display: 'block',
  minWidth: 0,
  flex: 1,
};

const estiloNombre = {
  display: 'block',
  color: '#263229',
  fontSize: '14px',
  lineHeight: 1.3,
};

const estiloDetalle = {
  display: 'block',
  marginTop: '4px',
  color: '#6e786f',
  fontSize: '12px',
};

const estiloPrecio = {
  display: 'block',
  marginTop: '5px',
  color: '#4f6f52',
  fontSize: '15px',
};

const estiloElegir = {
  flexShrink: 0,
  padding: '8px 10px',
  borderRadius: '10px',
  background: '#4f6f52',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 800,
};

const estiloFiltroSeccion = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '10px',
  padding: '9px 11px',
  borderRadius: '11px',
  background: '#eef5ed',
  color: '#4f6f52',
  fontSize: '12px',
  fontWeight: 750,
};

const estiloEstadoVacio = {
  display: 'grid',
  justifyItems: 'center',
  gap: '10px',
};

const estiloBotonAlternativo = {
  minHeight: '34px',
  padding: '7px 11px',
  border: '1px solid #b6c9b4',
  borderRadius: '10px',
  background: '#fff',
  color: '#3f6846',
  fontFamily: 'inherit',
  fontSize: '12px',
  fontWeight: 800,
  cursor: 'pointer',
};

const estiloEstado = {
  margin: 0,
  padding: '18px',
  borderRadius: '12px',
  background: '#f8faf7',
  color: '#6e786f',
  textAlign: 'center' as const,
};

const estiloError = {
  margin: 0,
  padding: '13px',
  borderRadius: '12px',
  background: '#fff1ec',
  color: '#914f3f',
};

export default SelectorProductoIngrediente;
