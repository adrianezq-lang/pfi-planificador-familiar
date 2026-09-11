import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { LineaCompra } from '../motor/compra';
import {
  cargarConfiguracionComparador,
  cargarOfertasComparador,
  compararPreciosCompra,
  crearTiendaLocal,
  eliminarOfertaComparador,
  EVENTO_COMPARADOR_PRECIOS,
  guardarConfiguracionComparador,
  guardarOfertaComparador,
  sugerirContenidoOferta,
  type ConfiguracionComparador,
  type ModoVentaComparador,
  type OpcionPrecioComparador,
  type OfertaComparador,
  type PlanCompraComparada,
  type TipoTiendaComparador,
  type UnidadOfertaComparador,
} from '../services/comparadorPrecios';
import { crearCopiaAutomaticaSiNecesaria } from '../services/copiasSeguridad';
import {
  buscarProductosCatalogo,
  esTiendaConCatalogo,
  formatoProductoCatalogo,
  refrescarOfertasCatalogo,
  type ProductoCatalogoSupermercado,
} from '../services/catalogosSupermercados';
import Card from './ui/Card';
import Title from './ui/Title';
import './ComparadorCompra.css';

type ComparadorCompraProps = {
  lineas: LineaCompra[];
  onPlanChange?: (plan: PlanCompraComparada) => void;
};

type ModoComparador = 'recomendada' | 'absoluta' | 'una';

const CLAVE_ULTIMO_REFRESCO_CATALOGOS = 'pfi-comparador-catalogos-refresco-v1';

const UNIDADES: Array<{ valor: UnidadOfertaComparador; texto: string }> = [
  { valor: 'g', texto: 'g' },
  { valor: 'kg', texto: 'kg' },
  { valor: 'ml', texto: 'ml' },
  { valor: 'l', texto: 'l' },
  { valor: 'ud', texto: 'unidades' },
];

const TIPOS_COMERCIO: Array<{ valor: Exclude<TipoTiendaComparador, 'supermercado'>; texto: string }> = [
  { valor: 'carniceria', texto: 'Carnicería' },
  { valor: 'fruteria', texto: 'Frutería' },
  { valor: 'otro', texto: 'Otro comercio' },
];

function euros(valor: number): string {
  return valor.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
}

function numeroEntrada(valor: string): number {
  return Number(valor.replace(',', '.'));
}

function fechaHoy(): string {
  const ahora = new Date();
  const desplazamiento = ahora.getTimezoneOffset() * 60_000;
  return new Date(ahora.getTime() - desplazamiento).toISOString().slice(0, 10);
}

function iconoTienda(tipo: TipoTiendaComparador): string {
  if (tipo === 'carniceria') return '🥩';
  if (tipo === 'fruteria') return '🥬';
  if (tipo === 'otro') return '🏬';
  return '🛒';
}

function cantidadCompra(opcion: OpcionPrecioComparador): string {
  if (opcion.alPeso && opcion.cantidadAlPeso && opcion.unidadAlPeso) {
    return `${opcion.cantidadAlPeso.toLocaleString('es-ES', {
      maximumFractionDigits: 3,
    })} ${opcion.unidadAlPeso} al peso`;
  }
  return `${opcion.envases.toLocaleString('es-ES')} envase${opcion.envases === 1 ? '' : 's'}`;
}

function formatoContenido(opcion: OpcionPrecioComparador): string {
  return `${opcion.contenidoCantidad.toLocaleString('es-ES', {
    maximumFractionDigits: 3,
  })} ${opcion.contenidoUnidad}`;
}

function necesidadBreve(linea: LineaCompra): string {
  return linea.necesidades
    .map((necesidad) => `${necesidad.cantidad.toLocaleString('es-ES', {
      maximumFractionDigits: 2,
    })} ${necesidad.unidad}`)
    .join(' + ');
}

function etiquetaTiendas(plan: PlanCompraComparada, configuracion: ConfiguracionComparador): string {
  const nombres = plan.tiendas.map(
    (id) => configuracion.tiendas.find((tienda) => tienda.id === id)?.nombre ?? id,
  );
  if (nombres.length === 0) return 'Sin precios suficientes';
  return nombres.join(' + ');
}

