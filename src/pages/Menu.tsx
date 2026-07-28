import { useEffect, useMemo, useState } from 'react';
import { useRecetas } from '../hooks/useRecetas';
import type { DiaMenu, MomentoPostre } from '../data/Menusemanal';
import {
  menuMensualInicial,
  type SemanaMenu,
} from '../data/MenuMensual';
import type { Receta } from '../data/Recetas';
import {
  esOpcionEspecial,
  formatearPlatosMenu,
  formatearPostreMenu,
  iconoRecetaPostre,
  obtenerOpcionesEspeciales,
  obtenerRecetaPostre,
  recalcularPreparaciones,
} from '../services/menu';
import {
  calcularEquilibrioSemana,
  copiarPlanMensual,
  generarPlanMensualInteligente,
} from '../services/planMensual';
import {
  aplicarConfiguracionPostresAlPlan,
  crearConfiguracionPostresDesdeRecetas,
} from '../services/postres';
import { esRecetaPostre } from '../services/recetas';
import {
  EVENTO_APRENDIZAJE,
  describirValoracion,
  obtenerComplementosSugeridos,
  obtenerFactorReceta,
  obtenerResumenAprendizaje,
  obtenerSugerenciasMenu,
  obtenerValoracionComida,
  registrarResultadoComida,
  type MomentoMenu,
  type ResultadoComida,
} from '../services/aprendizaje';

type MenuProps = {
  menu: DiaMenu[];
  guardarMenu: (nuevoMenu: DiaMenu[]) => void;
  planMensual: SemanaMenu[];
  guardarPlan: (nuevoPlan: SemanaMenu[], indice?: number) => void;
  semanaActiva: number;
  seleccionarSemana: (indice: number) => void;
};

type EditorActivo = {
  indice: number;
  momento: MomentoMenu;
} | null;

const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

const ABREVIATURAS: Record<string, string> = {
  Lunes: 'L',
  Martes: 'M',
  Miércoles: 'X',
  Jueves: 'J',
  Viernes: 'V',
  Sábado: 'S',
  Domingo: 'D',
};

