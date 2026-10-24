import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { iniciarColecta } from './colecta';
import type { Colecta } from './colecta';
import type { ParteGeonumerico } from './types';

function formatoRestante(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function ColectaModal({
  onRecibido,
  onClose,
}: {
  onRecibido: (parte: ParteGeonumerico) => Promise<void>;
  onClose: () => void;
}) {
  const [qr, setQr] = useState('');
  const [estado, setEstado] = useState<'iniciando' | 'abierta' | 'error' | 'cerrada'>('iniciando');
  const [detalle, setDetalle] = useState('');
  const [recibidos, setRecibidos] = useState<string[]>([]);
  const [restante, setRestante] = useState(0);
  const colectaRef = useRef<Colecta | null>(null);
  const onRecibidoRef = useRef(onRecibido);
  onRecibidoRef.current = onRecibido;

  useEffect(() => {
    let cancelado = false;
    let wake: WakeLockSentinel | null = null;

    iniciarColecta({
      onRecibido: async (parte) => {
        await onRecibidoRef.current(parte);
        setRecibidos((prev) => (prev.includes(parte.unidadNombre) ? prev : [...prev, parte.unidadNombre]));
      },
      onEstado: (e, d) => {
        setEstado(e);
        if (d) setDetalle(d);
      },
    })
      .then(async (c) => {
        if (cancelado) return c.cerrar();
        colectaRef.current = c;
        setQr(await QRCode.toDataURL(c.url, { width: 280, margin: 1 }));
        setRestante(c.expiraEn - Date.now());
        // Mantener la pantalla encendida: si el coordinador se desconecta, no entra nada
        try { wake = (await navigator.wakeLock?.request('screen')) ?? null; } catch { /* opcional */ }
      })
      .catch(() => { /* el estado de error ya se informó en onEstado */ });

    return () => {
      cancelado = true;
      colectaRef.current?.cerrar();
      wake?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const c = colectaRef.current;
    if (!c || estado !== 'abierta') return;
    const id = setInterval(() => setRestante(c.expiraEn - Date.now()), 1000);
    return () => clearInterval(id);
  }, [estado, qr]);

  return (
    <div className="reporte-modal-overlay">
      <div className="reporte-modal">
        <div className="reporte-modal__header">
          <div className="reporte-modal__logo-area">
            <div className="reporte-modal__shield">📡</div>
            <div className="reporte-modal__header-text">
              <h2>Recolección en vivo</h2>
              <p>Las unidades escanean el QR y envían su parte</p>
            </div>
          </div>
          <button className="reporte-modal__cerrar" onClick={onClose}>
            {estado === 'abierta' ? 'Terminar' : 'Cerrar'}
          </button>
        </div>

        <div className="reporte-modal__body" style={{ textAlign: 'center' }}>
          {estado === 'iniciando' && <p>Generando QR...</p>}

          {estado === 'error' && (
            <p style={{ color: '#c00', fontSize: 13 }}>
              No se pudo abrir la recolección: {detalle || 'sin conexión'}. Verifique su internet.
            </p>
          )}

          {estado === 'cerrada' && <p>La recolección terminó. Los partes recibidos quedaron guardados.</p>}

          {estado === 'abierta' && qr && (
            <>
              <img src={qr} alt="QR de recolección" width={280} height={280} style={{ maxWidth: '100%' }} />
              <p style={{ fontSize: 13, margin: '8px 0' }}>
                Vence en <b>{formatoRestante(restante)}</b>
              </p>
              <p style={{ fontSize: 11, color: '#666', margin: 0 }}>
                Mantenga esta pantalla abierta mientras las unidades envían.
              </p>
            </>
          )}

          <div className="reporte-seccion-titulo">Recibidos ({recibidos.length})</div>
          {recibidos.length === 0 ? (
            <p style={{ fontSize: 12, color: '#666' }}>Aún no llega ninguna unidad.</p>
          ) : (
            <ul style={{ textAlign: 'left', fontSize: 13 }}>
              {recibidos.map((u) => (
                <li key={u}>✅ {u}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
