export interface Cuarteto {
  of: number;
  sub: number;
  pt: number;
  axp: number;
}

export interface NovedadesData {
  [categoria: string]: {
    nombres: string[];
    of: number;
    sub: number;
    pt: number;
    axp: number;
  };
}

export interface ParteGeonumerico {
  id?: number;
  titulo: string;
  fecha: Date;
  unidadNombre: string;

  ef_of: number;
  ef_sub: number;
  ef_pt: number;
  ef_axp: number;

  nov_total_of: number;
  nov_total_sub: number;
  nov_total_pt: number;
  nov_total_axp: number;

  elaboradoPor: string;
  novedadesJSON: string;
}

export interface ParteStore {
  unidadNombre: string;
  unidadPadre: string;
  elaboradoPor: string;

  ef: Cuarteto;
  comision: Cuarteto;
  excusado: Cuarteto;
  franquicia: Cuarteto;
  permiso: Cuarteto;
  vacaciones: Cuarteto;
  servicios: Cuarteto;
  retardado: Cuarteto;
  horarioFlexible: Cuarteto;
  otros: Cuarteto;

  nombresDict: { [key: string]: string[] };
}