function Menu({
  menu,
  guardarMenu,
  planMensual,
  guardarPlan,
  semanaActiva,
  seleccionarSemana,
}: MenuProps) {
  const { recetas } = useRecetas();
  const hoy = DIAS_SEMANA[new Date().getDay()];
  const indiceHoy = Math.max(
    0,
    menu.findIndex((dia) => dia.dia === hoy),
  );
  const [indiceActivo, setIndiceActivo] = useState(indiceHoy);
  const [editorActivo, setEditorActivo] = useState<EditorActivo>(null);
  const [, forzarAprendizaje] = useState(0);
  const resumenAprendizaje = obtenerResumenAprendizaje();
  const resumenSemana = calcularEquilibrioSemana(menu);
  const diaActivo = menu[indiceActivo] ?? menu[0];
  const recetasPostres = useMemo(
    () => recetas.filter(esRecetaPostre),
    [recetas],
  );
  const recetasPlatos = useMemo(
    () => recetas.filter((receta) => !esRecetaPostre(receta)),
    [recetas],
  );
  const configuracionPostres = useMemo(
    () => crearConfiguracionPostresDesdeRecetas(recetasPostres),
    [recetasPostres],
  );

  useEffect(() => {
    const actualizar = () => forzarAprendizaje((valor) => valor + 1);
    window.addEventListener(EVENTO_APRENDIZAJE, actualizar);
    return () => window.removeEventListener(EVENTO_APRENDIZAJE, actualizar);
  }, []);

  useEffect(() => {
    if (indiceActivo >= menu.length) setIndiceActivo(0);
  }, [indiceActivo, menu.length]);

  const cambiarComposicion = (
    indice: number,
    campo: MomentoMenu,
    nuevosPlatos: string[],
  ) => {
    const menuActualizado = menu.map((dia, posicion) =>
      posicion === indice ? { ...dia, [campo]: nuevosPlatos } : dia,
    );

    guardarMenu(recalcularPreparaciones(menuActualizado));
  };

  const cambiarPostre = (
    indice: number,
    momento: MomentoPostre,
    nombreReceta: string,
  ) => {
    const menuActualizado = menu.map((dia, posicion) => {
      if (posicion !== indice) return dia;

      const sinPostre = nombreReceta === 'Sin postre';
      const legacy = sinPostre
        ? 'Sin postre' as const
        : nombreReceta.toLocaleLowerCase('es').includes('yogur') || momento === 'cena'
          ? 'Yogur' as const
          : 'Fruta' as const;

      return momento === 'comida'
        ? {
            ...dia,
            postreComida: legacy,
            postreComidaReceta: nombreReceta,
            detallePostreComida: nombreReceta,
            cantidadPostreComida: sinPostre ? 0 : 1,
            postreComidaManual: true,
          }
        : {
            ...dia,
            postreCena: legacy,
            postreCenaReceta: nombreReceta,
            detallePostreCena: nombreReceta,
            cantidadPostreCena: sinPostre ? 0 : 1,
            postreCenaManual: true,
          };
    });

    guardarMenu(recalcularPreparaciones(menuActualizado));
  };

  if (!diaActivo) return null;

  return (
    <main className="page menu-page">
      <section className="page-intro page-intro--compact menu-intro">
        <div>
          <h2>📅 Menú</h2>
          <p>Cuatro semanas editables con postres únicamente desde Recetas.</p>
        </div>
        <div className="menu-intro__actions">
          <button
            type="button"
            onClick={() => {
              const confirmado = window.confirm(
                'Se sustituirán las cuatro semanas actuales por un nuevo mes variado y equilibrado. ¿Continuar?',
              );
              if (!confirmado) return;

              guardarPlan(
                aplicarConfiguracionPostresAlPlan(
                  generarPlanMensualInteligente(
                    recetasPlatos.map((receta) => receta.nombre),
                  ),
                  configuracionPostres,
                ),
                0,
              );
              setIndiceActivo(0);
              setEditorActivo(null);
            }}
            className="primary-action"
          >
            🧠 Generar mes
          </button>
          <button
            type="button"
            onClick={() => {
              guardarPlan(
                aplicarConfiguracionPostresAlPlan(
                  copiarPlanMensual(menuMensualInicial),
                  configuracionPostres,
                ),
                0,
              );
              setIndiceActivo(0);
              setEditorActivo(null);
            }}
            className="secondary-action"
          >
            Restaurar
          </button>
        </div>
      </section>

      <section className="learning-strip" aria-label="Aprendizaje de PFI">
        <div className="learning-strip__icon" aria-hidden="true">🧠</div>
        <div className="learning-strip__copy">
          <strong>PFI ya está aprendiendo de vuestra familia</strong>
          <span>
            {resumenAprendizaje.combinacionesMenu} combinaciones ·{' '}
            {resumenAprendizaje.valoraciones} valoraciones ·{' '}
            {resumenAprendizaje.ajustesRecetas + resumenAprendizaje.ajustesPorciones}{' '}
            ajustes de cantidad
          </span>
        </div>
        <div className="learning-strip__pulse" aria-hidden="true" />
      </section>

      <div className="dessert-auto-note">
        🍓 En la comida rota la fruta del recetario y en la cena rota el yogur del recetario. Los domingos quedan vacíos por defecto.
      </div>

      <div className="menu-navigation-sticky">
        <section
          className="month-switcher month-switcher--compact"
          aria-label="Elegir semana del mes"
        >
          <div className="month-switcher__heading">
            <div>
              <span>SEMANA DEL MES</span>
              <strong>
                {planMensual[semanaActiva]?.nombre ?? `Semana ${semanaActiva + 1}`}
              </strong>
            </div>
          </div>
          <div className="month-switcher__grid">
            {planMensual.map((semana, indice) => {
              const equilibrio = calcularEquilibrioSemana(semana.menu);
              const activa = indice === semanaActiva;
              return (
                <button
                  key={semana.id}
                  type="button"
                  className={`month-week-card${activa ? ' month-week-card--active' : ''}`}
                  onClick={() => {
                    seleccionarSemana(indice);
                    setIndiceActivo(0);
                    setEditorActivo(null);
                  }}
                >
                  <span>{semana.nombre}</span>
                  <strong>{equilibrio.puntuacion}%</strong>
                </button>
              );
            })}
          </div>
        </section>

        <nav className="week-switcher" aria-label="Elegir día de la semana">
          {menu.map((dia, indice) => {
            const activo = indice === indiceActivo;
            const esHoy = dia.dia === hoy;
            return (
              <button
                key={dia.dia}
                type="button"
                className={`week-day-button${activo ? ' week-day-button--active' : ''}${
                  esHoy ? ' week-day-button--today' : ''
                }`}
                onClick={() => {
                  setIndiceActivo(indice);
                  setEditorActivo(null);
                }}
              >
                <span className="week-day-button__letter">
                  {ABREVIATURAS[dia.dia] ?? dia.dia.slice(0, 1)}
                </span>
                <span className="week-day-button__name">{dia.dia}</span>
                {esHoy && <small>Hoy</small>}
              </button>
            );
          })}
        </nav>
      </div>

      <div className={`balance-summary${resumenSemana.puntuacion >= 90 ? ' balance-summary--good' : ''}`}>
        <span className="balance-summary__score">{resumenSemana.puntuacion}%</span>
        <div>
          <strong>Equilibrio PFI de esta semana</strong>
          <span>
            {resumenSemana.legumbres} legumbres · {resumenSemana.pescado} pescado ·{' '}
            {resumenSemana.aves} pollo/pavo · {resumenSemana.platosUnicos} platos distintos
          </span>
        </div>
        <small>
          {resumenSemana.avisos[0] ?? 'Variedad y reparto semanal correctos'}
        </small>
      </div>

      <section
        className={`active-day${diaActivo.dia === hoy ? ' active-day--today' : ''}${
          diaActivo.dia === 'Viernes'
            ? ' active-day--friday'
            : diaActivo.dia === 'Domingo'
              ? ' active-day--sunday'
              : ''
        }`}
      >
        <header className="active-day__header">
          <div>
            <span className="active-day__eyebrow">
              {diaActivo.dia === hoy ? 'HOY' : `${planMensual[semanaActiva]?.nombre ?? ''} · MENÚ DEL DÍA`}
            </span>
            <h3>{diaActivo.dia}</h3>
          </div>
          <div className="active-day__summary">
            <span>Comida, cena y postre</span>
            <strong>
              {diaActivo.comida.length + diaActivo.cena.length} platos
            </strong>
          </div>
        </header>

        <div className="active-day__meals">
          <MealPanel
            dia={diaActivo.dia}
            momento="comida"
            titulo="Comida"
            subtitulo="Mediodía"
            icono="🍽️"
            seleccion={diaActivo.comida}
            recetas={recetasPlatos}
            editando={
              editorActivo?.indice === indiceActivo &&
              editorActivo.momento === 'comida'
            }
            onEditar={() =>
              setEditorActivo((actual) =>
                actual?.indice === indiceActivo && actual.momento === 'comida'
                  ? null
                  : { indice: indiceActivo, momento: 'comida' },
              )
            }
            onChange={(platos) =>
              cambiarComposicion(indiceActivo, 'comida', platos)
            }
          />

          <MealPanel
            dia={diaActivo.dia}
            momento="cena"
            titulo="Cena"
            subtitulo="Noche"
            icono="🌙"
            seleccion={diaActivo.cena}
            recetas={recetasPlatos}
            editando={
              editorActivo?.indice === indiceActivo &&
              editorActivo.momento === 'cena'
            }
            onEditar={() =>
              setEditorActivo((actual) =>
                actual?.indice === indiceActivo && actual.momento === 'cena'
                  ? null
                  : { indice: indiceActivo, momento: 'cena' },
              )
            }
            onChange={(platos) =>
              cambiarComposicion(indiceActivo, 'cena', platos)
            }
          />
        </div>

        <div className="daily-desserts">
          <div className="daily-dessert-stack">
            <DessertSelector
              momento="Postre de la comida"
              seleccion={obtenerRecetaPostre(diaActivo, 'comida')}
              recetas={recetasPostres}
              onChange={(nombreReceta) =>
                cambiarPostre(indiceActivo, 'comida', nombreReceta)
              }
            />
            <MealFeedback
              dia={diaActivo.dia}
              momento="comida"
              titulo="Comida"
              seleccion={diaActivo.comida}
            />
          </div>
          <div className="daily-dessert-stack">
            <DessertSelector
              momento="Postre de la cena"
              seleccion={obtenerRecetaPostre(diaActivo, 'cena')}
              recetas={recetasPostres}
              onChange={(nombreReceta) =>
                cambiarPostre(indiceActivo, 'cena', nombreReceta)
              }
            />
            <MealFeedback
              dia={diaActivo.dia}
              momento="cena"
              titulo="Cena"
              seleccion={diaActivo.cena}
            />
          </div>
        </div>

        <div className="tomorrow-prep">
          <div className="tomorrow-prep__icon" aria-hidden="true">🧊</div>
          <div>
            <small>PREPARAR PARA MAÑANA</small>
            <strong>{diaActivo.preparar}</strong>
          </div>
        </div>
      </section>

      <section className="week-overview">
        <div className="week-overview__heading">
          <div>
            <span>VISTA RÁPIDA</span>
            <h3>La semana completa</h3>
          </div>
          <small>Pincha en un día para editarlo</small>
        </div>
        <div className="week-overview__grid">
          {menu.map((dia, indice) => (
            <button
              key={dia.dia}
              type="button"
              className={`week-summary-card${indice === indiceActivo ? ' week-summary-card--active' : ''}`}
              onClick={() => {
                setIndiceActivo(indice);
                setEditorActivo(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <strong>{dia.dia}</strong>
              <span className="week-summary-card__meal">
                <b>🍽️</b>
                <span>Comida</span>
                <em>{formatearPlatosMenu(dia.comida)}</em>
                <small>{iconoRecetaPostre(obtenerRecetaPostre(dia, 'comida'))} {formatearPostreMenu(dia, 'comida')}</small>
              </span>
              <span className="week-summary-card__meal">
                <b>🌙</b>
                <span>Cena</span>
                <em>{formatearPlatosMenu(dia.cena)}</em>
                <small>{iconoRecetaPostre(obtenerRecetaPostre(dia, 'cena'))} {formatearPostreMenu(dia, 'cena')}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function DessertSelector({
  momento,
  seleccion,
  recetas,
  onChange,
}: {
  momento: string;
  seleccion: string;
  recetas: Receta[];
  onChange: (nombreReceta: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const nombresRecetas = new Set(recetas.map((receta) => receta.nombre));
  const esRecetaSeleccionada = nombresRecetas.has(seleccion);
  const opciones = Array.from(
    new Set([
      'Sin postre',
      ...recetas.map((receta) => receta.nombre),
    ]),
  );

  return (
    <article className="daily-dessert">
      <span className="daily-dessert__icon" aria-hidden="true">
        {iconoRecetaPostre(seleccion)}
      </span>
      <span className="daily-dessert__identity">
        <span>
          <small>{momento}</small>
          <strong>{seleccion}</strong>
        </span>
        {seleccion !== 'Sin postre' && (
          <em>{esRecetaSeleccionada ? 'Receta del recetario' : 'Selección antigua'}</em>
        )}
        <button
          type="button"
          className="daily-dessert__edit-button"
          onClick={() => setEditando((actual) => !actual)}
        >
          {editando ? '✓ Cerrar' : '✏️ Elegir postre'}
        </button>
      </span>
      {editando && (
        <div className="daily-dessert__editor daily-dessert__editor--recipes">
          <div className="dessert-recipe-options">
            {opciones.map((nombre) => (
              <button
                key={nombre}
                type="button"
                className={
                  nombre === seleccion
                    ? 'dessert-recipe-option dessert-recipe-option--active'
                    : 'dessert-recipe-option'
                }
                onClick={() => {
                  onChange(nombre);
                  setEditando(false);
                }}
              >
                <span>{iconoRecetaPostre(nombre)}</span>
                <strong>{nombre}</strong>
                <small>{nombre === 'Sin postre' ? 'No se añade a la compra' : 'Usar receta del recetario'}</small>
              </button>
            ))}
          </div>
          {recetas.length === 0 && (
            <p className="dessert-plan__message">
              Crea una receta de tipo «Postre» en Recetas para poder elegirla aquí.
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function MealPanel({
  dia,
  momento,
  titulo,
  subtitulo,
  icono,
  seleccion,
  recetas,
  editando,
  onEditar,
  onChange,
}: {
  dia: string;
  momento: MomentoMenu;
  titulo: string;
  subtitulo: string;
  icono: string;
  seleccion: string[];
  recetas: Receta[];
  editando: boolean;
  onEditar: () => void;
  onChange: (platos: string[]) => void;
}) {
  const especiales = obtenerOpcionesEspeciales();
  const nombresRecetas = useMemo(
    () => recetas.map((receta) => receta.nombre),
    [recetas],
  );
  const categorias = useMemo(
    () =>
      Array.from(
        recetas.reduce((mapa, receta) => {
          const grupo = mapa.get(receta.categoria) ?? [];
          grupo.push(receta.nombre);
          mapa.set(receta.categoria, grupo);
          return mapa;
        }, new Map<string, string[]>()),
      ).sort(([categoriaA], [categoriaB]) =>
        categoriaA.localeCompare(categoriaB, 'es'),
      ),
    [recetas],
  );
  const sugerencias = obtenerSugerenciasMenu(dia, momento, seleccion, 2);
  const complementos = seleccion[0]
    ? obtenerComplementosSugeridos(
        seleccion[0],
        momento,
        seleccion,
        nombresRecetas,
        3,
      )
    : [];
  const esEspecial = seleccion.some(esOpcionEspecial);

  const agregar = (nombre: string) => {
    if (!nombre) return;

    if (esOpcionEspecial(nombre)) {
      onChange([nombre]);
      return;
    }

    const sinEspeciales = seleccion.filter(
      (plato) => !esOpcionEspecial(plato),
    );

    if (!sinEspeciales.includes(nombre)) {
      onChange([...sinEspeciales, nombre]);
    }
  };

  return (
    <article className={`meal-panel meal-panel--${momento}`}>
      <header className="meal-panel__header">
        <div className="meal-panel__identity">
          <span className="meal-panel__icon" aria-hidden="true">{icono}</span>
          <div>
            <small>{subtitulo}</small>
            <h4>{titulo}</h4>
          </div>
        </div>
        <button
          type="button"
          className={`meal-edit-button${editando ? ' meal-edit-button--active' : ''}`}
          onClick={onEditar}
        >
          {editando ? '✓ Terminar' : '✏️ Editar'}
        </button>
      </header>

      <div className={`meal-composition meal-composition--${Math.max(1, seleccion.length)}`}>
        {seleccion.length > 0 ? (
          seleccion.map((plato, indice) => (
            <div
              key={plato}
              className={`meal-dish-card${indice === 0 ? ' meal-dish-card--primary' : ' meal-dish-card--secondary'}`}
            >
              <span>
                {indice === 0
                  ? 'Plato principal'
                  : seleccion.length === 2
                    ? 'Segundo plato o acompañamiento'
                    : `Plato ${indice + 1} o acompañamiento`}
              </span>
              <strong>{plato}</strong>
            </div>
          ))
        ) : (
          <div className="meal-dish-card meal-dish-card--empty">
            <span>Sin plato</span>
            <strong>Elige qué vais a comer</strong>
          </div>
        )}
      </div>

      {editando && (
        <div className="meal-editor-v2">
          <div className="dish-chips dish-chips--editable">
            {seleccion.length === 0 ? (
              <span className="empty-copy">Empieza añadiendo un plato</span>
            ) : (
              seleccion.map((plato, indice) => (
                <span
                  key={plato}
                  className={`dish-chip${indice === 0 ? ' dish-chip--main' : ''}`}
                >
                  <span>{indice === 0 ? '★ ' : ''}{plato}</span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(seleccion.filter((actual) => actual !== plato))
                    }
                    aria-label={`Quitar ${plato}`}
                    title={`Quitar ${plato}`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>

          <select
            value=""
            onChange={(evento) => agregar(evento.target.value)}
            className="meal-select"
            aria-label={`Añadir plato a ${titulo.toLowerCase()}`}
          >
            <option value="">＋ Añadir plato o complemento</option>
            <optgroup label="Opciones especiales">
              {especiales.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </optgroup>
            {categorias.map(([categoria, nombres]) => (
              <optgroup key={categoria} label={categoria}>
                {nombres
                  .sort((a, b) => a.localeCompare(b, 'es'))
                  .map((nombre) => (
                    <option
                      key={nombre}
                      value={nombre}
                      disabled={seleccion.includes(nombre)}
                    >
                      {nombre}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>

          {complementos.length > 0 && !esEspecial && (
            <div className="smart-complements">
              <span>✨ Complementos que encajan</span>
              <div>
                {complementos.map((complemento) => (
                  <button
                    key={complemento.plato}
                    type="button"
                    onClick={() => agregar(complemento.plato)}
                    title={complemento.explicacion}
                  >
                    + {complemento.plato}
                    <small>
                      {complemento.origen === 'aprendido'
                        ? 'aprendido'
                        : 'sugerido'}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {sugerencias.length > 0 && (
        <div className="smart-recommendation">
          <div className="smart-recommendation__icon" aria-hidden="true">🧠</div>
          <div className="smart-recommendation__copy">
            <small>SUGERENCIA PFI · CONFIANZA {sugerencias[0].confianza.toUpperCase()}</small>
            <strong>{formatearPlatosMenu(sugerencias[0].platos)}</strong>
            <span>{sugerencias[0].explicacion}</span>
          </div>
          <button
            type="button"
            onClick={() => onChange([...sugerencias[0].platos])}
          >
            Usar
          </button>
        </div>
      )}

    </article>
  );
}


function MealFeedback({
  dia,
  momento,
  titulo,
  seleccion,
}: {
  dia: string;
  momento: MomentoMenu;
  titulo: string;
  seleccion: string[];
}) {
  const esEspecial = seleccion.some(esOpcionEspecial);
  const valoracion = obtenerValoracionComida(dia, momento, seleccion);
  const ajustes = seleccion
    .map((plato) => obtenerFactorReceta(plato))
    .filter((ajuste) => ajuste !== null);

  if (esEspecial || seleccion.length === 0) return null;

  const valorar = (resultado: ResultadoComida) => {
    registrarResultadoComida(dia, momento, seleccion, resultado);
  };

  return (
    <div className="meal-feedback-v2 meal-feedback-v2--after-dessert">
      <div className="meal-feedback-v2__heading">
        <div>
          <strong>¿Cómo salió la {titulo.toLocaleLowerCase('es')}?</strong>
          <span>PFI usa esta respuesta para aprender</span>
        </div>
        {valoracion && (
          <span className={`feedback-saved feedback-saved--${valoracion.resultado}`}>
            ✓ {describirValoracion(valoracion.resultado)}
          </span>
        )}
      </div>
      <div className="feedback-buttons">
        <FeedbackButton
          resultado="gusto"
          icono="❤️"
          texto="Gustó"
          activo={valoracion?.resultado === 'gusto'}
          onClick={valorar}
        />
        <FeedbackButton
          resultado="sobro"
          icono="🍽️"
          texto="Sobró"
          activo={valoracion?.resultado === 'sobro'}
          onClick={valorar}
        />
        <FeedbackButton
          resultado="falto"
          icono="➕"
          texto="Faltó"
          activo={valoracion?.resultado === 'falto'}
          onClick={valorar}
        />
        <FeedbackButton
          resultado="no_gusto"
          icono="👎"
          texto="No gustó"
          activo={valoracion?.resultado === 'no_gusto'}
          onClick={valorar}
        />
      </div>
      {ajustes.length > 0 && (
        <p className="portion-learning-note">
          📏 PFI ajustará las cantidades automáticas de{' '}
          {ajustes.map((ajuste) => ajuste.receta).join(', ')} según lo que haya
          sobrado o faltado.
        </p>
      )}
    </div>
  );
}

function FeedbackButton({
  resultado,
  icono,
  texto,
  activo,
  onClick,
}: {
  resultado: ResultadoComida;
  icono: string;
  texto: string;
  activo: boolean;
  onClick: (resultado: ResultadoComida) => void;
}) {
  return (
    <button
      type="button"
      className={`feedback-button feedback-button--${resultado}${activo ? ' feedback-button--active' : ''}`}
      onClick={() => onClick(resultado)}
      aria-pressed={activo}
    >
      <span aria-hidden="true">{icono}</span>
      {texto}
    </button>
  );
}

export default Menu;
