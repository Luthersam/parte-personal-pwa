import Peer from 'peerjs';
import type { DataConnection, PeerOptions } from 'peerjs';
import type { NovedadesData, ParteGeonumerico } from './types';
import { urlBase } from './nativo';

// Recolección de partes entre celulares por WebRTC (PeerJS).
// El broker público de PeerJS solo ayuda a conectar los dispositivos; los datos
// viajan directo entre ellos. El coordinador debe mantener la app abierta.

export const DURACION_MS = 2 * 60 * 60 * 1000;
const MAX_MENSAJE_BYTES = 100_000;
const MAX_NOMBRES = 300;
const MAX_NUMERO = 99_999;

// Servidores que ayudan a los celulares a encontrarse. PeerJS trae por defecto dos servidores de
// retransmisión (TURN) que ya no existen, así que se define la lista aquí. Para redes difíciles
// (internet compartido desde un celular, algunos operadores) hace falta un TURN real: se agrega con
// la variable VITE_ICE_SERVERS, un JSON como
//   [{"urls":["turn:host:3478?transport=udp","turns:host:443?transport=tcp"],"username":"...","credential":"..."}]
// Los pasos completos están en GUIA_TURN.md.
const ICE_BASE: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

function servidoresIce(): RTCIceServer[] {
  const extra = import.meta.env.VITE_ICE_SERVERS as string | undefined;
  if (!extra) return ICE_BASE;
  try {
    const lista: unknown = JSON.parse(extra);
    return Array.isArray(lista) ? [...ICE_BASE, ...(lista as RTCIceServer[])] : ICE_BASE;
  } catch {
    console.warn('VITE_ICE_SERVERS no es un JSON válido; se ignora.');
    return ICE_BASE;
  }
}

// VITE_ICE_SOLO_RELAY=true obliga a pasar por el TURN: sirve para comprobar que el TURN funciona de verdad.
// No lo dejes activado en producción (todo el tráfico pasaría por el proveedor).
const SOLO_RELAY = import.meta.env.VITE_ICE_SOLO_RELAY === 'true';

const opcionesPeer = (): PeerOptions => ({
  config: {
    iceServers: servidoresIce(),
    iceCandidatePoolSize: 2,
    ...(SOLO_RELAY ? { iceTransportPolicy: 'relay' as const } : {}),
  },
});

const ETIQUETAS = [
  'COMISIÓN',
  'EXCUSADO SERVICIO',
  'FRANQUICIA',
  'PERMISO',
  'VACACIONES',
  'SERVICIOS',
  'RETARDADO',
  'HORARIO FLEXIBLE',
  'OTROS',
];

type MensajeEnvio = { t: 'envio'; token: string; parte: ParteGeonumerico };
// 'recibido' = llegó y espera decisión; 'ok' = aprobado; 'error' = rechazado o inválido
// cierre = el coordinador terminó la recepción sin decidir sobre este parte
type Respuesta = { t: 'recibido' } | { t: 'ok' } | { t: 'error'; msg: string; cierre?: boolean };
export type Decision = { ok: true } | { ok: false; msg: string; cierre?: boolean };

function aleatorio(bytes: number): string {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

function entero(v: unknown): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MAX_NUMERO ? v : null;
}

