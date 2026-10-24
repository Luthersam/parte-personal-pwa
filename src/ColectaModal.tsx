import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { iniciarColecta } from './colecta';
import type { Colecta, Decision } from './colecta';
import type { NovedadesData, ParteGeonumerico } from './types';

function formatoRestante(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function novedadesDe(parte: ParteGeonumerico): NovedadesData {
  try {
    return JSON.parse(parte.novedadesJSON || '{}');
  } catch {
    return {};
  }
}

function TarjetaPendiente({
  parte,
  onAprobar,
  onRechazar,
  ocupado,
}: {
  parte: ParteGeonumerico;
  onAprobar: () => void;
  onRechazar: () => void;
  ocupado: boolean;
}) {
  const nov = novedadesDe(parte);
  const disp = {
    of: parte.ef_of - parte.nov_total_of,
    sub: parte.ef_sub - parte.nov_total_sub,
    pt: parte.ef_pt - parte.nov_total_pt,
    axp: parte.ef_axp - parte.nov_total_axp,
  };
  const fila = (t: string, a: number, b: number, c: number, d: number) => (
    <tr>
      <td>{t}</td>
      <td>{a}</td>
      <td>{b}</td>
      <td>{c}</td>
      <td>{d}</td>
    </tr>
  );

  return (
    <div style={{ border: '2px solid #c8a000', borderRadius: 8, padding: 10, margin: '8px 0', textAlign: 'left' }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{parte.unidadNombre}</div>
      {parte.elaboradoPor && <div style={{ fontSize: 11, color: '#666' }}>Elaboró: {parte.elaboradoPor.toUpperCase()}</div>}

      <table className="reporte-tabla-resumen" style={{ marginTop: 6 }}>
        <thead>
          <tr>
            <th></th>
            <th>OF</th>
            <th>SUB</th>
            <th>PT</th>
            <th>AXP</th>
          </tr>
        </thead>
        <tbody>
          {fila('EFECTIVA', parte.ef_of, parte.ef_sub, parte.ef_pt, parte.ef_axp)}
          {fila('NOVEDADES', parte.nov_total_of, parte.nov_total_sub, parte.nov_total_pt, parte.nov_total_axp)}
          {fila('DISPONIBLE', disp.of, disp.sub, disp.pt, disp.axp)}
        </tbody>
      </table>

      {Object.entries(nov).map(([cat, d]) => (
        <div key={cat} style={{ fontSize: 12, marginTop: 6 }}>
          <b>{cat}</b> — OF {d.of} · SUB {d.sub} · PT {d.pt} · AXP {d.axp}
          {d.nombres.length > 0 && (
            <ul style={{ margin: '2px 0 0', paddingLeft: 18 }}>
              {d.nombres.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn btn--success" style={{ flex: 1 }} disabled={ocupado} onClick={onAprobar}>
          ✓ APROBAR
        </button>
        <button className="btn btn--danger" style={{ flex: 1 }} disabled={ocupado} onClick={onRechazar}>
          ✕ RECHAZAR
        </button>
      </div>
    </div>
  );
}

export function ColectaModal({
  onAprobar,
  onClose,
}: {
  onAprobar: (parte: ParteGeonumerico) => Promise<void>;
  onClose: () => void;
}) {
  const [qr, setQr] = useState('');
  const [estado, setEstado] = useState<'iniciando' | 'abierta' | 'error' | 'cerrada'>('iniciando');
  const [detalle, setDetalle] = useState('');
  const [pendientes, setPendientes] = useState<ParteGeonumerico[]>([]);
  const [aprobadas, setAprobadas] = useState<string[]>([]);
  const [rechazadas, setRechazadas] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');
  const [restante, setRestante] = useState(0);
  const colectaRef = useRef<Colecta | null>(null);
  const resolvers = useRef(new Map<string, (d: Decision) => void>());
  const onAprobarRef = useRef(onAprobar);
  onAprobarRef.current = onAprobar;

  useEffect(() => {
    let cancelado = false;
    let wake: WakeLockSentinel | null = null;

    iniciarColecta({
      onRecibido: (parte) =>
        new Promise<Decision>((resolve) => {
          const key = parte.unidadNombre;
          // Un nuevo envío de la misma unidad reemplaza al pendiente anterior
          resolvers.current.get(key)?.({ ok: false, msg: 'Reemplazado por un nuevo envío.' });
          resolvers.current.set(key, resolve);
          setPendientes((prev) => [...prev.filter((p) => p.unidadNombre !== key), parte]);
        }),
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

  const quitarPendiente = (parte: ParteGeonumerico) => {
    resolvers.current.delete(parte.unidadNombre);
    setPendientes((prev) => prev.filter((p) => p !== parte));
  };

  const aprobar = async (parte: ParteGeonumerico) => {
    setOcupado(true);
    setErrorGuardar('');
    try {
      await onAprobarRef.current(parte); // se guarda y se suma al panel principal
      resolvers.current.get(parte.unidadNombre)?.({ ok: true });
      quitarPendiente(parte);
      setAprobadas((prev) => (prev.includes(parte.unidadNombre) ? prev : [...prev, parte.unidadNombre]));
      setRechazadas((prev) => prev.filter((u) => u !== parte.unidadNombre));
    } catch (err) {
      setErrorGuardar(`No se pudo guardar ${parte.unidadNombre}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setOcupado(false);
    }
  };

  const rechazar = (parte: ParteGeonumerico) => {
    const motivo = window.prompt(`Motivo del rechazo de ${parte.unidadNombre} (la unidad lo verá):`, '');
    if (motivo === null) return; // canceló
    resolvers.current.get(parte.unidadNombre)?.({ ok: false, msg: motivo.trim() || 'Rechazado por el coordinador.' });
    quitarPendiente(parte);
    setRechazadas((prev) => (prev.includes(parte.unidadNombre) ? prev : [...prev, parte.unidadNombre]));
  };

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

          {estado === 'cerrada' && <p>La recolección terminó. Los partes aprobados quedaron guardados.</p>}

          {pendientes.length > 0 && (
            <>
              <div className="reporte-seccion-titulo">Por aprobar ({pendientes.length})</div>
              {errorGuardar && <p style={{ color: '#c00', fontSize: 12 }}>{errorGuardar}</p>}
              {pendientes.map((p) => (
                <TarjetaPendiente
                  key={p.unidadNombre}
                  parte={p}
                  ocupado={ocupado}
                  onAprobar={() => aprobar(p)}
                  onRechazar={() => rechazar(p)}
                />
              ))}
            </>
          )}

          {estado === 'abierta' && qr && (
            <>
              <img src={qr} alt="QR de recolección" width={pendientes.length ? 160 : 280} height={pendientes.length ? 160 : 280} style={{ maxWidth: '100%' }} />
              <p style={{ fontSize: 13, margin: '8px 0' }}>
                Vence en <b>{formatoRestante(restante)}</b>
              </p>
              <p style={{ fontSize: 11, color: '#666', margin: 0 }}>
                Mantenga esta pantalla abierta mientras las unidades envían.
              </p>
            </>
          )}

          <div className="reporte-seccion-titulo">Aprobadas ({aprobadas.length})</div>
          {aprobadas.length === 0 ? (
            <p style={{ fontSize: 12, color: '#666' }}>Aún no hay partes aprobados.</p>
          ) : (
            <ul style={{ textAlign: 'left', fontSize: 13 }}>
              {aprobadas.map((u) => (
                <li key={u}>✅ {u}</li>
              ))}
            </ul>
          )}

          {rechazadas.length > 0 && (
            <>
              <div className="reporte-seccion-titulo">Rechazadas ({rechazadas.length})</div>
              <ul style={{ textAlign: 'left', fontSize: 13 }}>
                {rechazadas.map((u) => (
                  <li key={u}>❌ {u}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
