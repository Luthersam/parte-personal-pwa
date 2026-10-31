import { useEffect, useRef, useState } from 'react';
import { crearLector } from './escaner';
import { Icono } from './Icono';
import { useBotonAtras } from './atras';

// Lee códigos QR con la cámara y entrega cada texto leído a quien lo usa.
// Se apaga la cámara al desmontar.
export function ScannerCodigos({
  titulo,
  instruccion,
  onTexto,
  onCerrar,
  progreso,
}: {
  titulo: string;
  instruccion: string;
  onTexto: (texto: string) => void;
  onCerrar: () => void;
  progreso?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onTextoRef = useRef(onTexto);
  const [error, setError] = useState('');
  useBotonAtras(onCerrar);

  useEffect(() => {
    onTextoRef.current = onTexto;
  }, [onTexto]);

  useEffect(() => {
    let activo = true;
    let stream: MediaStream | null = null;
    let temporizador = 0;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este navegador no permite usar la cámara.');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        const video = videoRef.current;
        if (!activo || !video) return;
        video.srcObject = stream;
        await video.play();
        const leer = await crearLector();

        const ciclo = async () => {
          if (!activo) return;
          try {
            const texto = await leer(video);
            if (texto) onTextoRef.current(texto);
          } catch {
            /* un cuadro que no se pudo leer no es un error */
          }
          temporizador = window.setTimeout(ciclo, 150);
        };
        ciclo();
      } catch (e) {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudo abrir la cámara.');
      }
    })();

    return () => {
      activo = false;
      window.clearTimeout(temporizador);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="dialogo-overlay" onClick={onCerrar}>
      <div className="dialogo" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="reporte-modal__header">
          <div className="reporte-modal__logo-area">
            <div className="reporte-modal__shield">
              <Icono nombre="escanear" size={24} />
            </div>
            <div className="reporte-modal__header-text">
              <h2>{titulo}</h2>
              <p>{instruccion}</p>
            </div>
          </div>
          <button className="reporte-modal__cerrar" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
        <div className="dialogo__cuerpo">
          {error ? (
            <p className="aviso-error">{error}</p>
          ) : (
            <>
              <div className="escaner">
                <video ref={videoRef} className="escaner__video" playsInline muted />
                <div className="escaner__marco" aria-hidden="true" />
              </div>
              {progreso && (
                <p className="instalar-nota" style={{ textAlign: 'center' }} role="status">
                  {progreso}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
