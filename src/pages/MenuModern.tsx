import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DiaMenu, MomentoPostre, PostreMenu } from '../data/Menusemanal';
import AppIcon from '../components/AppIcon';
import type { SemanaMenu } from '../data/MenuMensual';
import { useRecetas } from '../hooks/useRecetas';
import {
  obtenerComplementosSugeridos,
  obtenerSugerenciasMenu,
  obtenerValoracionComida,
  registrarEleccionMenu,
  registrarResultadoComida,
  type MomentoMenu,
  type ResultadoComida,
} from '../services/aprendizaje';
import { crearCopiaAutomaticaSiNecesaria } from '../services/copiasSeguridad';
import {
  cargarExcepciones,
  EVENTO_EXCEPCIONES,
  fechasFinDeSemana,
  fechasSemana,
  finDeSemanaSinNinos,
  guardarExcepcion,
  guardarFinDeSemanaSinNinos,
  indiceDiaSemana,
  type ExcepcionesCalendario,
} from '../services/excepcionesCalendario';
import {
  formatearPostreMenu,
  iconoRecetaPostre,
  obtenerOpcionesEspeciales,
} from '../services/menu';
import { esRecetaPostre } from '../services/recetas';
import { esPostreDeTemporada } from '../services/postres';
import { compartirTexto } from '../services/compartir';
import { cargarNotaSemana, guardarNotaSemana } from '../services/notasSemana';
import { fechaLocalISO, indiceDiaParaFecha } from '../services/fechaSemana';
import {
  cargarIngredientesNoDisponibles,
  EVENTO_DISPONIBILIDAD_INGREDIENTES,
  marcarIngredienteNoDisponible,
  type EstadoDisponibilidadIngrediente,
} from '../services/disponibilidadIngredientes';
import {
  cargarServiciosConsumidos,
  deshacerServicioConsumido,
  EVENTO_CONSUMO_MENU,
  obtenerServicioConsumido,
  registrarServicioConsumido,
  type MomentoServicioConsumido,
  type RegistroServicioConsumido,
} from '../services/consumoMenu';
import {
  cargarPerfil,
  obtenerConfiguracionComensales,
  obtenerHorarioServicio,
  type ConfiguracionComensales,
} from '../services/perfil';
import {
  cargarConfiguracionTemporada,
  evaluarTemporadaIngrediente,
  EVENTO_CONFIGURACION_TEMPORADA,
  type EvaluacionTemporadaIngrediente,
} from '../services/temporadaIngredientes';

type MenuProps = {
  menu: DiaMenu[];
  planMensual: SemanaMenu[];
  semanaActiva: number;
  guardar: (nuevoMenu: DiaMenu[]) => void;
  seleccionarSemana: (indice: number) => void;
  mesActivo: string;
  cambiarMes: (desplazamiento: number) => void;
  excluirSemana: (indice: number, excluida?: boolean) => void;
  generarNuevoMes: () => void;
  reiniciarMes: () => void;
  resolverIngrediente: (ingrediente: string) => void;
};

const RESULTADOS: Array<{
  valor: ResultadoComida;
  icono: string;
  texto: string;
}> = [
  { valor: 'gusto', icono: '😍', texto: 'Gustó' },
  { valor: 'sobro', icono: '🍽️', texto: 'Sobró' },
  { valor: 'falto', icono: '📈', texto: 'Faltó' },
  { valor: 'no_gusto', icono: '🙅', texto: 'No gustó' },
];

function normalizar(texto: string): string {
  return texto
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function fmtMes(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number);
  return new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(anio, numero - 1, 1));
}

function fmtRango(semana: SemanaMenu): string {
  if (!semana.inicio || !semana.fin) return semana.nombre;
  const [anio, mes] = semana.inicio.split('-').map(Number);
  const inicio = Number(semana.inicio.slice(8, 10));
  const fin = Number(semana.fin.slice(8, 10));
  const abreviatura = new Intl.DateTimeFormat('es-ES', { month: 'short' })
    .format(new Date(anio, mes - 1, 1))
    .replace('.', '')
    .toUpperCase();
  return `${inicio}–${fin} ${abreviatura}`;
}

