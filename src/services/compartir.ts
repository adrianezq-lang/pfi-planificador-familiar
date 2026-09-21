export type ResultadoCompartir = 'compartido' | 'copiado' | 'cancelado' | 'error';

type DatosCompartir = {
  titulo: string;
  texto: string;
};

async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Se intenta el fallback clásico.
  }

  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copiado = document.execCommand('copy');
    area.remove();
    return copiado;
  } catch {
    return false;
  }
}

export async function compartirTexto({
  titulo,
  texto,
}: DatosCompartir): Promise<ResultadoCompartir> {
  try {
    if (navigator.share) {
      await navigator.share({ title: titulo, text: texto });
      return 'compartido';
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelado';
    }
  }

  return (await copiarAlPortapapeles(texto)) ? 'copiado' : 'error';
}
