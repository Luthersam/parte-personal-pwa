import { useEffect, useRef } from 'react';
import { App as AppNativa } from '@capacitor/app';
import { esNativo } from './nativo';

// Botón "atrás" de Android: cierra la ventana que esté arriba (la última registrada).
// Si no hay ninguna, sale de la app. En el navegador no hace nada.
const pila: Array<() => void> = [];
let escuchando = false;

function escucharBotonAtras() {
  if (escuchando || !esNativo()) return;
  escuchando = true;
  void AppNativa.addListener('backButton', () => {
    const cierre = pila[pila.length - 1];
    if (cierre) cierre();
    else void AppNativa.exitApp();
  });
}

export function useBotonAtras(alAtras: () => void, activo = true) {
  const ref = useRef(alAtras);
  useEffect(() => {
    ref.current = alAtras;
  }, [alAtras]);

  useEffect(() => {
    if (!activo) return;
    escucharBotonAtras();
    const entrada = () => ref.current();
    pila.push(entrada);
    return () => {
      const i = pila.lastIndexOf(entrada);
      if (i >= 0) pila.splice(i, 1);
    };
  }, [activo]);
}
