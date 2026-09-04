import { useCallback, useEffect, useState } from 'react';
import {
  analizarCopiaCompleta,
  aplicarCopiaCompleta,
  crearCopiaAutomaticaSiNecesaria,
  descargarCopiaCompleta,
  EVENTO_COPIAS_SEGURIDAD,
  obtenerCopiasAutomaticas,
  obtenerEstadoSaludDatos,
  restaurarCopiaAutomatica,
  type CopiaAutomaticaResumen,
  type CopiaSeguridadPFI,
  type EstadoSaludDatos,
} from '../services/copiasSeguridad';
import RescateAsociaciones from './RescateAsociaciones';
import Card from './ui/Card';
import Title from './ui/Title';

type CopiaPendiente = {
  nombre: string;
  copia: CopiaSeguridadPFI;
};

function formatearFecha(fecha: string | null): string {
  if (!fecha) return 'Pendiente';
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return 'Fecha desconocida';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(valor);
}

export default function CentroDatosCopias() {
  const [estado, setEstado] = useState<EstadoSaludDatos>(obtenerEstadoSaludDatos);
  const [copias, setCopias] = useState<CopiaAutomaticaResumen[]>(obtenerCopiasAutomaticas);
  const [pendiente, setPendiente] = useState<CopiaPendiente | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const actualizar = useCallback(() => {
    setEstado(obtenerEstadoSaludDatos());
    setCopias(obtenerCopiasAutomaticas());
  }, []);

  useEffect(() => {
    crearCopiaAutomaticaSiNecesaria('apertura de Datos y copias');
    actualizar();
    window.addEventListener(EVENTO_COPIAS_SEGURIDAD, actualizar);
    return () => window.removeEventListener(EVENTO_COPIAS_SEGURIDAD, actualizar);
  }, [actualizar]);

  const descargar = () => {
    setError('');
    setMensaje('');
    try {
      descargarCopiaCompleta();
      setMensaje('Copia completa guardada. Consérvala para cambiar de móvil o recuperar PFI.');
      actualizar();
    } catch (errorDesconocido) {
      setError(errorDesconocido instanceof Error
        ? errorDesconocido.message
        : 'No se ha podido crear la copia.');
    }
  };

  const revisarArchivo = async (archivo: File | undefined) => {
    if (!archivo) return;
    setError('');
    setMensaje('');
    setPendiente(null);

    try {
      const copia = analizarCopiaCompleta(await archivo.text());
      setPendiente({ nombre: archivo.name, copia });
    } catch (errorDesconocido) {
      setError(errorDesconocido instanceof Error
        ? errorDesconocido.message
        : 'No se ha podido revisar esa copia.');
    }
  };

  const aplicarPendiente = () => {
    if (!pendiente) return;
    const { resumen } = pendiente.copia;
    const confirmado = window.confirm(
      `Se restaurarán ${resumen.recetas} recetas, ${resumen.asociaciones} asociaciones y ${resumen.semanasMenu} semanas. Antes se guardará una copia automática del estado actual. ¿Continuar?`,
    );
    if (!confirmado) return;

    setError('');
    try {
      aplicarCopiaCompleta(pendiente.copia);
      setPendiente(null);
      setMensaje('Copia restaurada correctamente. PFI se recargará para aplicar todos los datos.');
      actualizar();
      window.setTimeout(() => window.location.reload(), 900);
    } catch (errorDesconocido) {
      setError(errorDesconocido instanceof Error
        ? errorDesconocido.message
        : 'No se ha podido restaurar la copia.');
    }
  };

  const restaurarAutomatica = (copia: CopiaAutomaticaResumen) => {
    const confirmado = window.confirm(
      `Vas a volver al estado del ${formatearFecha(copia.creadaEn)}. Antes se protegerá el estado actual. ¿Continuar?`,
    );
    if (!confirmado) return;

    setError('');
    setMensaje('');
    try {
      restaurarCopiaAutomatica(copia.id);
      setMensaje('Copia automática restaurada. PFI se recargará ahora.');
      actualizar();
      window.setTimeout(() => window.location.reload(), 900);
    } catch (errorDesconocido) {
      setError(errorDesconocido instanceof Error
        ? errorDesconocido.message
        : 'No se ha podido restaurar la copia automática.');
    }
  };

  return (
    <Card className="data-center">
      <div className="data-center__heading">
        <div>
          <Title style={{ color: '#4f6f52', fontSize: '22px' }}>
            💾 Datos y copias
          </Title>
          <p className="data-center__intro">
            PFI protege automáticamente este móvil. La copia completa sirve además
            para cambiar de dispositivo sin perder el menú, las recetas ni la despensa.
          </p>
        </div>
        <span className={`data-health data-health--${estado.nivel}`}>
          <span aria-hidden="true">{estado.nivel === 'correcto' ? '✓' : '!'}</span>
          {estado.titulo}
        </span>
      </div>

      <p className="data-center__health-detail">{estado.detalle}</p>

      <div className="data-center__stats" aria-label="Resumen de los datos guardados">
        <div><strong>{estado.resumen.recetas}</strong><span>recetas</span></div>
        <div><strong>{estado.resumen.asociaciones}</strong><span>asociaciones</span></div>
        <div><strong>{estado.resumen.productosDespensa}</strong><span>en despensa</span></div>
        <div><strong>{estado.resumen.semanasMenu}</strong><span>semanas</span></div>
      </div>

      <div className="data-center__backup-status">
        <div>
          <span>Copias automáticas en este móvil</span>
          <strong>{estado.copiasAutomaticas}</strong>
        </div>
        <div>
          <span>Última protección</span>
          <strong>{formatearFecha(estado.ultimaCopia)}</strong>
        </div>
      </div>

      {estado.avisos.length > 0 && (
        <ul className="data-center__warnings">
          {estado.avisos.map((aviso) => <li key={aviso}>{aviso}</li>)}
        </ul>
      )}

      <div className="data-center__actions">
        <button type="button" className="data-action data-action--primary" onClick={descargar}>
          ⬇️ Descargar copia completa
        </button>
        <label className="data-action data-action--secondary">
          📂 Revisar una copia para restaurar
          <input
            type="file"
            accept="application/json,.json"
            aria-label="Revisar copia completa JSON"
            onChange={(evento) => {
              void revisarArchivo(evento.target.files?.[0]);
              evento.currentTarget.value = '';
            }}
          />
        </label>
      </div>

      {pendiente && (
        <section className="backup-preview" aria-live="polite">
          <div>
            <strong>Lista para restaurar</strong>
            <span>{pendiente.nombre}</span>
            <small>
              Creada el {formatearFecha(pendiente.copia.creadaEn)} · PFI {pendiente.copia.versionApp}
            </small>
          </div>
          <div className="backup-preview__summary">
            <span>{pendiente.copia.resumen.recetas} recetas</span>
            <span>{pendiente.copia.resumen.asociaciones} asociaciones</span>
            <span>{pendiente.copia.resumen.productosDespensa} productos de despensa</span>
            <span>{pendiente.copia.resumen.semanasMenu} semanas</span>
          </div>
          <div className="backup-preview__buttons">
            <button type="button" onClick={aplicarPendiente}>Restaurar esta copia</button>
            <button type="button" onClick={() => setPendiente(null)}>Cancelar</button>
          </div>
        </section>
      )}

      {copias.length > 0 && (
        <details className="automatic-backups">
          <summary>Ver copias automáticas anteriores</summary>
          <div className="automatic-backups__list">
            {copias.slice(0, 5).map((copia) => (
              <div key={copia.id} className="automatic-backup">
                <div>
                  <strong>{formatearFecha(copia.creadaEn)}</strong>
                  <span>{copia.motivo}</span>
                  <small>
                    {copia.resumen.recetas} recetas · {copia.resumen.asociaciones} asociaciones
                  </small>
                </div>
                <button type="button" onClick={() => restaurarAutomatica(copia)}>
                  Restaurar
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {mensaje && <p className="data-message data-message--ok" aria-live="polite">{mensaje}</p>}
      {error && <p className="data-message data-message--error" role="alert">{error}</p>}

      <RescateAsociaciones integrado />
    </Card>
  );
}
