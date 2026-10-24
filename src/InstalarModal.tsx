import { useState } from 'react';
import type { InstalarEvento } from './instalar';
import { Icono } from './Icono';

type Plataforma = 'android' | 'ios';

function detectarPlataforma(): Plataforma {
  const ua = navigator.userAgent;
  const esIpad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1; // iPadOS se presenta como Mac
  return /iPhone|iPad|iPod/.test(ua) || esIpad ? 'ios' : 'android';
}

export function InstalarModal({
  evento,
  onClose,
}: {
  evento: InstalarEvento | null;
  onClose: () => void;
}) {
  const [plataforma, setPlataforma] = useState<Plataforma>(detectarPlataforma);
  const [resultado, setResultado] = useState('');

  const instalarAhora = async () => {
    if (!evento) return;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    setResultado(outcome === 'accepted' ? 'Instalando... busque el ícono en su pantalla.' : 'Instalación cancelada.');
  };

  return (
    <div className="dialogo-overlay" onClick={onClose}>
      <div
        className="dialogo"
        role="dialog"
        aria-modal="true"
        aria-label="Instalar la aplicación"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reporte-modal__header">
          <div className="reporte-modal__logo-area">
            <img className="reporte-modal__shield" src="/icon-192.png" alt="" width={40} height={40} />
            <div className="reporte-modal__header-text">
              <h2>Instalar la aplicación</h2>
              <p>Tendrá un ícono en su pantalla, como cualquier app</p>
            </div>
          </div>
          <button className="reporte-modal__cerrar" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="dialogo__cuerpo">
          <div className="tabs" role="tablist">
            <button
              role="tab"
              aria-selected={plataforma === 'android'}
              className={`tabs__btn${plataforma === 'android' ? ' tabs__btn--activo' : ''}`}
              onClick={() => setPlataforma('android')}
            >
              <Icono nombre="celular" />
              Android
            </button>
            <button
              role="tab"
              aria-selected={plataforma === 'ios'}
              className={`tabs__btn${plataforma === 'ios' ? ' tabs__btn--activo' : ''}`}
              onClick={() => setPlataforma('ios')}
            >
              <Icono nombre="tablet" />
              iPhone / iPad
            </button>
          </div>

          {plataforma === 'android' ? (
            <>
              {evento && (
                <div className="instalar-directo">
                  <button className="btn btn--success" onClick={instalarAhora}>
                    <Icono nombre="descargar" />
                    Instalar ahora
                  </button>
                  {resultado && <p className="instalar-nota">{resultado}</p>}
                  <p className="instalar-nota">Si el botón no funciona, siga los pasos de abajo.</p>
                </div>
              )}
              <ol className="pasos">
                <li>
                  Abra esta dirección en <b>Google Chrome</b>.
                </li>
                <li>
                  Toque el menú <b>⋮</b> (tres puntos, arriba a la derecha).
                </li>
                <li>
                  Elija <b>"Instalar aplicación"</b> o <b>"Agregar a la pantalla principal"</b>.
                </li>
                <li>
                  Confirme con <b>"Instalar"</b>. El ícono aparecerá en su pantalla.
                </li>
              </ol>
            </>
          ) : (
            <>
              <ol className="pasos">
                <li>
                  Abra esta dirección en <b>Safari</b>. Si la recibió por WhatsApp, toque el enlace y luego
                  el ícono de la brújula para abrirla en Safari.
                </li>
                <li>
                  Toque el botón <b>Compartir</b> (un cuadro con una flecha hacia arriba).
                  <br />
                  <span className="pasos__detalle">
                    En iPhone está en la barra de abajo. En iPad está arriba a la derecha.
                  </span>
                </li>
                <li>
                  Deslice hacia abajo y elija <b>"Agregar a pantalla de inicio"</b>.
                </li>
                <li>
                  Toque <b>"Agregar"</b>. El ícono aparecerá en su pantalla.
                </li>
              </ol>
              <p className="instalar-nota">
                En iPhone y iPad la instalación solo funciona desde Safari, no desde otros navegadores.
              </p>
            </>
          )}

          <p className="instalar-nota instalar-nota--final">
            Después de instalarla, ábrala siempre desde su ícono.
          </p>
          <button className="btn btn--primary btn--centrado" style={{ width: '100%', marginTop: 14 }} onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