function etiquetaExcepcion(
  excepcion: ExcepcionesCalendario[string] | undefined,
): string {
  if (!excepcion) return '';
  if (excepcion.noEnCasa || (excepcion.sinComida && excepcion.sinCena)) {
    return 'Fuera';
  }
  return [
    excepcion.sinComida ? 'Sin comida' : '',
    excepcion.sinCena ? 'Sin cena' : '',
    excepcion.sinNinos ? 'Solo adultos' : '',
    excepcion.comensalesComida || excepcion.comensalesCena ? 'Comensales ajustados' : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

function tipoPostreManual(nombre: string): PostreMenu {
  if (nombre === 'Sin postre') return 'Sin postre';
  return normalizar(nombre).includes('yogur') ? 'Yogur' : 'Fruta';
}

function ValoracionPlegable({
  dia,
  momento,
  platos,
  revision,
  onValorar,
}: {
  dia: string;
  momento: MomentoMenu;
  platos: string[];
  revision: number;
  onValorar: (resultado: ResultadoComida) => void;
}) {
  void revision;
  const [abierto, setAbierto] = useState(false);
  const actual = obtenerValoracionComida(dia, momento, platos)?.resultado ?? null;

  return (
    <details
      className="meal-feedback"
      open={abierto}
      onToggle={(evento) => setAbierto(evento.currentTarget.open)}
    >
      <summary>
        <span>Valorar</span>
        <small>
          {actual
            ? 'Valoración guardada · toca para cambiar'
            : 'Opcional · PFI aprende de tus comidas'}
        </small>
      </summary>
      <div className="meal-feedback__options" aria-label={`Valorar ${momento}`}>
        {RESULTADOS.map((resultado) => (
          <button
            key={resultado.valor}
            type="button"
            aria-pressed={actual === resultado.valor}
            onClick={() => {
              onValorar(resultado.valor);
              setAbierto(false);
            }}
          >
            <span aria-hidden="true">{resultado.icono}</span>
            {resultado.texto}
          </button>
        ))}
      </div>
    </details>
  );
}

function ControlConsumoServicio({
  momento,
  registro,
  procesando,
  onAccion,
}: {
  momento: MomentoServicioConsumido;
  registro: RegistroServicioConsumido | null;
  procesando: boolean;
  onAccion: () => void;
}) {
  const avisos = registro
    ? registro.faltasStock.length +
      registro.sinAsociacion.length +
      registro.ingredientesNoDisponibles.length
    : 0;
  return (
    <div className={`meal-consumption${registro ? ' meal-consumption--done' : ''}`}>
      <div>
        <strong>{registro ? '✓ Consumo registrado' : '¿Servicio ya realizado?'}</strong>
        <small>
          {registro
            ? `${registro.consumos.length} producto${registro.consumos.length === 1 ? '' : 's'} descontado${registro.consumos.length === 1 ? '' : 's'}${avisos > 0 ? ` · ${avisos} aviso${avisos === 1 ? '' : 's'}` : ''}`
            : `Confirma la ${momento} para descontar solo stock físico.`}
        </small>
      </div>
      <button type="button" onClick={onAccion} disabled={procesando}>
        {procesando
          ? 'Calculando…'
          : registro
            ? 'Deshacer'
            : 'Registrar consumo'}
      </button>
      {registro && avisos > 0 && (
        <details>
          <summary>Ver datos por revisar</summary>
          {registro.faltasStock.length > 0 && (
            <p>
              Stock insuficiente: {registro.faltasStock.map((falta) => falta.productoNombre).join(', ')}.
            </p>
          )}
          {registro.sinAsociacion.length > 0 && (
            <p>Sin producto de despensa: {registro.sinAsociacion.join(', ')}.</p>
          )}
          {registro.ingredientesNoDisponibles.length > 0 && (
            <p>
              Excluidos por disponibilidad: {registro.ingredientesNoDisponibles.join(', ')}.
            </p>
          )}
        </details>
      )}
    </div>
  );
}

function EditorComensalesServicio({
  configuracion,
  edadesNinos,
  maxAdultos,
  maxBebes,
  bebesComenMenu,
  personalizada,
  onCambiar,
  onRestaurar,
}: {
  configuracion: ConfiguracionComensales;
  edadesNinos: number[];
  maxAdultos: number;
  maxBebes: number;
  bebesComenMenu: boolean;
  personalizada: boolean;
  onCambiar: (configuracion: ConfiguracionComensales) => void;
  onRestaurar: () => void;
}) {
  const partes = [
    `${configuracion.adultos} adulto${configuracion.adultos === 1 ? '' : 's'}`,
    ...edadesNinos.flatMap((edad, indice) =>
      configuracion.ninos[indice] ? [`niño ${edad}`] : [],
    ),
    ...(configuracion.bebes > 0
      ? [`${configuracion.bebes} bebé${configuracion.bebes === 1 ? '' : 's'}`]
      : []),
  ];
  return (
    <details className="meal-diners">
      <summary>
        <span>Comensales</span>
        <small>{partes.join(' · ')}</small>
      </summary>
      <div className="meal-diners__body">
        <div className="meal-diners__counter">
          <span>Adultos</span>
          <button
            type="button"
            onClick={() => onCambiar({ ...configuracion, adultos: Math.max(0, configuracion.adultos - 1) })}
            disabled={configuracion.adultos <= 0}
            aria-label="Quitar un adulto"
          >−</button>
          <strong>{configuracion.adultos}</strong>
          <button
            type="button"
            onClick={() => onCambiar({ ...configuracion, adultos: Math.min(maxAdultos, configuracion.adultos + 1) })}
            disabled={configuracion.adultos >= maxAdultos}
            aria-label="Añadir un adulto"
          >＋</button>
        </div>
        {edadesNinos.length > 0 && (
          <div className="meal-diners__people">
            <span>Niños</span>
            {edadesNinos.map((edad, indice) => (
              <button
                type="button"
                key={`${edad}-${indice}`}
                aria-pressed={configuracion.ninos[indice] === true}
                onClick={() => onCambiar({
                  ...configuracion,
                  ninos: configuracion.ninos.map((incluido, posicion) =>
                    posicion === indice ? !incluido : incluido,
                  ),
                })}
              >
                {configuracion.ninos[indice] ? '✓ ' : ''}{edad} años
              </button>
            ))}
          </div>
        )}
        {bebesComenMenu && maxBebes > 0 && (
          <div className="meal-diners__counter">
            <span>Bebés</span>
            <button
              type="button"
              onClick={() => onCambiar({ ...configuracion, bebes: Math.max(0, configuracion.bebes - 1) })}
              disabled={configuracion.bebes <= 0}
              aria-label="Quitar un bebé"
            >−</button>
            <strong>{configuracion.bebes}</strong>
            <button
              type="button"
              onClick={() => onCambiar({ ...configuracion, bebes: Math.min(maxBebes, configuracion.bebes + 1) })}
              disabled={configuracion.bebes >= maxBebes}
              aria-label="Añadir un bebé"
            >＋</button>
          </div>
        )}
        {personalizada && (
          <button type="button" className="meal-diners__reset" onClick={onRestaurar}>
            Usar asistencia habitual
          </button>
        )}
      </div>
    </details>
  );
}

function AvisoTemporadaServicio({
  avisos,
  onPausar,
  onRevisar,
}: {
  avisos: EvaluacionTemporadaIngrediente[];
  onPausar: (aviso: EvaluacionTemporadaIngrediente) => void;
  onRevisar: (ingrediente: string) => void;
}) {
  if (avisos.length === 0) return null;
  return (
    <aside className="meal-season-warning" role="status">
      <strong>Fuera de temporada habitual</strong>
      <small>
        Aviso orientativo para {avisos[0].zonaEtiqueta}; no bloquea el menú por sí solo.
      </small>
      {avisos.map((aviso) => (
        <div key={aviso.ingrediente}>
          <span>
            <b>{aviso.ingrediente}</b>
            {aviso.alternativas.length > 0 && (
              <small>
                Alternativas de temporada: {aviso.alternativas.map((alternativa) => alternativa.ingrediente).join(', ')}.
              </small>
            )}
          </span>
          <span className="meal-season-warning__actions">
            <button type="button" onClick={() => onRevisar(aviso.ingrediente)}>
              Revisar
            </button>
            <button type="button" onClick={() => onPausar(aviso)}>
              Desactivar
            </button>
          </span>
        </div>
      ))}
    </aside>
  );
}

function ResumenMes({
  planMensual,
  excepciones,
  semanaActiva,
  onAbrirDia,
}: {
  planMensual: SemanaMenu[];
  excepciones: ExcepcionesCalendario;
  semanaActiva: number;
  onAbrirDia: (indiceSemana: number, fecha: string) => void;
}) {
  return (
    <details className="month-overview-details">
      <summary>
        <span>Ver mes completo</span>
        <small>Consulta cualquier día sin perder la semana actual</small>
      </summary>
      <div className="monthly-week-rail">
        {planMensual.map((semana, indiceSemana) => {
          const fechas = fechasSemana(semana);
          return (
            <article
              key={semana.id}
              className={`monthly-week-column${indiceSemana === semanaActiva ? ' monthly-week-column--active' : ''}${semana.excluida ? ' monthly-week-column--away' : ''}`}
            >
              <header className="monthly-week-column__header">
                <span>Semana {indiceSemana + 1}</span>
                <strong>{fmtRango(semana)}</strong>
                {semana.excluida && <small>Fuera de casa</small>}
              </header>
              <div className="monthly-week-column__days">
                {fechas.map((fecha) => {
                  const dia = semana.menu[indiceDiaSemana(fecha)];
                  const excepcion = excepciones[fecha];
                  const fueraTodoElDia = semana.excluida || excepcion?.noEnCasa;
                  const comida = fueraTodoElDia
                    ? 'Fuera de casa'
                    : excepcion?.sinComida
                      ? 'Sin comida'
                      : dia?.comida.join(' + ') || 'Sin plan';
                  const cena = fueraTodoElDia
                    ? 'Fuera de casa'
                    : excepcion?.sinCena
                      ? 'Sin cena'
                      : dia?.cena.join(' + ') || 'Sin plan';

                  return (
                    <button
                      type="button"
                      key={fecha}
                      className={`monthly-week-day${fueraTodoElDia ? ' monthly-week-day--away' : ''}`}
                      onClick={() => onAbrirDia(indiceSemana, fecha)}
                    >
                      <span className="monthly-week-day__date">
                        <b>{dia?.dia?.slice(0, 3) ?? 'Día'}</b>
                        <strong>{fecha.slice(8, 10)}</strong>
                      </span>
                      <span className="monthly-week-day__meals">
                        <small>🍽️ {comida}</small>
                        <small>🌙 {cena}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </details>
  );
}

export default function MenuModern({
  menu,
  planMensual,
  semanaActiva,
  guardar,
  seleccionarSemana,
  mesActivo,
  cambiarMes,
  excluirSemana,
  generarNuevoMes,
  reiniciarMes,
  resolverIngrediente,
}: MenuProps) {
  const { recetas } = useRecetas();
  const [diaActivo, setDiaActivo] = useState(() =>
    indiceDiaParaFecha(planMensual[semanaActiva]),
  );
  const [, setRevisionExcepciones] = useState(0);
  const [revisionAprendizaje, setRevisionAprendizaje] = useState(0);
  const [editorMomento, setEditorMomento] = useState<MomentoMenu | null>(null);
  const [seleccionEditor, setSeleccionEditor] = useState<string[]>([]);
  const [busquedaEditor, setBusquedaEditor] = useState('');
  const [errorEditor, setErrorEditor] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [notaSemana, setNotaSemana] = useState(() => cargarNotaSemana(mesActivo, semanaActiva));
  const [ingredientesNoDisponibles, setIngredientesNoDisponibles] =
    useState<EstadoDisponibilidadIngrediente[]>(cargarIngredientesNoDisponibles);
  const [revisionConsumo, setRevisionConsumo] = useState(0);
  const [servicioProcesando, setServicioProcesando] = useState<MomentoServicioConsumido | null>(null);
  const [revisionTemporada, setRevisionTemporada] = useState(0);

  const indiceSemanaSeguro = planMensual.length === 0
    ? 0
    : Math.max(0, Math.min(semanaActiva, planMensual.length - 1));
  const semana = planMensual[indiceSemanaSeguro];
  const fechas = useMemo(() => (semana ? fechasSemana(semana) : []), [semana]);
  const excepciones = cargarExcepciones();
  const fechaActiva = fechas[diaActivo] ?? fechas[0];
  const indiceMenu = fechaActiva ? indiceDiaSemana(fechaActiva) : diaActivo;
  const dia = menu[indiceMenu] ?? menu[0];
  const excepcion = fechaActiva ? excepciones[fechaActiva] : undefined;
  const mesBonito = fmtMes(mesActivo);
  const tieneFinDeSemana = Boolean(semana && fechasFinDeSemana(semana).length);
  const ninosFueraElFinDeSemana = finDeSemanaSinNinos(semana, excepciones);
  const diaEsFinDeSemana = Boolean(fechaActiva && indiceDiaSemana(fechaActiva) >= 5);
  const perfilFamiliar = cargarPerfil();
  const configuracionComidaBase = dia
    ? obtenerConfiguracionComensales(perfilFamiliar, 'comida', dia.dia)
    : perfilFamiliar.comensales.comidaLaborable;
  const configuracionCenaBase = dia
    ? obtenerConfiguracionComensales(perfilFamiliar, 'cena', dia.dia)
    : perfilFamiliar.comensales.cena;
  const aplicarSoloAdultos = (configuracion: ConfiguracionComensales) =>
    excepcion?.sinNinos
      ? { ...configuracion, ninos: configuracion.ninos.map(() => false) }
      : configuracion;
  const configuracionComida = aplicarSoloAdultos(
    excepcion?.comensalesComida ?? configuracionComidaBase,
  );
  const configuracionCena = aplicarSoloAdultos(
    excepcion?.comensalesCena ?? configuracionCenaBase,
  );
  const serviciosConsumidos = useMemo(() => {
    void revisionConsumo;
    return cargarServiciosConsumidos();
  }, [revisionConsumo]);
  const consumoComida = fechaActiva
    ? obtenerServicioConsumido(fechaActiva, 'comida', serviciosConsumidos)
    : null;
  const consumoCena = fechaActiva
    ? obtenerServicioConsumido(fechaActiva, 'cena', serviciosConsumidos)
    : null;
  const preparacionesSemana = fechas.flatMap((fecha) => {
    const diaSemana = menu[indiceDiaSemana(fecha)];
    const excepcionFecha = excepciones[fecha];
    const preparacion = diaSemana?.preparar?.trim() ?? '';
    if (
      !preparacion ||
      /nada pendiente/i.test(preparacion) ||
      excepcionFecha?.noEnCasa
    ) {
      return [];
    }
    return [{
      fecha,
      dia: diaSemana?.dia ?? 'Día',
      texto: preparacion,
    }];
  });

  const recetasPlato = useMemo(
    () =>
      recetas
        .filter((receta) => !esRecetaPostre(receta))
        .map((receta) => receta.nombre)
        .sort((a, b) => a.localeCompare(b, 'es')),
    [recetas],
  );
  const postres = useMemo(
    () => [
      'Sin postre',
      ...recetas
        .filter(esRecetaPostre)
        .map((receta) => receta.nombre)
        .sort((a, b) => a.localeCompare(b, 'es')),
    ],
    [recetas],
  );
  const ingredientesNoDisponiblesPorReceta = useMemo(() => {
    const claves = new Set(
      ingredientesNoDisponibles.map((estado) => normalizar(estado.ingrediente)),
    );
    return new Map(
      recetas.map((receta) => [
        normalizar(receta.nombre),
        receta.ingredientes
          .filter((ingrediente) => claves.has(normalizar(ingrediente.nombre)))
          .map((ingrediente) => ingrediente.nombre),
      ]),
    );
  }, [ingredientesNoDisponibles, recetas]);
  const ingredientesPausadosEn = useCallback(
    (platos: string[]): string[] => Array.from(
      new Set(
        platos.flatMap(
          (plato) => ingredientesNoDisponiblesPorReceta.get(normalizar(plato)) ?? [],
        ),
      ),
    ),
    [ingredientesNoDisponiblesPorReceta],
  );
  const temporadaPorReceta = useMemo(() => {
    void revisionTemporada;
    const configuracion = cargarConfiguracionTemporada();
    if (!configuracion.avisarAutomaticamente || !fechaActiva) {
      return new Map<string, EvaluacionTemporadaIngrediente[]>();
    }
    return new Map(
      recetas.map((receta) => [
        normalizar(receta.nombre),
        receta.ingredientes
          .map((ingrediente) =>
            evaluarTemporadaIngrediente(
              ingrediente.nombre,
              fechaActiva,
              configuracion,
            ),
          )
          .filter((evaluacion) => evaluacion.enTemporada === false),
      ]),
    );
  }, [fechaActiva, recetas, revisionTemporada]);
  const avisosTemporadaEn = useCallback(
    (platos: string[]): EvaluacionTemporadaIngrediente[] => {
      const porIngrediente = new Map<string, EvaluacionTemporadaIngrediente>();
      platos.forEach((plato) => {
        (temporadaPorReceta.get(normalizar(plato)) ?? []).forEach((evaluacion) => {
          porIngrediente.set(normalizar(evaluacion.ingrediente), evaluacion);
        });
      });
      return Array.from(porIngrediente.values());
    },
    [temporadaPorReceta],
  );
  const noDisponiblesComida = dia
    ? ingredientesPausadosEn([...dia.comida, formatearPostreMenu(dia, 'comida')])
    : [];
  const noDisponiblesCena = dia
    ? ingredientesPausadosEn([...dia.cena, formatearPostreMenu(dia, 'cena')])
    : [];
  const temporadaComida = dia
    ? avisosTemporadaEn([...dia.comida, formatearPostreMenu(dia, 'comida')])
    : [];
  const temporadaCena = dia
    ? avisosTemporadaEn([...dia.cena, formatearPostreMenu(dia, 'cena')])
    : [];
  const platosDisponibles = useMemo(
    () => Array.from(new Set([...recetasPlato, ...obtenerOpcionesEspeciales()])),
    [recetasPlato],
  );
  const resultadosBusqueda = useMemo(() => {
    const termino = normalizar(busquedaEditor);
    return platosDisponibles
      .filter((nombre) => !termino || normalizar(nombre).includes(termino))
      .slice(0, 80);
  }, [busquedaEditor, platosDisponibles]);
  const sugerencias = useMemo(
    () => {
      void revisionAprendizaje;
      return editorMomento && dia
        ? obtenerSugerenciasMenu(
            dia.dia,
            editorMomento,
            editorMomento === 'comida' ? dia.comida : dia.cena,
            6,
          ).filter((sugerencia) => ingredientesPausadosEn(sugerencia.platos).length === 0)
            .sort((a, b) =>
              avisosTemporadaEn(a.platos).length - avisosTemporadaEn(b.platos).length,
            )
            .slice(0, 3)
        : [];
    },
    [avisosTemporadaEn, dia, editorMomento, ingredientesPausadosEn, revisionAprendizaje],
  );
  const complementos = useMemo(() => {
    void revisionAprendizaje;
    if (!editorMomento || seleccionEditor.length === 0) return [];
    return obtenerComplementosSugeridos(
      seleccionEditor[0],
      editorMomento,
      seleccionEditor,
      recetasPlato,
      6,
    ).filter((sugerencia) => ingredientesPausadosEn([sugerencia.plato]).length === 0)
      .sort((a, b) =>
        avisosTemporadaEn([a.plato]).length - avisosTemporadaEn([b.plato]).length,
      )
      .slice(0, 3);
  }, [avisosTemporadaEn, editorMomento, ingredientesPausadosEn, recetasPlato, revisionAprendizaje, seleccionEditor]);

  useEffect(() => {
    const actualizar = () => setRevisionExcepciones((valor) => valor + 1);
    window.addEventListener(EVENTO_EXCEPCIONES, actualizar);
    return () => window.removeEventListener(EVENTO_EXCEPCIONES, actualizar);
  }, []);

  useEffect(() => {
    const actualizar = () => setRevisionTemporada((valor) => valor + 1);
    window.addEventListener(EVENTO_CONFIGURACION_TEMPORADA, actualizar);
    return () => window.removeEventListener(EVENTO_CONFIGURACION_TEMPORADA, actualizar);
  }, []);

  useEffect(() => {
    const actualizar = () => setIngredientesNoDisponibles(cargarIngredientesNoDisponibles());
    window.addEventListener(EVENTO_DISPONIBILIDAD_INGREDIENTES, actualizar);
    return () => window.removeEventListener(EVENTO_DISPONIBILIDAD_INGREDIENTES, actualizar);
  }, []);

  useEffect(() => {
    const actualizar = () => setRevisionConsumo((valor) => valor + 1);
    window.addEventListener(EVENTO_CONSUMO_MENU, actualizar);
    return () => window.removeEventListener(EVENTO_CONSUMO_MENU, actualizar);
  }, []);

  useEffect(() => {
    if (diaActivo >= fechas.length && fechas.length > 0) setDiaActivo(0);
  }, [diaActivo, fechas.length]);

  useEffect(() => {
    setNotaSemana(cargarNotaSemana(mesActivo, indiceSemanaSeguro));
  }, [indiceSemanaSeguro, mesActivo]);

  const cambiar = (delta: number) => {
    cambiarMes(delta);
    setDiaActivo(0);
    setEditorMomento(null);
    setMensaje('');
  };

  const marcar = (tipo: 'sinComida' | 'sinCena' | 'noEnCasa' | 'sinNinos') => {
    if (!fechaActiva) return;
    if (tipo === 'noEnCasa') {
      guardarExcepcion(
        fechaActiva,
        {
          ...excepcion,
          noEnCasa: !excepcion?.noEnCasa,
        },
      );
      return;
    }
    guardarExcepcion(fechaActiva, {
      ...excepcion,
      noEnCasa: false,
      [tipo]: !excepcion?.[tipo],
    });
  };

  const abrirDiaResumen = (indiceSemana: number, fecha: string) => {
    const semanaDestino = planMensual[indiceSemana];
    const fechasDestino = semanaDestino ? fechasSemana(semanaDestino) : [];
    seleccionarSemana(indiceSemana);
    setDiaActivo(Math.max(0, fechasDestino.indexOf(fecha)));
    setEditorMomento(null);
    document.querySelector('.week-switcher')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const abrirEditor = (momento: MomentoMenu) => {
    if (!dia) return;
    setEditorMomento(momento);
    setSeleccionEditor([...(momento === 'comida' ? dia.comida : dia.cena)]);
    setBusquedaEditor('');
    setErrorEditor('');
  };

  const alternarPlato = (plato: string) => {
    setSeleccionEditor((actual) =>
      actual.includes(plato)
        ? actual.filter((elemento) => elemento !== plato)
        : [...actual, plato],
    );
    setErrorEditor('');
  };

  const guardarEdicion = () => {
    if (!editorMomento || !dia) return;
    const seleccion = Array.from(
      new Set(seleccionEditor.map((plato) => plato.trim()).filter(Boolean)),
    );
    if (seleccion.length === 0) {
      setErrorEditor('Elige al menos un plato.');
      return;
    }

    crearCopiaAutomaticaSiNecesaria('antes de editar una comida del menú');
    guardar(
      menu.map((elemento, indice) =>
        indice === indiceMenu
          ? { ...elemento, [editorMomento]: seleccion }
          : elemento,
      ),
    );
    registrarEleccionMenu(dia.dia, editorMomento, seleccion);
    setRevisionAprendizaje((valor) => valor + 1);
    setEditorMomento(null);
    setMensaje('Menú actualizado · la compra se ha recalculado.');
  };

  const cambiarPostre = (momento: MomentoPostre, receta: string) => {
    if (!dia) return;
    crearCopiaAutomaticaSiNecesaria('antes de cambiar un postre del menú');
    const tipo = tipoPostreManual(receta);
    guardar(
      menu.map((elemento, indice) => {
        if (indice !== indiceMenu) return elemento;
        if (momento === 'comida') {
          return {
            ...elemento,
            postreComida: tipo,
            postreComidaReceta: receta,
            detallePostreComida: receta,
            cantidadPostreComida: tipo === 'Sin postre' ? 0 : 1,
            postreComidaManual: true,
          };
        }
        return {
          ...elemento,
          postreCena: tipo,
          postreCenaReceta: receta,
          detallePostreCena: receta,
          cantidadPostreCena: tipo === 'Sin postre' ? 0 : 1,
          postreCenaManual: true,
        };
      }),
    );
    setMensaje('Postre actualizado · la compra se ha recalculado.');
  };

  const valorar = (momento: MomentoMenu, resultado: ResultadoComida) => {
    if (!dia) return;
    const platos = momento === 'comida' ? dia.comida : dia.cena;
    registrarResultadoComida(dia.dia, momento, platos, resultado);
    setRevisionAprendizaje((valor) => valor + 1);
    setMensaje('Valoración guardada.');
  };

  const servicioYaHaPasado = (momento: MomentoServicioConsumido): boolean => {
    if (!fechaActiva) return false;
    const hoy = fechaLocalISO();
    if (fechaActiva < hoy) return true;
    if (fechaActiva > hoy) return false;
    const horario = obtenerHorarioServicio(cargarPerfil(), momento);
    const ahora = new Date();
    return ahora.getHours() * 60 + ahora.getMinutes() >= horario.hora * 60 + horario.minutos;
  };

  const gestionarConsumoServicio = async (momento: MomentoServicioConsumido) => {
    if (!fechaActiva || !dia || servicioProcesando) return;
    const existente = obtenerServicioConsumido(fechaActiva, momento, serviciosConsumidos);
    if (existente) {
      if (!window.confirm(
        `¿Deshacer el consumo registrado de la ${momento}? Se restaurarán ${existente.consumos.length} movimiento${existente.consumos.length === 1 ? '' : 's'} de despensa.`,
      )) return;
      crearCopiaAutomaticaSiNecesaria('antes de deshacer un consumo del menú');
      deshacerServicioConsumido(existente.id);
      setMensaje(`Consumo de la ${momento} deshecho · el stock se ha restaurado.`);
      return;
    }

    if (!window.confirm(
      `¿Registrar la ${momento} como realizada? PFI descontará de la despensa las cantidades calculadas para este servicio. Podrás deshacerlo.`,
    )) return;
    crearCopiaAutomaticaSiNecesaria('antes de registrar un consumo del menú');
    setServicioProcesando(momento);
    try {
      const registro = await registrarServicioConsumido(fechaActiva, momento, dia);
      const avisos = registro.faltasStock.length +
        registro.sinAsociacion.length +
        registro.ingredientesNoDisponibles.length;
      setMensaje(
        `${momento === 'comida' ? 'Comida' : 'Cena'} registrada · ${registro.consumos.length} producto${registro.consumos.length === 1 ? '' : 's'} descontado${registro.consumos.length === 1 ? '' : 's'}${avisos > 0 ? ` · ${avisos} dato${avisos === 1 ? '' : 's'} por revisar` : ''}.`,
      );
    } catch {
      setMensaje(`No se ha podido registrar el consumo de la ${momento}.`);
    } finally {
      setServicioProcesando(null);
    }
  };

  const actualizarComensalesServicio = (
    momento: MomentoServicioConsumido,
    siguiente: ConfiguracionComensales | null,
  ) => {
    if (!fechaActiva) return;
    if (
      siguiente &&
      siguiente.adultos + siguiente.ninos.filter(Boolean).length + siguiente.bebes <= 0
    ) {
      setMensaje(`Debe quedar al menos un comensal o marcar que no se ${momento === 'comida' ? 'come' : 'cena'} en casa.`);
      return;
    }
    crearCopiaAutomaticaSiNecesaria('antes de ajustar comensales de un servicio');
    guardarExcepcion(fechaActiva, {
      ...excepcion,
      noEnCasa: false,
      sinNinos: false,
      [momento === 'comida' ? 'comensalesComida' : 'comensalesCena']:
        siguiente ?? undefined,
    });
    setMensaje(
      siguiente
        ? `Comensales de la ${momento} actualizados · compra y presupuesto recalculados.`
        : `La ${momento} vuelve a usar la asistencia habitual.`,
    );
  };

  const pausarPorTemporada = (evaluacion: EvaluacionTemporadaIngrediente) => {
    if (!window.confirm(
      `${evaluacion.ingrediente} está fuera de su temporada habitual en ${evaluacion.zonaEtiqueta}. ¿Desactivarlo temporalmente de compra y presupuesto?`,
    )) return;
    crearCopiaAutomaticaSiNecesaria(`antes de pausar ${evaluacion.ingrediente} por temporada`);
    marcarIngredienteNoDisponible(
      evaluacion.ingrediente,
      'temporada',
      `Aviso automático para ${fechaActiva ?? mesActivo}`,
    );
    setIngredientesNoDisponibles(cargarIngredientesNoDisponibles());
    setMensaje(
      `${evaluacion.ingrediente} desactivado temporalmente · revisa el menú o elige una alternativa.`,
    );
  };

  const textoCompartirSemana = () => {
    const titulo = `PFI · ${mesBonito} · Semana ${indiceSemanaSeguro + 1}`;
    const lineas = fechas.map((fecha) => {
      const menuDia = menu[indiceDiaSemana(fecha)];
      const excepcionFecha = excepciones[fecha];
      if (semana?.excluida || excepcionFecha?.noEnCasa) {
        return `${menuDia?.dia ?? 'Día'} ${fecha.slice(8, 10)}/${fecha.slice(5, 7)}\nFuera de casa`;
      }
      const comida = excepcionFecha?.sinComida
        ? 'Sin comida en casa'
        : menuDia?.comida.join(' + ') || 'Sin plan';
      const cena = excepcionFecha?.sinCena
        ? 'Sin cena en casa'
        : menuDia?.cena.join(' + ') || 'Sin plan';
      return `${menuDia?.dia ?? 'Día'} ${fecha.slice(8, 10)}/${fecha.slice(5, 7)}\nComida: ${comida}\nCena: ${cena}`;
    });

    const nota = notaSemana.trim() ? `\n\nNotas de la semana:\n${notaSemana.trim()}` : '';
    return `${titulo}\n\n${lineas.join('\n\n')}${nota}`;
  };

  const compartirSemana = async () => {
    const resultado = await compartirTexto({
      titulo: `PFI · Menú semana ${indiceSemanaSeguro + 1}`,
      texto: textoCompartirSemana(),
    });
    if (resultado === 'cancelado') return;
    setMensaje(
      resultado === 'compartido'
        ? 'Menú compartido.'
        : resultado === 'copiado'
          ? 'Menú copiado al portapapeles.'
          : 'No se ha podido compartir el menú.',
    );
  };

  const imprimirSemana = () => {
    window.print();
  };

  const generarMesProtegido = () => {
    if (!window.confirm(
      `Se generará un menú nuevo para ${mesBonito}. Antes se guardará una copia. ¿Continuar?`,
    )) return;
    crearCopiaAutomaticaSiNecesaria('antes de generar un nuevo menú mensual');
    generarNuevoMes();
    setDiaActivo(0);
    setMensaje('Nuevo menú mensual generado.');
  };

  const reiniciarMesProtegido = () => {
    if (!window.confirm(
      `Se restaurará el menú base de ${mesBonito}. Antes se guardará una copia. ¿Continuar?`,
    )) return;
    crearCopiaAutomaticaSiNecesaria('antes de reiniciar el menú mensual');
    reiniciarMes();
    setDiaActivo(0);
    setMensaje('Menú mensual reiniciado.');
  };

  return (
    <main className="page menu-page menu-page--modern">
      <section className="modern-page-heading">
        <div>
          <span className="modern-page-heading__eyebrow">PLANIFICACIÓN</span>
          <h2>Menú</h2>
          <p>Tu semana de un vistazo. Toca cualquier comida para cambiarla.</p>
        </div>
        {mensaje && <span className="modern-status" role="status">✓ {mensaje}</span>}
      </section>

      <section className="modern-month-card" aria-label="Navegación mensual">
        <div className="modern-month-nav">
          <button type="button" onClick={() => cambiar(-1)} aria-label="Mes anterior">‹</button>
          <div>
            <small>MES ACTIVO</small>
            <strong>{mesBonito}</strong>
          </div>
          <button type="button" onClick={() => cambiar(1)} aria-label="Mes siguiente">›</button>
        </div>

        <div className="month-week-tabs">
          {planMensual.map((semanaPlan, indice) => (
            <button
              key={semanaPlan.id}
              type="button"
              className={`month-week-tab${indice === indiceSemanaSeguro ? ' month-week-tab--active' : ''}${semanaPlan.excluida ? ' month-week-tab--excluded' : ''}`}
              onClick={() => {
                seleccionarSemana(indice);
                setDiaActivo(indiceDiaParaFecha(semanaPlan));
                setEditorMomento(null);
              }}
            >
              <span>{fmtRango(semanaPlan)}</span>
              {semanaPlan.excluida && <small>Fuera de casa</small>}
            </button>
          ))}
        </div>

        <details className="menu-options">
          <summary>Opciones de esta semana</summary>
          <div className="menu-options__grid">
            <button type="button" onClick={() => excluirSemana(indiceSemanaSeguro, !semana?.excluida)}>
              {semana?.excluida ? '↩ Incluir esta semana' : '🏖️ Semana fuera de casa'}
            </button>
            {tieneFinDeSemana && !semana?.excluida && (
              <button
                type="button"
                className={ninosFueraElFinDeSemana ? 'is-active' : undefined}
                onClick={() => {
                  if (!semana) return;
                  guardarFinDeSemanaSinNinos(semana, !ninosFueraElFinDeSemana);
                }}
                aria-pressed={ninosFueraElFinDeSemana}
              >
                {ninosFueraElFinDeSemana ? '↩ Niños en casa este finde' : '👧👦 Niños fuera este finde'}
              </button>
            )}
            <button type="button" onClick={generarMesProtegido}>✨ Generar otro menú</button>
            <button type="button" onClick={reiniciarMesProtegido}>↺ Reiniciar mes</button>
          </div>
        </details>
      </section>

      <section className="pro-action-bar pro-action-bar--menu" aria-label="Acciones del menú">
        <button type="button" onClick={() => void compartirSemana()}>
          <AppIcon name="share" size={18} />
          <span><strong>Compartir</strong><small>Envía el menú de la semana</small></span>
        </button>
        <button type="button" onClick={imprimirSemana}>
          <AppIcon name="printer" size={18} />
          <span><strong>Imprimir / PDF</strong><small>Versión limpia para guardar</small></span>
        </button>
      </section>

      {semana?.excluida ? (
        <section className="modern-empty-state">
          <span>🏖️</span>
          <h3>Semana fuera de casa</h3>
          <p>No se generará compra para estos días.</p>
        </section>
      ) : dia ? (
        <>
          <nav className="week-switcher modern-day-tabs" aria-label="Elegir día">
            {fechas.map((fecha, indice) => {
              const diaFecha = menu[indiceDiaSemana(fecha)];
              const fuera = excepciones[fecha];
              return (
                <button
                  key={fecha}
                  type="button"
                  className={indice === diaActivo ? 'week-day-button week-day-button--active' : 'week-day-button'}
                  onClick={() => {
                    setDiaActivo(indice);
                    setEditorMomento(null);
                    setMensaje('');
                  }}
                >
                  <span>{diaFecha?.dia?.slice(0, 3) ?? fecha}</span>
                  <strong>{fecha.slice(8, 10)}</strong>
                  {fuera && <small>{etiquetaExcepcion(fuera)}</small>}
                </button>
              );
            })}
          </nav>

          <details className="modern-week-prep">
            <summary>
              <span>
                <strong>Preparar con antelación</strong>
                <small>
                  {preparacionesSemana.length > 0
                    ? `${preparacionesSemana.length} tarea${preparacionesSemana.length === 1 ? '' : 's'} esta semana`
                    : 'No hay preparaciones pendientes'}
                </small>
              </span>
              <span aria-hidden="true">›</span>
            </summary>
            {preparacionesSemana.length > 0 ? (
              <div className="modern-week-prep__timeline">
                {preparacionesSemana.map((preparacion) => (
                  <article key={`${preparacion.fecha}-${preparacion.texto}`}>
                    <span>
                      <strong>{preparacion.dia}</strong>
                      <small>{preparacion.fecha.slice(8, 10)}/{preparacion.fecha.slice(5, 7)}</small>
                    </span>
                    <p>{preparacion.texto}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="modern-week-prep__empty">
                Esta semana no necesitas adelantar nada.
              </p>
            )}
          </details>

          <section className="modern-day-card">
            <header className="modern-day-card__header">
              <div>
                <span>{fechaActiva === fechaLocalISO() ? 'HOY EN EL MENÚ' : 'DÍA SELECCIONADO'}</span>
                <h3>{dia.dia}</h3>
                <small>{fechaActiva?.slice(8, 10)}/{fechaActiva?.slice(5, 7)}</small>
              </div>
              {excepcion?.sinNinos && !excepcion.noEnCasa && (
                <span className="modern-pill">👧👦 Solo adultos</span>
              )}
            </header>

            <details className="day-adjustments">
              <summary>＋ Ajustar este día</summary>
              <div className="day-adjustments__actions">
                <button type="button" onClick={() => marcar('sinComida')} aria-pressed={excepcion?.sinComida === true}>
                  {excepcion?.sinComida ? '↩ Recuperar comida' : '🍽️ No comemos en casa'}
                </button>
                <button type="button" onClick={() => marcar('sinCena')} aria-pressed={excepcion?.sinCena === true}>
                  {excepcion?.sinCena ? '↩ Recuperar cena' : '🌙 No cenamos en casa'}
                </button>
                <button type="button" onClick={() => marcar('noEnCasa')} aria-pressed={excepcion?.noEnCasa === true}>
                  {excepcion?.noEnCasa ? '↩ Estamos en casa' : '🏖️ Fuera todo el día'}
                </button>
                {diaEsFinDeSemana && !excepcion?.noEnCasa && (
                  <button type="button" onClick={() => marcar('sinNinos')} aria-pressed={excepcion?.sinNinos === true}>
                    {excepcion?.sinNinos ? '↩ Niños en casa' : '👧👦 Niños fuera'}
                  </button>
                )}
              </div>
            </details>

            {excepcion?.noEnCasa ? (
              <div className="modern-empty-state modern-empty-state--inside">
                <span>🏖️</span>
                <h3>Fuera de casa este día</h3>
              </div>
            ) : (
              <div className="modern-meal-grid">
                <article className="modern-meal-card">
                  <header>
                    <div>
                      <span className="modern-meal-card__icon"><AppIcon name="utensils" /></span>
                      <div><small>COMIDA</small><h4>Mediodía</h4></div>
                    </div>
                    {!excepcion?.sinComida && (
                      <button type="button" className="modern-edit-button" onClick={() => abrirEditor('comida')}>Editar</button>
                    )}
                  </header>
                  {excepcion?.sinComida ? (
                    <p className="modern-muted">No comemos en casa.</p>
                  ) : (
                    <>
                      <div className="modern-dish-list">
                        {dia.comida.map((plato) => <strong key={plato}>{plato}</strong>)}
                      </div>
                      <EditorComensalesServicio
                        configuracion={configuracionComida}
                        edadesNinos={perfilFamiliar.edadesNinos}
                        maxAdultos={perfilFamiliar.adultos}
                        maxBebes={perfilFamiliar.bebes}
                        bebesComenMenu={perfilFamiliar.bebesComenMenu}
                        personalizada={Boolean(excepcion?.comensalesComida)}
                        onCambiar={(siguiente) => actualizarComensalesServicio('comida', siguiente)}
                        onRestaurar={() => actualizarComensalesServicio('comida', null)}
                      />
                      <label className="modern-dessert-select">
                        <span>Postre</span>
                        <select
                          value={formatearPostreMenu(dia, 'comida')}
                          onChange={(evento) => cambiarPostre('comida', evento.target.value)}
                          aria-label="Cambiar postre de la comida"
                        >
                          {postres.map((postre) => <option key={postre} value={postre}>{iconoRecetaPostre(postre)} {postre}{esPostreDeTemporada(postre, mesActivo) ? '' : ' · fuera de temporada habitual'}</option>)}
                        </select>
                      </label>
                      {noDisponiblesComida.length > 0 && (
                        <p className="modern-meal-availability" role="status">
                          <strong>Ingrediente no disponible:</strong>{' '}
                          {noDisponiblesComida.join(', ')}. Cambia el menú o reactívalo en Recetas.
                        </p>
                      )}
                      <AvisoTemporadaServicio
                        avisos={temporadaComida}
                        onPausar={pausarPorTemporada}
                        onRevisar={resolverIngrediente}
                      />
                      {(consumoComida || servicioYaHaPasado('comida')) && (
                        <ControlConsumoServicio
                          momento="comida"
                          registro={consumoComida}
                          procesando={servicioProcesando === 'comida'}
                          onAccion={() => void gestionarConsumoServicio('comida')}
                        />
                      )}
                      <ValoracionPlegable
                        dia={dia.dia}
                        momento="comida"
                        platos={dia.comida}
                        revision={revisionAprendizaje}
                        onValorar={(resultado) => valorar('comida', resultado)}
                      />
                    </>
                  )}
                </article>

                <article className="modern-meal-card">
                  <header>
                    <div>
                      <span className="modern-meal-card__icon"><AppIcon name="moon" /></span>
                      <div><small>CENA</small><h4>Noche</h4></div>
                    </div>
                    {!excepcion?.sinCena && (
                      <button type="button" className="modern-edit-button" onClick={() => abrirEditor('cena')}>Editar</button>
                    )}
                  </header>
                  {excepcion?.sinCena ? (
                    <p className="modern-muted">No cenamos en casa.</p>
                  ) : (
                    <>
                      <div className="modern-dish-list">
                        {dia.cena.map((plato) => <strong key={plato}>{plato}</strong>)}
                      </div>
                      <EditorComensalesServicio
                        configuracion={configuracionCena}
                        edadesNinos={perfilFamiliar.edadesNinos}
                        maxAdultos={perfilFamiliar.adultos}
                        maxBebes={perfilFamiliar.bebes}
                        bebesComenMenu={perfilFamiliar.bebesComenMenu}
                        personalizada={Boolean(excepcion?.comensalesCena)}
                        onCambiar={(siguiente) => actualizarComensalesServicio('cena', siguiente)}
                        onRestaurar={() => actualizarComensalesServicio('cena', null)}
                      />
                      <label className="modern-dessert-select">
                        <span>Postre</span>
                        <select
                          value={formatearPostreMenu(dia, 'cena')}
                          onChange={(evento) => cambiarPostre('cena', evento.target.value)}
                          aria-label="Cambiar postre de la cena"
                        >
                          {postres.map((postre) => <option key={postre} value={postre}>{iconoRecetaPostre(postre)} {postre}{esPostreDeTemporada(postre, mesActivo) ? '' : ' · fuera de temporada habitual'}</option>)}
                        </select>
                      </label>
                      {noDisponiblesCena.length > 0 && (
                        <p className="modern-meal-availability" role="status">
                          <strong>Ingrediente no disponible:</strong>{' '}
                          {noDisponiblesCena.join(', ')}. Cambia el menú o reactívalo en Recetas.
                        </p>
                      )}
                      <AvisoTemporadaServicio
                        avisos={temporadaCena}
                        onPausar={pausarPorTemporada}
                        onRevisar={resolverIngrediente}
                      />
                      {(consumoCena || servicioYaHaPasado('cena')) && (
                        <ControlConsumoServicio
                          momento="cena"
                          registro={consumoCena}
                          procesando={servicioProcesando === 'cena'}
                          onAccion={() => void gestionarConsumoServicio('cena')}
                        />
                      )}
                      <ValoracionPlegable
                        dia={dia.dia}
                        momento="cena"
                        platos={dia.cena}
                        revision={revisionAprendizaje}
                        onValorar={(resultado) => valorar('cena', resultado)}
                      />
                    </>
                  )}
                </article>
              </div>
            )}
          </section>
        </>
      ) : null}

      {semana && (
        <section className="print-week-menu" aria-hidden="true">
          <header>
            <strong>PFI · Menú semanal</strong>
            <span>{mesBonito} · Semana {indiceSemanaSeguro + 1}</span>
          </header>
          <div>
            {fechas.map((fecha) => {
              const menuDia = menu[indiceDiaSemana(fecha)];
              const excepcionFecha = excepciones[fecha];
              const fuera = semana.excluida || excepcionFecha?.noEnCasa;
              return (
                <article key={`print-${fecha}`}>
                  <h3>{menuDia?.dia ?? 'Día'} <small>{fecha.slice(8, 10)}/{fecha.slice(5, 7)}</small></h3>
                  {fuera ? (
                    <p>Fuera de casa</p>
                  ) : (
                    <>
                      <p><strong>Comida:</strong> {excepcionFecha?.sinComida ? 'Sin comida en casa' : menuDia?.comida.join(' + ') || 'Sin plan'}</p>
                      <p><strong>Cena:</strong> {excepcionFecha?.sinCena ? 'Sin cena en casa' : menuDia?.cena.join(' + ') || 'Sin plan'}</p>
                    </>
                  )}
                </article>
              );
            })}
          </div>
          {notaSemana.trim() && (
            <footer>
              <strong>Notas</strong>
              <p>{notaSemana}</p>
            </footer>
          )}
        </section>
      )}

      {semana && (
        <details className="week-notes">
          <summary>
            <span>
              <AppIcon name="note" size={17} />
              <strong>Notas de la semana</strong>
            </span>
            <small>{notaSemana.trim() ? 'Guardadas automáticamente' : 'Opcional'}</small>
          </summary>
          <div className="week-notes__body">
            <textarea
              value={notaSemana}
              maxLength={2400}
              onChange={(evento) => {
                const siguiente = guardarNotaSemana(
                  mesActivo,
                  indiceSemanaSeguro,
                  evento.target.value,
                );
                setNotaSemana(siguiente);
              }}
              placeholder="Pendientes, cambios, cosas que comprar fuera, recordatorios…"
              aria-label="Notas de la semana"
            />
            <small>{notaSemana.length}/2400 · Se guarda automáticamente</small>
          </div>
        </details>
      )}

      <ResumenMes
        planMensual={planMensual}
        excepciones={excepciones}
        semanaActiva={indiceSemanaSeguro}
        onAbrirDia={abrirDiaResumen}
      />

      {editorMomento && dia && (
        <div className="modern-modal-backdrop" role="presentation">
          <section className="modern-menu-editor" role="dialog" aria-modal="true" aria-label={`Editar ${editorMomento} de ${dia.dia}`}>
            <header className="modern-menu-editor__header">
              <div>
                <small>EDITAR MENÚ</small>
                <h3>{editorMomento === 'comida' ? '🍽️ Comida' : '🌙 Cena'} · {dia.dia}</h3>
              </div>
              <button type="button" onClick={() => setEditorMomento(null)} aria-label="Cerrar editor">×</button>
            </header>

            <div className="modern-menu-editor__selection">
              <span>Seleccionado</span>
              <div>
                {seleccionEditor.map((plato) => (
                  <button type="button" key={plato} onClick={() => alternarPlato(plato)}>{plato} ×</button>
                ))}
                {seleccionEditor.length === 0 && <small>Aún no hay platos.</small>}
              </div>
            </div>

            {sugerencias.length > 0 && (
              <section className="modern-suggestions">
                <span>🧠 PFI te sugiere</span>
                <div>
                  {sugerencias.map((sugerencia) => (
                    <button
                      type="button"
                      key={sugerencia.platos.join('|')}
                      onClick={() => setSeleccionEditor([...sugerencia.platos])}
                    >
                      <strong>{sugerencia.platos.join(' + ')}</strong>
                      <small>{sugerencia.explicacion}</small>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {complementos.length > 0 && (
              <section className="modern-complements">
                <span>Puede encajar bien</span>
                <div>
                  {complementos.map((sugerencia) => (
                    <button type="button" key={sugerencia.plato} onClick={() => alternarPlato(sugerencia.plato)}>
                      ＋ {sugerencia.plato}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <label className="modern-search-field">
              <span>Buscar en tus recetas</span>
              <input
                type="search"
                value={busquedaEditor}
                onChange={(evento) => setBusquedaEditor(evento.target.value)}
                placeholder="Salmón, tortilla, lentejas…"
                autoFocus
              />
            </label>

            <div className="modern-recipe-picker">
              {resultadosBusqueda.map((plato) => {
                const seleccionado = seleccionEditor.includes(plato);
                const noDisponibles = ingredientesPausadosEn([plato]);
                const fueraTemporada = avisosTemporadaEn([plato]);
                return (
                  <button
                    type="button"
                    key={plato}
                    aria-pressed={seleccionado}
                    onClick={() => alternarPlato(plato)}
                  >
                    <span>{seleccionado ? '✓' : '＋'}</span>
                    <strong>
                      {plato}
                      {noDisponibles.length > 0 && (
                        <small>Ingrediente no disponible: {noDisponibles.join(', ')}</small>
                      )}
                      {fueraTemporada.length > 0 && (
                        <small>
                          Fuera de temporada habitual: {fueraTemporada.map((aviso) => aviso.ingrediente).join(', ')}
                        </small>
                      )}
                    </strong>
                  </button>
                );
              })}
              {resultadosBusqueda.length === 0 && <p>No hay recetas con esa búsqueda.</p>}
            </div>

            {errorEditor && <p className="modern-form-error" role="alert">{errorEditor}</p>}

            <footer className="modern-menu-editor__footer">
              <button type="button" onClick={() => setEditorMomento(null)}>Cancelar</button>
              <button type="button" className="is-primary" onClick={guardarEdicion}>Guardar cambios</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
