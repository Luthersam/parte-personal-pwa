import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { ParteGeonumerico } from './types';

interface PartePersonalDB extends DBSchema {
  partes: {
    key: number;
    value: ParteGeonumerico;
    indexes: { 'by-fecha': Date; 'by-unidad': string };
  };
}

let db: IDBPDatabase<PartePersonalDB>;

export async function initDB() {
  db = await openDB<PartePersonalDB>('PartePersonalDB', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('partes')) {
        const store = db.createObjectStore('partes', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-fecha', 'fecha');
        store.createIndex('by-unidad', 'unidadNombre');
      }
    },
  });
  return db;
}

export async function guardarParte(parte: ParteGeonumerico) {
  if (!db) await initDB();

  const nombreU = parte.unidadNombre.toUpperCase().trim();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Buscar si ya existe un parte para esta unidad hoy
  const allPartes = await db.getAll('partes');
  const existente = allPartes.find((p) => {
    const pFecha = new Date(p.fecha);
    pFecha.setHours(0, 0, 0, 0);
    return p.unidadNombre.toUpperCase() === nombreU && pFecha.getTime() === hoy.getTime();
  });

  if (existente) {
    parte.id = existente.id;
    return await db.put('partes', parte);
  } else {
    return await db.add('partes', parte);
  }
}

export async function obtenerPartesHoy() {
  if (!db) await initDB();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const mañana = new Date(hoy);
  mañana.setDate(mañana.getDate() + 1);

  const allPartes = await db.getAll('partes');
  return allPartes.filter((p) => {
    const pFecha = new Date(p.fecha);
    return pFecha >= hoy && pFecha < mañana;
  });
}

export async function obtenerTodosPartes() {
  if (!db) await initDB();
  return await db.getAll('partes');
}

export async function obtenerPartePorUnidad(unidad: string) {
  if (!db) await initDB();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const allPartes = await db.getAll('partes');
  return allPartes.find((p) => {
    const pFecha = new Date(p.fecha);
    pFecha.setHours(0, 0, 0, 0);
    return p.unidadNombre.toUpperCase() === unidad.toUpperCase() && pFecha.getTime() === hoy.getTime();
  });
}

export async function borrarPartesHoy() {
  if (!db) await initDB();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const mañana = new Date(hoy);
  mañana.setDate(mañana.getDate() + 1);

  const allPartes = await db.getAll('partes');
  const parteHoy = allPartes.filter((p) => {
    const pFecha = new Date(p.fecha);
    return pFecha >= hoy && pFecha < mañana;
  });

  for (const parte of parteHoy) {
    if (parte.id) await db.delete('partes', parte.id);
  }
}
