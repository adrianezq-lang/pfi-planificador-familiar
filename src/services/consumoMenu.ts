import type { DiaMenu } from '../data/Menusemanal';
import { generarCompraMercadona } from '../motor/compra';
import { cargarDespensa } from './despensa';
import {
  cargarMovimientos,
  eliminarMovimiento,
  obtenerStockActual,
  registrarConsumo,
} from './inventario';

const CLAVE_SERVICIOS_CONSUMIDOS = 'pfi-servicios-consumidos-v1';
export const EVENTO_CONSUMO_MENU = 'pfi:consumo-menu-actualizado';

export type MomentoServicioConsumido = 'comida' | 'cena';

export type ConsumoProductoServicio = {
  movimientoId: string;
  productoId: string;
  productoNombre: string;
  cantidad: number;
};

export type FaltaStockServicio = {
  productoNombre: string;
  cantidadNecesaria: number;
  cantidadConsumida: number;
};

export type RegistroServicioConsumido = {
  id: string;
  clave: string;
  fecha: string;
  momento: MomentoServicioConsumido;
  registradoEn: string;
  consumos: ConsumoProductoServicio[];
  faltasStock: FaltaStockServicio[];
  sinAsociacion: string[];
  ingredientesNoDisponibles: string[];
};

function esMomento(valor: unknown): valor is MomentoServicioConsumido {
  return valor === 'comida' || valor === 'cena';
}

function numeroNoNegativo(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0
    ? valor
    : null;
}

function normalizarRegistro(valor: unknown): RegistroServicioConsumido | null {
  if (typeof valor !== 'object' || valor === null) return null;
  const registro = valor as Partial<RegistroServicioConsumido>;
  if (
    typeof registro.id !== 'string' ||
    typeof registro.clave !== 'string' ||
    typeof registro.fecha !== 'string' ||
    !esMomento(registro.momento) ||
    typeof registro.registradoEn !== 'string' ||
    !Array.isArray(registro.consumos) ||
    !Array.isArray(registro.faltasStock) ||
    !Array.isArray(registro.sinAsociacion) ||
    !Array.isArray(registro.ingredientesNoDisponibles)
  ) {
    return null;
  }

  const consumos = registro.consumos.flatMap((entrada) => {
    if (typeof entrada !== 'object' || entrada === null) return [];
    const consumo = entrada as Partial<ConsumoProductoServicio>;
    const cantidad = numeroNoNegativo(consumo.cantidad);
    if (
      typeof consumo.movimientoId !== 'string' ||
      typeof consumo.productoId !== 'string' ||
      typeof consumo.productoNombre !== 'string' ||
      cantidad === null
    ) return [];
    return [{
      movimientoId: consumo.movimientoId,
      productoId: consumo.productoId,
      productoNombre: consumo.productoNombre,
      cantidad,
    }];
  });
  const faltasStock = registro.faltasStock.flatMap((entrada) => {
    if (typeof entrada !== 'object' || entrada === null) return [];
    const falta = entrada as Partial<FaltaStockServicio>;
    const cantidadNecesaria = numeroNoNegativo(falta.cantidadNecesaria);
    const cantidadConsumida = numeroNoNegativo(falta.cantidadConsumida);
    if (
      typeof falta.productoNombre !== 'string' ||
      cantidadNecesaria === null ||
      cantidadConsumida === null
    ) return [];
    return [{ productoNombre: falta.productoNombre, cantidadNecesaria, cantidadConsumida }];
  });

  return {
    id: registro.id,
    clave: registro.clave,
    fecha: registro.fecha,
    momento: registro.momento,
    registradoEn: registro.registradoEn,
    consumos,
    faltasStock,
    sinAsociacion: registro.sinAsociacion.filter(
      (nombre): nombre is string => typeof nombre === 'string',
    ),
    ingredientesNoDisponibles: registro.ingredientesNoDisponibles.filter(
      (nombre): nombre is string => typeof nombre === 'string',
    ),
  };
}

function guardar(registros: RegistroServicioConsumido[]): RegistroServicioConsumido[] {
  localStorage.setItem(CLAVE_SERVICIOS_CONSUMIDOS, JSON.stringify(registros));
  window.dispatchEvent(new CustomEvent(EVENTO_CONSUMO_MENU));
  return registros;
}

export function cargarServiciosConsumidos(): RegistroServicioConsumido[] {
  try {
    const datos = JSON.parse(
      localStorage.getItem(CLAVE_SERVICIOS_CONSUMIDOS) ?? '[]',
    ) as unknown;
    if (!Array.isArray(datos)) return [];
    return datos
      .map(normalizarRegistro)
      .filter((registro): registro is RegistroServicioConsumido => registro !== null)
      .sort((a, b) => b.registradoEn.localeCompare(a.registradoEn));
  } catch {
    return [];
  }
}

