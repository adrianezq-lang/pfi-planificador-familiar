import { useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Title from '../components/ui/Title';
import {
  calcularComensalesMomento,
  calcularRacionesEquivalentes,
  calcularRacionesMomento,
  cargarPerfil,
  describirFamilia,
  guardarPerfil,
  type ConfiguracionComensales,
  type PerfilFamiliar,
  type PlanComensales,
} from '../services/perfil';
import { recalcularRecetasParaPerfil } from '../services/recetas';
import {
  obtenerResumenAprendizaje,
  reiniciarAprendizaje,
} from '../services/aprendizaje';

const SERVICIOS_COMENSALES: Array<{
  clave: keyof PlanComensales;
  titulo: string;
  detalle: string;
  momento: 'comida' | 'cena';
  dia: string;
}> = [
  {
    clave: 'comidaLaborable',
    titulo: '🍽️ Comida de lunes a viernes',
    detalle: 'Para descontar comedor escolar o días de trabajo.',
    momento: 'comida',
    dia: 'Lunes',
  },
  {
    clave: 'comidaFinSemana',
    titulo: '☀️ Comida de fin de semana',
    detalle: 'Sábados y domingos que comáis en casa.',
    momento: 'comida',
    dia: 'Sábado',
  },
  {
    clave: 'cena',
    titulo: '🌙 Cenas',
    detalle: 'Se aplica todos los días de la semana.',
    momento: 'cena',
    dia: 'Lunes',
  },
];

function transformarPlanComensales(
  plan: PlanComensales,
  transformar: (
    configuracion: ConfiguracionComensales,
    clave: keyof PlanComensales,
  ) => ConfiguracionComensales,
): PlanComensales {
  return {
    comidaLaborable: transformar(plan.comidaLaborable, 'comidaLaborable'),
    comidaFinSemana: transformar(plan.comidaFinSemana, 'comidaFinSemana'),
    cena: transformar(plan.cena, 'cena'),
  };
}

function Perfil() {
  const [perfil, setPerfil] =
    useState<PerfilFamiliar>(cargarPerfil);
  const [guardado, setGuardado] = useState(false);
  const [resumenAprendizaje, setResumenAprendizaje] = useState(
    obtenerResumenAprendizaje,
  );
  const [mensajeAprendizaje, setMensajeAprendizaje] = useState('');

  const raciones = useMemo(
    () => calcularRacionesEquivalentes(perfil),
    [perfil],
  );

  const resumenServicios = useMemo(
    () => SERVICIOS_COMENSALES.map((servicio) => ({
      ...servicio,
      comensales: calcularComensalesMomento(
        perfil,
        servicio.momento,
        servicio.dia,
      ),
      raciones: calcularRacionesMomento(
        perfil,
        servicio.momento,
        servicio.dia,
      ),
    })),
    [perfil],
  );

  const actualizarCampo = <K extends keyof PerfilFamiliar>(
    campo: K,
    valor: PerfilFamiliar[K],
  ) => {
    setPerfil((perfilActual) => ({
      ...perfilActual,
      [campo]: valor,
    }));
    setGuardado(false);
  };

  const actualizarNumeroNinos = (cantidad: number) => {
    const ninos = Math.max(0, Math.round(cantidad));
    const edadesNinos = Array.from(
      { length: ninos },
      (_, indice) => perfil.edadesNinos[indice] ?? 8,
    );

    setPerfil((actual) => ({
      ...actual,
      ninos,
      edadesNinos,
      comensales: transformarPlanComensales(
        actual.comensales,
        (configuracion, clave) => ({
          ...configuracion,
          ninos: Array.from(
            { length: ninos },
            (_, indice) =>
              configuracion.ninos[indice] ?? clave !== 'comidaLaborable',
          ),
        }),
      ),
    }));
    setGuardado(false);
  };

  const actualizarNumeroAdultos = (cantidad: number) => {
    const adultos = Math.max(1, Math.round(cantidad));
    setPerfil((actual) => ({
      ...actual,
      adultos,
      comensales: transformarPlanComensales(
        actual.comensales,
        (configuracion) => ({
          ...configuracion,
          adultos: Math.min(configuracion.adultos, adultos),
        }),
      ),
    }));
    setGuardado(false);
  };

  const actualizarNumeroBebes = (cantidad: number) => {
    const bebes = Math.max(0, Math.round(cantidad));
    setPerfil((actual) => ({
      ...actual,
      bebes,
      comensales: transformarPlanComensales(
        actual.comensales,
        (configuracion) => ({
          ...configuracion,
          bebes: Math.min(configuracion.bebes, bebes),
        }),
      ),
    }));
    setGuardado(false);
  };

  const actualizarBebesEnMenu = (incluidos: boolean) => {
    setPerfil((actual) => ({
      ...actual,
      bebesComenMenu: incluidos,
      comensales: incluidos
        ? actual.comensales
        : transformarPlanComensales(
            actual.comensales,
            (configuracion) => ({ ...configuracion, bebes: 0 }),
          ),
    }));
    setGuardado(false);
  };

  const actualizarConfiguracionComensales = (
    clave: keyof PlanComensales,
    cambios: Partial<ConfiguracionComensales>,
  ) => {
    setPerfil((actual) => ({
      ...actual,
      comensales: {
        ...actual.comensales,
        [clave]: {
          ...actual.comensales[clave],
          ...cambios,
        },
      },
    }));
    setGuardado(false);
  };

  const cambiarNinoEnServicio = (
    clave: keyof PlanComensales,
    indice: number,
    incluido: boolean,
  ) => {
    const seleccion = perfil.comensales[clave].ninos.map(
      (valor, posicion) => posicion === indice ? incluido : valor,
    );
    actualizarConfiguracionComensales(clave, { ninos: seleccion });
  };

  const actualizarEdadNino = (indice: number, edad: number) => {
    setPerfil((actual) => ({
      ...actual,
      edadesNinos: actual.edadesNinos.map((valor, posicion) =>
        posicion === indice
          ? Math.max(1, Math.round(edad))
          : valor,
      ),
    }));
    setGuardado(false);
  };

  const guardar = () => {
    const normalizado = guardarPerfil(perfil);
    setPerfil(normalizado);
    recalcularRecetasParaPerfil(normalizado);
    setGuardado(true);
  };

  const borrarAprendizaje = () => {
    const confirmado = window.confirm(
      'Se borrarán las combinaciones y ajustes aprendidos. Tus menús, recetas y despensa no cambiarán. ¿Continuar?',
    );

    if (!confirmado) return;

    reiniciarAprendizaje();
    setResumenAprendizaje(obtenerResumenAprendizaje());
    setMensajeAprendizaje('Aprendizaje reiniciado.');
  };

  return (
    <main className="page legacy-page" style={estiloPagina}>
      <Card className="page-hero-card">
        <Title style={{ color: '#4f6f52' }}>
          👤 Perfil familiar
        </Title>
        <p style={estiloIntroduccion}>
          Estos datos ajustan automáticamente las raciones principales de
          las recetas y las cantidades de Compra.
        </p>
      </Card>

      <Card>
        <div style={estiloCuadricula}>
          <label style={estiloEtiqueta}>
            Nombre
            <input
              type="text"
              value={perfil.nombre}
              onChange={(evento) =>
                actualizarCampo('nombre', evento.target.value)
              }
              style={estiloInput}
            />
          </label>

          <label style={estiloEtiqueta}>
            Supermercado
            <input
              type="text"
              value={perfil.supermercado}
              onChange={(evento) =>
                actualizarCampo('supermercado', evento.target.value)
              }
              style={estiloInput}
            />
          </label>

          <label style={estiloEtiqueta}>
            Adultos
            <input
              type="number"
              min="1"
              value={perfil.adultos}
              onChange={(evento) =>
                actualizarNumeroAdultos(Number(evento.target.value))
              }
              style={estiloInput}
            />
          </label>

          <label style={estiloEtiqueta}>
            Niños
            <input
              type="number"
              min="0"
              value={perfil.ninos}
              onChange={(evento) =>
                actualizarNumeroNinos(Number(evento.target.value))
              }
              style={estiloInput}
            />
          </label>

          <label style={estiloEtiqueta}>
            Bebés
            <input
              type="number"
              min="0"
              value={perfil.bebes}
              onChange={(evento) =>
                actualizarNumeroBebes(Number(evento.target.value))
              }
              style={estiloInput}
            />
          </label>

          <label style={estiloEtiqueta}>
            Presupuesto mensual
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                min="0"
                value={perfil.presupuesto}
                onChange={(evento) =>
                  actualizarCampo(
                    'presupuesto',
                    Math.max(0, Number(evento.target.value)),
                  )
                }
                style={{ ...estiloInput, paddingRight: '42px' }}
              />
              <span style={estiloEuro}>€</span>
            </div>
          </label>
        </div>

        {perfil.ninos > 0 && (
          <div style={estiloBloqueEdades}>
            <strong style={{ color: '#4f6f52' }}>
              Edades de los niños
            </strong>
            <div style={estiloCuadriculaEdades}>
              {perfil.edadesNinos.map((edad, indice) => (
                <label key={indice} style={estiloEtiqueta}>
                  Niño {indice + 1}
                  <input
                    type="number"
                    min="1"
                    max="17"
                    value={edad}
                    onChange={(evento) =>
                      actualizarEdadNino(
                        indice,
                        Number(evento.target.value),
                      )
                    }
                    style={estiloInput}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {perfil.bebes > 0 && (
          <label style={estiloInterruptor}>
            <input
              type="checkbox"
              checked={perfil.bebesComenMenu}
              onChange={(evento) =>
                actualizarBebesEnMenu(evento.target.checked)
              }
            />
            Incluir al bebé en las cantidades del menú
          </label>
        )}

        <div style={estiloBloqueComensales}>
          <div>
            <strong style={estiloTituloComensales}>
              Comensales que comen en casa
            </strong>
            <p style={estiloTextoComensales}>
              La compra usará estas personas para calcular cada comida y cada cena.
            </p>
          </div>

          <div style={estiloCuadriculaComensales}>
            {resumenServicios.map((servicio) => {
              const configuracion = perfil.comensales[servicio.clave];

              return (
                <section key={servicio.clave} style={estiloTarjetaComensales}>
                  <strong style={estiloNombreServicio}>{servicio.titulo}</strong>
                  <small style={estiloDetalleServicio}>{servicio.detalle}</small>
                  <span style={estiloResumenServicio}>
                    {servicio.comensales} comensal{servicio.comensales === 1 ? '' : 'es'} ·{' '}
                    {servicio.raciones.toLocaleString('es-ES')} raciones equivalentes
                  </span>

                  <label style={estiloEtiquetaCompacta}>
                    Adultos
                    <input
                      type="number"
                      min="0"
                      max={perfil.adultos}
                      value={configuracion.adultos}
                      onChange={(evento) =>
                        actualizarConfiguracionComensales(servicio.clave, {
                          adultos: Math.max(
                            0,
                            Math.min(
                              perfil.adultos,
                              Math.round(Number(evento.target.value)),
                            ),
                          ),
                        })
                      }
                      style={estiloInputCompacto}
                    />
                  </label>

                  {perfil.edadesNinos.map((edad, indice) => (
                    <label
                      key={`${servicio.clave}-nino-${indice}`}
                      style={estiloOpcionComensal}
                    >
                      <input
                        type="checkbox"
                        checked={configuracion.ninos[indice] === true}
                        onChange={(evento) =>
                          cambiarNinoEnServicio(
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
                    <label style={estiloEtiquetaCompacta}>
                      Bebés que comen este menú
                      <input
                        type="number"
                        min="0"
                        max={perfil.bebes}
                        value={configuracion.bebes}
                        onChange={(evento) =>
                          actualizarConfiguracionComensales(servicio.clave, {
                            bebes: Math.max(
                              0,
                              Math.min(
                                perfil.bebes,
                                Math.round(Number(evento.target.value)),
                              ),
                            ),
                          })
                        }
                        style={estiloInputCompacto}
                      />
                    </label>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        <div style={estiloResumenRaciones}>
          <strong>
            Familia completa: {raciones.toLocaleString('es-ES')} raciones adultas equivalentes
          </strong>
          <span>{describirFamilia(perfil)}</span>
          <small>
            Es una estimación inicial. Las cantidades pueden editarse a mano
            en cada receta y se irán afinando con el uso.
          </small>
        </div>

        <button type="button" onClick={guardar} style={estiloBotonGuardar}>
          Guardar perfil y actualizar cantidades
        </button>

        {guardado && (
          <p style={estiloMensajeGuardado}>
            Perfil guardado. Menú y compra usarán estos comensales.
          </p>
        )}
      </Card>

      <Card>
        <Title style={{ color: '#4f6f52', fontSize: '22px' }}>
          🧠 Aprendizaje inteligente
        </Title>
        <p style={estiloIntroduccion}>
          PFI aprende de las combinaciones que eliges, de si gustaron y de
          si sobró o faltó comida. También afina las cantidades que corriges
          manualmente en Recetas. Todo se guarda solo en este navegador.
        </p>

        <div style={estiloCuadriculaAprendizaje}>
          <div style={estiloDatoAprendizaje}>
            <strong>{resumenAprendizaje.eleccionesMenu}</strong>
            <span>elecciones observadas</span>
          </div>
          <div style={estiloDatoAprendizaje}>
            <strong>{resumenAprendizaje.combinacionesMenu}</strong>
            <span>combinaciones conocidas</span>
          </div>
          <div style={estiloDatoAprendizaje}>
            <strong>{resumenAprendizaje.valoraciones}</strong>
            <span>resultados valorados</span>
          </div>
          <div style={estiloDatoAprendizaje}>
            <strong>
              {resumenAprendizaje.ajustesPorciones +
                resumenAprendizaje.ajustesRecetas}
            </strong>
            <span>cantidades afinadas</span>
          </div>
        </div>

        <button
          type="button"
          onClick={borrarAprendizaje}
          style={estiloBotonReiniciar}
        >
          Reiniciar aprendizaje
        </button>
        {mensajeAprendizaje && (
          <p style={estiloMensajeGuardado}>{mensajeAprendizaje}</p>
        )}
      </Card>

    </main>
  );
}

const estiloPagina = {
  maxWidth: '900px',
  margin: '0 auto',
  padding: '20px 20px 110px',
};

const estiloIntroduccion = {
  marginBottom: 0,
  color: '#667067',
};

const estiloCuadricula = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
};

const estiloEtiqueta = {
  display: 'grid',
  gap: '7px',
  color: '#4f6f52',
  fontWeight: 700,
};

const estiloInput = {
  width: '100%',
  boxSizing: 'border-box' as const,
  border: '1px solid #d7dfd4',
  borderRadius: '12px',
  padding: '12px',
  background: '#f8f6f2',
  color: '#263229',
  fontSize: '16px',
};

const estiloEuro = {
  position: 'absolute' as const,
  top: '50%',
  right: '14px',
  transform: 'translateY(-50%)',
  color: '#667067',
  fontWeight: 700,
};

const estiloBloqueEdades = {
  marginTop: '18px',
  padding: '15px',
  borderRadius: '14px',
  background: '#f8f6f2',
};

const estiloCuadriculaEdades = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: '12px',
  marginTop: '12px',
};

const estiloInterruptor = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginTop: '18px',
  color: '#4f6f52',
  fontWeight: 700,
};

const estiloBloqueComensales = {
  display: 'grid',
  gap: '14px',
  marginTop: '20px',
  padding: '16px',
  border: '1px solid #d7dfd4',
  borderRadius: '16px',
  background: '#f8f6f2',
};

const estiloTituloComensales = {
  display: 'block',
  color: '#4f6f52',
  fontSize: '18px',
};

const estiloTextoComensales = {
  margin: '5px 0 0',
  color: '#667067',
  fontSize: '14px',
};

const estiloCuadriculaComensales = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '12px',
};

const estiloTarjetaComensales = {
  display: 'grid',
  alignContent: 'start',
  gap: '10px',
  padding: '14px',
  border: '1px solid #dce4d9',
  borderRadius: '14px',
  background: '#fff',
};

const estiloNombreServicio = {
  color: '#334c36',
};

const estiloDetalleServicio = {
  minHeight: '34px',
  color: '#737b74',
  lineHeight: 1.35,
};

const estiloResumenServicio = {
  padding: '8px 10px',
  borderRadius: '10px',
  background: '#eef5ed',
  color: '#4f6f52',
  fontSize: '13px',
  fontWeight: 800,
};

const estiloEtiquetaCompacta = {
  display: 'grid',
  gridTemplateColumns: '1fr 72px',
  gap: '10px',
  alignItems: 'center',
  color: '#4f6f52',
  fontSize: '14px',
  fontWeight: 700,
};

const estiloInputCompacto = {
  width: '100%',
  boxSizing: 'border-box' as const,
  border: '1px solid #d7dfd4',
  borderRadius: '10px',
  padding: '9px',
  background: '#f8f6f2',
  color: '#263229',
  fontSize: '16px',
};

const estiloOpcionComensal = {
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
  color: '#4f6f52',
  fontSize: '14px',
  fontWeight: 700,
};

const estiloResumenRaciones = {
  display: 'grid',
  gap: '5px',
  marginTop: '18px',
  padding: '15px',
  border: '1px solid #cddbc9',
  borderRadius: '14px',
  background: '#eef5ed',
  color: '#4f6f52',
};

const estiloBotonGuardar = {
  width: '100%',
  marginTop: '20px',
  border: 0,
  borderRadius: '14px',
  padding: '14px',
  background: '#4f6f52',
  color: 'white',
  fontSize: '16px',
  fontWeight: 800,
  cursor: 'pointer',
};

const estiloMensajeGuardado = {
  marginBottom: 0,
  color: '#4f6f52',
  textAlign: 'center' as const,
  fontWeight: 700,
};


const estiloCuadriculaAprendizaje = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '10px',
  marginTop: '16px',
};

const estiloDatoAprendizaje = {
  display: 'grid',
  gap: '3px',
  padding: '14px',
  borderRadius: '14px',
  background: '#eef5ed',
  color: '#4f6f52',
};

const estiloBotonReiniciar = {
  marginTop: '15px',
  border: '1px solid #d7dfd4',
  borderRadius: '12px',
  padding: '10px 13px',
  background: '#fff',
  color: '#667067',
  fontWeight: 800,
  cursor: 'pointer',
};

export default Perfil;
