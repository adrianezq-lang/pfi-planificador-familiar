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
import type { DiaMenu } from '../data/Menusemanal';
import {
  generarCompraMercadona,
  type LineaCompra,
  type ResultadoCompra,
} from '../motor/compra';
import { EVENTO_DESPENSA } from '../services/despensa';
import type {
  ProductoMercadonaCatalogo,
} from '../services/catalogoMercadona';
import {
  EVENTO_ASOCIACIONES,
} from '../services/asociacionesIngredientes';
import {
  EVENTO_INVENTARIO,
  registrarCompra,
} from '../services/inventario';

import {
  obtenerSeccionCompra,
  ORDEN_SECCIONES_COMPRA,
} from '../services/categoriasCompra';

type CompraProps = {
  menu: DiaMenu[];
};

function obtenerClaveSemana(): string {
  const fecha = new Date();
  const dia = fecha.getDay();
  const diferencia = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(fecha);
  lunes.setDate(fecha.getDate() + diferencia);

  return lunes.toISOString().slice(0, 10);
}

const claveSemana = obtenerClaveSemana();
const CLAVE_COMPRADOS = `pfi-compra-comprados-${claveSemana}`;
const CLAVE_REGISTRADOS = `pfi-compra-inventario-${claveSemana}`;

function cargarListaLocal(clave: string): string[] {
  try {
    const raw = localStorage.getItem(clave);
    const datos = raw ? (JSON.parse(raw) as unknown) : [];

    return Array.isArray(datos)
      ? datos.map(String)
      : [];
  } catch {
    return [];
  }
}

function guardarListaLocal(
  clave: string,
  valores: string[],
): void {
  localStorage.setItem(
    clave,
    JSON.stringify(Array.from(new Set(valores))),
  );
}

