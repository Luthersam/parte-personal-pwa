import { Capacitor } from '@capacitor/core';

// Dirección pública de la app web. Dentro de la app de Android la página se sirve desde
// https://localhost, que no sirve en un QR: otros celulares no podrían abrirla.
export const URL_PUBLICA = 'https://parte-personal-pwa.vercel.app';

// Política de privacidad (página pública; Google Play exige que también se pueda abrir desde la app)
export const URL_PRIVACIDAD = `${URL_PUBLICA}/privacidad.html`;

export const esNativo = (): boolean => Capacitor.isNativePlatform();

// Dirección base para los enlaces que se comparten por QR
export const urlBase = (): string => (esNativo() ? URL_PUBLICA : location.origin);