// Valida y normaliza lo recibido: nunca se confía en el dispositivo remoto.
export function sanitizarParte(raw: unknown): ParteGeonumerico | string {
  if (!raw || typeof raw !== 'object') return 'Formato inválido.';
  const r = raw as Record<string, unknown>;

  const unidad = typeof r.unidadNombre === 'string' ? r.unidadNombre.trim().toUpperCase().slice(0, 60) : '';
  if (!unidad) return 'Falta el nombre de la unidad.';

  const efOf = entero(r.ef_of), efSub = entero(r.ef_sub), efPt = entero(r.ef_pt), efAxp = entero(r.ef_axp);
  if (efOf == null || efSub == null || efPt == null || efAxp == null) return 'Fuerza efectiva inválida.';

  let origen: unknown;
  try {
    origen = JSON.parse(typeof r.novedadesJSON === 'string' ? r.novedadesJSON : '{}');
  } catch {
    return 'Novedades inválidas.';
  }
  if (!origen || typeof origen !== 'object') return 'Novedades inválidas.';

  const dict: NovedadesData = {};
  const tot = { of: 0, sub: 0, pt: 0, axp: 0 };
  let totalNombres = 0;
  for (const etiqueta of ETIQUETAS) {
    const d = (origen as Record<string, unknown>)[etiqueta] as Record<string, unknown> | undefined;
    if (!d || typeof d !== 'object') continue;
    const n = { of: entero(d.of), sub: entero(d.sub), pt: entero(d.pt), axp: entero(d.axp) };
    if (n.of == null || n.sub == null || n.pt == null || n.axp == null) return `Cifras inválidas en ${etiqueta}.`;
    const nombres = (Array.isArray(d.nombres) ? d.nombres : [])
      .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
      .map((x) => x.trim().toUpperCase().slice(0, 60));
    totalNombres += nombres.length;
    if (totalNombres > MAX_NOMBRES) return 'Demasiados nombres.';
    dict[etiqueta] = { nombres, of: n.of, sub: n.sub, pt: n.pt, axp: n.axp };
    tot.of += n.of; tot.sub += n.sub; tot.pt += n.pt; tot.axp += n.axp;
  }

  if (tot.of > efOf || tot.sub > efSub || tot.pt > efPt || tot.axp > efAxp) {
    return 'Las novedades superan la Fuerza Efectiva.';
  }

  return {
    titulo: 'Diario',
    fecha: new Date(),
    unidadNombre: unidad,
    ef_of: efOf, ef_sub: efSub, ef_pt: efPt, ef_axp: efAxp,
    nov_total_of: tot.of, nov_total_sub: tot.sub, nov_total_pt: tot.pt, nov_total_axp: tot.axp,
    elaboradoPor: typeof r.elaboradoPor === 'string' ? r.elaboradoPor.trim().slice(0, 60) : '',
    novedadesJSON: JSON.stringify(dict),
  };
}

// ============================================================
// COORDINADOR
// ============================================================

export interface Colecta {
  url: string;
  expiraEn: number;
  cerrar: () => void;
}

export function iniciarColecta(opts: {
  // Se resuelve cuando el coordinador aprueba o rechaza el envío
  onRecibido: (parte: ParteGeonumerico) => Promise<Decision>;
  onEstado: (estado: 'abierta' | 'error' | 'cerrada', detalle?: string) => void;
}): Promise<Colecta> {
  const token = aleatorio(8);
  const peerId = `pp-${aleatorio(8)}`;
  const expiraEn = Date.now() + DURACION_MS;
  const peer = new Peer(peerId, opcionesPeer());
  let cerrada = false;

  const cerrar = () => {
    if (cerrada) return;
    cerrada = true;
    clearTimeout(timer);
    peer.destroy();
    opts.onEstado('cerrada');
  };
  const timer = setTimeout(cerrar, DURACION_MS);

  peer.on('connection', (conn: DataConnection) => {
    // La unidad puede haberse desconectado mientras esperaba la decisión
    const responder = (r: Respuesta) => {
      try { conn.send(r); } catch { /* conexión cerrada */ }
    };

    conn.on('data', async (data) => {
      if (cerrada || Date.now() > expiraEn) return responder({ t: 'error', msg: 'La recolección ya cerró.' });
      if (JSON.stringify(data).length > MAX_MENSAJE_BYTES) return responder({ t: 'error', msg: 'Mensaje demasiado grande.' });

      const m = data as Partial<MensajeEnvio>;
      if (m?.t !== 'envio' || m.token !== token) return responder({ t: 'error', msg: 'Código inválido o vencido.' });

      const parte = sanitizarParte(m.parte);
      if (typeof parte === 'string') return responder({ t: 'error', msg: parte });

      responder({ t: 'recibido' });
      let decision: Decision;
      try {
        decision = await opts.onRecibido(parte);
      } catch {
        decision = { ok: false, msg: 'No se pudo procesar en el coordinador.' };
      }
      responder(decision.ok ? { t: 'ok' } : { t: 'error', msg: decision.msg, cierre: decision.cierre });
    });
  });

  return new Promise((resolve, reject) => {
    peer.on('open', () => {
      opts.onEstado('abierta');
      const url = `${urlBase()}/?c=${peerId}&k=${token}`;
      resolve({ url, expiraEn, cerrar });
    });
    peer.on('error', (err) => {
      if (!cerrada) opts.onEstado('error', err.message);
      reject(err);
    });
    peer.on('disconnected', () => {
      // Reconectar al broker si se perdió la señal (las conexiones activas siguen)
      if (!cerrada && !peer.destroyed) peer.reconnect();
    });
  });
}

