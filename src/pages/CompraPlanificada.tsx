import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Card from '../components/ui/Card';
import Title from '../components/ui/Title';
import type { DiaMenu } from '../data/Menusemanal';
import type { LineaCompra, ResultadoCompra } from '../motor/compra';
import {
  generarCompraMensual,
  generarCompraSemanalProyectada,
} from '../services/planificacionCompra';
import {
  cargarClavesGuardadas,
  crearClavesEstadoCompra,
  guardarClavesCompra,
  obtenerLineasPendientesDeInventario,
  registrarMarcadosEnInventario,
  type PeriodoCompra,
} from '../services/registroCompra';
import {
  añadirProductoManualCompra,
  cargarProductosManualesCompra,
  crearPeriodoIdCompraManual,
  eliminarProductoManualCompra,
  marcarProductoManualCompra,
  marcarTodosProductosManualesCompra,
  registrarProductosManualesEnDespensa,
  type ProductoManualCompra,
  type UnidadProductoManual,
} from '../services/productosManualesCompra';

type Props = {
  menu: DiaMenu[];
  menuMes: DiaMenu[];
  menusSemanas: DiaMenu[][];
  mesActivo: string;
  semanaActiva: number;
};

const UMBRAL_CERO = 0.000001;
const SIN_LINEAS: LineaCompra[] = [];

const euros = (valor: number) =>
  valor.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });

