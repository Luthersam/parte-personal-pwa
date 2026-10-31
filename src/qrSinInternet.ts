// Transferencia de un mensaje por una serie de códigos QR, sin red.
// Cada código lleva: prefijo, identificador del envío, posición, total, verificación y un trozo.
// Formato: PPQ|<id 4>|<i>|<n>|<crc32 8 hex>|<trozo base64>

const PREFIJO = 'PPQ';
export const TAM_TROZO = 700; // caracteres por código: se lee bien con cámaras de celular

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(texto: string): string {
  let c = 0xffffffff;
  for (let i = 0; i < texto.length; i++) c = TABLA_CRC[(c ^ texto.charCodeAt(i)) & 0xff] ^ (c >>> 8);
  return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

function aBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
  return btoa(binario);
}

function deBase64(base64: string): string {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function idAleatorio(): string {
  const letras = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (b) => letras[b % letras.length]).join('');
}

/** Convierte un objeto en la lista de textos que se muestran como códigos QR, en orden. */
export function codificarMensaje(objeto: unknown): string[] {
  const base64 = aBase64(JSON.stringify(objeto));
  const crc = crc32(base64);
  const id = idAleatorio();
  const trozos: string[] = [];
  for (let i = 0; i < base64.length; i += TAM_TROZO) trozos.push(base64.slice(i, i + TAM_TROZO));
  if (trozos.length === 0) trozos.push('');
  const n = trozos.length;
  return trozos.map((trozo, i) => `${PREFIJO}|${id}|${i + 1}|${n}|${crc}|${trozo}`);
}

const FORMATO = /^PPQ\|([a-z0-9]{4})\|(\d{1,3})\|(\d{1,3})\|([0-9a-f]{8})\|([A-Za-z0-9+/=]*)$/;

export type Progreso =
  | { estado: 'ignorado' }
  | { estado: 'parcial'; recibidos: number; total: number }
  | { estado: 'completo'; valor: unknown }
  | { estado: 'error'; msg: string };

/** Reúne los códigos de un mismo envío (en cualquier orden, repetidos o con ruido) y reconstruye el mensaje. */
export class Ensamblador {
  private id: string | null = null;
  private total = 0;
  private crc = '';
  private trozos = new Map<number, string>();

  reiniciar(): void {
    this.id = null;
    this.total = 0;
    this.crc = '';
    this.trozos.clear();
  }

  agregar(texto: string): Progreso {
    const m = FORMATO.exec(texto.trim());
    if (!m) return { estado: 'ignorado' };
    const [, id, iTxt, nTxt, crc, trozo] = m;
    const i = Number(iTxt);
    const n = Number(nTxt);
    if (n < 1 || i < 1 || i > n) return { estado: 'ignorado' };

    if (this.id === null) {
      this.id = id;
      this.total = n;
      this.crc = crc;
    } else if (id !== this.id || n !== this.total || crc !== this.crc) {
      return { estado: 'ignorado' }; // otro envío: se ignora hasta que se reinicie
    }

    this.trozos.set(i, trozo);
    if (this.trozos.size < this.total) {
      return { estado: 'parcial', recibidos: this.trozos.size, total: this.total };
    }

    const base64 = Array.from({ length: this.total }, (_, k) => this.trozos.get(k + 1) ?? '').join('');
    if (crc32(base64) !== this.crc) {
      return { estado: 'error', msg: 'Los códigos se leyeron con errores. Vuelva a escanear el envío completo.' };
    }
    try {
      return { estado: 'completo', valor: JSON.parse(deBase64(base64)) };
    } catch {
      return { estado: 'error', msg: 'No se pudo reconstruir el mensaje. Vuelva a escanear el envío completo.' };
    }
  }

  faltan(): number[] {
    if (this.id === null) return [];
    return Array.from({ length: this.total }, (_, k) => k + 1).filter((i) => !this.trozos.has(i));
  }
}
