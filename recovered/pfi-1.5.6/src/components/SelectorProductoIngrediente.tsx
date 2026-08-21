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
} from '../services/despensa';

type SelectorProductoIngredienteProps = {
  ingrediente: string | null;
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
};


function SelectorProductoIngrediente({
  ingrediente,
  productoActual = null,
  pendientesRestantes,
  busquedaInicial,
  añadirADespensaAlSeleccionar = false,
  asociarAutomaticamente = true,
  onCerrar,
  onAsociado,
}: SelectorProductoIngredienteProps) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<ProductoMercadonaCatalogo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ingrediente === null) return;

    setBusqueda(busquedaInicial ?? ingrediente);
    setResultados([]);
    setError('');

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

          const productos = await buscarEnCatalogoMercadona(busqueda.trim());
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
  }, [busqueda, ingrediente]);

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

  const seleccionar = (producto: ProductoMercadonaCatalogo) => {
    if (
      añadirADespensaAlSeleccionar &&
      !cargarDespensa().some(
        (elemento) => elemento.productoId === producto.productoId,
      )
    ) {
      crearProductoDespensaDesdeCatalogo(producto);
    }

    if (asociarAutomaticamente && ingrediente.trim()) {
      asociarProductoAIngrediente(ingrediente, producto.productoId);
    }
    onAsociado(ingrediente, producto);
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
            style={estiloInput}
          />
          {busqueda && (
            <button type="button" onClick={() => setBusqueda('')} style={estiloLimpiar}>
              Limpiar
            </button>
          )}
        </div>

        <p style={estiloAyuda}>
          Elige el producto correcto del catálogo. Si todavía no está en la despensa, PFI lo añadirá automáticamente.
        </p>

        <div style={estiloResultados}>
          <section style={estiloBloqueResultados}>
            <div style={estiloTituloBloque}>
              <strong>🛒 Catálogo Mercadona</strong>
              {!cargando && <span>{resultadosCatalogo.length}</span>}
            </div>
            {cargando && <p style={estiloEstado}>Buscando productos…</p>}
            {error && <p style={estiloError}>{error}</p>}
            {!cargando && !error && resultadosCatalogo.length === 0 && (
              <p style={estiloEstado}>
                No hay más coincidencias. Prueba con menos palabras.
              </p>
            )}
            {!error &&
              resultadosCatalogo.map((producto) =>
                renderProducto(producto),
              )}
          </section>
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

const estiloAyuda = {
  margin: '9px 20px 12px',
  color: '#6e786f',
  fontSize: '13px',
};

const estiloResultados = {
  display: 'grid',
  gap: '16px',
  minHeight: 0,
  overflowY: 'auto' as const,
  padding: '0 20px 20px',
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
