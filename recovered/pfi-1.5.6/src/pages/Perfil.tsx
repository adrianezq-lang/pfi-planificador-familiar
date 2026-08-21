import { useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Title from '../components/ui/Title';
import {
  calcularRacionesEquivalentes,
  cargarPerfil,
  describirFamilia,
  guardarPerfil,
  type PerfilFamiliar,
} from '../services/perfil';
import { recalcularRecetasParaPerfil } from '../services/recetas';
import {
  obtenerResumenAprendizaje,
  reiniciarAprendizaje,
} from '../services/aprendizaje';

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
    }));
    setGuardado(false);
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
                actualizarCampo(
                  'adultos',
                  Math.max(1, Number(evento.target.value)),
                )
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
                actualizarCampo(
                  'bebes',
                  Math.max(0, Number(evento.target.value)),
                )
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
                actualizarCampo(
                  'bebesComenMenu',
                  evento.target.checked,
                )
              }
            />
            Incluir al bebé en las cantidades del menú
          </label>
        )}

        <div style={estiloResumenRaciones}>
          <strong>{raciones.toLocaleString('es-ES')} raciones adultas equivalentes</strong>
          <span>{describirFamilia(perfil)}</span>
          <small>
            Es una estimación inicial. Las cantidades pueden editarse a mano
            en cada receta y se irán afinando con el uso.
          </small>
        </div>

        <button type="button" onClick={guardar} style={estiloBotonGuardar}>
          Guardar perfil y recalcular recetas
        </button>

        {guardado && (
          <p style={estiloMensajeGuardado}>
            Perfil guardado y cantidades automáticas actualizadas.
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
