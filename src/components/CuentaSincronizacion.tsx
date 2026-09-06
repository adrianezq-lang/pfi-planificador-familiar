import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Card from './ui/Card';
import Title from './ui/Title';
import { cargarPerfil } from '../services/perfil';
import { recopilarDatosPFI } from '../services/copiasSeguridad';
import {
  cargarFamiliaCuenta,
  cerrarSesion,
  crearFamilia,
  enviarRecuperacionPassword,
  guardarEsteMovilEnNube,
  guardarPasswordNuevo,
  iniciarSesion,
  observarSesion,
  obtenerCodigoFamilia,
  obtenerUsuarioActual,
  registrarCuenta,
  traerDatosDeNube,
  unirseAFamilia,
  type FamiliaCuentaPFI,
  type UsuarioCuentaPFI,
} from '../services/sincronizacionCuenta';
import './CuentaSincronizacion.css';

type ModoAcceso = 'entrar' | 'crear' | 'olvido';

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Ha ocurrido un error inesperado.';
}
function formatearFecha(fecha: string | null): string {
  if (!fecha) return 'Aún no hay una copia';
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return 'Fecha desconocida';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(valor);
}

export default function CuentaSincronizacion() {
  const perfil = useMemo(cargarPerfil, []);
  const [usuario, setUsuario] = useState<UsuarioCuentaPFI | null>(null);
  const [familia, setFamilia] = useState<FamiliaCuentaPFI | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoFamilia, setCargandoFamilia] = useState(false);
  const [ocupado, setOcupado] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [modo, setModo] = useState<ModoAcceso>('entrar');
  const [nombre, setNombre] = useState(perfil.nombre || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordNuevo, setPasswordNuevo] = useState('');
  const [recuperandoPassword, setRecuperandoPassword] = useState(false);
  const [nombreFamilia, setNombreFamilia] = useState('Mi familia');
  const [codigoFamilia, setCodigoFamilia] = useState('');
  const [codigoVisible, setCodigoVisible] = useState('');

  const clavesLocales = Object.keys(recopilarDatosPFI()).length;

  const limpiarAvisos = () => {
    setMensaje('');
    setError('');
  };

  const cargarFamilia = useCallback(async (usuarioActivo: UsuarioCuentaPFI) => {
    setCargandoFamilia(true);
    try {
      setFamilia(await cargarFamiliaCuenta(usuarioActivo.id));
    } catch (errorDesconocido) {
      setError(mensajeError(errorDesconocido));
      setFamilia(null);
    } finally {
      setCargandoFamilia(false);
    }
  }, []);

  useEffect(() => {
    let montado = true;

    void obtenerUsuarioActual()
      .then((usuarioActual) => {
        if (!montado) return;
        setUsuario(usuarioActual);
        setCargando(false);
        if (usuarioActual) void cargarFamilia(usuarioActual);
      })
      .catch((errorDesconocido) => {
        if (!montado) return;
        setError(mensajeError(errorDesconocido));
        setCargando(false);
      });

    const dejarDeObservar = observarSesion((evento, usuarioActual) => {
      if (!montado) return;
      if (evento === 'PASSWORD_RECOVERY') setRecuperandoPassword(true);
      setUsuario(usuarioActual);
      setCargando(false);
      if (usuarioActual) {
        void cargarFamilia(usuarioActual);
      } else {
        setFamilia(null);
        setCodigoVisible('');
      }
    });

    return () => {
      montado = false;
      dejarDeObservar();
    };
  }, [cargarFamilia]);

  const enviarAcceso = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    limpiarAvisos();
    setOcupado(modo);

    try {
      if (modo === 'entrar') {
        const usuarioConectado = await iniciarSesion(email, password);
        setUsuario(usuarioConectado);
        await cargarFamilia(usuarioConectado);
        setMensaje('Sesión iniciada. Ya puedes elegir qué copia usar.');
        setPassword('');
      } else if (modo === 'crear') {
        const resultado = await registrarCuenta(nombre, email, password);
        if (resultado.usuario) {
          setUsuario(resultado.usuario);
          await cargarFamilia(resultado.usuario);
          setMensaje('Cuenta creada y conectada.');
        } else if (resultado.necesitaConfirmacion) {
          setMensaje('Cuenta creada. Revisa tu correo para confirmarla antes de entrar.');
          setModo('entrar');
        }
        setPassword('');
      } else {
        await enviarRecuperacionPassword(email);
        setMensaje('Te hemos enviado un enlace para cambiar la contraseña.');
        setModo('entrar');
      }
    } catch (errorDesconocido) {
      setError(mensajeError(errorDesconocido));
    } finally {
      setOcupado('');
    }
  };

  const cambiarPassword = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    limpiarAvisos();
    setOcupado('password');
    try {
      await guardarPasswordNuevo(passwordNuevo);
      setPasswordNuevo('');
      setRecuperandoPassword(false);
      setMensaje('Contraseña actualizada correctamente.');
    } catch (errorDesconocido) {
      setError(mensajeError(errorDesconocido));
    } finally {
      setOcupado('');
    }
  };

  const crearHogar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!usuario) return;
    limpiarAvisos();
    setOcupado('crear-familia');
    try {
      await crearFamilia(nombreFamilia, nombre || usuario.nombre);
      await cargarFamilia(usuario);
      setMensaje('Familia creada. Ya puedes guardar los datos de este móvil.');
    } catch (errorDesconocido) {
      setError(mensajeError(errorDesconocido));
    } finally {
      setOcupado('');
    }
  };

  const unirse = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!usuario) return;
    limpiarAvisos();
    setOcupado('unirse');
    try {
      await unirseAFamilia(codigoFamilia, nombre || usuario.nombre);
      await cargarFamilia(usuario);
      setCodigoFamilia('');
      setMensaje('Cuenta añadida a la familia.');
    } catch (errorDesconocido) {
      setError(mensajeError(errorDesconocido));
    } finally {
      setOcupado('');
    }
  };

  const guardarNube = async () => {
    if (!usuario || !familia) return;
    const confirmado = window.confirm(
      `Se actualizará la copia de “${familia.nombre}” con los datos de este móvil. No se cambiará nada en el móvil. ¿Continuar?`,
    );
    if (!confirmado) return;

    limpiarAvisos();
    setOcupado('subir');
    try {
      const nube = await guardarEsteMovilEnNube(familia.id, usuario.id);
      setFamilia((actual) => actual ? { ...actual, nube } : actual);
      setMensaje('Datos de este móvil guardados en la nube.');
    } catch (errorDesconocido) {
      setError(mensajeError(errorDesconocido));
    } finally {
      setOcupado('');
    }
  };

  const traerNube = async () => {
    if (!familia) return;
    const confirmado = window.confirm(
      'Antes de traer la nube, PFI guardará una copia automática de este móvil. Los datos de la familia se aplicarán sin borrar claves locales nuevas. ¿Continuar?',
    );
    if (!confirmado) return;

    limpiarAvisos();
    setOcupado('bajar');
    try {
      const resultado = await traerDatosDeNube(familia.id);
      setMensaje(
        `Datos recuperados: ${resultado.resumen.recetas} recetas, ${resultado.resumen.productosDespensa} productos de despensa y ${resultado.resumen.semanasMenu} semanas. PFI se recargará ahora.`,
      );
      window.setTimeout(() => window.location.reload(), 1200);
    } catch (errorDesconocido) {
      setError(mensajeError(errorDesconocido));
      setOcupado('');
    }
  };

  const mostrarCodigo = async () => {
    if (!familia) return;
    limpiarAvisos();
    setOcupado('codigo');
    try {
      setCodigoVisible(await obtenerCodigoFamilia(familia.id));
    } catch (errorDesconocido) {
      setError(mensajeError(errorDesconocido));
    } finally {
      setOcupado('');
    }
  };

  const copiarCodigo = async () => {
    if (!codigoVisible) return;
    try {
      await navigator.clipboard.writeText(codigoVisible);
      setMensaje('Código familiar copiado.');
    } catch {
      setMensaje('Mantén pulsado el código para copiarlo.');
    }
  };

  const salir = async () => {
    limpiarAvisos();
    setOcupado('salir');
    try {
      await cerrarSesion();
      setUsuario(null);
      setFamilia(null);
      setMensaje('Sesión cerrada. Los datos de este móvil siguen aquí.');
    } catch (errorDesconocido) {
      setError(mensajeError(errorDesconocido));
    } finally {
      setOcupado('');
    }
  };

  return (
    <Card className="account-sync">
      <div className="account-sync__heading">
        <div>
          <Title style={{ color: '#4f6f52', fontSize: '22px' }}>
            ☁️ Cuenta y sincronización
          </Title>
          <p>
            Inicia sesión para compartir el mismo PFI entre los móviles de la familia.
          </p>
        </div>
        <span className={`account-sync__status account-sync__status--${usuario ? 'online' : 'local'}`}>
          {cargando ? 'Comprobando…' : usuario ? 'Conectada' : 'Solo este móvil'}
        </span>
      </div>

      {cargando && (
        <div className="account-sync__loading" role="status">
          Comprobando la sesión guardada…
        </div>
      )}

      {!cargando && !usuario && (
        <div className="account-access">
          <div className="account-access__tabs" role="tablist" aria-label="Acceso a la cuenta">
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'entrar'}
              className={modo === 'entrar' ? 'is-active' : ''}
              onClick={() => { setModo('entrar'); limpiarAvisos(); }}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'crear'}
              className={modo === 'crear' ? 'is-active' : ''}
              onClick={() => { setModo('crear'); limpiarAvisos(); }}
            >
              Crear cuenta
            </button>
          </div>

          <form className="account-form" onSubmit={(evento) => { void enviarAcceso(evento); }}>
            {modo === 'crear' && (
              <label>
                Tu nombre
                <input
                  type="text"
                  autoComplete="name"
                  value={nombre}
                  onChange={(evento) => setNombre(evento.target.value)}
                  required
                />
              </label>
            )}

            <label>
              Correo electrónico
              <input
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                required
              />
            </label>

            {modo !== 'olvido' && (
              <label>
                Contraseña
                <input
                  type="password"
                  autoComplete={modo === 'crear' ? 'new-password' : 'current-password'}
                  minLength={8}
                  value={password}
                  onChange={(evento) => setPassword(evento.target.value)}
                  required
                />
              </label>
            )}

            <button className="account-button account-button--primary" type="submit" disabled={ocupado !== ''}>
              {ocupado === modo
                ? 'Espera…'
                : modo === 'entrar'
                  ? 'Iniciar sesión'
                  : modo === 'crear'
                    ? 'Crear mi cuenta'
                    : 'Enviar enlace'}
            </button>

            {modo === 'entrar' && (
              <button
                type="button"
                className="account-link"
                onClick={() => { setModo('olvido'); limpiarAvisos(); }}
              >
                He olvidado la contraseña
              </button>
            )}
            {modo === 'olvido' && (
              <button
                type="button"
                className="account-link"
                onClick={() => { setModo('entrar'); limpiarAvisos(); }}
              >
                Volver a iniciar sesión
              </button>
            )}
          </form>
        </div>
      )}

      {!cargando && usuario && (
        <div className="account-connected">
          <div className="account-user">
            <div className="account-user__avatar" aria-hidden="true">
              {(familia?.nombreMiembro || usuario.nombre || usuario.email).slice(0, 1).toLocaleUpperCase('es')}
            </div>
            <div>
              <small>Sesión iniciada</small>
              <strong>{familia?.nombreMiembro || usuario.nombre || 'Cuenta PFI'}</strong>
              <span>{usuario.email}</span>
            </div>
          </div>

          {recuperandoPassword && (
            <form className="account-password" onSubmit={(evento) => { void cambiarPassword(evento); }}>
              <strong>Elige una contraseña nueva</strong>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={passwordNuevo}
                onChange={(evento) => setPasswordNuevo(evento.target.value)}
                placeholder="Mínimo 8 caracteres"
                aria-label="Contraseña nueva"
                required
              />
              <button className="account-button account-button--primary" type="submit" disabled={ocupado !== ''}>
                {ocupado === 'password' ? 'Guardando…' : 'Guardar contraseña'}
              </button>
            </form>
          )}

          {cargandoFamilia && (
            <div className="account-sync__loading" role="status">Cargando la familia…</div>
          )}

          {!cargandoFamilia && !familia && (
            <div className="family-onboarding">
              <div className="account-notice">
                La cuenta está lista. Crea una familia o usa el código de una existente.
              </div>

              <div className="family-onboarding__grid">
                <form onSubmit={(evento) => { void crearHogar(evento); }}>
                  <strong>Crear una familia</strong>
                  <label>
                    Nombre de la familia
                    <input
                      type="text"
                      value={nombreFamilia}
                      onChange={(evento) => setNombreFamilia(evento.target.value)}
                      required
                    />
                  </label>
                  <button className="account-button account-button--primary" type="submit" disabled={ocupado !== ''}>
                    {ocupado === 'crear-familia' ? 'Creando…' : 'Crear familia'}
                  </button>
                </form>

                <form onSubmit={(evento) => { void unirse(evento); }}>
                  <strong>Unirme a una familia</strong>
                  <label>
                    Código familiar
                    <input
                      type="text"
                      autoCapitalize="characters"
                      maxLength={8}
                      value={codigoFamilia}
                      onChange={(evento) => setCodigoFamilia(evento.target.value.toLocaleUpperCase('es'))}
                      placeholder="8 caracteres"
                      required
                    />
                  </label>
                  <button className="account-button account-button--secondary" type="submit" disabled={ocupado !== ''}>
                    {ocupado === 'unirse' ? 'Uniendo…' : 'Usar código'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {!cargandoFamilia && familia && (
            <div className="family-cloud">
              <div className="family-cloud__summary">
                <div>
                  <small>Familia</small>
                  <strong>{familia.nombre}</strong>
                  <span>{familia.miembros.length} cuenta{familia.miembros.length === 1 ? '' : 's'} conectada{familia.miembros.length === 1 ? '' : 's'}</span>
                </div>
                <div>
                  <small>Copia en la nube</small>
                  <strong>{familia.nube.claves} bloques</strong>
                  <span>{formatearFecha(familia.nube.ultimaActualizacion)}</span>
                </div>
                <div>
                  <small>Este móvil</small>
                  <strong>{clavesLocales} bloques</strong>
                  <span>Se conserva aunque cierres sesión</span>
                </div>
              </div>

              <div className="account-notice account-notice--safe">
                PFI no mezcla las dos copias automáticamente: tú eliges cuál conservar.
              </div>

              <div className="family-cloud__actions">
                <button
                  type="button"
                  className="account-button account-button--primary"
                  onClick={() => { void guardarNube(); }}
                  disabled={ocupado !== '' || clavesLocales === 0}
                >
                  {ocupado === 'subir' ? 'Guardando…' : '↑ Guardar este móvil en la nube'}
                </button>
                <button
                  type="button"
                  className="account-button account-button--secondary"
                  onClick={() => { void traerNube(); }}
                  disabled={ocupado !== '' || familia.nube.claves === 0}
                >
                  {ocupado === 'bajar' ? 'Recuperando…' : '↓ Traer datos de la nube'}
                </button>
              </div>

              <details className="family-members">
                <summary>Ver las cuentas de la familia</summary>
                <div className="family-members__list">
                  {familia.miembros.map((miembro) => (
                    <div key={miembro.id}>
                      <span aria-hidden="true">👤</span>
                      <strong>{miembro.nombre}</strong>
                      <small>{miembro.rol === 'propietario' ? 'Propietario' : 'Miembro'}</small>
                    </div>
                  ))}
                </div>

                {familia.rol === 'propietario' && (
                  <div className="family-code">
                    {!codigoVisible ? (
                      <button
                        type="button"
                        className="account-link"
                        onClick={() => { void mostrarCodigo(); }}
                        disabled={ocupado !== ''}
                      >
                        {ocupado === 'codigo' ? 'Cargando código…' : 'Mostrar código para añadir otra cuenta'}
                      </button>
                    ) : (
                      <>
                        <span>Código familiar</span>
                        <strong>{codigoVisible}</strong>
                        <button type="button" onClick={() => { void copiarCodigo(); }}>Copiar</button>
                      </>
                    )}
                  </div>
                )}
              </details>
            </div>
          )}

          <button
            type="button"
            className="account-link account-link--signout"
            onClick={() => { void salir(); }}
            disabled={ocupado !== ''}
          >
            {ocupado === 'salir' ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        </div>
      )}

      {mensaje && <p className="account-message account-message--ok" aria-live="polite">{mensaje}</p>}
      {error && <p className="account-message account-message--error" role="alert">{error}</p>}
    </Card>
  );
}