export default function CompraPlanificada({
  menu,
  menuMes,
  menusSemanas,
  mesActivo,
  semanaActiva,
}: Props) {
  const [periodo, setPeriodo] = useState<PeriodoCompra>('semana');
  const [resultado, setResultado] = useState<ResultadoCompra | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensajeInventario, setMensajeInventario] = useState('');
  const [productosManuales, setProductosManuales] = useState(
    cargarProductosManualesCompra,
  );
  const [formularioManualAbierto, setFormularioManualAbierto] = useState(false);
  const [nombreManual, setNombreManual] = useState('');
  const [cantidadManual, setCantidadManual] = useState('1');
  const [unidadManual, setUnidadManual] = useState<UnidadProductoManual>('ud');
  const [tiendaManual, setTiendaManual] = useState('');
  const [precioManual, setPrecioManual] = useState('');
  const [errorManual, setErrorManual] = useState('');
  const menuObjetivo = periodo === 'semana' ? menu : menuMes;
  const clavesEstado = useMemo(
    () => crearClavesEstadoCompra(periodo, mesActivo, semanaActiva),
    [mesActivo, periodo, semanaActiva],
  );
  const [marcados, setMarcados] = useState<string[]>([]);
  const [registrados, setRegistrados] = useState<string[]>([]);
  const periodoManualId = useMemo(
    () => crearPeriodoIdCompraManual(periodo, mesActivo, semanaActiva),
    [mesActivo, periodo, semanaActiva],
  );
  const manualesPeriodo = useMemo(
    () =>
      productosManuales.filter(
        (producto) => producto.periodoId === periodoManualId,
      ),
    [periodoManualId, productosManuales],
  );

  useEffect(() => {
    setMarcados(cargarClavesGuardadas(clavesEstado.marcados));
    setRegistrados(cargarClavesGuardadas(clavesEstado.registrados));
    setMensajeInventario('');
  }, [clavesEstado]);

  useEffect(() => {
    setFormularioManualAbierto(false);
    setErrorManual('');
  }, [periodoManualId]);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError('');

    const calculo = periodo === 'mes'
      ? generarCompraMensual(menuMes)
      : generarCompraSemanalProyectada(menusSemanas, semanaActiva);

    calculo
      .then((siguiente) => {
        if (activo) setResultado(siguiente);
      })
      .catch(() => {
        if (activo) setError('No se ha podido calcular la compra.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [menuMes, menusSemanas, periodo, mesActivo, semanaActiva]);

  const lineas = resultado?.lineas ?? SIN_LINEAS;
  const marcadosSet = useMemo(() => new Set(marcados), [marcados]);
  const registradosSet = useMemo(() => new Set(registrados), [registrados]);
  const pendientesInventario = useMemo(
    () => obtenerLineasPendientesDeInventario(lineas, marcados, registrados),
    [lineas, marcados, registrados],
  );
  const marcadosVisibles = lineas.reduce(
    (totalMarcados, linea) =>
      totalMarcados +
      Number(marcadosSet.has(linea.clave) || registradosSet.has(linea.clave)),
    0,
  );
  const marcadosSinInventario = lineas.reduce(
    (totalSinInventario, linea) =>
      totalSinInventario + Number(
        marcadosSet.has(linea.clave) && !linea.productoDespensa && !linea.producto,
      ),
    0,
  );
  const manualesMarcados = manualesPeriodo.filter(
    (producto) => producto.comprado || producto.guardadoEnDespensa,
  ).length;
  const manualesPendientesInventario = manualesPeriodo.filter(
    (producto) => producto.comprado && !producto.guardadoEnDespensa,
  );
  const totalProductos = lineas.length + manualesPeriodo.length;
  const totalMarcados = marcadosVisibles + manualesMarcados;
  const totalPendientesInventario =
    pendientesInventario.length + manualesPendientesInventario.length;

  const cambiar = (linea: LineaCompra) => {
    if (registradosSet.has(linea.clave)) return;
    const nuevas = marcadosSet.has(linea.clave)
      ? marcados.filter((claveMarcada) => claveMarcada !== linea.clave)
      : [...marcados, linea.clave];
    setMarcados(nuevas);
    guardarClavesCompra(clavesEstado.marcados, nuevas);
    setMensajeInventario('');
  };

  const marcarTodo = () => {
    const nuevas = lineas.map((linea) => linea.clave);
    setMarcados(nuevas);
    guardarClavesCompra(clavesEstado.marcados, nuevas);
    setProductosManuales(
      marcarTodosProductosManualesCompra(periodoManualId),
    );
    setMensajeInventario('');
  };

  const costeLinea = (linea: LineaCompra) => linea.subtotal ?? 0;
  const totalAutomatico = lineas.reduce(
    (suma, linea) => suma + costeLinea(linea),
    0,
  );
  const totalManual = manualesPeriodo.reduce(
    (suma, producto) => suma + (producto.precioTotal ?? 0),
    0,
  );
  const total = totalAutomatico + totalManual;
  const hayPreciosPendientes =
    lineas.some((linea) => linea.subtotal === null) ||
    manualesPeriodo.some((producto) => producto.precioTotal === null);
  const pendienteAutomatico = lineas.reduce(
    (suma, linea) =>
      suma +
      (marcadosSet.has(linea.clave) || registradosSet.has(linea.clave)
        ? 0
        : costeLinea(linea)),
    0,
  );
  const pendienteManual = manualesPeriodo.reduce(
    (suma, producto) =>
      suma +
      (producto.comprado || producto.guardadoEnDespensa
        ? 0
        : (producto.precioTotal ?? 0)),
    0,
  );
  const pendiente = pendienteAutomatico + pendienteManual;
  const mesTexto = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${mesActivo}-01T12:00:00`));

  const guardarEnInventario = () => {
    const observaciones = periodo === 'mes'
      ? `Compra mensual · ${mesTexto}`
      : `Compra semanal ${semanaActiva + 1} · ${mesTexto}`;
    const registro = registrarMarcadosEnInventario(
      lineas,
      marcados,
      registrados,
      observaciones,
    );
    setRegistrados(registro.clavesRegistradas);
    guardarClavesCompra(clavesEstado.registrados, registro.clavesRegistradas);

    const registroManual = registrarProductosManualesEnDespensa(
      periodoManualId,
      observaciones,
    );
    setProductosManuales(registroManual.productos);

    const totalRegistrados = registro.lineasRegistradas + registroManual.registrados;
    const mensajeBase = totalRegistrados === 1
      ? '1 producto añadido a la despensa.'
      : `${totalRegistrados} productos añadidos a la despensa.`;
    setMensajeInventario(
      registro.lineasSinInventario > 0
        ? `${mensajeBase} ${registro.lineasSinInventario} no se ha podido guardar porque todavía no tiene un producto asociado.`
        : mensajeBase,
    );
  };

  const añadirManual = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErrorManual('');

    try {
      const precioTotal = precioManual.trim() === ''
        ? null
        : Number(precioManual);
      setProductosManuales(
        añadirProductoManualCompra({
          periodoId: periodoManualId,
          nombre: nombreManual,
          cantidad: Number(cantidadManual),
          unidad: unidadManual,
          tienda: tiendaManual,
          precioTotal,
        }),
      );
      setNombreManual('');
      setCantidadManual('1');
      setPrecioManual('');
      setMensajeInventario('Producto añadido a la lista.');
    } catch (errorDesconocido) {
      setErrorManual(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se ha podido añadir el producto.',
      );
    }
  };

  const cambiarManual = (producto: ProductoManualCompra) => {
    setProductosManuales(
      marcarProductoManualCompra(producto.id, !producto.comprado),
    );
    setMensajeInventario('');
  };

  const eliminarManual = (producto: ProductoManualCompra) => {
    const confirmado = window.confirm(`¿Quitar «${producto.nombre}» de la lista?`);
    if (!confirmado) return;
    setProductosManuales(eliminarProductoManualCompra(producto.id));
    setMensajeInventario('Producto eliminado de la lista.');
  };

  return (
    <main
      className="page legacy-page compra-planificada-page"
      style={{ maxWidth: 1050, margin: '0 auto', padding: '20px 20px 118px' }}
    >
      <Card className="page-hero-card">
        <Title style={{ color: '#4f6f52' }}>🛒 Compra</Title>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            margin: '18px 0',
          }}
        >
          <button
            type="button"
            aria-pressed={periodo === 'semana'}
            onClick={() => setPeriodo('semana')}
            style={boton(periodo === 'semana')}
          >
            🥬 Compra semanal
          </button>
          <button
            type="button"
            aria-pressed={periodo === 'mes'}
            onClick={() => setPeriodo('mes')}
            style={boton(periodo === 'mes')}
          >
            🧺 Compra mensual
          </button>
        </div>
        <div className="compra-periodo-aviso">
          <strong>
            {periodo === 'semana'
              ? `Semana ${semanaActiva + 1} · ${mesTexto}`
              : `Compra mensual · ${mesTexto}`}
          </strong>
        </div>
      </Card>

      {cargando && (
        <Card>
          <p>Calculando compra…</p>
        </Card>
      )}
      {error && (
        <Card>
          <p>{error}</p>
        </Card>
      )}

      {!cargando && resultado && (
        <>
          <Card>
            <div className="compra-resumen-grid">
              <Resumen
                valor={euros(total)}
                texto={hayPreciosPendientes ? 'total conocido' : 'total previsto'}
              />
              <Resumen valor={String(totalProductos)} texto="productos" />
              <Resumen
                valor={euros(pendiente)}
                texto={hayPreciosPendientes ? 'pendiente conocido' : 'pendiente'}
              />
            </div>

            <div className="compra-inventario-actions">
              <div>
                <strong>
                  {totalMarcados} de {totalProductos} marcados
                </strong>
                {marcadosSinInventario > 0 && (
                  <span>{marcadosSinInventario} sin producto asociado</span>
                )}
              </div>
              <div>
                <button
                  type="button"
                  className="compra-action-button compra-action-button--secondary"
                  onClick={marcarTodo}
                  disabled={totalProductos === 0 || totalMarcados === totalProductos}
                >
                  Marcar todo
                </button>
                <button
                  type="button"
                  className="compra-action-button compra-action-button--primary"
                  onClick={guardarEnInventario}
                  disabled={totalPendientesInventario === 0}
                >
                  Guardar{totalPendientesInventario > 0 ? ` ${totalPendientesInventario}` : ''} en despensa
                </button>
              </div>
            </div>

            {mensajeInventario && (
              <p className="compra-inventario-message" role="status">
                {mensajeInventario}
              </p>
            )}
          </Card>

          <Card className="compra-manual-card">
            <header className="compra-manual-card__header">
              <div>
                <h2>Otros sitios</h2>
                {manualesPeriodo.length > 0 && (
                  <span>
                    {manualesPeriodo.length} producto
                    {manualesPeriodo.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="compra-action-button compra-action-button--secondary"
                aria-expanded={formularioManualAbierto}
                aria-controls="formulario-producto-manual"
                onClick={() => {
                  setFormularioManualAbierto((abierto) => !abierto);
                  setErrorManual('');
                }}
              >
                {formularioManualAbierto ? 'Cerrar' : '＋ Añadir producto'}
              </button>
            </header>

            {formularioManualAbierto && (
              <form
                id="formulario-producto-manual"
                className="compra-manual-form"
                onSubmit={añadirManual}
              >
                <label className="compra-manual-form__nombre">
                  Producto
                  <input
                    type="text"
                    autoFocus
                    autoComplete="off"
                    maxLength={120}
                    value={nombreManual}
                    onChange={(evento) => setNombreManual(evento.target.value)}
                    required
                  />
                </label>
                <label>
                  Cantidad
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    inputMode="decimal"
                    value={cantidadManual}
                    onChange={(evento) => setCantidadManual(evento.target.value)}
                    required
                  />
                </label>
                <label>
                  Unidad
                  <select
                    value={unidadManual}
                    onChange={(evento) =>
                      setUnidadManual(evento.target.value as UnidadProductoManual)
                    }
                  >
                    <option value="ud">ud</option>
                    <option value="envase">envase</option>
                    <option value="paquete">paquete</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                    <option value="ml">ml</option>
                  </select>
                </label>
                <label>
                  Tienda
                  <input
                    type="text"
                    autoComplete="organization"
                    list="tiendas-producto-manual"
                    maxLength={80}
                    placeholder="Otra tienda"
                    value={tiendaManual}
                    onChange={(evento) => setTiendaManual(evento.target.value)}
                  />
                  <datalist id="tiendas-producto-manual">
                    <option value="Carnicería" />
                    <option value="Frutería" />
                    <option value="Mercado" />
                    <option value="Panadería" />
                  </datalist>
                </label>
                <label>
                  Precio total <span>opcional</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={precioManual}
                    onChange={(evento) => setPrecioManual(evento.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className="compra-action-button compra-action-button--primary"
                >
                  Añadir
                </button>
                {errorManual && <p role="alert">{errorManual}</p>}
              </form>
            )}

            {manualesPeriodo.length > 0 && (
              <div className="compra-manual-lista">
                {manualesPeriodo.map((producto) => (
                  <LineaProductoManual
                    key={producto.id}
                    producto={producto}
                    cambiar={() => cambiarManual(producto)}
                    eliminar={() => eliminarManual(producto)}
                  />
                ))}
              </div>
            )}
          </Card>

          {menuObjetivo.length === 0 && (
            <Card className="compra-estado-vacio">
              <strong>🏖️ Sin menú en este periodo</strong>
            </Card>
          )}

          {lineas.length > 0 && (
            <section
              className="compra-tiendas-lista"
              aria-label="Tu lista de la compra en Mercadona"
            >
              <Card className="compra-tienda-lista-card">
                <header className="compra-tienda-lista-card__header">
                  <div>
                    <h3>🛒 Mercadona</h3>
                  </div>
                  <div>
                    <strong>{euros(totalAutomatico)}</strong>
                    <small>{lineas.length} producto{lineas.length === 1 ? '' : 's'}</small>
                  </div>
                </header>
                {lineas.map((linea) => (
                  <LineaProducto
                    key={linea.clave}
                    linea={linea}
                    marcada={marcadosSet.has(linea.clave)}
                    registrada={registradosSet.has(linea.clave)}
                    cambiar={() => cambiar(linea)}
                  />
                ))}
              </Card>
            </section>
          )}

          {periodo === 'semana' &&
            resultado.lineasCubiertas &&
            resultado.lineasCubiertas.length > 0 && (
              <Card className="compra-cubierta-card">
                <Title style={{ color: '#4f6f52', fontSize: 20 }}>
                  ✅ Ya cubierto con lo que queda
                </Title>
                {resultado.lineasCubiertas.map((linea) => (
                  <LineaCubierta key={linea.clave} linea={linea} />
                ))}
              </Card>
            )}
        </>
      )}
    </main>
  );
}

function LineaProductoManual({
  producto,
  cambiar,
  eliminar,
}: {
  producto: ProductoManualCompra;
  cambiar: () => void;
  eliminar: () => void;
}) {
  const identificador = `compra-manual-${producto.id}`;
  const completado = producto.comprado || producto.guardadoEnDespensa;

  return (
    <div className="compra-producto-linea compra-producto-linea--manual">
      <input
        id={identificador}
        type="checkbox"
        checked={completado}
        onChange={cambiar}
        disabled={producto.guardadoEnDespensa}
        aria-label={
          producto.guardadoEnDespensa
            ? `${producto.nombre} guardado en la despensa`
            : `Marcar ${producto.nombre} como comprado`
        }
      />
      <div className="compra-producto-contenido">
        <label
          className={`compra-producto-nombre${completado ? ' compra-producto-nombre--marcado' : ''}`}
          htmlFor={identificador}
        >
          {producto.nombre}
        </label>
        <small className="compra-formato">
          {formatear(producto.cantidad)} {unidadNatural(producto.unidad, producto.cantidad)} ·{' '}
          {producto.tienda}
        </small>
        {producto.guardadoEnDespensa && (
          <small className="compra-en-inventario">✓ En despensa</small>
        )}
      </div>
      <strong className="compra-producto-precio">
        {producto.precioTotal === null ? '—' : euros(producto.precioTotal)}
      </strong>
      <button
        type="button"
        className="compra-producto-eliminar"
        onClick={eliminar}
        aria-label={`Eliminar ${producto.nombre}`}
      >
        ×
      </button>
    </div>
  );
}

function LineaProducto({
  linea,
  marcada,
  registrada,
  cambiar,
}: {
  linea: LineaCompra;
  marcada: boolean;
  registrada: boolean;
  cambiar: () => void;
}) {
  const identificador = `compra-${linea.clave.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const sobrante = linea.explicacionCantidad?.sobranteDespuesEnvases ?? 0;
  const nombreProducto = nombreLinea(linea);

  return (
    <div className="compra-producto-linea">
      <input
        id={identificador}
        type="checkbox"
        checked={marcada || registrada}
        onChange={cambiar}
        disabled={registrada}
        aria-label={
          registrada
            ? `${nombreProducto} guardado en la despensa`
            : `Marcar ${nombreProducto} como comprado`
        }
      />
      <div className="compra-producto-contenido">
        <label
          className={`compra-producto-nombre${marcada ? ' compra-producto-nombre--marcado' : ''}`}
          htmlFor={identificador}
        >
          {nombreProducto}
        </label>
        {registrada && (
          <small className="compra-en-inventario">✓ En despensa</small>
        )}
        <small className="compra-necesidad">
          {resumenNecesidades(linea)}
        </small>
        {linea.producto ? (
          <>
            <small className="compra-formato">{linea.producto.formato}</small>
            <strong className="compra-cantidad">
              {resumenEnvases(linea, linea.envases)}
            </strong>
            {sobrante > UMBRAL_CERO && (
              <small className="compra-sobrante">
                Quedará {resumenEnvasesConContenido(linea, sobrante)}
              </small>
            )}
            <ExplicacionCantidad linea={linea} />
          </>
        ) : (
          <small className="compra-sin-producto">Falta elegir el producto exacto</small>
        )}
      </div>
      <strong className="compra-producto-precio">
        {linea.subtotal === null ? '—' : euros(linea.subtotal)}
      </strong>
    </div>
  );
}

function LineaCubierta({ linea }: { linea: LineaCompra }) {
  const explicacion = linea.explicacionCantidad;

  return (
    <div className="compra-linea-cubierta">
      <strong>{nombreLinea(linea)}</strong>
      <small>{resumenNecesidades(linea)}</small>
      {linea.producto && <small>{linea.producto.formato}</small>}
      {explicacion && (
        <small className="compra-sobrante">
          Había {resumenEnvasesConContenido(linea, explicacion.stockAntesEnvases)} y
          quedarán {resumenEnvasesConContenido(
            linea,
            explicacion.sobranteDespuesEnvases,
          )}.
        </small>
      )}
      <ExplicacionCantidad linea={linea} />
    </div>
  );
}

function ExplicacionCantidad({ linea }: { linea: LineaCompra }) {
  const explicacion = linea.explicacionCantidad;
  if (!explicacion) return null;

  const etiquetaObjetivo = explicacion.periodo === 'semana'
    ? 'Uso de la semana'
    : 'Objetivo del mes';

  return (
    <details className="compra-calculo">
      <summary>Cálculo</summary>
      <div className="compra-calculo__grid">
        <DatoCalculo
          etiqueta={etiquetaObjetivo}
          valor={resumenEnvases(linea, explicacion.objetivoEnvases)}
        />
        <DatoCalculo
          etiqueta="Disponible antes"
          valor={resumenEnvases(linea, explicacion.stockAntesEnvases)}
        />
        <DatoCalculo
          etiqueta="Comprar"
          valor={resumenEnvases(linea, explicacion.compraEnvases)}
        />
        <DatoCalculo
          etiqueta="Quedará"
          valor={resumenEnvases(linea, explicacion.sobranteDespuesEnvases)}
        />
      </div>
    </details>
  );
}

function DatoCalculo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <span className="compra-calculo__dato">
      <small>{etiqueta}</small>
      <strong>{valor}</strong>
    </span>
  );
}

function capacidadNaturalPorEnvase(
  linea: LineaCompra,
): { cantidad: number; unidad: string } | null {
  const exactos = linea.envasesExactos ?? 0;
  if (!linea.producto || exactos <= UMBRAL_CERO || linea.necesidades.length === 0) {
    return null;
  }

  const unidades = new Set(
    linea.necesidades.map((necesidad) => necesidad.unidad.trim().toLocaleLowerCase('es')),
  );
  if (unidades.size !== 1) return null;

  const total = linea.necesidades.reduce(
    (suma, necesidad) => suma + Math.max(0, necesidad.cantidad),
    0,
  );
  const capacidad = total / exactos;
  if (!Number.isFinite(capacidad) || capacidad <= UMBRAL_CERO) return null;

  return { cantidad: capacidad, unidad: linea.necesidades[0].unidad };
}

function Resumen({ valor, texto }: { valor: string; texto: string }) {
  return (
    <div>
      <strong>{valor}</strong>
      <span>{texto}</span>
    </div>
  );
}

function nombreLinea(linea: LineaCompra): string {
  return linea.producto?.nombre ?? linea.ingrediente.nombre;
}

function resumenNecesidades(linea: LineaCompra): string {
  return linea.necesidades
    .map(
      (necesidad) =>
        `${formatear(necesidad.cantidad)} ${unidadNatural(necesidad.unidad, necesidad.cantidad)} de ${necesidad.nombre}`,
    )
    .join(' + ');
}

function formatear(valor: number): string {
  const normalizado = Math.abs(valor) < UMBRAL_CERO ? 0 : valor;
  return normalizado.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

function resumenEnvases(linea: LineaCompra, cantidad: number): string {
  return `${formatear(cantidad)} ${etiquetaEnvase(linea, cantidad)}`;
}

function resumenEnvasesConContenido(linea: LineaCompra, cantidad: number): string {
  const envases = resumenEnvases(linea, cantidad);
  const capacidad = capacidadNaturalPorEnvase(linea);
  if (!capacidad || cantidad <= UMBRAL_CERO) return envases;

  const contenido = cantidad * capacidad.cantidad;
  const aproximacion = linea.calculoEstimado ? 'aprox. ' : '';
  return `${envases} (${aproximacion}${formatear(contenido)} ${unidadNatural(capacidad.unidad, contenido)})`;
}

function etiquetaEnvase(linea: LineaCompra, cantidad: number): string {
  const formato = (linea.producto?.formato ?? '')
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const plural = Math.abs(cantidad - 1) > UMBRAL_CERO;

  if (formato.includes('malla')) return plural ? 'mallas' : 'malla';
  if (formato.includes('bandeja')) return plural ? 'bandejas' : 'bandeja';
  if (formato.includes('botella')) return plural ? 'botellas' : 'botella';
  if (formato.includes('bolsa')) return plural ? 'bolsas' : 'bolsa';
  if (formato.includes('caja') || formato.includes('estuche')) {
    return plural ? 'cajas' : 'caja';
  }
  if (formato.includes('pack') || formato.includes('paquete')) {
    return plural ? 'paquetes' : 'paquete';
  }
  if (formato.includes('lata')) return plural ? 'latas' : 'lata';
  if (formato.includes('bote') || formato.includes('tarro')) {
    return plural ? 'botes' : 'bote';
  }
  if (formato.includes('pieza')) return plural ? 'piezas' : 'pieza';
  return plural ? 'envases' : 'envase';
}

function unidadNatural(unidadOriginal: string, cantidad: number): string {
  const unidad = unidadOriginal.trim();
  const normalizada = unidad.toLocaleLowerCase('es');
  if (['g', 'kg', 'ml', 'cl', 'dl', 'l'].includes(normalizada)) return unidad;
  if (['u', 'ud', 'uds'].includes(normalizada)) {
    return Math.abs(cantidad - 1) <= UMBRAL_CERO ? 'unidad' : 'unidades';
  }
  if (Math.abs(cantidad - 1) <= UMBRAL_CERO) return unidad;
  if (normalizada.endsWith('s')) return unidad;
  if (normalizada.endsWith('z')) return `${unidad.slice(0, -1)}ces`;
  return `${unidad}s`;
}

function boton(activo: boolean) {
  return {
    border: activo ? '2px solid #4f6f52' : '1px solid #d8dfd5',
    borderRadius: 14,
    padding: '14px 10px',
    background: activo ? '#e7eee4' : '#fff',
    color: '#334c36',
    fontWeight: 800,
    fontFamily: 'inherit',
    cursor: 'pointer',
  } as const;
}