export default function ComparadorCompra({ lineas, onPlanChange }: ComparadorCompraProps) {
  const [configuracion, setConfiguracion] = useState(cargarConfiguracionComparador);
  const [ofertas, setOfertas] = useState<OfertaComparador[]>(cargarOfertasComparador);
  const [modo, setModo] = useState<ModoComparador>('absoluta');
  const [editorAbierto, setEditorAbierto] = useState(false);
  const [productoClave, setProductoClave] = useState('');
  const [tiendaId, setTiendaId] = useState('eroski');
  const [nombreProducto, setNombreProducto] = useState('');
  const [precio, setPrecio] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [unidad, setUnidad] = useState<UnidadOfertaComparador>('ud');
  const [modoVenta, setModoVenta] = useState<ModoVentaComparador>('envase');
  const [actualizadaEn, setActualizadaEn] = useState(fechaHoy);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [codigoPostal, setCodigoPostal] = useState(configuracion.codigoPostal);
  const [nombreComercio, setNombreComercio] = useState('');
  const [tipoComercio, setTipoComercio] = useState<Exclude<TipoTiendaComparador, 'supermercado'>>('carniceria');
  const [consultaCatalogo, setConsultaCatalogo] = useState('');
  const [productosCatalogo, setProductosCatalogo] = useState<ProductoCatalogoSupermercado[]>([]);
  const [avisoCatalogo, setAvisoCatalogo] = useState('');
  const [errorCatalogo, setErrorCatalogo] = useState('');
  const [buscandoCatalogo, setBuscandoCatalogo] = useState(false);
  const [actualizandoCatalogos, setActualizandoCatalogos] = useState(false);
  const [vinculoCatalogo, setVinculoCatalogo] = useState<{
    referenciaExterna: string;
    urlFuente: string;
    imagen: string | null;
  } | null>(null);
  const refrescoAutomaticoIntentado = useRef(false);
  const controladorBusquedaCatalogo = useRef<AbortController | null>(null);

  useEffect(() => {
    const actualizar = () => {
      const siguiente = cargarConfiguracionComparador();
      setConfiguracion(siguiente);
      setCodigoPostal(siguiente.codigoPostal);
      setOfertas(cargarOfertasComparador());
    };
    window.addEventListener(EVENTO_COMPARADOR_PRECIOS, actualizar);
    return () => window.removeEventListener(EVENTO_COMPARADOR_PRECIOS, actualizar);
  }, []);

  const resultado = useMemo(
    () => compararPreciosCompra(lineas, configuracion, ofertas),
    [configuracion, lineas, ofertas],
  );
  const tiendasEditables = useMemo(
    () => configuracion.tiendas.filter(
      (tienda) => tienda.activa && tienda.id !== 'mercadona',
    ),
    [configuracion.tiendas],
  );
  const tiendaCatalogoPreferida = tiendasEditables.find(
    (tienda) => tienda.id === 'eroski',
  )?.id ?? tiendasEditables.find(
    (tienda) => tienda.id === 'carrefour',
  )?.id ?? '';
  const tiendaManualPreferida = tiendasEditables.find(
    (tienda) => !tienda.automatica,
  )?.id ?? tiendasEditables[0]?.id ?? '';
  const productoSeleccionado = resultado.lineas.some(
    (linea) => linea.clave === productoClave,
  )
    ? productoClave
    : resultado.lineas[0]?.clave ?? '';
  const tiendaSeleccionadaId = tiendasEditables.some(
    (tienda) => tienda.id === tiendaId,
  )
    ? tiendaId
    : tiendasEditables[0]?.id ?? '';
  const tiendaSeleccionada = configuracion.tiendas.find(
    (tienda) => tienda.id === tiendaSeleccionadaId,
  );
  const catalogoSeleccionado = esTiendaConCatalogo(tiendaSeleccionadaId);
  const ofertasVinculadasCatalogo = useMemo(
    () => ofertas.filter(
      (oferta) => oferta.origen === 'catalogo' && Boolean(oferta.referenciaExterna),
    ),
    [ofertas],
  );

  const plan = modo === 'absoluta'
    ? resultado.absoluta
    : modo === 'una'
      ? resultado.unaTienda ?? resultado.recomendada
      : resultado.recomendada;
  useEffect(() => {
    onPlanChange?.(plan);
  }, [onPlanChange, plan]);
  const mercadona = resultado.porTienda.find((resumen) => resumen.tienda.id === 'mercadona');
  const ahorro = mercadona?.completo && plan.completo
    ? Math.round((mercadona.total - plan.total) * 100) / 100
    : null;
  const tiendasActivas = useMemo(
    () => configuracion.tiendas.filter((tienda) => tienda.activa),
    [configuracion.tiendas],
  );
  const asignacionPorClave = useMemo(
    () => new Map(plan.asignaciones.map((asignacion) => [asignacion.clave, asignacion])),
    [plan.asignaciones],
  );

  const rellenarFormulario = useCallback((clave: string, idTienda: string) => {
    const comparacion = resultado.lineas.find((linea) => linea.clave === clave);
    if (!comparacion) return;
    const existente = ofertas.find(
      (oferta) => oferta.productoClave === clave && oferta.tiendaId === idTienda,
    );
    const sugerencia = sugerirContenidoOferta(comparacion.linea);
    const tienda = configuracion.tiendas.find((candidata) => candidata.id === idTienda);
    const tiendaDeFrescos = tienda?.tipo === 'carniceria' || tienda?.tipo === 'fruteria';
    const unidadSugerida = existente?.unidad ?? sugerencia.unidad;

    controladorBusquedaCatalogo.current?.abort();
    controladorBusquedaCatalogo.current = null;
    setBuscandoCatalogo(false);
    setProductoClave(clave);
    setTiendaId(idTienda);
    setNombreProducto(existente?.nombreProducto ?? comparacion.nombre);
    setPrecio(existente ? String(existente.precio).replace('.', ',') : '');
    setCantidad(String(existente?.cantidad ?? sugerencia.cantidad).replace('.', ','));
    setUnidad(unidadSugerida);
    setModoVenta(
      existente?.modoVenta ??
      (tiendaDeFrescos && (unidadSugerida === 'g' || unidadSugerida === 'kg')
        ? 'peso'
        : 'envase'),
    );
    setActualizadaEn(existente?.actualizadaEn ?? fechaHoy());
    setConsultaCatalogo(comparacion.linea.ingrediente.nombre || comparacion.nombre);
    setProductosCatalogo([]);
    setAvisoCatalogo('');
    setErrorCatalogo('');
    setVinculoCatalogo(
      existente?.origen === 'catalogo' && existente.referenciaExterna && existente.urlFuente
        ? {
            referenciaExterna: existente.referenciaExterna,
            urlFuente: existente.urlFuente,
            imagen: existente.imagen ?? null,
          }
        : null,
    );
    setMensaje('');
    setError('');
  }, [configuracion.tiendas, ofertas, resultado.lineas]);

  const abrirEditor = (tiendaPreferida?: string) => {
    const idTienda = tiendasEditables.some((tienda) => tienda.id === tiendaPreferida)
      ? tiendaPreferida as string
      : tiendaSeleccionadaId;
    const sinPrecioEnTienda = resultado.lineas.find((linea) =>
      !ofertas.some((oferta) =>
        oferta.productoClave === linea.clave && oferta.tiendaId === idTienda,
      ),
    );
    const clave = sinPrecioEnTienda?.clave ?? productoSeleccionado;
    if (!clave || !idTienda) {
      setError('Activa al menos una tienda editable y calcula una compra con productos.');
      return;
    }
    rellenarFormulario(clave, idTienda);
    setEditorAbierto(true);
  };

  const abrirEditorPara = (clave: string, idTienda: string) => {
    if (idTienda === 'mercadona') return;
    rellenarFormulario(clave, idTienda);
    setEditorAbierto(true);
    window.setTimeout(() => {
      document.getElementById('editor-precio-comparador')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 0);
  };

  const guardarPrecio = (evento: FormEvent) => {
    evento.preventDefault();
    const comparacion = resultado.lineas.find(
      (linea) => linea.clave === productoSeleccionado,
    );
    const tienda = tiendasEditables.find(
      (candidata) => candidata.id === tiendaSeleccionadaId,
    );
    if (!comparacion || !tienda) {
      setError('Elige un producto y una tienda válidos.');
      return;
    }

    setError('');
    try {
      const guardada = guardarOfertaComparador({
        productoClave: productoSeleccionado,
        ingrediente: comparacion.linea.ingrediente.nombre,
        tiendaId: tiendaSeleccionadaId,
        nombreProducto,
        precio: numeroEntrada(precio),
        cantidad: numeroEntrada(cantidad),
        unidad,
        modoVenta,
        actualizadaEn,
        origen: vinculoCatalogo ? 'catalogo' : 'manual',
        referenciaExterna: vinculoCatalogo?.referenciaExterna ?? null,
        urlFuente: vinculoCatalogo?.urlFuente ?? tienda.fuenteUrl,
        imagen: vinculoCatalogo?.imagen ?? null,
      });
      setOfertas(cargarOfertasComparador());
      crearCopiaAutomaticaSiNecesaria('precio del comparador actualizado');
      if (guardada.origen === 'catalogo') {
        localStorage.setItem(CLAVE_ULTIMO_REFRESCO_CATALOGOS, fechaHoy());
      }
      setMensaje(
        guardada.origen === 'catalogo'
          ? `${guardada.nombreProducto}: vinculado al catálogo de ${tienda.nombre}.`
          : `${guardada.nombreProducto}: precio de ${tienda.nombre} guardado.`,
      );
      setEditorAbierto(false);
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se ha podido guardar el precio.',
      );
    }
  };

  const desvincularCatalogo = () => {
    setVinculoCatalogo(null);
    setMensaje('');
  };

  const buscarEnCatalogo = async () => {
    const tiendaBuscada = tiendaSeleccionadaId;
    if (!esTiendaConCatalogo(tiendaBuscada)) return;
    controladorBusquedaCatalogo.current?.abort();
    const controlador = new AbortController();
    controladorBusquedaCatalogo.current = controlador;
    setBuscandoCatalogo(true);
    setErrorCatalogo('');
    setAvisoCatalogo('');
    try {
      const respuesta = await buscarProductosCatalogo(
        tiendaBuscada,
        consultaCatalogo,
        configuracion.codigoPostal,
        controlador.signal,
      );
      if (controladorBusquedaCatalogo.current !== controlador) return;
      setProductosCatalogo(respuesta.productos);
      setAvisoCatalogo(respuesta.aviso ?? '');
    } catch (errorDesconocido) {
      if (controlador.signal.aborted) return;
      setProductosCatalogo([]);
      setErrorCatalogo(
        `${errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se ha podido consultar el catálogo.'} Puedes introducir el precio manualmente debajo.`,
      );
    } finally {
      if (controladorBusquedaCatalogo.current === controlador) {
        controladorBusquedaCatalogo.current = null;
        setBuscandoCatalogo(false);
      }
    }
  };

  const elegirProductoCatalogo = (producto: ProductoCatalogoSupermercado) => {
    if (producto.tiendaId !== tiendaSeleccionadaId) {
      setErrorCatalogo('Ese resultado pertenece a otra tienda. Repite la búsqueda.');
      return;
    }
    setNombreProducto(producto.nombre);
    setPrecio(String(producto.precio).replace('.', ','));
    setCantidad(String(producto.cantidad).replace('.', ','));
    setUnidad(producto.unidad);
    setModoVenta(producto.modoVenta);
    setActualizadaEn(producto.actualizadaEn);
    setVinculoCatalogo({
      referenciaExterna: producto.id,
      urlFuente: producto.url,
      imagen: producto.imagen,
    });
    setErrorCatalogo('');
  };

  const actualizarPreciosDeCatalogo = useCallback(async (silencioso = false) => {
    if (ofertasVinculadasCatalogo.length === 0 || actualizandoCatalogos) return;
    setActualizandoCatalogos(true);
    if (!silencioso) {
      setError('');
      setMensaje('Consultando los productos vinculados…');
    }
    try {
      const refresco = await refrescarOfertasCatalogo(ofertasVinculadasCatalogo);
      refresco.actualizaciones.forEach(({ oferta, producto }) => {
        guardarOfertaComparador({
          ...oferta,
          nombreProducto: producto.nombre,
          precio: producto.precio,
          cantidad: producto.cantidad,
          unidad: producto.unidad,
          modoVenta: producto.modoVenta,
          actualizadaEn: producto.actualizadaEn,
          origen: 'catalogo',
          referenciaExterna: producto.id,
          urlFuente: producto.url,
          imagen: producto.imagen,
        });
      });
      setOfertas(cargarOfertasComparador());
      localStorage.setItem(CLAVE_ULTIMO_REFRESCO_CATALOGOS, fechaHoy());
      if (!silencioso) {
        const actualizadas = refresco.actualizaciones.length;
        const fallidas = refresco.errores.length;
        setMensaje(
          `${actualizadas} precio${actualizadas === 1 ? '' : 's'} de catálogo actualizado${actualizadas === 1 ? '' : 's'}.`
          + (fallidas ? ` ${fallidas} se mantienen con su último valor válido.` : ''),
        );
        if (fallidas) setError(Array.from(new Set(refresco.errores)).slice(0, 2).join(' '));
      }
    } catch (errorDesconocido) {
      if (!silencioso) {
        setMensaje('');
        setError(
          errorDesconocido instanceof Error
            ? errorDesconocido.message
            : 'No se han podido actualizar los catálogos.',
        );
      }
    } finally {
      setActualizandoCatalogos(false);
    }
  }, [actualizandoCatalogos, ofertasVinculadasCatalogo]);

  useEffect(() => {
    if (
      refrescoAutomaticoIntentado.current ||
      ofertasVinculadasCatalogo.length === 0
    ) return;
    refrescoAutomaticoIntentado.current = true;
    if (localStorage.getItem(CLAVE_ULTIMO_REFRESCO_CATALOGOS) === fechaHoy()) return;
    void actualizarPreciosDeCatalogo(true);
  }, [actualizarPreciosDeCatalogo, ofertasVinculadasCatalogo.length]);

  useEffect(() => () => controladorBusquedaCatalogo.current?.abort(), []);

  const ofertaEditada = ofertas.find(
    (oferta) =>
      oferta.productoClave === productoSeleccionado &&
      oferta.tiendaId === tiendaSeleccionadaId,
  );

  const borrarPrecio = () => {
    if (!ofertaEditada) return;
    const confirmado = window.confirm(
      `Se eliminará el precio de ${ofertaEditada.nombreProducto}. ¿Continuar?`,
    );
    if (!confirmado) return;
    crearCopiaAutomaticaSiNecesaria('antes de eliminar un precio del comparador');
    eliminarOfertaComparador(ofertaEditada.id);
    setOfertas(cargarOfertasComparador());
    setEditorAbierto(false);
    setMensaje('Precio eliminado. La comparación ya se ha recalculado.');
  };

  const guardarConfiguracion = (siguiente: ConfiguracionComparador) => {
    const guardada = guardarConfiguracionComparador(siguiente);
    setConfiguracion(guardada);
  };

  const guardarCodigoPostal = () => {
    if (!/^\d{5}$/.test(codigoPostal)) {
      setCodigoPostal(configuracion.codigoPostal);
      setError('El código postal debe tener 5 cifras.');
      return;
    }
    guardarConfiguracion({ ...configuracion, codigoPostal });
    setError('');
    setMensaje(`Zona de comparación actualizada al CP ${codigoPostal}.`);
  };

  const añadirComercio = () => {
    setError('');
    try {
      const siguiente = crearTiendaLocal(configuracion, nombreComercio, tipoComercio);
      setConfiguracion(siguiente);
      setNombreComercio('');
      setMensaje('Comercio añadido. Ya puedes guardar sus precios.');
      crearCopiaAutomaticaSiNecesaria('comercio local añadido al comparador');
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se ha podido añadir el comercio.',
      );
    }
  };

  if (resultado.lineas.length === 0) return null;

  return (
    <Card className="comparador-card">
      <div className="comparador-heading">
        <div>
          <span className="comparador-kicker">COMPARACIÓN DIRECTA</span>
          <Title style={{ color: '#34573d', fontSize: 24 }}>⚖️ El mejor precio, producto a producto</Title>
          <p>
            Compara el coste real de la cantidad que necesitas. La opción más barata
            queda elegida y la lista se separa automáticamente por tienda.
          </p>
        </div>
        <span className="comparador-sync">✓ Aplicado a tu lista</span>
      </div>

      <div className="comparador-cobertura" aria-label="Cobertura de precios por tienda">
        {resultado.porTienda.map((resumen) => (
          <article key={resumen.tienda.id} className="comparador-tienda">
            <div>
              <span aria-hidden="true">{iconoTienda(resumen.tienda.tipo)}</span>
              <strong>{resumen.tienda.nombre}</strong>
            </div>
            <span>
              {resumen.cubiertos}/{resumen.totalLineas} precios
            </span>
            <b>{resumen.completo ? euros(resumen.total) : `${resumen.cubiertos} disponibles`}</b>
            <small>
              {resumen.tienda.id === 'mercadona'
                ? 'Catálogo asociado'
                : resumen.tienda.automatica
                  ? 'Catálogo conectado'
                  : 'Precios guardados'}
            </small>
            {resumen.tienda.fuenteUrl && (
              <a href={resumen.tienda.fuenteUrl} target="_blank" rel="noreferrer">
                Consultar fuente oficial ↗
              </a>
            )}
          </article>
        ))}
      </div>

      <div className="comparador-modos" aria-label="Tipo de comparación">
        <button type="button" aria-pressed={modo === 'absoluta'} onClick={() => setModo('absoluta')}>
          Más barato por producto
        </button>
        <button type="button" aria-pressed={modo === 'recomendada'} onClick={() => setModo('recomendada')}>
          Máximo {configuracion.maxTiendas} tiendas
        </button>
        <button type="button" aria-pressed={modo === 'una'} onClick={() => setModo('una')}>
          Una sola tienda
        </button>
      </div>

      <section className="comparador-resultado" aria-live="polite">
        <div>
          <span>{modo === 'absoluta' ? 'MEJOR PRECIO DE CADA PRODUCTO' : modo === 'una' ? 'MEJOR CESTA EN UNA TIENDA' : 'RUTA DE COMPRA PRÁCTICA'}</span>
          <strong>{euros(plan.total)}{!plan.completo ? ' parcial' : ''}</strong>
          <small>{etiquetaTiendas(plan, configuracion)}</small>
        </div>
        <div className="comparador-ahorro">
          <span>AHORRO FRENTE A MERCADONA</span>
          <strong>{ahorro === null ? '—' : ahorro > 0 ? euros(ahorro) : euros(0)}</strong>
          <small>
            {plan.completo
              ? `${plan.cubiertos} productos comparados`
              : `${plan.cubiertos}/${plan.totalLineas} productos con precio`}
          </small>
        </div>
      </section>

      {resultado.ofertasCaducadas > 0 && (
        <p className="comparador-aviso" role="status">
          ⏳ {resultado.ofertasCaducadas} precios han superado los {configuracion.vigenciaDias} días y
          no se usan hasta que confirmes que siguen vigentes.
        </p>
      )}

      {!plan.completo && plan.sinPrecio.length > 0 && (
        <p className="comparador-aviso comparador-aviso--error">
          Faltan precios para: {plan.sinPrecio.slice(0, 4).join(', ')}
          {plan.sinPrecio.length > 4 ? ` y ${plan.sinPrecio.length - 4} más` : ''}.
        </p>
      )}

      <div className="comparador-actions comparador-actions--principal">
        {tiendaCatalogoPreferida && (
          <button
            type="button"
            className="comparador-primary"
            onClick={() => abrirEditor(tiendaCatalogoPreferida)}
          >
            🔎 Completar precio de catálogo
          </button>
        )}
        <button type="button" onClick={() => abrirEditor(tiendaManualPreferida)}>
          ＋ Precio manual
        </button>
        {ofertasVinculadasCatalogo.length > 0 && (
          <button
            type="button"
            onClick={() => void actualizarPreciosDeCatalogo(false)}
            disabled={actualizandoCatalogos}
          >
            {actualizandoCatalogos
              ? 'Actualizando…'
              : `↻ Renovar ${ofertasVinculadasCatalogo.length} de catálogo`}
          </button>
        )}
      </div>

      <section className="comparador-matriz" aria-labelledby="titulo-matriz-precios">
        <div className="comparador-matriz__heading">
          <div>
            <span>COMPARACIÓN POR PRODUCTO</span>
            <h3 id="titulo-matriz-precios">Todos los precios de un vistazo</h3>
          </div>
          <small><i aria-hidden="true" /> Opción aplicada a la compra</small>
        </div>

        <div className="comparador-matriz__filas">
          {resultado.lineas.map((comparacion) => {
            const asignacion = asignacionPorClave.get(comparacion.clave);
            return (
              <article className="comparador-producto" key={comparacion.clave}>
                <header>
                  <strong>{comparacion.nombre}</strong>
                  <span>Necesitas {necesidadBreve(comparacion.linea)}</span>
                </header>
                <div className="comparador-producto__opciones">
                  {tiendasActivas.map((tienda) => {
                    const opcion = comparacion.opciones.find(
                      (candidata) => candidata.tiendaId === tienda.id,
                    );
                    const seleccionada = opcion?.vigente === true &&
                      asignacion?.opcion.tiendaId === tienda.id;
                    const clases = [
                      'comparador-opcion',
                      seleccionada ? 'comparador-opcion--seleccionada' : '',
                      opcion && !opcion.vigente ? 'comparador-opcion--caducada' : '',
                    ].filter(Boolean).join(' ');

                    return (
                      <section className={clases} key={tienda.id}>
                        <div className="comparador-opcion__tienda">
                          <strong>{iconoTienda(tienda.tipo)} {tienda.nombre}</strong>
                          {seleccionada && <span>MEJOR OPCIÓN</span>}
                          {opcion && !opcion.vigente && <span className="is-warning">REVISAR</span>}
                        </div>
                        {opcion ? (
                          <>
                            <b>{euros(opcion.coste)}</b>
                            <span>{cantidadCompra(opcion)}</span>
                            <small title={opcion.productoNombre}>{opcion.productoNombre}</small>
                            <small>
                              {euros(opcion.precioEnvase)} · {opcion.alPeso
                                ? `por ${formatoContenido(opcion)}`
                                : `envase de ${formatoContenido(opcion)}`}
                            </small>
                            {tienda.id !== 'mercadona' && (
                              <button
                                type="button"
                                onClick={() => abrirEditorPara(comparacion.clave, tienda.id)}
                              >
                                Cambiar producto
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <b>Sin precio</b>
                            <small>
                              {tienda.automatica
                                ? 'Elige el producto exacto del catálogo.'
                                : 'Añade el precio cuando lo conozcas.'}
                            </small>
                            {tienda.id !== 'mercadona' && (
                              <button
                                type="button"
                                onClick={() => abrirEditorPara(comparacion.clave, tienda.id)}
                              >
                                ＋ Añadir precio
                              </button>
                            )}
                          </>
                        )}
                      </section>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <p className="comparador-aplicado" role="status">
        <span className="comparador-aplicado__icono" aria-hidden="true">✓</span>
        <span className="comparador-aplicado__texto">
          <strong>Selección lista.</strong> Debajo encontrarás cada producto en la lista de su supermercado.
        </span>
      </p>

      {editorAbierto && (
        <form id="editor-precio-comparador" className="comparador-editor" onSubmit={guardarPrecio}>
          <div className="comparador-editor__title">
            <strong>{catalogoSeleccionado ? 'Producto exacto del catálogo' : 'Precio comprobado'}</strong>
            <button type="button" onClick={() => setEditorAbierto(false)} aria-label="Cerrar editor de precio">×</button>
          </div>
          <div className="comparador-form-grid">
            <label>
              Producto de la compra
              <select
                value={productoSeleccionado}
                onChange={(evento) => rellenarFormulario(evento.target.value, tiendaSeleccionadaId)}
              >
                {resultado.lineas.map((linea) => (
                  <option key={linea.clave} value={linea.clave}>{linea.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              Establecimiento
              <select
                value={tiendaSeleccionadaId}
                onChange={(evento) => rellenarFormulario(productoSeleccionado, evento.target.value)}
              >
                {tiendasEditables.map((tienda) => (
                  <option key={tienda.id} value={tienda.id}>{tienda.nombre}</option>
                ))}
              </select>
            </label>

            {catalogoSeleccionado && (
              <section className="comparador-catalogo comparador-form-wide">
                <div className="comparador-catalogo__heading">
                  <div>
                    <strong>Catálogo oficial de {tiendaSeleccionada?.nombre}</strong>
                    <small>Busca y elige el envase exacto una sola vez.</small>
                  </div>
                  {tiendaSeleccionada?.fuenteUrl && (
                    <a href={tiendaSeleccionada.fuenteUrl} target="_blank" rel="noreferrer">
                      Abrir tienda ↗
                    </a>
                  )}
                </div>
                <div className="comparador-catalogo__busqueda">
                  <input
                    value={consultaCatalogo}
                    maxLength={80}
                    onChange={(evento) => setConsultaCatalogo(evento.target.value)}
                    onKeyDown={(evento) => {
                      if (evento.key !== 'Enter') return;
                      evento.preventDefault();
                      void buscarEnCatalogo();
                    }}
                    placeholder="Ej. leche entera"
                    aria-label={`Buscar en ${tiendaSeleccionada?.nombre ?? 'el catálogo'}`}
                  />
                  <button
                    type="button"
                    onClick={() => void buscarEnCatalogo()}
                    disabled={buscandoCatalogo || consultaCatalogo.trim().length < 2}
                  >
                    {buscandoCatalogo ? 'Buscando…' : 'Buscar'}
                  </button>
                </div>
                {avisoCatalogo && <p className="comparador-catalogo__aviso">ℹ️ {avisoCatalogo}</p>}
                {errorCatalogo && <p className="comparador-catalogo__error" role="alert">{errorCatalogo}</p>}
                {productosCatalogo.length > 0 && (
                  <div className="comparador-catalogo__resultados" aria-label="Resultados del catálogo">
                    {productosCatalogo.map((producto) => {
                      const elegido = vinculoCatalogo?.referenciaExterna === producto.id;
                      return (
                        <article key={`${producto.tiendaId}-${producto.id}`} className={elegido ? 'is-selected' : undefined}>
                          {producto.imagen ? (
                            <img src={producto.imagen} alt="" loading="lazy" referrerPolicy="no-referrer" />
                          ) : <span className="comparador-catalogo__sin-imagen" aria-hidden="true">🛒</span>}
                          <div>
                            <strong>{producto.nombre}</strong>
                            <small>{producto.marca || tiendaSeleccionada?.nombre}</small>
                            <span>{formatoProductoCatalogo(producto)}</span>
                          </div>
                          <div>
                            <b>{euros(producto.precio)}</b>
                            <button type="button" onClick={() => elegirProductoCatalogo(producto)}>
                              {elegido ? '✓ Elegido' : 'Elegir'}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {vinculoCatalogo && (
              <div className="comparador-vinculo comparador-form-wide">
                <span>✓ Vinculado al catálogo: el precio se podrá renovar automáticamente.</span>
                <button type="button" onClick={desvincularCatalogo}>Editar a mano</button>
              </div>
            )}
            <label className="comparador-form-wide">
              Nombre en esa tienda
              <input
                value={nombreProducto}
                maxLength={180}
                onChange={(evento) => setNombreProducto(evento.target.value)}
                placeholder="Ej. Arroz redondo Campo Largo"
                readOnly={Boolean(vinculoCatalogo)}
                required
              />
            </label>
            <label>
              {modoVenta === 'peso' ? 'Precio por la cantidad indicada' : 'Precio del envase'}
              <div className="comparador-input-euro">
                <input
                  inputMode="decimal"
                  value={precio}
                  onChange={(evento) => setPrecio(evento.target.value)}
                  placeholder="1,25"
                  readOnly={Boolean(vinculoCatalogo)}
                  required
                />
                <span>€</span>
              </div>
            </label>
            <label>
              {modoVenta === 'peso' ? 'Cantidad de referencia' : 'Contenido del envase'}
              <div className="comparador-input-cantidad">
                <input
                  inputMode="decimal"
                  value={cantidad}
                  onChange={(evento) => setCantidad(evento.target.value)}
                  readOnly={Boolean(vinculoCatalogo)}
                  required
                />
                <select
                  value={unidad}
                  disabled={Boolean(vinculoCatalogo)}
                  onChange={(evento) => {
                    const siguiente = evento.target.value as UnidadOfertaComparador;
                    setUnidad(siguiente);
                    if (siguiente !== 'g' && siguiente !== 'kg') setModoVenta('envase');
                  }}
                >
                  {UNIDADES.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>{opcion.texto}</option>
                  ))}
                </select>
              </div>
            </label>
            <label>
              Forma de venta
              <select
                value={modoVenta}
                disabled={Boolean(vinculoCatalogo)}
                onChange={(evento) => setModoVenta(evento.target.value as ModoVentaComparador)}
              >
                <option value="envase">Envase cerrado</option>
                <option value="peso" disabled={unidad !== 'g' && unidad !== 'kg'}>
                  Al peso (cantidad exacta)
                </option>
              </select>
            </label>
            <label>
              Comprobado el
              <input
                type="date"
                max={fechaHoy()}
                value={actualizadaEn}
                onChange={(evento) => setActualizadaEn(evento.target.value)}
                disabled={Boolean(vinculoCatalogo)}
                required
              />
            </label>
          </div>
          <p className="comparador-help">
            {modoVenta === 'peso'
              ? 'PFI cobrará exactamente el peso necesario, como en una carnicería o frutería.'
              : vinculoCatalogo
                ? 'Nombre, precio y formato proceden del producto exacto elegido en el catálogo.'
                : 'PFI calculará cuántos envases hacen falta. Usa el contenido total del paquete: por ejemplo, 6 × 200 ml son 1.200 ml.'}
          </p>
          <div className="comparador-editor__actions">
            {ofertaEditada && (
              <button type="button" className="comparador-danger" onClick={borrarPrecio}>Eliminar precio</button>
            )}
            <button type="submit" className="comparador-primary">
              {vinculoCatalogo ? 'Vincular y recalcular' : 'Guardar y recalcular'}
            </button>
          </div>
        </form>
      )}

      <details className="comparador-config">
        <summary>Configurar zona, tiendas y criterio de ahorro</summary>
        <div className="comparador-config__grid">
          <label>
            Código postal
            <input
              inputMode="numeric"
              maxLength={5}
              value={codigoPostal}
              onChange={(evento) => setCodigoPostal(evento.target.value.replace(/\D/g, '').slice(0, 5))}
              onBlur={guardarCodigoPostal}
            />
          </label>
          <label>
            Máximo de tiendas en compra práctica
            <select
              value={configuracion.maxTiendas}
              onChange={(evento) => guardarConfiguracion({ ...configuracion, maxTiendas: Number(evento.target.value) })}
            >
              <option value="1">1 tienda</option>
              <option value="2">2 tiendas</option>
              <option value="3">3 tiendas</option>
              <option value="4">4 tiendas</option>
            </select>
          </label>
          <label>
            Ahorro mínimo para añadir otra parada
            <div className="comparador-input-euro">
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={configuracion.ahorroMinimo}
                onChange={(evento) => guardarConfiguracion({ ...configuracion, ahorroMinimo: Number(evento.target.value) })}
              />
              <span>€</span>
            </div>
          </label>
          <label>
            Descartar precios sin renovar tras
            <select
              value={configuracion.vigenciaDias}
              onChange={(evento) => guardarConfiguracion({ ...configuracion, vigenciaDias: Number(evento.target.value) })}
            >
              <option value="7">7 días</option>
              <option value="14">14 días</option>
              <option value="30">30 días</option>
            </select>
          </label>
        </div>

        <fieldset className="comparador-tiendas-config">
          <legend>Establecimientos incluidos</legend>
          {configuracion.tiendas.map((tienda) => (
            <label key={tienda.id}>
              <input
                type="checkbox"
                checked={tienda.activa}
                disabled={tienda.id === 'mercadona'}
                onChange={(evento) => guardarConfiguracion({
                  ...configuracion,
                  tiendas: configuracion.tiendas.map((candidata) =>
                    candidata.id === tienda.id ? { ...candidata, activa: evento.target.checked } : candidata,
                  ),
                })}
              />
              <span>{iconoTienda(tienda.tipo)} {tienda.nombre}</span>
              <small>
                {tienda.id === 'mercadona'
                  ? 'asociado'
                  : tienda.automatica
                    ? 'catálogo'
                    : 'manual'}
              </small>
            </label>
          ))}
        </fieldset>

        <div className="comparador-nueva-tienda">
          <strong>Añadir comercio del barrio</strong>
          <div>
            <input
              value={nombreComercio}
              maxLength={80}
              onChange={(evento) => setNombreComercio(evento.target.value)}
              placeholder="Nombre del comercio"
              aria-label="Nombre del comercio local"
            />
            <select
              value={tipoComercio}
              onChange={(evento) => setTipoComercio(evento.target.value as Exclude<TipoTiendaComparador, 'supermercado'>)}
              aria-label="Tipo de comercio local"
            >
              {TIPOS_COMERCIO.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>{opcion.texto}</option>
              ))}
            </select>
            <button type="button" onClick={añadirComercio}>Añadir</button>
          </div>
        </div>
      </details>

      {mensaje && <p className="comparador-mensaje" role="status">{mensaje}</p>}
      {error && <p className="comparador-error" role="alert">{error}</p>}
    </Card>
  );
}
