import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { DiaMenu } from '../data/Menusemanal';
import AppIcon from '../components/AppIcon';
import type { LineaCompra, ResultadoCompra } from '../motor/compra';
import {
  ORDEN_SECCIONES_COMPRA,
  obtenerSeccionCompra,
} from '../services/categoriasCompra';
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
import { compartirTexto } from '../services/compartir';

type Props = {
  menu: DiaMenu[];
  menuMes: DiaMenu[];
  menusSemanas: DiaMenu[][];
  mesActivo: string;
  semanaActiva: number;
};

type GrupoSeccionCompra = {
  seccion: string;
  lineas: LineaCompra[];
  subtotal: number;
  preciosPendientes: number;
};

const UMBRAL_CERO = 0.000001;
const SIN_LINEAS: LineaCompra[] = [];

const euros = (valor: number) =>
  valor.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });

export default function CompraModern({
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
  const [productosManuales, setProductosManuales] = useState(cargarProductosManualesCompra);
  const [formularioManualAbierto, setFormularioManualAbierto] = useState(false);
  const [nombreManual, setNombreManual] = useState('');
  const [cantidadManual, setCantidadManual] = useState('1');
  const [unidadManual, setUnidadManual] = useState<UnidadProductoManual>('ud');
  const [tiendaManual, setTiendaManual] = useState('');
  const [precioManual, setPrecioManual] = useState('');
  const [errorManual, setErrorManual] = useState('');
  const [marcados, setMarcados] = useState<string[]>([]);
  const [registrados, setRegistrados] = useState<string[]>([]);
  const [ocultarCompletados, setOcultarCompletados] = useState(false);

  const compraMensualDisponible = semanaActiva === 0;
  const menuObjetivo = periodo === 'semana' ? menu : menuMes;
  const clavesEstado = useMemo(
    () => crearClavesEstadoCompra(periodo, mesActivo, semanaActiva),
    [mesActivo, periodo, semanaActiva],
  );
  const periodoManualId = useMemo(
    () => crearPeriodoIdCompraManual(periodo, mesActivo, semanaActiva),
    [mesActivo, periodo, semanaActiva],
  );
  const manualesPeriodo = useMemo(
    () => productosManuales.filter((producto) => producto.periodoId === periodoManualId),
    [periodoManualId, productosManuales],
  );

  useEffect(() => {
    if (!compraMensualDisponible && periodo === 'mes') setPeriodo('semana');
  }, [compraMensualDisponible, periodo]);

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
  }, [menuMes, menusSemanas, periodo, semanaActiva]);

  const lineas = resultado?.lineas ?? SIN_LINEAS;
  const marcadosSet = useMemo(() => new Set(marcados), [marcados]);
  const registradosSet = useMemo(() => new Set(registrados), [registrados]);

  const lineasPorSeccion = useMemo<GrupoSeccionCompra[]>(() => {
    const grupos = new Map<string, LineaCompra[]>();
    lineas.forEach((linea) => {
      const seccion = obtenerSeccionCompra(linea);
      grupos.set(seccion, [...(grupos.get(seccion) ?? []), linea]);
    });

    const orden = [
      ...ORDEN_SECCIONES_COMPRA,
      ...Array.from(grupos.keys()).filter((seccion) => !ORDEN_SECCIONES_COMPRA.includes(seccion)),
    ];

    return orden.flatMap((seccion) => {
      const lineasSeccion = grupos.get(seccion) ?? [];
      if (lineasSeccion.length === 0) return [];
      return [{
        seccion,
        lineas: lineasSeccion,
        subtotal: lineasSeccion.reduce((suma, linea) => suma + (linea.subtotal ?? 0), 0),
        preciosPendientes: lineasSeccion.filter((linea) => linea.subtotal === null).length,
      }];
    });
  }, [lineas]);

  const lineasPorSeccionVisibles = useMemo<GrupoSeccionCompra[]>(() => {
    if (!ocultarCompletados) return lineasPorSeccion;
    return lineasPorSeccion.flatMap((grupo) => {
      const pendientes = grupo.lineas.filter(
        (linea) => !marcadosSet.has(linea.clave) && !registradosSet.has(linea.clave),
      );
      if (pendientes.length === 0) return [];
      return [{
        ...grupo,
        lineas: pendientes,
        subtotal: pendientes.reduce((suma, linea) => suma + (linea.subtotal ?? 0), 0),
        preciosPendientes: pendientes.filter((linea) => linea.subtotal === null).length,
      }];
    });
  }, [
    lineasPorSeccion,
    marcadosSet,
    ocultarCompletados,
    registradosSet,
  ]);

  const manualesPeriodoVisibles = useMemo(
    () =>
      ocultarCompletados
        ? manualesPeriodo.filter(
            (producto) => !producto.comprado && !producto.guardadoEnDespensa,
          )
        : manualesPeriodo,
    [manualesPeriodo, ocultarCompletados],
  );

  const pendientesInventario = useMemo(
    () => obtenerLineasPendientesDeInventario(lineas, marcados, registrados),
    [lineas, marcados, registrados],
  );
  const marcadosVisibles = lineas.reduce(
    (total, linea) => total + Number(marcadosSet.has(linea.clave) || registradosSet.has(linea.clave)),
    0,
  );
  const manualesMarcados = manualesPeriodo.filter(
    (producto) => producto.comprado || producto.guardadoEnDespensa,
  ).length;
  const manualesEditablesMarcados = manualesPeriodo.filter(
    (producto) => producto.comprado && !producto.guardadoEnDespensa,
  ).length;
  const manualesPendientesInventario = manualesPeriodo.filter(
    (producto) => producto.comprado && !producto.guardadoEnDespensa,
  );
  const totalProductos = lineas.length + manualesPeriodo.length;
  const totalMarcados = marcadosVisibles + manualesMarcados;
  const totalPendientesInventario = pendientesInventario.length + manualesPendientesInventario.length;
  const totalEditablesMarcados = marcados.length + manualesEditablesMarcados;
  const progreso = totalProductos === 0 ? 0 : Math.round((totalMarcados / totalProductos) * 100);

  const costeLinea = (linea: LineaCompra) => linea.subtotal ?? 0;
  const totalAutomatico = lineas.reduce((suma, linea) => suma + costeLinea(linea), 0);
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
      suma + (marcadosSet.has(linea.clave) || registradosSet.has(linea.clave) ? 0 : costeLinea(linea)),
    0,
  );
  const pendienteManual = manualesPeriodo.reduce(
    (suma, producto) =>
      suma + (producto.comprado || producto.guardadoEnDespensa ? 0 : (producto.precioTotal ?? 0)),
    0,
  );
  const pendiente = pendienteAutomatico + pendienteManual;
  const sinProductoExacto = resultado?.productosSinSeleccionar.length ?? 0;
  const sinPrecioAutomatico = resultado?.productosSinPrecio.length ?? 0;
  const sinPrecioManual = manualesPeriodo.filter(
    (producto) => producto.precioTotal === null,
  ).length;
  const sinPrecioTotal = sinPrecioAutomatico + sinPrecioManual;
  const calculosEstimados = resultado?.productosEstimados.length ?? 0;
  const datosCompletos = sinProductoExacto === 0 && sinPrecioTotal === 0;
  const mesTexto = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${mesActivo}-01T12:00:00`));

  const textoCompraPendiente = () => {
    const titulo = periodo === 'mes'
      ? `PFI · Compra mensual · ${mesTexto}`
      : `PFI · Compra semana ${semanaActiva + 1} · ${mesTexto}`;
    const grupos = lineasPorSeccion.flatMap((grupo) => {
      const pendientesGrupo = grupo.lineas.filter(
        (linea) => !marcadosSet.has(linea.clave) && !registradosSet.has(linea.clave),
      );
      if (pendientesGrupo.length === 0) return [];
      const productos = pendientesGrupo.map(
        (linea) => `- ${nombreLinea(linea)} · ${resumenEnvases(linea, linea.envases)}`,
      );
      return [`${grupo.seccion}\n${productos.join('\n')}`];
    });
    const manuales = manualesPeriodo
      .filter((producto) => !producto.comprado && !producto.guardadoEnDespensa)
      .map(
        (producto) =>
          `- ${producto.nombre} · ${formatear(producto.cantidad)} ${unidadNatural(producto.unidad, producto.cantidad)}${producto.tienda ? ` · ${producto.tienda}` : ''}`,
      );

    if (manuales.length > 0) {
      grupos.push(`Otros sitios\n${manuales.join('\n')}`);
    }

    const avisoPrecio = hayPreciosPendientes
      ? '\n\n* Hay productos sin precio; el importe es parcial.'
      : '';
    return `${titulo}\n\n${grupos.join('\n\n')}\n\nPendiente conocido: ${euros(pendiente)}${avisoPrecio}`;
  };

  const compartirCompra = async () => {
    const respuesta = await compartirTexto({
      titulo: periodo === 'mes' ? 'PFI · Compra mensual' : `PFI · Compra semana ${semanaActiva + 1}`,
      texto: textoCompraPendiente(),
    });
    if (respuesta === 'cancelado') return;
    setMensajeInventario(
      respuesta === 'compartido'
        ? 'Lista compartida.'
        : respuesta === 'copiado'
          ? 'Lista copiada al portapapeles.'
          : 'No se ha podido compartir la lista.',
    );
  };

  const imprimirCompra = () => {
    window.print();
  };

  const cambiar = (linea: LineaCompra) => {
    if (registradosSet.has(linea.clave)) return;
    const nuevas = marcadosSet.has(linea.clave)
      ? marcados.filter((clave) => clave !== linea.clave)
      : [...marcados, linea.clave];
    setMarcados(nuevas);
    guardarClavesCompra(clavesEstado.marcados, nuevas);
    setMensajeInventario('');
  };

  const marcarTodo = () => {
    const nuevas = lineas
      .filter((linea) => !registradosSet.has(linea.clave))
      .map((linea) => linea.clave);
    setMarcados(nuevas);
    guardarClavesCompra(clavesEstado.marcados, nuevas);
    setProductosManuales(marcarTodosProductosManualesCompra(periodoManualId));
    setMensajeInventario('Todo lo pendiente está marcado.');
  };

  const desmarcarTodo = () => {
    setMarcados([]);
    guardarClavesCompra(clavesEstado.marcados, []);
    manualesPeriodo.forEach((producto) => {
      if (producto.comprado && !producto.guardadoEnDespensa) {
        marcarProductoManualCompra(producto.id, false);
      }
    });
    setProductosManuales(cargarProductosManualesCompra());
    setMensajeInventario('Selección pendiente desmarcada.');
  };

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

    const registroManual = registrarProductosManualesEnDespensa(periodoManualId, observaciones);
    setProductosManuales(registroManual.productos);

    const totalRegistrados = registro.lineasRegistradas + registroManual.registrados;
    const base = totalRegistrados === 1
      ? '1 producto añadido a la despensa.'
      : `${totalRegistrados} productos añadidos a la despensa.`;
    setMensajeInventario(
      registro.lineasSinInventario > 0
        ? `${base} ${registro.lineasSinInventario} queda pendiente de asociación.`
        : base,
    );
  };

  const añadirManual = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    setErrorManual('');
    try {
      const precioTotal = precioManual.trim() === '' ? null : Number(precioManual);
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
        errorDesconocido instanceof Error ? errorDesconocido.message : 'No se ha podido añadir el producto.',
      );
    }
  };

  const cambiarManual = (producto: ProductoManualCompra) => {
    setProductosManuales(marcarProductoManualCompra(producto.id, !producto.comprado));
    setMensajeInventario('');
  };

  const eliminarManual = (producto: ProductoManualCompra) => {
    if (!window.confirm(`¿Quitar «${producto.nombre}» de la lista?`)) return;
    setProductosManuales(eliminarProductoManualCompra(producto.id));
    setMensajeInventario('Producto eliminado de la lista.');
  };

  return (
    <main className="page compra-planificada-page compra-page--modern">
      <section className="modern-page-heading modern-page-heading--shopping">
        <div>
          <span className="modern-page-heading__eyebrow">LISTA INTELIGENTE</span>
          <h2>Compra</h2>
          <p>Compra solo lo que falta. PFI descuenta lo que ya tienes y arrastra sobrantes.</p>
        </div>
      </section>

      <section className="modern-shopping-toolbar">
        <div className="modern-segmented-control" aria-label="Periodo de compra">
          <button
            type="button"
            aria-pressed={periodo === 'semana'}
            onClick={() => setPeriodo('semana')}
          >
            <span className="shopping-period-icon"><AppIcon name="leaf" /></span>
            <div><strong>Semanal</strong><small>Semana {semanaActiva + 1}</small></div>
          </button>
          {compraMensualDisponible && (
            <button
              type="button"
              aria-pressed={periodo === 'mes'}
              onClick={() => setPeriodo('mes')}
            >
              <span className="shopping-period-icon"><AppIcon name="basket" /></span>
              <div><strong>Mensual</strong><small>Solo Semana 1</small></div>
            </button>
          )}
        </div>
        {!compraMensualDisponible && (
          <small className="modern-helper">La compra mensual está en la Semana 1 para no duplicar productos.</small>
        )}
      </section>

      {cargando && <section className="modern-loading-card">Calculando tu compra…</section>}
      {error && <section className="modern-error-card" role="alert">{error}</section>}

      {!cargando && resultado && (
        <>
          <section className="modern-shopping-summary">
            <div className="modern-shopping-summary__top">
              <div>
                <small>{periodo === 'mes' ? 'COMPRA MENSUAL' : `SEMANA ${semanaActiva + 1}`}</small>
                <strong>{mesTexto}</strong>
              </div>
              <span>{progreso}% completado</span>
            </div>
            <div className="modern-progress" aria-label={`${progreso}% de la compra completada`}>
              <span style={{ width: `${progreso}%` }} />
            </div>
            <div className="modern-shopping-stats">
              <Resumen valor={euros(total)} texto={hayPreciosPendientes ? 'total conocido' : 'total previsto'} />
              <Resumen valor={String(totalProductos)} texto="productos" />
              <Resumen valor={euros(pendiente)} texto={hayPreciosPendientes ? 'pendiente conocido' : 'pendiente'} />
            </div>
            <div className="modern-shopping-actions">
              <div>
                <strong>{totalMarcados} de {totalProductos} marcados</strong>
                <small>Los guardados en despensa quedan bloqueados para evitar duplicados.</small>
              </div>
              <div>
                {totalEditablesMarcados > 0 && (
                  <button type="button" className="modern-button modern-button--ghost" onClick={desmarcarTodo}>
                    ↩ Desmarcar todo
                  </button>
                )}
                <button
                  type="button"
                  className="modern-button modern-button--secondary"
                  onClick={marcarTodo}
                  disabled={totalProductos === 0 || totalMarcados === totalProductos}
                >
                  ✓ Marcar todo
                </button>
                <button
                  type="button"
                  className="modern-button modern-button--primary"
                  onClick={guardarEnInventario}
                  disabled={totalPendientesInventario === 0}
                >
                  Guardar{totalPendientesInventario > 0 ? ` ${totalPendientesInventario}` : ''} en despensa
                </button>
              </div>
            </div>
            {mensajeInventario && <p className="modern-inline-message" role="status">{mensajeInventario}</p>}
          </section>

          <section className="pro-action-bar pro-action-bar--shopping" aria-label="Acciones de la compra">
            <button
              type="button"
              onClick={() => void compartirCompra()}
              disabled={totalProductos === 0 || totalMarcados === totalProductos}
            >
              <AppIcon name="share" size={18} />
              <span><strong>Compartir pendientes</strong><small>WhatsApp, mensajes o copiar</small></span>
            </button>
            <button type="button" onClick={imprimirCompra} disabled={totalProductos === 0}>
              <AppIcon name="printer" size={18} />
              <span><strong>Imprimir / PDF</strong><small>Lista limpia para llevar</small></span>
            </button>
          </section>

          <section className={datosCompletos ? 'shopping-data-health is-ok' : 'shopping-data-health is-warning'} aria-label="Calidad de los datos de compra">
            <span className="shopping-data-health__icon" aria-hidden="true">
              <AppIcon name={datosCompletos ? 'check' : 'alert'} size={18} />
            </span>
            <div>
              <strong>{datosCompletos ? 'Importes completos' : 'Hay datos pendientes de completar'}</strong>
              <small>
                {datosCompletos
                  ? calculosEstimados > 0
                    ? `${calculosEstimados} cálculo${calculosEstimados === 1 ? '' : 's'} aproximado${calculosEstimados === 1 ? '' : 's'} por formato comercial.`
                    : 'Todos los productos tienen referencia y precio.'
                  : [
                      sinProductoExacto > 0 ? `${sinProductoExacto} sin producto exacto` : '',
                      sinPrecioTotal > 0 ? `${sinPrecioTotal} sin precio` : '',
                    ].filter(Boolean).join(' · ')}
              </small>
            </div>
          </section>

          <section className="shopping-view-controls" aria-label="Vista de compra">
            <div>
              <strong>Modo tienda</strong>
              <small>Oculta lo que ya has metido en el carro y deja solo lo pendiente.</small>
            </div>
            <button
              type="button"
              aria-pressed={ocultarCompletados}
              onClick={() => setOcultarCompletados((activo) => !activo)}
              disabled={totalMarcados === 0}
            >
              {ocultarCompletados ? 'Mostrar todo' : 'Ocultar comprados'}
            </button>
          </section>

          <details className="modern-manual-shopping" open={manualesPeriodo.length > 0 || formularioManualAbierto}>
            <summary>
              <span>＋ Productos de otros sitios</span>
              <small>Carnicería, frutería, mercado, panadería…</small>
            </summary>
            <div className="modern-manual-shopping__body">
              <button
                type="button"
                className="modern-button modern-button--secondary"
                aria-expanded={formularioManualAbierto}
                onClick={() => {
                  setFormularioManualAbierto((abierto) => !abierto);
                  setErrorManual('');
                }}
              >
                {formularioManualAbierto ? 'Cerrar formulario' : '＋ Añadir producto'}
              </button>

              {formularioManualAbierto && (
                <form className="modern-manual-form" onSubmit={añadirManual}>
                  <label>
                    <span>Producto</span>
                    <input value={nombreManual} onChange={(e) => setNombreManual(e.target.value)} required maxLength={120} autoFocus />
                  </label>
                  <label>
                    <span>Cantidad</span>
                    <input type="number" min="0.01" step="any" inputMode="decimal" value={cantidadManual} onChange={(e) => setCantidadManual(e.target.value)} required />
                  </label>
                  <label>
                    <span>Unidad</span>
                    <select value={unidadManual} onChange={(e) => setUnidadManual(e.target.value as UnidadProductoManual)}>
                      <option value="ud">ud</option><option value="envase">envase</option><option value="paquete">paquete</option>
                      <option value="kg">kg</option><option value="g">g</option><option value="l">l</option><option value="ml">ml</option>
                    </select>
                  </label>
                  <label>
                    <span>Tienda</span>
                    <input value={tiendaManual} onChange={(e) => setTiendaManual(e.target.value)} placeholder="Otra tienda" maxLength={80} />
                  </label>
                  <label>
                    <span>Precio total <em>opcional</em></span>
                    <input type="number" min="0" step="0.01" inputMode="decimal" value={precioManual} onChange={(e) => setPrecioManual(e.target.value)} />
                  </label>
                  <button type="submit" className="modern-button modern-button--primary">Añadir</button>
                  {errorManual && <p className="modern-form-error" role="alert">{errorManual}</p>}
                </form>
              )}

              {manualesPeriodoVisibles.length > 0 && (
                <div className="modern-manual-list">
                  {manualesPeriodoVisibles.map((producto) => (
                    <LineaProductoManual
                      key={producto.id}
                      producto={producto}
                      cambiar={() => cambiarManual(producto)}
                      eliminar={() => eliminarManual(producto)}
                    />
                  ))}
                </div>
              )}
            </div>
          </details>

          {menuObjetivo.length === 0 && (
            <section className="modern-empty-state">
              <span>🏖️</span><h3>Sin menú en este periodo</h3><p>No hay productos automáticos que comprar.</p>
            </section>
          )}

          {lineas.length > 0 && (
            <section className="modern-store-card" aria-label="Tu lista de la compra en Mercadona">
              <header className="modern-store-card__header">
                <div>
                  <span className="modern-store-card__logo">M</span>
                  <div><small>RECORRIDO DE TIENDA</small><h3>Mercadona</h3></div>
                </div>
                <div><strong>{euros(totalAutomatico)}</strong><small>{ocultarCompletados ? `${lineasPorSeccionVisibles.reduce((total, grupo) => total + grupo.lineas.length, 0)} pendientes` : `${lineas.length} productos`}</small></div>
              </header>

              <div className="modern-store-sections">
                {lineasPorSeccionVisibles.map((grupo, indice) => (
                  <section className="modern-shop-section" key={grupo.seccion}>
                    <header>
                      <span className="modern-shop-section__number">{String(indice + 1).padStart(2, '0')}</span>
                      <div><strong>{grupo.seccion}</strong><small>{grupo.lineas.length} producto{grupo.lineas.length === 1 ? '' : 's'}</small></div>
                      <span>{euros(grupo.subtotal)}{grupo.preciosPendientes > 0 ? ' +' : ''}</span>
                    </header>
                    <div>
                      {grupo.lineas.map((linea) => (
                        <LineaProducto
                          key={linea.clave}
                          linea={linea}
                          marcada={marcadosSet.has(linea.clave)}
                          registrada={registradosSet.has(linea.clave)}
                          cambiar={() => cambiar(linea)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          )}

          {ocultarCompletados &&
            totalProductos > 0 &&
            lineasPorSeccionVisibles.length === 0 &&
            manualesPeriodoVisibles.length === 0 && (
              <section className="shopping-complete-state">
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>Compra completada</strong>
                  <small>Todo está marcado. Puedes guardarlo en despensa cuando termines.</small>
                </div>
              </section>
            )}

          {periodo === 'semana' && resultado.lineasCubiertas && resultado.lineasCubiertas.length > 0 && (
            <details className="modern-covered-card">
              <summary>
                <span>✅ No hace falta comprarlo esta semana</span>
                <small>{resumenOrigenCobertura(resultado.lineasCubiertas)}</small>
              </summary>
              <div>
                {resultado.lineasCubiertas.map((linea) => <LineaCubierta key={linea.clave} linea={linea} />)}
              </div>
            </details>
          )}
        </>
      )}
    </main>
  );
}

function Resumen({ valor, texto }: { valor: string; texto: string }) {
  return <div><strong>{valor}</strong><span>{texto}</span></div>;
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
  const completado = producto.comprado || producto.guardadoEnDespensa;
  return (
    <div className={`modern-shopping-row modern-shopping-row--manual${completado ? ' is-complete' : ''}`}>
      <label className="modern-check">
        <input type="checkbox" checked={completado} onChange={cambiar} disabled={producto.guardadoEnDespensa} />
        <span aria-hidden="true" />
      </label>
      <div className="modern-shopping-row__content">
        <strong>{producto.nombre}</strong>
        <small>{formatear(producto.cantidad)} {unidadNatural(producto.unidad, producto.cantidad)} · {producto.tienda}</small>
        {producto.guardadoEnDespensa && <em>✓ En despensa</em>}
      </div>
      <strong className="modern-shopping-row__price">{producto.precioTotal === null ? '—' : euros(producto.precioTotal)}</strong>
      <button type="button" className="modern-row-delete" onClick={eliminar} aria-label={`Eliminar ${producto.nombre}`}>×</button>
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
  const sobrante = linea.explicacionCantidad?.sobranteDespuesEnvases ?? 0;
  const nombre = nombreLinea(linea);
  return (
    <div className={`modern-shopping-row${marcada || registrada ? ' is-complete' : ''}`}>
      <label className="modern-check">
        <input type="checkbox" checked={marcada || registrada} onChange={cambiar} disabled={registrada} aria-label={`Marcar ${nombre} como comprado`} />
        <span aria-hidden="true" />
      </label>
      <div className="modern-shopping-row__content">
        <strong>{nombre}</strong>
        {registrada && <em>✓ En despensa</em>}
        <small>{resumenNecesidades(linea)}</small>
        {linea.producto ? (
          <>
            <span className="modern-format-pill">{linea.producto.formato}</span>
            <b>{resumenEnvases(linea, linea.envases)}</b>
            {sobrante > UMBRAL_CERO && <small className="modern-leftover">Quedará {resumenEnvasesConContenido(linea, sobrante)}</small>}
            <ExplicacionCantidad linea={linea} />
          </>
        ) : (
          <small className="modern-warning">Falta elegir el producto exacto</small>
        )}
      </div>
      <strong className="modern-shopping-row__price">{linea.subtotal === null ? '—' : euros(linea.subtotal)}</strong>
    </div>
  );
}

function LineaCubierta({ linea }: { linea: LineaCompra }) {
  const explicacion = linea.explicacionCantidad;
  const origen = linea.origenCobertura;
  return (
    <div className="modern-covered-row">
      <strong>{nombreLinea(linea)}</strong>
      <small>{resumenNecesidades(linea)}</small>
      {explicacion && (
        <small>
          {origen === 'stock-real'
            ? `Stock físico registrado: ${resumenEnvasesConContenido(linea, explicacion.stockRealAntesEnvases ?? explicacion.stockAntesEnvases)}`
            : origen === 'mixta'
              ? `Cobertura mixta: ${resumenEnvasesConContenido(linea, explicacion.stockRealAntesEnvases ?? 0)} físicos + ${resumenEnvasesConContenido(linea, explicacion.sobranteProyectadoAntesEnvases ?? 0)} previstos`
              : `Sobrante previsto de compras anteriores: ${resumenEnvasesConContenido(linea, explicacion.sobranteProyectadoAntesEnvases ?? explicacion.stockAntesEnvases)}`}
          {' · '}quedarán {resumenEnvasesConContenido(linea, explicacion.sobranteDespuesEnvases)}
        </small>
      )}
    </div>
  );
}

function ExplicacionCantidad({ linea }: { linea: LineaCompra }) {
  const explicacion = linea.explicacionCantidad;
  if (!explicacion) return null;
  const etiquetaObjetivo = explicacion.periodo === 'semana' ? 'Uso de la semana' : 'Objetivo del mes';
  return (
    <details className="modern-calculation">
      <summary>Ver cálculo</summary>
      <div>
        <DatoCalculo etiqueta={etiquetaObjetivo} valor={resumenEnvases(linea, explicacion.objetivoEnvases)} />
        {explicacion.stockRealAntesEnvases !== undefined && (
          <DatoCalculo etiqueta="Stock físico antes" valor={resumenEnvases(linea, explicacion.stockRealAntesEnvases)} />
        )}
        {explicacion.sobranteProyectadoAntesEnvases !== undefined && explicacion.sobranteProyectadoAntesEnvases > UMBRAL_CERO && (
          <DatoCalculo etiqueta="Sobrante previsto antes" valor={resumenEnvases(linea, explicacion.sobranteProyectadoAntesEnvases)} />
        )}
        {explicacion.stockRealAntesEnvases === undefined && (
          <DatoCalculo etiqueta="Disponible antes" valor={resumenEnvases(linea, explicacion.stockAntesEnvases)} />
        )}
        <DatoCalculo etiqueta="Comprar" valor={resumenEnvases(linea, explicacion.compraEnvases)} />
        <DatoCalculo etiqueta="Quedará" valor={resumenEnvases(linea, explicacion.sobranteDespuesEnvases)} />
      </div>
    </details>
  );
}

function resumenOrigenCobertura(lineas: LineaCompra[]): string {
  const reales = lineas.filter(
    (linea) => linea.origenCobertura === 'stock-real',
  ).length;
  const proyectadas = lineas.length - reales;
  if (reales > 0 && proyectadas > 0) {
    return `${reales} con stock físico · ${proyectadas} con sobrante previsto`;
  }
  if (reales > 0) {
    return `${reales} producto${reales === 1 ? '' : 's'} con stock físico registrado`;
  }
  return `${proyectadas} producto${proyectadas === 1 ? '' : 's'} con sobrante previsto, aún no real`;
}

function DatoCalculo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return <span><small>{etiqueta}</small><strong>{valor}</strong></span>;
}

function nombreLinea(linea: LineaCompra): string {
  return linea.producto?.nombre ?? linea.ingrediente.nombre;
}

function resumenNecesidades(linea: LineaCompra): string {
  return linea.necesidades
    .map((necesidad) => `${formatear(necesidad.cantidad)} ${unidadNatural(necesidad.unidad, necesidad.cantidad)} de ${necesidad.nombre}`)
    .join(' + ');
}

function formatear(valor: number): string {
  const normalizado = Math.abs(valor) < UMBRAL_CERO ? 0 : valor;
  return normalizado.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

function capacidadNaturalPorEnvase(
  linea: LineaCompra,
): { cantidad: number; unidad: string } | null {
  const exactos = linea.envasesExactos ?? 0;
  if (!linea.producto || exactos <= UMBRAL_CERO || linea.necesidades.length === 0) return null;
  const unidades = new Set(linea.necesidades.map((necesidad) => necesidad.unidad.trim().toLocaleLowerCase('es')));
  if (unidades.size !== 1) return null;
  const total = linea.necesidades.reduce((suma, necesidad) => suma + Math.max(0, necesidad.cantidad), 0);
  const capacidad = total / exactos;
  if (!Number.isFinite(capacidad) || capacidad <= UMBRAL_CERO) return null;
  return { cantidad: capacidad, unidad: linea.necesidades[0].unidad };
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
  if (formato.includes('caja') || formato.includes('estuche')) return plural ? 'cajas' : 'caja';
  if (formato.includes('pack') || formato.includes('paquete')) return plural ? 'paquetes' : 'paquete';
  if (formato.includes('lata')) return plural ? 'latas' : 'lata';
  if (formato.includes('bote') || formato.includes('tarro')) return plural ? 'botes' : 'bote';
  if (formato.includes('pieza')) return plural ? 'piezas' : 'pieza';
  return plural ? 'envases' : 'envase';
}

function unidadNatural(unidadOriginal: string, cantidad: number): string {
  const unidad = unidadOriginal.trim();
  const normalizada = unidad.toLocaleLowerCase('es');
  if (['g', 'kg', 'ml', 'cl', 'dl', 'l'].includes(normalizada)) return unidad;
  if (['u', 'ud', 'uds'].includes(normalizada)) return Math.abs(cantidad - 1) <= UMBRAL_CERO ? 'unidad' : 'unidades';
  if (Math.abs(cantidad - 1) <= UMBRAL_CERO) return unidad;
  if (normalizada.endsWith('s')) return unidad;
  if (normalizada.endsWith('z')) return `${unidad.slice(0, -1)}ces`;
  return `${unidad}s`;
}
