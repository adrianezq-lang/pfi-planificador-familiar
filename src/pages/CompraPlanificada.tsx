import { useEffect, useMemo, useState } from 'react';
import ComparadorCompra from '../components/ComparadorCompra';
import Card from '../components/ui/Card';
import Title from '../components/ui/Title';
import type { DiaMenu } from '../data/Menusemanal';
import type { LineaCompra, ResultadoCompra } from '../motor/compra';
import {
  claveProductoComparador,
  type AsignacionComparador,
  type OpcionPrecioComparador,
  type PlanCompraComparada,
} from '../services/comparadorPrecios';
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

type Props = {
  menu: DiaMenu[];
  menuMes: DiaMenu[];
  menusSemanas: DiaMenu[][];
  mesActivo: string;
  semanaActiva: number;
};

type LineaPorTienda = {
  linea: LineaCompra;
  asignacion?: AsignacionComparador;
};

type GrupoCompraTienda = {
  id: string;
  nombre: string;
  total: number;
  lineas: LineaPorTienda[];
};

const UMBRAL_CERO = 0.000001;
const SIN_LINEAS: LineaCompra[] = [];
const SIN_ASIGNACIONES: AsignacionComparador[] = [];
const SIN_TIENDAS: string[] = [];

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
  const [planComparado, setPlanComparado] = useState<PlanCompraComparada | null>(null);
  const menuObjetivo = periodo === 'semana' ? menu : menuMes;
  const clavesEstado = useMemo(
    () => crearClavesEstadoCompra(periodo, mesActivo, semanaActiva),
    [mesActivo, periodo, semanaActiva],
  );
  const [marcados, setMarcados] = useState<string[]>([]);
  const [registrados, setRegistrados] = useState<string[]>([]);

  useEffect(() => {
    setMarcados(cargarClavesGuardadas(clavesEstado.marcados));
    setRegistrados(cargarClavesGuardadas(clavesEstado.registrados));
    setMensajeInventario('');
  }, [clavesEstado]);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError('');
    setPlanComparado(null);

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
    (totalMarcados, linea) => totalMarcados + Number(marcadosSet.has(linea.clave)),
    0,
  );
  const registradosVisibles = lineas.reduce(
    (totalRegistrados, linea) =>
      totalRegistrados + Number(registradosSet.has(linea.clave)),
    0,
  );
  const marcadosSinInventario = lineas.reduce(
    (totalSinInventario, linea) =>
      totalSinInventario + Number(
        marcadosSet.has(linea.clave) && !linea.productoDespensa && !linea.producto,
      ),
    0,
  );
  const asignacionesComparadas = planComparado?.asignaciones ?? SIN_ASIGNACIONES;
  const ordenTiendasComparadas = planComparado?.tiendas ?? SIN_TIENDAS;
  const asignacionPorClave = useMemo(
    () => new Map(
      asignacionesComparadas.map((asignacion) => [asignacion.clave, asignacion]),
    ),
    [asignacionesComparadas],
  );
  const gruposTiendas = useMemo(() => agruparCompraPorTienda(
    lineas,
    asignacionPorClave,
    ordenTiendasComparadas,
  ), [asignacionPorClave, lineas, ordenTiendasComparadas]);

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
    setMensajeInventario('');
  };

  const costeLinea = (linea: LineaCompra) => {
    const costeComparado = asignacionPorClave.get(
      claveProductoComparador(linea),
    )?.opcion.coste;
    return planComparado ? costeComparado ?? 0 : linea.subtotal ?? 0;
  };
  const total = lineas.reduce((suma, linea) => suma + costeLinea(linea), 0);
  const pendiente = lineas.reduce(
    (suma, linea) =>
      suma + (marcadosSet.has(linea.clave) ? 0 : costeLinea(linea)),
    0,
  );
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
      asignacionesComparadas,
    );
    setRegistrados(registro.clavesRegistradas);
    guardarClavesCompra(clavesEstado.registrados, registro.clavesRegistradas);

    const mensajeBase = registro.lineasRegistradas === 1
      ? '1 producto añadido a la despensa.'
      : `${registro.lineasRegistradas} productos añadidos a la despensa.`;
    setMensajeInventario(
      registro.lineasSinInventario > 0
        ? `${mensajeBase} ${registro.lineasSinInventario} no se ha podido guardar porque todavía no tiene un producto asociado.`
        : mensajeBase,
    );
  };

  return (
    <main
      className="page legacy-page compra-planificada-page"
      style={{ maxWidth: 1050, margin: '0 auto', padding: '20px 20px 118px' }}
    >
      <Card className="page-hero-card">
        <Title style={{ color: '#4f6f52' }}>🛒 Planificación de compra</Title>
        <p style={{ color: '#667067' }}>
          El menú decide qué necesitas. Tú eliges si preparas la compra de esta
          semana o la visión completa del mes.
        </p>
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
          <span>
            {periodo === 'semana'
              ? 'Fruta y verdura, carne y pescado. Los sobrantes de envases anteriores ya están descontados.'
              : 'Leche, despensa, embutido, salsas, desayuno, limpieza, mascotas y demás productos no frescos para todo el mes.'}
          </span>
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
              <Resumen valor={euros(total)} texto="total previsto" />
              <Resumen valor={String(lineas.length)} texto="productos" />
              <Resumen valor={euros(pendiente)} texto="pendiente" />
            </div>

            <div className="compra-inventario-actions">
              <div>
                <strong>
                  {marcadosVisibles} de {lineas.length} productos marcados
                </strong>
                <span>
                  {pendientesInventario.length > 0
                    ? `${pendientesInventario.length} listos para añadir a la despensa.`
                    : marcadosVisibles > 0 && registradosVisibles === marcadosVisibles
                      ? 'Los productos ya están en la despensa y protegidos contra registros duplicados.'
                      : marcadosSinInventario > 0
                        ? `${marcadosSinInventario} necesitan estar vinculados a la despensa antes de guardarlos.`
                      : 'Marca cada producto cuando lo metas en el carro; se guardará con la tienda elegida.'}
                </span>
              </div>
              <div>
                <button
                  type="button"
                  className="compra-action-button compra-action-button--secondary"
                  onClick={marcarTodo}
                  disabled={lineas.length === 0 || marcadosVisibles === lineas.length}
                >
                  Marcar todo
                </button>
                <button
                  type="button"
                  className="compra-action-button compra-action-button--primary"
                  onClick={guardarEnInventario}
                  disabled={pendientesInventario.length === 0}
                >
                  Guardar{pendientesInventario.length > 0 ? ` ${pendientesInventario.length}` : ''} en despensa
                </button>
              </div>
            </div>

            {mensajeInventario && (
              <p className="compra-inventario-message" role="status">
                {mensajeInventario}
              </p>
            )}
          </Card>

          <ComparadorCompra lineas={lineas} onPlanChange={setPlanComparado} />

          {menuObjetivo.length === 0 && (
            <Card>
              <Title style={{ color: '#4f6f52' }}>🏖️ Semana fuera de casa</Title>
              <p style={{ color: '#667067' }}>
                No se generan productos del menú para esta semana.
              </p>
            </Card>
          )}

          {gruposTiendas.length > 0 && (
            <section className="compra-tiendas-lista" aria-labelledby="titulo-listas-tiendas">
              <div className="compra-tiendas-lista__heading">
                <div>
                  <span>LISTA FINAL</span>
                  <h2 id="titulo-listas-tiendas" className="compra-tiendas-lista__title">
                    Compra separada por supermercados
                  </h2>
                </div>
                <small>Marca aquí lo que vas metiendo en el carro.</small>
              </div>
              <div className="compra-tiendas-lista__grid">
                {gruposTiendas.map((grupo) => (
                  <Card key={grupo.id} className="compra-tienda-lista-card">
                    <header className="compra-tienda-lista-card__header">
                      <div>
                        <span>{grupo.id === 'sin-precio' ? 'POR COMPLETAR' : 'COMPRAR EN'}</span>
                        <h3>{iconoTiendaCompra(grupo.id)} {grupo.nombre}</h3>
                      </div>
                      <div>
                        <strong>{euros(grupo.total)}</strong>
                        <small>{grupo.lineas.length} producto{grupo.lineas.length === 1 ? '' : 's'}</small>
                      </div>
                    </header>
                    {grupo.lineas.map(({ linea, asignacion }) => (
                      <LineaProducto
                        key={linea.clave}
                        linea={linea}
                        asignacion={asignacion}
                        marcada={marcadosSet.has(linea.clave)}
                        registrada={registradosSet.has(linea.clave)}
                        comparacionAplicada={planComparado !== null}
                        cambiar={() => cambiar(linea)}
                      />
                    ))}
                  </Card>
                ))}
              </div>
            </section>
          )}

          {periodo === 'semana' &&
            resultado.lineasCubiertas &&
            resultado.lineasCubiertas.length > 0 && (
              <Card className="compra-cubierta-card">
                <Title style={{ color: '#4f6f52', fontSize: 20 }}>
                  ✅ Ya cubierto con lo que queda
                </Title>
                <p style={{ color: '#667067' }}>
                  No necesitas volver a comprar estos productos esta semana.
                  Abre el cálculo para ver de qué semana viene el sobrante.
                </p>
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

function agruparCompraPorTienda(
  lineas: LineaCompra[],
  asignacionPorClave: Map<string, AsignacionComparador>,
  ordenTiendas: string[],
): GrupoCompraTienda[] {
  const grupos = new Map<string, GrupoCompraTienda>();

  lineas.forEach((linea) => {
    const asignacion = asignacionPorClave.get(claveProductoComparador(linea));
    const id = asignacion?.opcion.tiendaId ?? 'sin-precio';
    const nombre = asignacion?.opcion.tiendaNombre ?? 'Sin precio asignado';
    const grupo = grupos.get(id) ?? { id, nombre, total: 0, lineas: [] };
    grupo.total += asignacion?.opcion.coste ?? 0;
    grupo.lineas.push({ linea, asignacion });
    grupos.set(id, grupo);
  });

  const posicion = new Map(ordenTiendas.map((id, indice) => [id, indice]));
  return Array.from(grupos.values())
    .map((grupo) => ({ ...grupo, total: Math.round(grupo.total * 100) / 100 }))
    .sort((a, b) =>
      (posicion.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (posicion.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
}

function iconoTiendaCompra(tiendaId: string): string {
  if (tiendaId.startsWith('local-')) return '🏬';
  if (tiendaId === 'sin-precio') return '⚠️';
  return '🛒';
}

function cantidadCompraComparada(opcion: OpcionPrecioComparador): string {
  if (opcion.alPeso && opcion.cantidadAlPeso && opcion.unidadAlPeso) {
    return `${opcion.cantidadAlPeso.toLocaleString('es-ES', {
      maximumFractionDigits: 3,
    })} ${opcion.unidadAlPeso} al peso`;
  }
  return `${opcion.envases.toLocaleString('es-ES')} envase${opcion.envases === 1 ? '' : 's'}`;
}

function LineaProducto({
  linea,
  asignacion,
  marcada,
  registrada,
  comparacionAplicada,
  cambiar,
}: {
  linea: LineaCompra;
  asignacion?: AsignacionComparador;
  marcada: boolean;
  registrada: boolean;
  comparacionAplicada: boolean;
  cambiar: () => void;
}) {
  const identificador = `compra-${linea.clave.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const sobrante = linea.explicacionCantidad?.sobranteDespuesEnvases ?? 0;
  const opcion = asignacion?.opcion;
  const nombreProducto = opcion?.productoNombre ?? nombreLinea(linea);

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
        {opcion && nombreProducto !== nombreLinea(linea) && (
          <small className="compra-producto-equivalencia">
            Para {nombreLinea(linea)} · elegido por mejor precio
          </small>
        )}
        {registrada && (
          <small className="compra-en-inventario">✓ Guardado en despensa</small>
        )}
        <small className="compra-necesidad">
          Necesitas: {resumenNecesidades(linea)}
        </small>
        {opcion ? (
          <>
            <small className="compra-formato">
              Formato: {opcion.contenidoCantidad.toLocaleString('es-ES', { maximumFractionDigits: 3 })} {opcion.contenidoUnidad}
            </small>
            <strong className="compra-cantidad">
              Comprar: {cantidadCompraComparada(opcion)}
            </strong>
            <small className="compra-tienda-seleccionada">
              {opcion.tiendaNombre} · {euros(opcion.precioEnvase)} por {opcion.alPeso
                ? `${opcion.contenidoCantidad.toLocaleString('es-ES', { maximumFractionDigits: 3 })} ${opcion.contenidoUnidad}`
                : 'envase'}
            </small>
          </>
        ) : comparacionAplicada ? (
          <small className="compra-sin-producto">
            Falta un precio válido para el criterio elegido
          </small>
        ) : linea.producto ? (
          <>
            <small className="compra-formato">Formato: {linea.producto.formato}</small>
            <strong className="compra-cantidad">
              Comprar: {resumenEnvases(linea, linea.envases)}
            </strong>
            {sobrante > UMBRAL_CERO && (
              <small className="compra-sobrante">
                Después quedarán: {resumenEnvasesConContenido(linea, sobrante)}
              </small>
            )}
            <ExplicacionCantidad linea={linea} />
          </>
        ) : (
          <small className="compra-sin-producto">Falta elegir el producto exacto</small>
        )}
      </div>
      <strong className="compra-producto-precio">
        {opcion
          ? euros(opcion.coste)
          : comparacionAplicada || linea.subtotal === null
            ? '—'
            : euros(linea.subtotal)}
      </strong>
    </div>
  );
}

function LineaCubierta({ linea }: { linea: LineaCompra }) {
  const explicacion = linea.explicacionCantidad;

  return (
    <div className="compra-linea-cubierta">
      <strong>{nombreLinea(linea)}</strong>
      <small>Necesitas: {resumenNecesidades(linea)}</small>
      {linea.producto && <small>Formato: {linea.producto.formato}</small>}
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
      <summary>¿Cómo sale esta cantidad?</summary>
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
      <p>{textoExplicacion(linea)}</p>
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

function textoExplicacion(linea: LineaCompra): string {
  const explicacion = linea.explicacionCantidad;
  if (!explicacion) return '';

  const frases: string[] = [];
  const equivalencia = equivalenciaFormato(linea);
  const faltante = Math.max(
    0,
    explicacion.objetivoEnvases - explicacion.stockAntesEnvases,
  );

  if (equivalencia) frases.push(equivalencia);

  if (explicacion.periodo === 'semana' && (explicacion.semana ?? 1) > 1) {
    frases.push(
      'El disponible incluye el stock registrado y los sobrantes proyectados de las semanas anteriores.',
    );
  } else if (explicacion.periodo === 'mes') {
    if (
      explicacion.necesidadMensualEnvases >
      explicacion.necesidadMenuEnvases + UMBRAL_CERO
    ) {
      frases.push(
        `Tu cantidad mensual configurada (${resumenEnvases(linea, explicacion.necesidadMensualEnvases)}) fija el objetivo.`,
      );
    }
    if (
      explicacion.reservaEnvases >
      Math.max(
        explicacion.necesidadMenuEnvases,
        explicacion.necesidadMensualEnvases,
      ) + UMBRAL_CERO
    ) {
      frases.push(
        `La reserva mínima (${resumenEnvases(linea, explicacion.reservaEnvases)}) fija el objetivo.`,
      );
    }
    if (!explicacion.stockAplicado) {
      frases.push(
        linea.productoDespensa?.frecuencia === 'manual'
          ? 'La despensa está en modo manual, por eso su stock no se descuenta.'
          : 'No hay stock vinculado a este producto; el cálculo parte de cero.',
      );
    }
  }

  if (explicacion.compraEnvases <= UMBRAL_CERO) {
    frases.push('Lo disponible cubre todo el uso, así que no compras nada.');
  } else {
    frases.push(
      `Faltan ${resumenEnvases(linea, faltante)}. La compra resultante es ${resumenEnvases(linea, explicacion.compraEnvases)}.`,
    );
  }

  frases.push(
    `Después de cubrirlo quedarán ${resumenEnvasesConContenido(linea, explicacion.sobranteDespuesEnvases)}.`,
  );

  if (linea.calculoEstimado) {
    frases.push('La equivalencia es aproximada porque el producto se vende por peso o el formato no es exacto.');
  }

  return frases.join(' ');
}

function equivalenciaFormato(linea: LineaCompra): string | null {
  const capacidad = capacidadNaturalPorEnvase(linea);
  if (!capacidad) return null;

  const envase = etiquetaEnvase(linea, 1);
  const aproximacion = linea.calculoEstimado ? 'aprox. ' : '';
  return `${articuloEnvase(envase)} ${envase} cubre ${aproximacion}${formatear(capacidad.cantidad)} ${unidadNatural(capacidad.unidad, capacidad.cantidad)}.`;
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

function articuloEnvase(envase: string): 'Un' | 'Una' {
  return ['malla', 'bandeja', 'botella', 'bolsa', 'caja', 'lata', 'pieza'].includes(envase)
    ? 'Una'
    : 'Un';
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
