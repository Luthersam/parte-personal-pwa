// Evento no incluido en los tipos de TypeScript: solo Chrome/Android lo dispara
export interface InstalarEvento extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function yaInstalada(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
}
