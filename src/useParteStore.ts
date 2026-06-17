import { useState, useCallback } from 'react';
import type { Cuarteto, ParteStore, NovedadesData } from './types';

const CATEGORIAS = [
  { id: 'com', label: 'COMISIÓN' },
  { id: 'exc', label: 'EXCUSADO SERVICIO' },
  { id: 'fra', label: 'FRANQUICIA' },
  { id: 'per', label: 'PERMISO' },
  { id: 'vac', label: 'VACACIONES' },
  { id: 'ser', label: 'SERVICIOS' },
  { id: 'ret', label: 'RETARDADO' },
  { id: 'hor', label: 'HORARIO FLEXIBLE' },
  { id: 'otr', label: 'OTROS' },
];

const INIT_CUARTETO: Cuarteto = { of: 0, sub: 0, pt: 0, axp: 0 };

export function useParteStore() {
  const [store, setStore] = useState<ParteStore>({
    unidadNombre: '',
    unidadPadre: '',
    elaboradoPor: '',
    ef: INIT_CUARTETO,
    comision: INIT_CUARTETO,
    excusado: INIT_CUARTETO,
    franquicia: INIT_CUARTETO,
    permiso: INIT_CUARTETO,
    vacaciones: INIT_CUARTETO,
    servicios: INIT_CUARTETO,
    retardado: INIT_CUARTETO,
    horarioFlexible: INIT_CUARTETO,
    otros: INIT_CUARTETO,
    nombresDict: {},
  });

  const updateEF = useCallback((field: keyof Cuarteto, value: number) => {
    setStore((prev) => ({
      ...prev,
      ef: { ...prev.ef, [field]: value },
    }));
  }, []);

  const updateNovedad = useCallback(
    (categoria: string, field: keyof Cuarteto, value: number) => {
      setStore((prev) => {
        const categoriaKey = Object.keys(prev).find(
          (k) => k !== 'unidadNombre' && k !== 'unidadPadre' && k !== 'elaboradoPor' && k !== 'ef' && k !== 'nombresDict'
        );

        const mapping: { [key: string]: keyof ParteStore } = {
          com: 'comision',
          exc: 'excusado',
          fra: 'franquicia',
          per: 'permiso',
          vac: 'vacaciones',
          ser: 'servicios',
          ret: 'retardado',
          hor: 'horarioFlexible',
          otr: 'otros',
        };

        const key = mapping[categoria];
        if (!key) return prev;

        const currentCuarteto = prev[key] as Cuarteto;
        return {
          ...prev,
          [key]: { ...currentCuarteto, [field]: value },
        };
      });
    },
    []
  );

  const addNombre = useCallback((categoria: string, nombre: string) => {
    if (!nombre.trim()) return;
    setStore((prev) => ({
      ...prev,
      nombresDict: {
        ...prev.nombresDict,
        [categoria]: [...(prev.nombresDict[categoria] || []), nombre.toUpperCase()],
      },
    }));
  }, []);

  const removeNombre = useCallback((categoria: string, index: number) => {
    setStore((prev) => ({
      ...prev,
      nombresDict: {
        ...prev.nombresDict,
        [categoria]: prev.nombresDict[categoria].filter((_, i) => i !== index),
      },
    }));
  }, []);

  const convertirADict = useCallback((): NovedadesData => {
    const dict: NovedadesData = {};

    const mapping: { [key: string]: keyof ParteStore } = {
      'COMISIÓN': 'comision',
      'EXCUSADO SERVICIO': 'excusado',
      'FRANQUICIA': 'franquicia',
      'PERMISO': 'permiso',
      'VACACIONES': 'vacaciones',
      'SERVICIOS': 'servicios',
      'RETARDADO': 'retardado',
      'HORARIO FLEXIBLE': 'horarioFlexible',
      'OTROS': 'otros',
    };

    for (const [label, key] of Object.entries(mapping)) {
      const cuarteto = store[key] as Cuarteto;
      const idKey = CATEGORIAS.find((c) => c.label === label)?.id || '';
      const nombres = (store.nombresDict[idKey] || []).filter((n) => n.trim());

      if (nombres.length > 0 || cuarteto.of + cuarteto.sub + cuarteto.pt + cuarteto.axp > 0) {
        dict[label] = {
          nombres,
          of: cuarteto.of,
          sub: cuarteto.sub,
          pt: cuarteto.pt,
          axp: cuarteto.axp,
        };
      }
    }

    return dict;
  }, [store]);

  const cargarDesdeDict = useCallback((dict: NovedadesData) => {
    const newNombresDict: { [key: string]: string[] } = {};

    const mapping: { [label: string]: string } = {
      'COMISIÓN': 'com',
      'EXCUSADO SERVICIO': 'exc',
      'FRANQUICIA': 'fra',
      'PERMISO': 'per',
      'VACACIONES': 'vac',
      'SERVICIOS': 'ser',
      'RETARDADO': 'ret',
      'HORARIO FLEXIBLE': 'hor',
      'OTROS': 'otr',
    };

    setStore((prev) => {
      const newStore = { ...prev };

      for (const [label, data] of Object.entries(dict)) {
        const id = mapping[label];
        if (id) {
          newNombresDict[id] = data.nombres;

          const cuartetoKey = Object.entries(mapping).find(
            ([l]) => l === label
          )?.[1];

          if (cuartetoKey) {
            const key = {
              com: 'comision',
              exc: 'excusado',
              fra: 'franquicia',
              per: 'permiso',
              vac: 'vacaciones',
              ser: 'servicios',
              ret: 'retardado',
              hor: 'horarioFlexible',
              otr: 'otros',
            }[cuartetoKey] as keyof ParteStore;

            (newStore[key] as Cuarteto) = {
              of: data.of,
              sub: data.sub,
              pt: data.pt,
              axp: data.axp,
            };
          }
        }
      }

      return { ...newStore, nombresDict: newNombresDict };
    });
  }, []);

  const obtenerTotales = useCallback(() => {
    const novedades: Cuarteto = {
      of: store.comision.of + store.excusado.of + store.franquicia.of + store.permiso.of + store.vacaciones.of + store.servicios.of + store.retardado.of + store.horarioFlexible.of + store.otros.of,
      sub: store.comision.sub + store.excusado.sub + store.franquicia.sub + store.permiso.sub + store.vacaciones.sub + store.servicios.sub + store.retardado.sub + store.horarioFlexible.sub + store.otros.sub,
      pt: store.comision.pt + store.excusado.pt + store.franquicia.pt + store.permiso.pt + store.vacaciones.pt + store.servicios.pt + store.retardado.pt + store.horarioFlexible.pt + store.otros.pt,
      axp: store.comision.axp + store.excusado.axp + store.franquicia.axp + store.permiso.axp + store.vacaciones.axp + store.servicios.axp + store.retardado.axp + store.horarioFlexible.axp + store.otros.axp,
    };

    const disponible: Cuarteto = {
      of: store.ef.of - novedades.of,
      sub: store.ef.sub - novedades.sub,
      pt: store.ef.pt - novedades.pt,
      axp: store.ef.axp - novedades.axp,
    };

    return { novedades, disponible };
  }, [store]);

  const limpiar = useCallback(() => {
    setStore({
      unidadNombre: '',
      unidadPadre: '',
      elaboradoPor: '',
      ef: INIT_CUARTETO,
      comision: INIT_CUARTETO,
      excusado: INIT_CUARTETO,
      franquicia: INIT_CUARTETO,
      permiso: INIT_CUARTETO,
      vacaciones: INIT_CUARTETO,
      servicios: INIT_CUARTETO,
      retardado: INIT_CUARTETO,
      horarioFlexible: INIT_CUARTETO,
      otros: INIT_CUARTETO,
      nombresDict: {},
    });
  }, []);

  return {
    store,
    setStore,
    updateEF,
    updateNovedad,
    addNombre,
    removeNombre,
    convertirADict,
    cargarDesdeDict,
    obtenerTotales,
    limpiar,
  };
}
