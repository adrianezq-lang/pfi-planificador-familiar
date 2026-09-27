import { cargarDespensa, type ProductoDespensa } from './despensa.ts';
import { fechaLocalISO } from './fechaSemana.ts';

const CLAVE_STOCK_APERTURA = 'pfi-stock-apertura-mes-v1';

type AperturaMes = {
  creadaEn: string;
  stockPorProducto: Record<string, number>;
};

type AperturasGuardadas = Record<string, AperturaMes>;

function cargarAperturas(): AperturasGuardadas {
  try {
    const valor = JSON.parse(
      localStorage.getItem(CLAVE_STOCK_APERTURA) ?? '{}',
    ) as unknown;
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};

    return Object.fromEntries(
      Object.entries(valor).flatMap(([mes, dato]) => {
        if (!/^\d{4}-\d{2}$/.test(mes) || !dato || typeof dato !== 'object') {
          return [];
        }
        const apertura = dato as Partial<AperturaMes>;
        if (
          typeof apertura.creadaEn !== 'string' ||
          !apertura.stockPorProducto ||
          typeof apertura.stockPorProducto !== 'object' ||
          Array.isArray(apertura.stockPorProducto)
        ) {
          return [];
        }
        const stockPorProducto = Object.fromEntries(
          Object.entries(apertura.stockPorProducto).flatMap(([productoId, stock]) =>
            typeof stock === 'number' && Number.isFinite(stock)
              ? [[productoId, Math.max(0, stock)]]
              : [],
          ),
        );
        return [[mes, { creadaEn: apertura.creadaEn, stockPorProducto }]];
      }),
    );
  } catch {
    return {};
  }
}

function guardarAperturas(aperturas: AperturasGuardadas): void {
  const meses = Object.keys(aperturas).sort().slice(-18);
  const acotadas = Object.fromEntries(meses.map((mes) => [mes, aperturas[mes]]));
  localStorage.setItem(CLAVE_STOCK_APERTURA, JSON.stringify(acotadas));
}

/**
 * Congela el stock de referencia con el que se calculó por primera vez el mes.
 * Las compras posteriores dejan de reescribir retroactivamente el presupuesto:
 * sus importes reales sustituyen al previsto mediante el registro de compras.
 */
export function obtenerDespensaAperturaMes(
  mes: string,
  despensa = cargarDespensa(),
): ProductoDespensa[] {
  const aperturas = cargarAperturas();
  let apertura = aperturas[mes];

  // Solo el mes en curso puede congelar una apertura nueva. En meses futuros
  // el stock todavía cambiará; en meses pasados no debemos inventar una foto
  // histórica con las existencias actuales.
  const mesActual = fechaLocalISO(new Date()).slice(0, 7);
  if (!apertura && mes !== mesActual) return despensa;

  if (!apertura) {
    apertura = {
      creadaEn: new Date().toISOString(),
      stockPorProducto: Object.fromEntries(
        despensa.map((producto) => [producto.productoId, producto.stockActual]),
      ),
    };
    guardarAperturas({ ...aperturas, [mes]: apertura });
  }

  return despensa.map((producto) => ({
    ...producto,
    stockActual: apertura.stockPorProducto[producto.productoId] ?? 0,
  }));
}
