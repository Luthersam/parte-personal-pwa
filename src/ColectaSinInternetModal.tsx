import { useMemo, useRef, useState } from 'react';
import { sanitizarParte } from './colecta';
import type { Decision } from './colecta';
import { codificarMensaje, Ensamblador } from './qrSinInternet';
import { MostrarCodigos } from './MostrarCodigos';
import { ScannerCodigos } from './ScannerCodigos';
import { TarjetaPendiente } from './ColectaModal';
import { Icono } from './Icono';
import { useBotonAtras } from './atras';
import type { ParteGeonumerico } from './types';

interface Confirmacion {
  unidad: string;
  ok: boolean;
  msg: string;
}

// Recepción de partes sin internet: se escanean los códigos de cada unidad,
// se aprueba o rechaza y luego se muestra la confirmación para que la unidad la escanee.
export function ColectaSinInternetModal({
  onAprobar,
  onClose,
}: {
  onAprobar: (parte: ParteGeonumerico) => Promise<void>;
  onClose: () => void;
}) {
  const [escaneando, setEscaneando] = useState(false);
  const [progreso, setProgreso] = useState('');
  const [pendientes, setPendientes] = useState<ParteGeonumerico[]>([]);
  const [aprobadas, setAprobadas] = useState<string[]>([]);
  const [rechazadas, setRechazadas] = useState<string[]>([]);
  const [confirmaciones, setConfirmaciones] = useState<Confirmacion[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState('');
  const ensamblador = useRef(new Ensamblador());
  const resolvers = useRef(new Map<string, (d: Decision) => void>());
  useBotonAtras(() => {
    if (escaneando) setEscaneando(false);
    else if (confirmaciones.length === 0) onClose();
  });

  const confirmacionActual = confirmaciones[0];
  const textosConfirmacion = useMemo(
    () =>
      confirmacionActual
        ? codificarMensaje({
            tipo: 'ack',
            unidad: confirmacionActual.unidad,
            ok: confirmacionActual.ok,
            msg: confirmacionActual.msg,
          })
        : [],
    [confirmacionActual]
  );

  const alLeer = (texto: string) => {
    const r = ensamblador.current.agregar(texto);
    if (r.estado === 'parcial') return setProgreso(`Parte: recibidos ${r.recibidos} de ${r.total}`);
    if (r.estado === 'error') {
      ensamblador.current.reiniciar();
      return setProgreso(r.msg);
    }
    if (r.estado !== 'completo') return;

    ensamblador.current.reiniciar();
    const valor = r.valor as { tipo?: string; parte?: unknown };
    if (valor?.tipo !== 'parte') return setProgreso('Ese código no es de un parte.');
    const parte = sanitizarParte(valor.parte);
    if (typeof parte === 'string') return setProgreso(parte);

    // Un nuevo envío de la misma unidad reemplaza al pendiente anterior
    resolvers.current.delete(parte.unidadNombre);
    resolvers.current.set(parte.unidadNombre, (d) => {
      setConfirmaciones((prev) => [
        ...prev,
        { unidad: parte.unidadNombre, ok: d.ok, msg: d.ok ? '' : d.msg },
      ]);
    });
    setPendientes((prev) => [...prev.filter((p) => p.unidadNombre !== parte.unidadNombre), parte]);
    setProgreso(`Recibido: ${parte.unidadNombre}. Revise y apruebe o rechace.`);
  };

  const quitar = (parte: ParteGeonumerico) => {
    resolvers.current.delete(parte.unidadNombre);
    setPendientes((prev) => prev.filter((p) => p !== parte));
  };

  const aprobar = async (parte: ParteGeonumerico) => {
    setOcupado(true);
    setErrorGuardar('');
    try {
      await onAprobar(parte);
      resolvers.current.get(parte.unidadNombre)?.({ ok: true });
      quitar(parte);
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
    if (motivo === null) return;
    resolvers.current.get(parte.unidadNombre)?.({ ok: false, msg: motivo.trim() || 'Rechazado por el coordinador.' });
    quitar(parte);
    setRechazadas((prev) => (prev.includes(parte.unidadNombre) ? prev : [...prev, parte.unidadNombre]));
  };

  if (escaneando) {
    return (
      <ScannerCodigos
        titulo="Escanear partes"
        instruccion="Apunte la cámara a los códigos de la unidad, uno tras otro."
        progreso={progreso}
        onTexto={alLeer}
        onCerrar={() => setEscaneando(false)}
      />
    );
  }

  if (confirmacionActual) {
    return (
      <MostrarCodigos
        titulo={`Confirmación para ${confirmacionActual.unidad}`}
        instruccion={
          confirmacionActual.ok
            ? 'Pida a la unidad que escanee estos códigos con «Enviar sin internet».'
            : `No aprobado: ${confirmacionActual.msg}. Pida a la unidad que escanee estos códigos.`
        }
        textos={textosConfirmacion}
        textoFinal="LISTO, SIGUIENTE"
        onFinal={() => setConfirmaciones((prev) => prev.slice(1))}
      />
    );
  }

  return (
    <div className="reporte-modal-overlay">
      <div className="reporte-modal">
        <div className="reporte-modal__header">
          <div className="reporte-modal__logo-area">
            <div className="reporte-modal__shield">
              <Icono nombre="escanear" size={24} />
            </div>
            <div className="reporte-modal__header-text">
              <h2>Recibir sin internet</h2>
              <p>Escanee los partes de las unidades</p>
            </div>
          </div>
          <button className="reporte-modal__cerrar" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="reporte-modal__body" style={{ textAlign: 'center' }}>
          <button className="btn btn--primary" style={{ width: '100%', marginBottom: 12 }} onClick={() => setEscaneando(true)}>
            <Icono nombre="escanear" />
            ESCANEAR PARTE
          </button>
          {progreso && <p className="instalar-nota" role="status">{progreso}</p>}
          {errorGuardar && <p style={{ color: '#b3261e', fontSize: 15, fontWeight: 700 }}>{errorGuardar}</p>}

          {pendientes.length > 0 && (
            <>
              <div className="reporte-seccion-titulo">Por aprobar ({pendientes.length})</div>
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
