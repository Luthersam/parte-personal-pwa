import { useEffect, useRef, useState } from 'react';
import { crearLector } from './escaner';
import { paramsDeEnlace } from './colecta';
import { Icono } from './Icono';
import { useBotonAtras } from './atras';

interface Props {
  onLeido: (datos: { peerId: string; token: string }) => void;
  onClose: () => void;
}

function mensajeDeError(e: unknown): string {
  const nombre = e instanceof DOMException ? e.name : '';
  if (nombre === 'NotAllowedError' || nombre === 'SecurityError') {
    return 'No hay permiso para usar la cámara. Actívelo en los ajustes del navegador para este sitio y vuelva a intentar.';
  }
  if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') return 'No se encontró una cámara en este equipo.';
  if (nombre === 'NotReadableError') return 'La cámara está en uso por otra aplicación. Ciérrela e intente de nuevo.';
  return e instanceof Error ? e.message : 'No se pudo abrir la cámara.';
}

export function EscanerModal({ onLeido, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onLeidoRef = useRef(onLeido);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('Apunte la cámara al QR del coordinador');
  useBotonAtras(onClose);

  useEffect(() => {
    onLeidoRef.current = onLeido;
  }, [onLeido]);

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
            if (texto) {
              const datos = paramsDeEnlace(texto);
              if (datos) {
                activo = false;
                onLeidoRef.current(datos);
                return;
              }
              setAviso('Ese QR no es de Parte de Personal. Use el QR que muestra el coordinador.');
            }
          } catch {
            /* un cuadro que no se pudo leer no es un error: se intenta con el siguiente */
          }
          temporizador = window.setTimeout(ciclo, 250);
        };
        ciclo();
      } catch (e) {
        if (activo) setError(mensajeDeError(e));
      }
    })();

    return () => {
      activo = false;
      window.clearTimeout(temporizador);
      stream?.getTracks().forEach((t) => t.stop()); // apaga la cámara
    };
  }, []);

  return (
    <div className="dialogo-overlay" onClick={onClose}>
      <div className="dialogo" role="dialog" aria-modal="true" aria-label="Escanear QR" onClick={(e) => e.stopPropagation()}>
        <div className="reporte-modal__header">
          <div className="reporte-modal__logo-area">
            <div className="reporte-modal__shield">
              <Icono nombre="escanear" size={24} />
            </div>
            <div className="reporte-modal__header-text">
              <h2>Escanear QR</h2>
              <p>Para enviar su parte al coordinador</p>
            </div>
          </div>
          <button className="reporte-modal__cerrar" onClick={onClose}>
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
              <p className="instalar-nota" style={{ textAlign: 'center' }}>
                {aviso}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
