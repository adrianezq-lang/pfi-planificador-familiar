import { useEffect, useMemo, useState } from 'react';
import type {
  ConfiguracionComensales,
  PerfilFamiliar,
  PlanComensales,
} from '../services/perfil';
import { crearCopiaAutomaticaSiNecesaria } from '../services/copiasSeguridad';
import {
  cargarProgramacionComensales,
  clonarPlanComensales,
  eliminarCambioComensalesProgramado,
  programarCambioComensales,
  type CambioComensalesProgramado,
} from '../services/programacionComensales';

type Props = {
  perfil: PerfilFamiliar;
};

const SERVICIOS: Array<{
  clave: keyof PlanComensales;
  titulo: string;
}> = [
  { clave: 'comidaLaborable', titulo: '🍽️ Comidas de lunes a viernes' },
  { clave: 'comidaFinSemana', titulo: '☀️ Comidas de fin de semana' },
  { clave: 'cena', titulo: '🌙 Cenas' },
];

function numeroComensales(configuracion: ConfiguracionComensales): number {
  return (
    configuracion.adultos +
    configuracion.ninos.filter(Boolean).length +
    configuracion.bebes
  );
}

function resumenPlan(plan: PlanComensales): string {
  return SERVICIOS.map(({ clave, titulo }) =>
    `${titulo.replace(/^\S+\s*/, '')}: ${numeroComensales(plan[clave])}`,
  ).join(' · ');
}