// ============================================================
// UNIDAD (celular que escanea el QR)
// ============================================================

// Extrae los datos de conexión de un enlace de recepción (el contenido del QR).
// Solo importan los parámetros: sirve igual si el QR trae otra dirección de la app.
export function paramsDeEnlace(texto: string): { peerId: string; token: string } | null {
  let p: URLSearchParams;
  try {
    p = new URL(texto).searchParams;
  } catch {
    return null;
  }
  const peerId = p.get('c');
  const token = p.get('k');
  if (!peerId || !token || !/^pp-[0-9a-f]{16}$/.test(peerId) || !/^[0-9a-f]{16}$/.test(token)) return null;
  return { peerId, token };
}

export function paramsColecta(): { peerId: string; token: string } | null {
  return paramsDeEnlace(location.href);
}

export type FaseEnvio = 'senal' | 'directa' | 'enviando';

const MSG_SENAL = 'No hay acceso al servicio de conexión. Revise su internet e intente de nuevo.';
const MSG_DIRECTA =
  'No se pudo abrir la conexión directa con el coordinador. Si uno de los dos comparte internet desde un celular, pruebe en la misma red Wi-Fi y pida un QR nuevo.';
const MSG_SIN_RESPUESTA = 'El coordinador no respondió a tiempo. Intente de nuevo.';

function mensajeDeErrorPeer(tipo: string): string {
  if (tipo === 'peer-unavailable') {
    return 'No se encontró al coordinador. Verifique que tenga la recepción abierta y pídale un QR nuevo.';
  }
  if (['network', 'server-error', 'socket-error', 'socket-closed', 'browser-incompatible'].includes(tipo)) return MSG_SENAL;
  return `No se pudo conectar (${tipo}). Intente de nuevo.`;
}

// Resuelve cuando el coordinador aprueba; rechaza con el motivo si lo rechaza.
// onPendiente se llama cuando el parte llegó y espera la decisión.
// onFase informa en qué paso va la conexión, para mostrárselo al usuario.
export function enviarParte(
  peerId: string,
  token: string,
  parte: ParteGeonumerico,
  onPendiente?: () => void,
  onFase?: (fase: FaseEnvio) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const peer = new Peer(opcionesPeer());
    let terminado = false;
    let limite: ReturnType<typeof setTimeout>;
    const fin = (err?: Error) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(limite);
      // Resolver antes de destruir: destroy() dispara 'close', que no debe contarse como error
      if (err) reject(err); else resolve();
      peer.destroy();
    };
    // Un plazo por paso: así el error dice en cuál falló (servicio, conexión directa o respuesta)
    const plazo = (ms: number, msg: string) => {
      clearTimeout(limite);
      limite = setTimeout(() => fin(new Error(msg)), ms);
    };

    onFase?.('senal');
    plazo(10_000, MSG_SENAL);

    peer.on('error', (e) => fin(new Error(mensajeDeErrorPeer(e.type))));
    peer.on('open', () => {
      onFase?.('directa');
      plazo(25_000, MSG_DIRECTA);
      const conn = peer.connect(peerId, { reliable: true, serialization: 'json' });
      conn.on('open', () => {
        onFase?.('enviando');
        plazo(15_000, MSG_SIN_RESPUESTA);
        conn.send({ t: 'envio', token, parte } satisfies MensajeEnvio);
      });
      conn.on('data', (d) => {
        const r = d as Respuesta;
        if (r.t === 'recibido') {
          clearTimeout(limite); // ya llegó: la decisión puede tardar
          onPendiente?.();
        } else if (r.t === 'ok') fin();
        else if (r.t === 'error') fin(Object.assign(new Error(r.msg), { cierre: r.cierre === true }));
      });
      conn.on('close', () =>
        fin(new Error('Se cerró la conexión con el coordinador. Si terminó la recepción, pídale un QR nuevo y reenvíe su parte.'))
      );
      conn.on('error', (e) => fin(e));
    });
  });
}
