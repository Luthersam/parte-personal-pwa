import { esNativo } from './nativo';

export const esAndroid = (): boolean => /Android/i.test(navigator.userAgent);

// iPadOS se presenta como Mac, por eso también se mira si tiene pantalla táctil
export const esIOS = (): boolean =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Evento no incluido en los tipos de TypeScript: solo Chrome/Android lo dispara
export interface InstalarEvento extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function yaInstalada(): boolean {
  if (esNativo()) return true; // la app de Android ya está instalada
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
}
