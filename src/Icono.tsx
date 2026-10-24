// Íconos de línea: cuadrícula de 24 px, trazo uniforme y esquinas redondeadas.
// El grosor se ajusta en un solo lugar: --icono-trazo (styles.css).

const CIRCULO = 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z';

const TRAZOS = {
  guardar: ['M4.5 12.5l5 5L19.5 6.5'],
  actualizar: [
    'M20 11.5a8 8 0 0 0-14.3-4.3L4 9',
    'M4 4.5V9h4.5',
    'M4 12.5a8 8 0 0 0 14.3 4.3L20 15',
    'M20 19.5V15h-4.5',
  ],
  reporte: [
    'M9 3.5h6v3H9z',
    'M9 5H7a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 17 5h-2',
    'M8.5 11.5h7',
    'M8.5 15.5h5',
  ],
  limpiar: [
    'M4 7h16',
    'M9.5 7V4.5h5V7',
    'M6.5 7l1 12.5h9l1-12.5',
    'M10 11v5.5',
    'M14 11v5.5',
  ],
  qr: [
    'M4 4h6v6H4z',
    'M14 4h6v6h-6z',
    'M4 14h6v6H4z',
    'M14 14h3v3h-3z',
    'M20 14v3',
    'M14 20h3',
    'M20 20h.01',
  ],
  descargar: ['M12 4v10.5', 'M7.5 10.5l4.5 4.5 4.5-4.5', 'M5 19.5h14'],
  celular: ['M8 3h8a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 16 21H8a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 8 3z', 'M10.5 18h3'],
  tablet: ['M5.5 3.5h13A1.5 1.5 0 0 1 20 5v14a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V5a1.5 1.5 0 0 1 1.5-1.5z', 'M11 17.5h2'],
  cerrar: ['M6 6l12 12', 'M18 6L6 18'],
  mas: ['M12 5v14', 'M5 12h14'],
  campana: ['M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z', 'M10 21a2 2 0 0 0 4 0'],
  reloj: [CIRCULO, 'M12 7.5V12l3 2'],
  enviar: ['M20.5 3.5l-17 7 6.5 3 3 6.5z', 'M10 13.5l10.5-10'],
  circuloOk: [CIRCULO, 'M8.5 12.3l2.5 2.5 4.5-5'],
  circuloX: [CIRCULO, 'M9.5 9.5l5 5', 'M14.5 9.5l-5 5'],
  imagen: [
    'M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5z',
    'M3.5 16l5-5 4 4 3-3 5 5',
    'M9 9.5h.01',
  ],
  texto: [
    'M6.5 3.5H14l4.5 4.5v11.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z',
    'M14 3.5V8h4.5',
    'M8.5 13h7',
    'M8.5 16.5h7',
  ],
  chevron: ['M6 9.5l6 6 6-6'],
  escanear: [
    'M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8',
    'M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8',
    'M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16',
    'M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16',
    'M4 12h16',
  ],
  atras: ['M14.5 6l-6 6 6 6'],
} as const;

export type NombreIcono = keyof typeof TRAZOS;

export function Icono({ nombre, size = 22, className = '' }: { nombre: NombreIcono; size?: number; className?: string }) {
  return (
    <svg
      className={`icono ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {TRAZOS[nombre].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
