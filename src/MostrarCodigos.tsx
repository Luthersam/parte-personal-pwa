import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Muestra una serie de códigos QR que avanzan solos (y se pueden mover a mano).
// Lo usa la unidad para entregar su parte y el coordinador para confirmar.
export function MostrarCodigos({
  textos,
  titulo,
  instruccion,
  textoFinal,
  onFinal,
}: {
  textos: string[];
  titulo: string;
  instruccion: string;
  textoFinal: string;
  onFinal: () => void;
}) {
  const [indice, setIndice] = useState(0);
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all(textos.map((t) => QRCode.toDataURL(t, { width: 360, margin: 2, errorCorrectionLevel: 'M' }))).then(
      (lista) => {
        if (vivo) setImagenes(lista);
      }
    );
    return () => {
      vivo = false;
    };
  }, [textos]);

  // Avanza solo, para que el otro celular capture cada código
  useEffect(() => {
    if (pausado || textos.length < 2) return;
    const id = window.setInterval(() => setIndice((i) => (i + 1) % textos.length), 1500);
    return () => window.clearInterval(id);
  }, [pausado, textos.length]);

  const total = textos.length;
  const mover = (delta: number) => {
    setPausado(true);
    setIndice((i) => (i + delta + total) % total);
  };

  return (
    <div className="codigos">
      <h3 className="codigos__titulo">{titulo}</h3>
      <p className="codigos__instruccion">{instruccion}</p>

      <div className="codigos__marco">
        {imagenes[indice] ? (
          <img src={imagenes[indice]} alt={`Código ${indice + 1} de ${total}`} width={300} height={300} />
        ) : (
          <p>Generando códigos...</p>
        )}
      </div>

      <p className="codigos__contador" aria-live="polite">
        Código {indice + 1} de {total}
      </p>

      {total > 1 && (
        <div className="codigos__controles">
          <button type="button" className="btn btn--primary" onClick={() => mover(-1)} aria-label="Código anterior">
            ‹ Anterior
          </button>
          <button type="button" className="btn btn--primary" onClick={() => mover(1)} aria-label="Código siguiente">
            Siguiente ›
          </button>
        </div>
      )}

      <button type="button" className="btn btn--success codigos__final" onClick={onFinal}>
        {textoFinal}
      </button>
    </div>
  );
}