export default function ProgramacionComensalesPanel({ perfil }: Props) {
  const [cambios, setCambios] = useState<CambioComensalesProgramado[]>(
    () => cargarProgramacionComensales(perfil),
  );
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [plan, setPlan] = useState<PlanComensales>(
    () => clonarPlanComensales(perfil.comensales),
  );
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    setCambios(cargarProgramacionComensales(perfil));
    setPlan(clonarPlanComensales(perfil.comensales));
  }, [
    perfil.adultos,
    perfil.ninos,
    perfil.bebes,
    perfil.bebesComenMenu,
    perfil.comensales,
  ]);

  const totalProgramados = useMemo(() => cambios.length, [cambios]);

  const actualizarServicio = (
    clave: keyof PlanComensales,
    cambiosServicio: Partial<ConfiguracionComensales>,
  ) => {
    setPlan((actual) => ({
      ...actual,
      [clave]: {
        ...actual[clave],
        ...cambiosServicio,
      },
    }));
    setMensaje('');
  };

  const cambiarNino = (
    clave: keyof PlanComensales,
    indice: number,
    incluido: boolean,
  ) => {
    const ninos = Array.from(
      { length: perfil.ninos },
      (_, posicion) =>
        posicion === indice
          ? incluido
          : plan[clave].ninos[posicion] === true,
    );
    actualizarServicio(clave, { ninos });
  };

  const programar = () => {
    try {
      crearCopiaAutomaticaSiNecesaria(
        'antes de programar un cambio futuro de comensales',
      );
      const siguientes = programarCambioComensales(
        {
          desde,
          hasta: hasta || undefined,
          etiqueta,
          comensales: plan,
        },
        perfil,
      );
      setCambios(siguientes);
      setDesde('');
      setHasta('');
      setEtiqueta('');
      setPlan(clonarPlanComensales(perfil.comensales));
      setMensaje(
        'Cambio programado. Menú, compra y presupuesto usarán esos comensales cuando llegue la fecha.',
      );
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : 'No se ha podido programar el cambio.',
      );
    }
  };

  const eliminar = (id: string) => {
    crearCopiaAutomaticaSiNecesaria(
      'antes de eliminar un cambio futuro de comensales',
    );
    setCambios(eliminarCambioComensalesProgramado(id, perfil));
    setMensaje('Cambio programado eliminado.');
  };

  return (
    <section className="profile-scheduled-diners">
      <div className="profile-section-heading">
        <div>
          <span>CAMBIOS FUTUROS</span>
          <strong>Programar comensales por fecha</strong>
        </div>
        <small>
          {totalProgramados === 0
            ? 'Sin cambios programados'
            : `${totalProgramados} cambio${totalProgramados === 1 ? '' : 's'} activo${totalProgramados === 1 ? '' : 's'}`}
        </small>
      </div>

      <p className="profile-scheduled-diners__copy">
        Configura quién comerá en casa a partir de una fecha. Las excepciones
        puntuales de un día siempre prevalecen sobre esta programación.
      </p>

      <div className="profile-scheduled-diners__dates">
        <label>
          <span>Desde</span>
          <input
            type="date"
            value={desde}
            onChange={(evento) => setDesde(evento.target.value)}
          />
        </label>
        <label>
          <span>Hasta <small>(opcional)</small></span>
          <input
            type="date"
            value={hasta}
            onChange={(evento) => setHasta(evento.target.value)}
          />
        </label>
        <label>
          <span>Nombre <small>(opcional)</small></span>
          <input
            type="text"
            value={etiqueta}
            onChange={(evento) => setEtiqueta(evento.target.value)}
            placeholder="Ej. Desde diciembre"
          />
        </label>
      </div>

      <div className="profile-scheduled-diners__services">
        {SERVICIOS.map((servicio) => {
          const configuracion = plan[servicio.clave];
          return (
            <article key={servicio.clave}>
              <header>
                <strong>{servicio.titulo}</strong>
                <small>
                  {numeroComensales(configuracion)} comensal
                  {numeroComensales(configuracion) === 1 ? '' : 'es'}
                </small>
              </header>

              <label>
                <span>Adultos</span>
                <input
                  type="number"
                  min="0"
                  max={perfil.adultos}
                  value={configuracion.adultos}
                  onChange={(evento) =>
                    actualizarServicio(servicio.clave, {
                      adultos: Math.max(
                        0,
                        Math.min(
                          perfil.adultos,
                          Math.round(Number(evento.target.value) || 0),
                        ),
                      ),
                    })
                  }
                />
              </label>

              {perfil.edadesNinos.map((edad, indice) => (
                <label
                  key={`${servicio.clave}-programado-nino-${indice}`}
                  className="profile-scheduled-diners__check"
                >
                  <input
                    type="checkbox"
                    checked={configuracion.ninos[indice] === true}
                    onChange={(evento) =>
                      cambiarNino(
                        servicio.clave,
                        indice,
                        evento.target.checked,
                      )
                    }
                  />
                  Niño de {edad} años
                </label>
              ))}

              {perfil.bebesComenMenu && perfil.bebes > 0 && (
                <label>
                  <span>Bebés</span>
                  <input
                    type="number"
                    min="0"
                    max={perfil.bebes}
                    value={configuracion.bebes}
                    onChange={(evento) =>
                      actualizarServicio(servicio.clave, {
                        bebes: Math.max(
                          0,
                          Math.min(
                            perfil.bebes,
                            Math.round(Number(evento.target.value) || 0),
                          ),
                        ),
                      })
                    }
                  />
                </label>
              )}
            </article>
          );
        })}
      </div>

      <button
        type="button"
        className="profile-scheduled-diners__save"
        onClick={programar}
        disabled={!desde}
      >
        Programar cambio
      </button>

      {mensaje && (
        <p className="profile-scheduled-diners__message" role="status">
          {mensaje}
        </p>
      )}

      {cambios.length > 0 && (
        <div className="profile-scheduled-diners__list">
          <strong>Cambios programados</strong>
          {cambios.map((cambio) => (
            <article key={cambio.id}>
              <div>
                <strong>{cambio.etiqueta}</strong>
                <span>
                  Desde {new Date(`${cambio.desde}T12:00:00`).toLocaleDateString('es-ES')}
                  {cambio.hasta
                    ? ` hasta ${new Date(`${cambio.hasta}T12:00:00`).toLocaleDateString('es-ES')}`
                    : ' en adelante'}
                </span>
                <small>{resumenPlan(cambio.comensales)}</small>
              </div>
              <button type="button" onClick={() => eliminar(cambio.id)}>
                Eliminar
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
