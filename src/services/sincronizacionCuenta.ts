import {
  createClient,
  type AuthChangeEvent,
  type Session,
} from '@supabase/supabase-js';
import {
  aplicarDatosSincronizados,
  recopilarDatosPFI,
  type ResumenCopiaPFI,
} from './copiasSeguridad';

const SUPABASE_URL = 'https://zajskjsewlhsnladkswn.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_UzEIHqgvvraLoLvbdj_T9Q_6vlBClA9';
const CLAVE_SESION = 'pfi-sync-sesion-v1';
const TAMANO_LOTE = 75;

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
  auth: {
    storageKey: CLAVE_SESION,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type UsuarioCuentaPFI = {
  id: string;
  email: string;
  nombre: string;
};

export type MiembroFamiliaPFI = {
  id: string;
  nombre: string;
  rol: 'propietario' | 'miembro';
  unidoEn: string | null;
};

export type ResumenNubePFI = {
  claves: number;
  ultimaActualizacion: string | null;
};

export type FamiliaCuentaPFI = {
  id: string;
  nombre: string;
  rol: 'propietario' | 'miembro';
  nombreMiembro: string;
  miembros: MiembroFamiliaPFI[];
  nube: ResumenNubePFI;
};

export type ResultadoRegistroPFI = {
  usuario: UsuarioCuentaPFI | null;
  necesitaConfirmacion: boolean;
};

export type ResultadoDescargaNubePFI = {
  resumen: ResumenCopiaPFI;
  ultimaActualizacion: string | null;
};

type FilaMiembro = {
  household_id: string;
  user_id: string;
  role: 'propietario' | 'miembro';
  display_name: string | null;
  joined_at: string | null;
};

type FilaDatoNube = {
  data_key: string;
  data_value: string | null;
  is_deleted: boolean;
  updated_at: string | null;
};

function crearError(mensaje: string | undefined, alternativa: string): Error {
  const original = mensaje?.trim() ?? '';
  const normalizado = original.toLocaleLowerCase('en');

  if (normalizado.includes('invalid login credentials')) {
    return new Error('El correo o la contraseña no son correctos.');
  }
  if (normalizado.includes('email not confirmed')) {
    return new Error('Confirma primero el correo de esta cuenta.');
  }
  if (normalizado.includes('user already registered')) {
    return new Error('Ese correo ya tiene una cuenta. Prueba a iniciar sesión.');
  }
  if (normalizado.includes('password should be at least')) {
    return new Error('La contraseña debe tener al menos 8 caracteres.');
  }
  if (
    normalizado.includes('failed to fetch') ||
    normalizado.includes('network') ||
    normalizado.includes('load failed')
  ) {
    return new Error('No hay conexión con la cuenta. Revisa Internet e inténtalo de nuevo.');
  }
  if (normalizado.includes('already belongs to')) {
    return new Error('Esta cuenta ya pertenece a una familia.');
  }
  if (normalizado.includes('código de familia no válido')) {
    return new Error('El código familiar no es válido.');
  }

  return new Error(original || alternativa);
}

function usuarioDesdeSesion(sesion: Session | null): UsuarioCuentaPFI | null {
  const usuario = sesion?.user;
  if (!usuario) return null;

  const nombre = typeof usuario.user_metadata?.nombre === 'string'
    ? usuario.user_metadata.nombre.trim()
    : '';

  return {
    id: usuario.id,
    email: usuario.email ?? '',
    nombre,
  };
}

function fechaMasReciente(fechas: Array<string | null>): string | null {
  return fechas.reduce<string | null>((masReciente, fecha) => {
    if (!fecha) return masReciente;
    if (!masReciente) return fecha;
    return new Date(fecha).getTime() > new Date(masReciente).getTime()
      ? fecha
      : masReciente;
  }, null);
}

async function cargarResumenNube(hogarId: string): Promise<ResumenNubePFI> {
  const { data, error } = await supabase
    .from('pfi_family_data')
    .select('data_key,is_deleted,updated_at')
    .eq('household_id', hogarId);

  if (error) throw crearError(error.message, 'No se ha podido revisar la copia de la nube.');

  const filas = (data ?? []) as Array<Pick<FilaDatoNube, 'data_key' | 'is_deleted' | 'updated_at'>>;
  const activas = filas.filter((fila) => !fila.is_deleted);

  return {
    claves: activas.length,
    ultimaActualizacion: fechaMasReciente(activas.map((fila) => fila.updated_at)),
  };
}

export async function obtenerUsuarioActual(): Promise<UsuarioCuentaPFI | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw crearError(error.message, 'No se ha podido comprobar la sesión.');
  return usuarioDesdeSesion(data.session);
}

export function observarSesion(
  escuchar: (evento: AuthChangeEvent, usuario: UsuarioCuentaPFI | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
    escuchar(evento, usuarioDesdeSesion(sesion));
  });

  return () => data.subscription.unsubscribe();
}

export async function iniciarSesion(
  email: string,
  password: string,
): Promise<UsuarioCuentaPFI> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw crearError(error.message, 'No se ha podido iniciar sesión.');
  const usuario = usuarioDesdeSesion(data.session);
  if (!usuario) throw new Error('La cuenta no ha devuelto una sesión válida.');
  return usuario;
}

export async function registrarCuenta(
  nombre: string,
  email: string,
  password: string,
): Promise<ResultadoRegistroPFI> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { nombre: nombre.trim() },
    },
  });

  if (error) throw crearError(error.message, 'No se ha podido crear la cuenta.');

  return {
    usuario: usuarioDesdeSesion(data.session),
    necesitaConfirmacion: data.session === null,
  };
}