function Compra({ menu }: CompraProps) {
  const [resultado, setResultado] =
    useState<ResultadoCompra | null>(null);
  const [cargando, setCargando] =
    useState(true);
  const [error, setError] = useState('');
  const [comprados, setComprados] = useState<string[]>(
    () => cargarListaLocal(CLAVE_COMPRADOS),
  );
  const [registrados, setRegistrados] = useState<string[]>(
    () => cargarListaLocal(CLAVE_REGISTRADOS),
  );
  const [mensaje, setMensaje] = useState('');
  const [version, setVersion] = useState(0);
  const [ingredienteSelector, setIngredienteSelector] =
    useState<string | null>(null);
  const [modoPendientes, setModoPendientes] =
    useState(false);
  const [productoAbierto, setProductoAbierto] =
    useState<ProductoMercadonaCatalogo | null>(null);

  const cargarCompra = useCallback(async () => {
    try {
      setCargando(true);
      setError('');
      const nuevaCompra = await generarCompraMercadona(menu);
      setResultado(nuevaCompra);
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se ha podido generar la compra.',
      );
    } finally {
      setCargando(false);
    }
  }, [menu]);

  useEffect(() => {
    void cargarCompra();
  }, [cargarCompra, version]);

  useEffect(() => {
    const actualizar = () =>
      setVersion((valor) => valor + 1);

    window.addEventListener(EVENTO_DESPENSA, actualizar);
    window.addEventListener(EVENTO_INVENTARIO, actualizar);
    window.addEventListener(EVENTO_ASOCIACIONES, actualizar);

    return () => {
      window.removeEventListener(
        EVENTO_DESPENSA,
        actualizar,
      );
      window.removeEventListener(
        EVENTO_INVENTARIO,
        actualizar,
      );
      window.removeEventListener(
        EVENTO_ASOCIACIONES,
        actualizar,
      );
    };
  }, []);

  useEffect(() => {
    if (!resultado) return;

    const pendientes = resultado.lineasDespensa.filter(
      (linea) =>
        comprados.includes(linea.clave) &&
        !registrados.includes(linea.clave) &&
        linea.productoDespensa &&
        linea.envases > 0,
    );

    if (pendientes.length === 0) return;

    const nuevasClaves = pendientes.map(
      (linea) => linea.clave,
    );
    const nuevasRegistradas = Array.from(
      new Set([...registrados, ...nuevasClaves]),
    );

    setRegistrados(nuevasRegistradas);
    guardarListaLocal(
      CLAVE_REGISTRADOS,
      nuevasRegistradas,
    );

    pendientes.forEach((linea) => {
      if (!linea.productoDespensa) return;

      registrarCompra(
        linea.productoDespensa.productoId,
        linea.envases,
        `Compra semanal ${claveSemana}`,
      );
    });

    setMensaje(
      pendientes.length === 1
        ? `${pendientes[0].productoDespensa?.nombre ?? 'Producto'} añadido al inventario.`
        : `${pendientes.length} productos añadidos al inventario.`,
    );
  }, [resultado, comprados, registrados]);

  const cambiarEstado = (linea: LineaCompra) => {
    const nuevos = comprados.includes(linea.clave)
      ? comprados.filter(
          (item) => item !== linea.clave,
        )
      : [...comprados, linea.clave];

    setComprados(nuevos);
    guardarListaLocal(CLAVE_COMPRADOS, nuevos);
  };

  const marcarTodo = () => {
    if (!resultado) return;

    const claves = resultado.lineas.map(
      (linea) => linea.clave,
    );
    setComprados(claves);
    guardarListaLocal(CLAVE_COMPRADOS, claves);
  };

  const reiniciar = () => {
    setComprados([]);
    setRegistrados([]);
    guardarListaLocal(CLAVE_COMPRADOS, []);
    guardarListaLocal(CLAVE_REGISTRADOS, []);
    setMensaje('Lista semanal reiniciada.');
  };

  const registrarProductosComprados = () => {
    if (!resultado) return;

    const paraRegistrar = resultado.lineasDespensa.filter(
      (linea) =>
        comprados.includes(linea.clave) &&
        !registrados.includes(linea.clave) &&
        linea.productoDespensa &&
        linea.envases > 0,
    );

    paraRegistrar.forEach((linea) => {
      if (!linea.productoDespensa) return;

      registrarCompra(
        linea.productoDespensa.productoId,
        linea.envases,
        `Compra semanal ${claveSemana}`,
      );
    });

    const nuevasRegistradas = [
      ...registrados,
      ...paraRegistrar.map((linea) => linea.clave),
    ];

    setRegistrados(nuevasRegistradas);
    guardarListaLocal(
      CLAVE_REGISTRADOS,
      nuevasRegistradas,
    );

    setMensaje(
      paraRegistrar.length > 0
        ? `${paraRegistrar.length} productos añadidos al inventario.`
        : 'No hay productos nuevos de despensa marcados.',
    );
  };

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
    setMensaje(
      `${ingrediente} asociado a ${producto.nombre}.`,
    );

    if (!modoPendientes || !resultado) {
      cerrarSelector();
      return;
    }

    const siguiente =
      resultado.productosSinSeleccionar.find(
        (nombre) => nombre !== ingrediente,
      );

    if (siguiente) {
      setIngredienteSelector(siguiente);
    } else {
      cerrarSelector();
      setMensaje('Todos los ingredientes están asociados.');
    }
  };

  const resumen = useMemo(() => {
    if (!resultado) {
      return {
        comprados: 0,
        pendientes: 0,
        progreso: 0,
        porComprar: 0,
      };
    }

    const compradosValidos = resultado.lineas.filter(
      (linea) => comprados.includes(linea.clave),
    );
    const pendientes =
      resultado.lineas.length - compradosValidos.length;
    const progreso =
      resultado.lineas.length === 0
        ? 0
        : Math.round(
            (compradosValidos.length /
              resultado.lineas.length) *
              100,
          );
    const porComprar = resultado.lineas.reduce(
      (total, linea) =>
        comprados.includes(linea.clave)
          ? total
          : total + (linea.subtotal ?? 0),
      0,
    );

    return {
      comprados: compradosValidos.length,
      pendientes,
      progreso,
      porComprar,
    };
  }, [resultado, comprados]);

  if (cargando) {
    return (
      <main className="page legacy-page" style={estiloPagina}>
        <Card className="page-hero-card">
          <Title style={{ color: '#4f6f52' }}>
            🛒 Compra inteligente
          </Title>
          <p style={estiloMensaje}>
            Calculando menú, formatos y reposición de
            despensa…
          </p>
        </Card>
      </main>
    );
  }

  if (error || !resultado) {
    return (
      <main className="page legacy-page" style={estiloPagina}>
        <Card style={estiloAviso}>
          <Title style={{ color: '#806718' }}>
            ⚠️ No se pudo generar la compra
          </Title>
          <p style={{ marginBottom: 0 }}>{error}</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="page legacy-page" style={estiloPagina}>
      <Card className="page-hero-card">
        <Title style={{ color: '#4f6f52' }}>
          🛒 Compra inteligente
        </Title>
        <p style={estiloSubtitulo}>
          Perecederos del menú y despensa, descontando el stock real y respetando
          únicamente las reservas mínimas que hayas configurado.
        </p>

        <div style={estiloResumenGrid}>
          <Resumen
            numero={resultado.totalSemanal.toLocaleString(
              'es-ES',
              { style: 'currency', currency: 'EUR' },
            )}
            texto="compra semanal"
          />
          <Resumen
            numero={resultado.totalDespensa.toLocaleString(
              'es-ES',
              { style: 'currency', currency: 'EUR' },
            )}
            texto="despensa"
          />
          <Resumen
            numero={resumen.porComprar.toLocaleString(
              'es-ES',
              { style: 'currency', currency: 'EUR' },
            )}
            texto="pendiente"
          />
        </div>

        <div style={estiloBarraFondo}>
          <div
            style={{
              ...estiloBarra,
              width: `${resumen.progreso}%`,
            }}
          />
        </div>
        <p style={estiloProgreso}>
          {resumen.comprados} comprados ·{' '}
          {resumen.pendientes} pendientes ·{' '}
          {resumen.progreso} %
        </p>

        <div style={estiloAcciones}>
          <button
            type="button"
            onClick={marcarTodo}
            style={estiloBotonSecundario}
          >
            Marcar todo
          </button>
          <button
            type="button"
            onClick={registrarProductosComprados}
            style={estiloBotonPrincipal}
          >
            Guardar en inventario
          </button>
          <button
            type="button"
            onClick={reiniciar}
            style={estiloBotonPeligro}
          >
            Reiniciar semana
          </button>
        </div>

        {mensaje && <p style={estiloMensajeExito}>{mensaje}</p>}
      </Card>

      {resultado.productosSinSeleccionar.length > 0 && (
        <Card style={estiloAviso}>
          <div style={estiloCabeceraAviso}>
            <div>
              <Title style={estiloTituloAviso}>
                ⚠️ Asociaciones pendientes
              </Title>
              <p style={{ marginBottom: 0 }}>
                {resultado.productosSinSeleccionar.length}{' '}
                ingredientes todavía no tienen un producto de
                Mercadona asociado.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                abrirSelector(
                  resultado.productosSinSeleccionar[0],
                  true,
                )
              }
              style={estiloBotonPrincipal}
            >
              Asociar pendientes
            </button>
          </div>
        </Card>
      )}

      <BloqueCompra
        titulo="🥬 Compra semanal"
        descripcion="Carne, pescado, fruta, verdura, pan y productos necesarios para el menú."
        lineas={resultado.lineasSemanales}
        comprados={comprados}
        registrados={registrados}
        onCambiar={cambiarEstado}
        onAsociar={(ingrediente) =>
          abrirSelector(ingrediente)
        }
        onAbrirProducto={setProductoAbierto}
      />

      <BloqueCompra
        titulo="📦 Compra de despensa"
        descripcion="Necesidades del menú y, solo donde exista, la reserva mínima configurada."
        lineas={resultado.lineasDespensa}
        comprados={comprados}
        registrados={registrados}
        onCambiar={cambiarEstado}
        onAsociar={(ingrediente) =>
          abrirSelector(ingrediente)
        }
        onAbrirProducto={setProductoAbierto}
      />

      <SelectorProductoIngrediente
        ingrediente={ingredienteSelector}
        pendientesRestantes={
          modoPendientes
            ? resultado.productosSinSeleccionar.length
            : undefined
        }
        onCerrar={cerrarSelector}
        onAsociado={manejarAsociado}
      />

      <ProductoDetalleModal
        productoId={productoAbierto?.productoId ?? null}
        productoInicial={productoAbierto}
        onCerrar={() => setProductoAbierto(null)}
        onActualizado={() => setVersion((valor) => valor + 1)}
      />
    </main>
  );
}

