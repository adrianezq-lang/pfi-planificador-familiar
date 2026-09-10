import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
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
import Card from './ui/Card';
import Title from './ui/Title';
import './ComparadorCompra.css';

type ComparadorCompraProps = {
  lineas: LineaCompra[];
};

type ModoComparador = 'recomendada' | 'absoluta' | 'una';

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

function etiquetaTiendas(plan: PlanCompraComparada, configuracion: ConfiguracionComparador): string {
  const nombres = plan.tiendas.map(
    (id) => configuracion.tiendas.find((tienda) => tienda.id === id)?.nombre ?? id,
  );
  if (nombres.length === 0) return 'Sin precios suficientes';
  return nombres.join(' + ');
}

export default function ComparadorCompra({ lineas }: ComparadorCompraProps) {
  const [configuracion, setConfiguracion] = useState(cargarConfiguracionComparador);
  const [ofertas, setOfertas] = useState<OfertaComparador[]>(cargarOfertasComparador);
  const [modo, setModo] = useState<ModoComparador>('recomendada');
  const [editorAbierto, setEditorAbierto] = useState(false);
  const [productoClave, setProductoClave] = useState('');
  const [tiendaId, setTiendaId] = useState('lidl');
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
  const tiendasManuales = useMemo(
    () => configuracion.tiendas.filter((tienda) => tienda.activa && !tienda.automatica),
    [configuracion.tiendas],
  );
  const productoSeleccionado = resultado.lineas.some(
    (linea) => linea.clave === productoClave,
  )
    ? productoClave
    : resultado.lineas[0]?.clave ?? '';
  const tiendaSeleccionadaId = tiendasManuales.some(
    (tienda) => tienda.id === tiendaId,
  )
    ? tiendaId
    : tiendasManuales[0]?.id ?? '';

  const plan = modo === 'absoluta'
    ? resultado.absoluta
    : modo === 'una'
      ? resultado.unaTienda ?? resultado.recomendada
      : resultado.recomendada;
  const mercadona = resultado.porTienda.find((resumen) => resumen.tienda.id === 'mercadona');
  const ahorro = mercadona?.completo && plan.completo
    ? Math.round((mercadona.total - plan.total) * 100) / 100
    : null;
  const tiendaPorId = useMemo(
    () => new Map(configuracion.tiendas.map((tienda) => [tienda.id, tienda])),
    [configuracion.tiendas],
  );
  const grupos = plan.tiendas.map((id) => ({
    tienda: tiendaPorId.get(id),
    asignaciones: plan.asignaciones.filter((asignacion) => asignacion.opcion.tiendaId === id),
  }));

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
    setMensaje('');
    setError('');
  }, [configuracion.tiendas, ofertas, resultado.lineas]);

  const abrirEditor = () => {
    const clave = productoSeleccionado;
    const idTienda = tiendaSeleccionadaId;
    if (!clave || !idTienda) {
      setError('Activa al menos una tienda manual y calcula una compra con productos.');
      return;
    }
    rellenarFormulario(clave, idTienda);
    setEditorAbierto(true);
  };

  const guardarPrecio = (evento: FormEvent) => {
    evento.preventDefault();
    const comparacion = resultado.lineas.find(
      (linea) => linea.clave === productoSeleccionado,
    );
    const tienda = tiendasManuales.find(
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
        origen: 'manual',
      });
      setOfertas(cargarOfertasComparador());
      crearCopiaAutomaticaSiNecesaria('precio del comparador actualizado');
      setMensaje(`${guardada.nombreProducto}: precio de ${tienda.nombre} guardado.`);
      setEditorAbierto(false);
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se ha podido guardar el precio.',
      );
    }
  };

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
          <span className="comparador-kicker">AHORRO POR ESTABLECIMIENTO</span>
          <Title style={{ color: '#34573d', fontSize: 24 }}>⚖️ Comparador de precios</Title>
          <p>
            Mercadona se actualiza automáticamente. Añade el precio visto en Lidl,
            Carrefour, Eroski o un comercio del barrio y PFI igualará formatos y envases.
          </p>
        </div>
        <span className="comparador-sync">☁️ Incluido en cuenta y copias</span>
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
            <b>{resumen.completo ? euros(resumen.total) : 'Parcial'}</b>
            <small>{resumen.tienda.automatica ? 'Actualización automática' : 'Precios guardados'}</small>
            {resumen.tienda.fuenteUrl && !resumen.tienda.automatica && (
              <a href={resumen.tienda.fuenteUrl} target="_blank" rel="noreferrer">
                Consultar fuente oficial ↗
              </a>
            )}
          </article>
        ))}
      </div>

      <div className="comparador-modos" aria-label="Tipo de comparación">
        <button type="button" aria-pressed={modo === 'recomendada'} onClick={() => setModo('recomendada')}>
          Práctica
        </button>
        <button type="button" aria-pressed={modo === 'absoluta'} onClick={() => setModo('absoluta')}>
          Más barata
        </button>
        <button type="button" aria-pressed={modo === 'una'} onClick={() => setModo('una')}>
          Una tienda
        </button>
      </div>

      <section className="comparador-resultado" aria-live="polite">
        <div>
          <span>{modo === 'absoluta' ? 'MÍNIMO ABSOLUTO' : modo === 'una' ? 'MEJOR CESTA COMPLETA' : 'RECOMENDACIÓN PFI'}</span>
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

      <div className="comparador-actions">
        <button type="button" className="comparador-primary" onClick={abrirEditor}>
          ＋ Añadir o actualizar precio
        </button>
      </div>

      {editorAbierto && (
        <form className="comparador-editor" onSubmit={guardarPrecio}>
          <div className="comparador-editor__title">
            <strong>Precio comprobado</strong>
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
                {tiendasManuales.map((tienda) => (
                  <option key={tienda.id} value={tienda.id}>{tienda.nombre}</option>
                ))}
              </select>
            </label>
            <label className="comparador-form-wide">
              Nombre en esa tienda
              <input
                value={nombreProducto}
                maxLength={180}
                onChange={(evento) => setNombreProducto(evento.target.value)}
                placeholder="Ej. Arroz redondo Campo Largo"
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
                  required
                />
                <select
                  value={unidad}
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
                required
              />
            </label>
          </div>
          <p className="comparador-help">
            {modoVenta === 'peso'
              ? 'PFI cobrará exactamente el peso necesario, como en una carnicería o frutería.'
              : 'PFI calculará cuántos envases hacen falta. Usa el contenido total del paquete: por ejemplo, 6 × 200 ml son 1.200 ml.'}
          </p>
          <div className="comparador-editor__actions">
            {ofertaEditada && (
              <button type="button" className="comparador-danger" onClick={borrarPrecio}>Eliminar precio</button>
            )}
            <button type="submit" className="comparador-primary">Guardar y recalcular</button>
          </div>
        </form>
      )}

      {grupos.length > 0 && (
        <details className="comparador-reparto">
          <summary>Ver reparto producto a producto</summary>
          <div className="comparador-reparto__grupos">
            {grupos.map(({ tienda, asignaciones }) => (
              <section key={tienda?.id ?? 'desconocida'}>
                <h4>{tienda ? `${iconoTienda(tienda.tipo)} ${tienda.nombre}` : 'Establecimiento'}</h4>
                {asignaciones.map((asignacion) => (
                  <div className="comparador-linea" key={asignacion.clave}>
                    <span>
                      <strong>{asignacion.nombre}</strong>
                      <small>
                        {cantidadCompra(asignacion.opcion)} · {asignacion.opcion.productoNombre}
                        {asignacion.opcion.estimado ? ' · aprox.' : ''}
                      </small>
                    </span>
                    <b>{euros(asignacion.opcion.coste)}</b>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </details>
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
            Renovar precios manuales cada
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
              <small>{tienda.automatica ? 'automático' : 'manual'}</small>
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