export async function enviarRecuperacionPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) throw crearError(error.message, 'No se ha podido enviar el enlace.');
}

export async function guardarPasswordNuevo(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw crearError(error.message, 'No se ha podido cambiar la contraseña.');
}

export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw crearError(error.message, 'No se ha podido cerrar la sesión.');
}

export async function cargarFamiliaCuenta(
  usuarioId: string,
): Promise<FamiliaCuentaPFI | null> {
  const { data: miembroData, error: miembroError } = await supabase
    .from('pfi_household_members')
    .select('household_id,user_id,role,display_name,joined_at')
    .eq('user_id', usuarioId)
    .maybeSingle();

  if (miembroError) {
    throw crearError(miembroError.message, 'No se ha podido cargar la familia de esta cuenta.');
  }
  if (!miembroData) return null;

  const miembro = miembroData as FilaMiembro;
  const [hogarResultado, miembrosResultado, nube] = await Promise.all([
    supabase
      .from('pfi_households')
      .select('id,name')
      .eq('id', miembro.household_id)
      .single(),
    supabase
      .from('pfi_household_members')
      .select('household_id,user_id,role,display_name,joined_at')
      .eq('household_id', miembro.household_id)
      .order('joined_at', { ascending: true }),
    cargarResumenNube(miembro.household_id),
  ]);

  if (hogarResultado.error) {
    throw crearError(hogarResultado.error.message, 'No se ha podido cargar la familia.');
  }
  if (miembrosResultado.error) {
    throw crearError(miembrosResultado.error.message, 'No se han podido cargar sus miembros.');
  }

  const hogar = hogarResultado.data as { id: string; name: string };
  const miembros = (miembrosResultado.data ?? []) as FilaMiembro[];

  return {
    id: hogar.id,
    nombre: hogar.name,
    rol: miembro.role,
    nombreMiembro: miembro.display_name ?? '',
    miembros: miembros.map((fila) => ({
      id: fila.user_id,
      nombre: fila.display_name?.trim() || 'Miembro de la familia',
      rol: fila.role,
      unidoEn: fila.joined_at,
    })),
    nube,
  };
}

export async function crearFamilia(
  nombreFamilia: string,
  nombreMiembro: string,
): Promise<void> {
  const { error } = await supabase.rpc('create_pfi_household', {
    p_name: nombreFamilia.trim(),
    p_display_name: nombreMiembro.trim() || null,
  });

  if (error) throw crearError(error.message, 'No se ha podido crear la familia.');
}

export async function unirseAFamilia(
  codigo: string,
  nombreMiembro: string,
): Promise<void> {
  const { error } = await supabase.rpc('join_pfi_household', {
    p_invite_code: codigo.trim().toLocaleUpperCase('es'),
    p_display_name: nombreMiembro.trim() || null,
  });

  if (error) throw crearError(error.message, 'No se ha podido unir la cuenta a esa familia.');
}

export async function obtenerCodigoFamilia(hogarId: string): Promise<string> {
  const { data, error } = await supabase
    .from('pfi_households')
    .select('invite_code')
    .eq('id', hogarId)
    .single();

  if (error) throw crearError(error.message, 'No se ha podido mostrar el código familiar.');
  const codigo = (data as { invite_code?: string } | null)?.invite_code;
  if (!codigo) throw new Error('Esta familia no tiene un código disponible.');
  return codigo;
}

export async function guardarEsteMovilEnNube(
  hogarId: string,
  usuarioId: string,
): Promise<ResumenNubePFI> {
  const datos = recopilarDatosPFI();
  const filas = Object.entries(datos).map(([clave, valor]) => ({
    household_id: hogarId,
    data_key: clave,
    data_value: valor,
    is_deleted: false,
    updated_by: usuarioId,
  }));

  if (filas.length === 0) {
    throw new Error('Este móvil todavía no contiene datos de PFI para guardar.');
  }

  for (let indice = 0; indice < filas.length; indice += TAMANO_LOTE) {
    const { error } = await supabase
      .from('pfi_family_data')
      .upsert(filas.slice(indice, indice + TAMANO_LOTE), {
        onConflict: 'household_id,data_key',
      });

    if (error) throw crearError(error.message, 'No se han podido guardar los datos en la nube.');
  }

  return cargarResumenNube(hogarId);
}

export async function traerDatosDeNube(
  hogarId: string,
): Promise<ResultadoDescargaNubePFI> {
  const { data, error } = await supabase
    .from('pfi_family_data')
    .select('data_key,data_value,is_deleted,updated_at')
    .eq('household_id', hogarId);

  if (error) throw crearError(error.message, 'No se han podido descargar los datos de la nube.');

  const filas = (data ?? []) as FilaDatoNube[];
  const activas = filas.filter(
    (fila) => !fila.is_deleted && typeof fila.data_value === 'string',
  );
  if (activas.length === 0) {
    throw new Error('La familia todavía no tiene una copia guardada en la nube.');
  }

  const ultimaActualizacion = fechaMasReciente(activas.map((fila) => fila.updated_at));
  const datos = Object.fromEntries(
    activas.map((fila) => [fila.data_key, fila.data_value as string]),
  );

  return {
    resumen: aplicarDatosSincronizados(datos, ultimaActualizacion),
    ultimaActualizacion,
  };
}
