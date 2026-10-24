// Lectura de códigos QR con la cámara.
// Chrome en Android trae un lector nativo (BarcodeDetector). Si el navegador no lo tiene,
// se usa jsQR, que se descarga solo cuando hace falta.

interface DetectorBarras {
  detect: (fuente: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}
interface ConstructorDetector {
  new (opciones?: { formats: string[] }): DetectorBarras;
  getSupportedFormats?: () => Promise<string[]>;
}

export type Lector = (video: HTMLVideoElement) => Promise<string | null>;

export async function leerQrDeImagen(imagen: ImageData): Promise<string | null> {
  const { default: jsQR } = await import('jsqr');
  return jsQR(imagen.data, imagen.width, imagen.height, { inversionAttempts: 'dontInvert' })?.data ?? null;
}

export async function crearLector(): Promise<Lector> {
  const Detector = (window as unknown as { BarcodeDetector?: ConstructorDetector }).BarcodeDetector;
  if (Detector) {
    try {
      const formatos = (await Detector.getSupportedFormats?.()) ?? ['qr_code'];
      if (formatos.includes('qr_code')) {
        const detector = new Detector({ formats: ['qr_code'] });
        return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
      }
    } catch {
      /* se usa la librería de respaldo */
    }
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async (video) => {
    if (!ctx || !video.videoWidth) return null;
    const escala = Math.min(1, 640 / video.videoWidth); // más chica = más rápido
    canvas.width = Math.round(video.videoWidth * escala);
    canvas.height = Math.round(video.videoHeight * escala);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return leerQrDeImagen(ctx.getImageData(0, 0, canvas.width, canvas.height));
  };
}
