import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { iniciarColecta } from './colecta';
import type { Colecta, Decision } from './colecta';
import type { NovedadesData, ParteGeonumerico } from './types';
import { Icono } from './Icono';
import { useBotonAtras } from './atras';
import { esNativo } from './nativo';
import { KeepAwake } from '@capacitor-community/keep-awake';

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
      <div style={{ fontWeight: 800, fontSize: 18 }}>{parte.unidadNombre}</div>
      {parte.elaboradoPor && <div style={{ fontSize: 14, color: '#444' }}>Elaboró: {parte.elaboradoPor.toUpperCase()}</div>}

      <table className="reporte-tabla-resumen" style={{ marginTop: 6 }}>
        <thead>
          <tr>
            <th></th>
            <th>OF</th>
            <th>SUB</th>
            <th>PT/PP</th>
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
        <div key={cat} style={{ fontSize: 14, marginTop: 8 }}>
          <b>{cat}</b> — OF {d.of} · SUB {d.sub} · PT/PP {d.pt} · AXP {d.axp}
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
          <Icono nombre="guardar" />
          APROBAR
        </button>
        <button className="btn btn--danger" style={{ flex: 1 }} disabled={ocupado} onClick={onRechazar}>
          <Icono nombre="cerrar" />
          RECHAZAR
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
  const [nuevo, setNuevo] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const colectaRef = useRef<Colecta | null>(null);
  const resolvers = useRef(new Map<string, (d: Decision) => void>());
  const onAprobarRef = useRef(onAprobar);

  useEffect(() => {
    onAprobarRef.current = onAprobar;
  }, [onAprobar]);

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
          setNuevo(`Nuevo parte: ${key}`);
          navigator.vibrate?.(200); // solo Android; en iPhone se ignora
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
    if (!nuevo) return;
    const id = setTimeout(() => setNuevo(''), 4000);
    return () => clearTimeout(id);
  }, [nuevo]);

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

  // En la app de Android, mantener la pantalla encendida mientras se reciben partes
  useEffect(() => {
    if (!esNativo()) return;
    void KeepAwake.keepAwake();
    return () => {
      void KeepAwake.allowSleep();
    };
  }, []);

  // Con partes sin decidir, pide confirmación antes de cerrar (se perderían)
  const terminar = () => {
    if (estado === 'abierta' && pendientes.length > 0) setConfirmando(true);
    else onClose();
  };

  // Avisa a cada unidad pendiente y deja un instante para que el aviso llegue antes de cerrar
  const terminarYAvisar = async () => {
    setCerrando(true);
    for (const resolver of resolvers.current.values()) {
      resolver({
        ok: false,
        cierre: true,
        msg: 'El coordinador cerró la recepción antes de revisar su parte. Pídale un QR nuevo y reenvíelo.',
      });
    }
    resolvers.current.clear();
    await new Promise((r) => setTimeout(r, 800));
    onClose();
  };

  // Botón "atrás" de Android: cierra el aviso si está abierto; si no, intenta terminar
  useBotonAtras(() => {
    if (cerrando) return;
    if (confirmando) setConfirmando(false);
    else terminar();
  });

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
            <div className="reporte-modal__shield"><Icono nombre="qr" size={24} /></div>
            <div className="reporte-modal__header-text">
              <h2>Recolección en vivo</h2>
              <p>Las unidades escanean el QR y envían su parte</p>
            </div>
          </div>
          <button className="reporte-modal__cerrar" onClick={terminar}>
            {estado === 'abierta' ? 'Terminar' : 'Cerrar'}
          </button>
        </div>

        {confirmando && (
          <div className="dialogo-overlay">
            <div className="dialogo" role="alertdialog" aria-modal="true" aria-label="Terminar la recepción">
              <div className="dialogo__cuerpo">
                <h3 style={{ fontSize: 22, marginBottom: 8 }}>¿Terminar la recepción?</h3>
                <p style={{ fontSize: 17, lineHeight: 1.45, marginBottom: 16 }}>
                  Hay {pendientes.length} {pendientes.length === 1 ? 'parte' : 'partes'} sin revisar. Si termina ahora se
                  descartan, y esas unidades tendrán que pedir un QR nuevo y reenviar.
                </p>
                <button
                  className="btn btn--primary"
                  style={{ width: '100%', marginBottom: 10 }}
                  disabled={cerrando}
                  onClick={() => setConfirmando(false)}
                >
                  Seguir revisando
                </button>
                <button className="btn btn--danger" style={{ width: '100%' }} disabled={cerrando} onClick={terminarYAvisar}>
                  {cerrando ? 'Avisando a las unidades...' : 'Terminar y descartar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {nuevo && (
          <div className="toast" role="status">
            <Icono nombre="campana" />
            {nuevo}
          </div>
        )}

        <div className="reporte-modal__body" style={{ textAlign: 'center' }}>
          {estado === 'iniciando' && <p>Generando QR...</p>}

          {estado === 'error' && (
            <p style={{ color: '#b3261e', fontSize: 16, fontWeight: 700 }}>
              No se pudo abrir la recolección: {detalle || 'sin conexión'}. Verifique su internet.
            </p>
          )}

          {estado === 'cerrada' && <p>La recolección terminó. Los partes aprobados quedaron guardados.</p>}

          {pendientes.length > 0 && (
            <>
              <div className="reporte-seccion-titulo">Por aprobar ({pendientes.length})</div>
              {errorGuardar && <p style={{ color: '#b3261e', fontSize: 15, fontWeight: 700 }}>{errorGuardar}</p>}
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
              <p style={{ fontSize: 18, margin: '8px 0' }}>
                Vence en <b>{formatoRestante(restante)}</b>
              </p>
              <p style={{ fontSize: 14, color: '#444', margin: 0 }}>
                Mantenga esta pantalla abierta mientras las unidades envían.
              </p>
              <p style={{ fontSize: 14, color: '#444', margin: '6px 0 0' }}>
                Si alguien no logra conectarse, prueben con la misma red Wi-Fi y eviten compartir internet desde un
                celular.
              </p>
            </>
          )}

          <div className="reporte-seccion-titulo">Aprobadas ({aprobadas.length})</div>
          {aprobadas.length === 0 ? (
            <p style={{ fontSize: 15, color: '#444' }}>Aún no hay partes aprobados.</p>
          ) : (
            <ul style={{ textAlign: 'left', fontSize: 16, fontWeight: 600, listStyle: 'none' }}>
              {aprobadas.map((u) => (
                <li key={u} className="lista-icono">
                  <Icono nombre="circuloOk" className="icono--ok" />
                  {u}
                </li>
              ))}
            </ul>
          )}

          {rechazadas.length > 0 && (
            <>
              <div className="reporte-seccion-titulo">Rechazadas ({rechazadas.length})</div>
              <ul style={{ textAlign: 'left', fontSize: 16, fontWeight: 600, listStyle: 'none' }}>
                {rechazadas.map((u) => (
                  <li key={u} className="lista-icono">
                  <Icono nombre="circuloX" className="icono--error" />
                  {u}
                </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