export function claveServicioConsumido(
  fecha: string,
  momento: MomentoServicioConsumido,
): string {
  return `${fecha}|${momento}`;
}

export function obtenerServicioConsumido(
  fecha: string,
  momento: MomentoServicioConsumido,
  registros = cargarServiciosConsumidos(),
): RegistroServicioConsumido | null {
  const clave = claveServicioConsumido(fecha, momento);
  return registros.find((registro) => registro.clave === clave) ?? null;
}

function crearMenuDeServicio(
  dia: DiaMenu,
  momento: MomentoServicioConsumido,
): DiaMenu[] {
  return [{
    ...dia,
    comida: momento === 'comida' ? [...dia.comida] : [],
    cena: momento === 'cena' ? [...dia.cena] : [],
    postreComida: momento === 'comida' ? dia.postreComida : 'Sin postre',
    postreCena: momento === 'cena' ? dia.postreCena : 'Sin postre',
    postreComidaReceta: momento === 'comida' ? dia.postreComidaReceta : 'Sin postre',
    postreCenaReceta: momento === 'cena' ? dia.postreCenaReceta : 'Sin postre',
    detallePostreComida: momento === 'comida' ? dia.detallePostreComida : 'Sin postre',
    detallePostreCena: momento === 'cena' ? dia.detallePostreCena : 'Sin postre',
  }];
}

export async function registrarServicioConsumido(
  fecha: string,
  momento: MomentoServicioConsumido,
  dia: DiaMenu,
): Promise<RegistroServicioConsumido> {
  const clave = claveServicioConsumido(fecha, momento);
  const existentes = cargarServiciosConsumidos();
  const existente = existentes.find((registro) => registro.clave === clave);
  if (existente) return existente;

  const compra = await generarCompraMercadona(
    crearMenuDeServicio(dia, momento),
    { aplicarStock: false, incluirReposicion: false },
  );
  const despensaPorId = new Map(
    cargarDespensa().map((producto) => [producto.productoId, producto]),
  );
  const consumos: ConsumoProductoServicio[] = [];
  const faltasStock: FaltaStockServicio[] = [];
  const sinAsociacion = new Set<string>(compra.productosSinSeleccionar);

  compra.lineas.forEach((linea) => {
    const productoId = linea.producto?.productoId;
    const productoDespensa = productoId ? despensaPorId.get(productoId) : undefined;
    if (!productoId || !productoDespensa) {
      sinAsociacion.add(linea.producto?.nombre ?? linea.ingrediente.nombre);
      return;
    }

    const necesaria = Math.max(0, linea.envasesExactos ?? linea.envases);
    const disponible = Math.max(0, obtenerStockActual(productoId));
    const consumida = Math.min(necesaria, disponible);
    if (consumida > 0.000001) {
      const idsAntes = new Set(cargarMovimientos().map((movimiento) => movimiento.id));
      const movimientos = registrarConsumo(
        productoId,
        consumida,
        'menu',
        `${momento === 'comida' ? 'Comida' : 'Cena'} realizada · ${fecha}`,
      );
      const movimiento = movimientos.find((candidato) => !idsAntes.has(candidato.id));
      if (movimiento) {
        consumos.push({
          movimientoId: movimiento.id,
          productoId,
          productoNombre: productoDespensa.nombre,
          cantidad: consumida,
        });
      }
    }
    if (consumida + 0.000001 < necesaria) {
      faltasStock.push({
        productoNombre: productoDespensa.nombre,
        cantidadNecesaria: necesaria,
        cantidadConsumida: consumida,
      });
    }
  });

  const registro: RegistroServicioConsumido = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    clave,
    fecha,
    momento,
    registradoEn: new Date().toISOString(),
    consumos,
    faltasStock,
    sinAsociacion: Array.from(sinAsociacion),
    ingredientesNoDisponibles: (compra.ingredientesNoDisponibles ?? []).map(
      (estado) => estado.ingrediente,
    ),
  };
  guardar([registro, ...existentes]);
  return registro;
}

export function deshacerServicioConsumido(id: string): RegistroServicioConsumido[] {
  const registros = cargarServiciosConsumidos();
  const registro = registros.find((candidato) => candidato.id === id);
  if (!registro) return registros;
  registro.consumos.forEach((consumo) => eliminarMovimiento(consumo.movimientoId));
  return guardar(registros.filter((candidato) => candidato.id !== id));
}