function BloqueCompra({
  titulo,
  descripcion,
  lineas,
  comprados,
  registrados,
  onCambiar,
  onAsociar,
  onAbrirProducto,
}: {
  titulo: string;
  descripcion: string;
  lineas: LineaCompra[];
  comprados: string[];
  registrados: string[];
  onCambiar: (linea: LineaCompra) => void;
  onAsociar: (ingrediente: string) => void;
  onAbrirProducto: (producto: ProductoMercadonaCatalogo) => void;
}) {
  const secciones = Array.from(
    new Set(lineas.map(obtenerSeccionCompra)),
  ).sort((a, b) => {
    const ia = ORDEN_SECCIONES_COMPRA.indexOf(a);
    const ib = ORDEN_SECCIONES_COMPRA.indexOf(b);

    if (ia === -1 && ib === -1) {
      return a.localeCompare(b, 'es');
    }
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return (
    <section>
      <Card>
        <Title style={{ color: '#4f6f52' }}>{titulo}</Title>
        <p style={estiloSubtitulo}>{descripcion}</p>
      </Card>

      {secciones.map((seccion) => (
        <Card key={seccion}>
          <Title style={estiloTituloSeccion}>{seccion}</Title>
          {lineas
            .filter(
              (linea) =>
                obtenerSeccionCompra(linea) === seccion,
            )
            .sort((a, b) =>
              (a.producto?.nombre ?? a.ingrediente.nombre).localeCompare(
                b.producto?.nombre ?? b.ingrediente.nombre,
                'es',
              ),
            )
            .map((linea) => (
              <Linea
                key={linea.clave}
                linea={linea}
                comprado={comprados.includes(linea.clave)}
                registrado={registrados.includes(linea.clave)}
                onCambiar={() => onCambiar(linea)}
                onAsociar={() =>
                  onAsociar(linea.ingrediente.nombre)
                }
                onAbrirProducto={() => {
                  if (linea.producto) onAbrirProducto(linea.producto);
                }}
              />
            ))}
        </Card>
      ))}

      {lineas.length === 0 && (
        <Card>
          <p style={estiloMensaje}>
            No hay productos en este bloque.
          </p>
        </Card>
      )}
    </section>
  );
}

function Linea({
  linea,
  comprado,
  registrado,
  onCambiar,
  onAsociar,
  onAbrirProducto,
}: {
  linea: LineaCompra;
  comprado: boolean;
  registrado: boolean;
  onCambiar: () => void;
  onAsociar: () => void;
  onAbrirProducto: () => void;
}) {
  return (
    <div
      style={{
        ...estiloLinea,
        opacity: comprado ? 0.58 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={comprado}
        onChange={onCambiar}
        style={estiloCheckbox}
      />

      <button
        type="button"
        onClick={linea.producto ? onAbrirProducto : onAsociar}
        style={estiloBotonFotoProducto}
        aria-label={
          linea.producto
            ? `Editar ${linea.producto.nombre}`
            : `Asociar ${linea.ingrediente.nombre}`
        }
      >
        {linea.producto?.imagen ? (
          <img
            src={linea.producto.imagen}
            alt=""
            style={estiloImagen}
          />
        ) : (
          <span style={estiloSinImagen}>🛒</span>
        )}
      </button>

      <span style={{ flex: 1, minWidth: 0 }}>
        <strong
          style={{
            ...estiloNombre,
            textDecoration: comprado
              ? 'line-through'
              : 'none',
          }}
        >
          {linea.producto?.nombre ??
            linea.ingrediente.nombre}
        </strong>

        {linea.producto && (
          <span style={estiloDetalle}>
            Formato: {linea.producto.formato}
          </span>
        )}

        {linea.origen === 'menu' && (
          <span style={estiloNecesidad}>
            Necesitas: {formatearNecesidades(linea.necesidades)}
          </span>
        )}

        {linea.producto && (
          <span style={estiloDetalleDestacado}>
            Comprar {linea.envases}{' '}
            {etiquetaFormatoCompra(linea)}
            {linea.calculoEstimado
              ? ' · coste aproximado'
              : ''}
          </span>
        )}

        {linea.productoDespensa && (
          <span style={estiloDetalle}>
            Stock {linea.productoDespensa.stockActual}{' '}
            {linea.productoDespensa.unidad} ·{' '}
            {linea.productoDespensa.stockMinimo > 0
              ? `mínimo ${linea.productoDespensa.stockMinimo}`
              : 'sin mínimo'}
          </span>
        )}

        {!linea.producto && (
          <span style={estiloPendiente}>
            Falta elegir producto
          </span>
        )}

        {!linea.producto && linea.origen === 'menu' && (
          <button
            type="button"
            onClick={onAsociar}
            style={estiloBotonAsociarLinea}
          >
            Asociar ahora
          </button>
        )}

        {registrado && (
          <span style={estiloRegistrado}>
            ✓ Registrado en inventario
          </span>
        )}
      </span>

      <strong style={estiloPrecio}>
        {linea.subtotal === null
          ? '—'
          : `${linea.calculoEstimado ? '≈ ' : ''}${linea.subtotal.toLocaleString(
              'es-ES',
              {
                style: 'currency',
                currency: 'EUR',
              },
            )}`}
      </strong>
    </div>
  );
}

function formatearCantidad(cantidad: number): string {
  return cantidad.toLocaleString('es-ES', {
    maximumFractionDigits: 2,
  });
}

function formatearNecesidades(
  necesidades: LineaCompra['necesidades'],
): string {
  return necesidades
    .map(
      (necesidad) =>
        `${formatearCantidad(necesidad.cantidad)} ${necesidad.unidad} de ${necesidad.nombre}`,
    )
    .join(' + ');
}

function etiquetaFormatoCompra(linea: LineaCompra): string {
  const formato = linea.producto?.formato
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') ?? '';

  if (formato.includes('pieza')) {
    return linea.envases === 1 ? 'pieza' : 'piezas';
  }

  if (formato.includes('bandeja')) {
    return linea.envases === 1 ? 'bandeja' : 'bandejas';
  }

  if (formato.includes('paquete') || formato.includes('pack')) {
    return linea.envases === 1 ? 'paquete' : 'paquetes';
  }

  if (formato.includes('caja') || formato.includes('estuche')) {
    return linea.envases === 1 ? 'caja' : 'cajas';
  }

  if (formato.includes('malla')) {
    return linea.envases === 1 ? 'malla' : 'mallas';
  }

  if (formato.includes('botella')) {
    return linea.envases === 1 ? 'botella' : 'botellas';
  }

  if (formato.includes('bolsa')) {
    return linea.envases === 1 ? 'bolsa' : 'bolsas';
  }

  if (formato.includes('bote') || formato.includes('tarro')) {
    return linea.envases === 1 ? 'bote' : 'botes';
  }

  if (formato.includes('lata')) {
    return linea.envases === 1 ? 'lata' : 'latas';
  }

  return linea.envases === 1 ? 'envase' : 'envases';
}

function Resumen({
  numero,
  texto,
}: {
  numero: string | number;
  texto: string;
}) {
  return (
    <div style={estiloResumen}>
      <strong style={estiloNumero}>{numero}</strong>
      <span>{texto}</span>
    </div>
  );
}

const estiloPagina = {
  maxWidth: '1050px',
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
    'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '12px',
};

const estiloResumen = {
  display: 'grid',
  gap: '4px',
  padding: '14px',
  borderRadius: '14px',
  background: '#f8f6f2',
  color: '#667067',
  textAlign: 'center' as const,
};

const estiloNumero = {
  color: '#4f6f52',
  fontSize: '23px',
};

const estiloBarraFondo = {
  height: '10px',
  marginTop: '16px',
  overflow: 'hidden',
  borderRadius: '999px',
  background: '#e1e7df',
};

const estiloBarra = {
  height: '100%',
  borderRadius: '999px',
  background: '#4f6f52',
  transition: 'width 200ms ease',
};

const estiloProgreso = {
  margin: '8px 0 0',
  color: '#667067',
  textAlign: 'center' as const,
  fontSize: '14px',
};

const estiloAcciones = {
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '10px',
  marginTop: '18px',
};

const estiloBotonBase = {
  border: 0,
  borderRadius: '12px',
  padding: '11px 14px',
  fontFamily: 'inherit',
  fontWeight: 800,
  cursor: 'pointer',
};

const estiloBotonPrincipal = {
  ...estiloBotonBase,
  background: '#4f6f52',
  color: 'white',
};

const estiloBotonSecundario = {
  ...estiloBotonBase,
  background: '#e7eee4',
  color: '#4f6f52',
};

const estiloBotonPeligro = {
  ...estiloBotonBase,
  background: '#f5e7e2',
  color: '#914f3f',
};

const estiloMensajeExito = {
  marginBottom: 0,
  padding: '10px 12px',
  borderRadius: '10px',
  background: '#eef5ed',
  color: '#4f6f52',
  fontWeight: 700,
};

const estiloAviso = {
  background: '#fff9e8',
  border: '1px solid #ead58d',
  color: '#6b5b26',
};

const estiloCabeceraAviso = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap' as const,
  gap: '14px',
};

const estiloTituloAviso = {
  color: '#806718',
  fontSize: '20px',
};

const estiloTituloSeccion = {
  color: '#4f6f52',
  fontSize: '20px',
};

const estiloLinea = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '13px 0',
  borderBottom: '1px solid #e1e7df',
  cursor: 'pointer',
};

const estiloCheckbox = {
  width: '22px',
  height: '22px',
  accentColor: '#4f6f52',
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
  objectFit: 'contain' as const,
  borderRadius: '10px',
  background: 'white',
};

const estiloSinImagen = {
  display: 'grid',
  placeItems: 'center',
  width: '58px',
  height: '58px',
  borderRadius: '10px',
  background: '#eef2ec',
  fontSize: '24px',
};

const estiloNombre = {
  display: 'block',
  color: '#263229',
  lineHeight: 1.25,
};

const estiloDetalle = {
  display: 'block',
  marginTop: '3px',
  color: '#737b74',
  fontSize: '13px',
};

const estiloNecesidad = {
  display: 'block',
  marginTop: '5px',
  color: '#4d5b50',
  fontSize: '13px',
  lineHeight: 1.4,
};

const estiloDetalleDestacado = {
  display: 'block',
  marginTop: '4px',
  color: '#4f6f52',
  fontSize: '13px',
  fontWeight: 800,
};

const estiloPendiente = {
  display: 'block',
  marginTop: '4px',
  color: '#9a6b1d',
  fontSize: '13px',
  fontWeight: 700,
};

const estiloBotonAsociarLinea = {
  marginTop: '8px',
  border: 0,
  borderRadius: '9px',
  padding: '7px 10px',
  background: '#4f6f52',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: '12px',
  fontWeight: 800,
  cursor: 'pointer',
};

const estiloRegistrado = {
  display: 'block',
  marginTop: '4px',
  color: '#4f6f52',
  fontSize: '12px',
  fontWeight: 800,
};

const estiloPrecio = {
  color: '#4f6f52',
  whiteSpace: 'nowrap' as const,
};

const estiloMensaje = {
  marginBottom: 0,
  color: '#667067',
  textAlign: 'center' as const,
};

export default Compra;
