import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { ParteGeonumerico } from './types';

// Detectar si IndexedDB está disponible (falla en Safari privado y algunos contextos iOS)
const idbAvailable = (() => {
  try {
    return typeof window !== 'undefined' &&
      'indexedDB' in window &&
      window.indexedDB != null;
  } catch {
    return false;
  }
})();

// ============================================================
// INDEXED DB (navegadores modernos)
// ============================================================

interface PartePersonalDB extends DBSchema {
  partes: {
    key: number;
    value: ParteGeonumerico;
    indexes: { 'by-fecha': Date; 'by-unidad': string };
  };
}

let db: IDBPDatabase<PartePersonalDB> | null = null;

async function idbInit() {
  db = await openDB<PartePersonalDB>('PartePersonalDB', 1, {
    upgrade(store) {
      if (!store.objectStoreNames.contains('partes')) {
        const s = store.createObjectStore('partes', { keyPath: 'id', autoIncrement: true });
        s.createIndex('by-fecha', 'fecha');
        s.createIndex('by-unidad', 'unidadNombre');
      }
    },
  });
}

async function idbGetDB() {
  if (!db) await idbInit();
  return db!;
}

// ============================================================
// LOCAL STORAGE FALLBACK (Safari privado / iOS restricto)
// ============================================================

const LS_KEY = 'partePersonalData';
let lsNextId = 1;

function lsGetAll(): ParteGeonumerico[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const items: ParteGeonumerico[] = raw ? JSON.parse(raw) : [];
    items.forEach((p) => { p.fecha = new Date(p.fecha); });
    return items;
  } catch {
    return [];
  }
}

function lsSaveAll(partes: ParteGeonumerico[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(partes));
}

function lsNextID(partes: ParteGeonumerico[]) {
  const max = partes.reduce((m, p) => Math.max(m, p.id ?? 0), 0);
  return max + 1;
}

// ============================================================
// API PÚBLICA (usa IDB o localStorage automáticamente)
// ============================================================

export async function initDB() {
  if (idbAvailable) await idbInit();
}

export async function guardarParte(parte: ParteGeonumerico) {
  const nombreU = parte.unidadNombre.toUpperCase().trim();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (idbAvailable) {
    const store = await idbGetDB();
    const allPartes = await store.getAll('partes');
    const existente = allPartes.find((p) => {
      const f = new Date(p.fecha);
      f.setHours(0, 0, 0, 0);
      return p.unidadNombre.toUpperCase() === nombreU && f.getTime() === hoy.getTime();
    });
    if (existente) {
      parte.id = existente.id;
      return store.put('partes', parte);
    }
    return store.add('partes', parte);
  }

  // Fallback localStorage
  const partes = lsGetAll();
  const idx = partes.findIndex((p) => {
    const f = new Date(p.fecha);
    f.setHours(0, 0, 0, 0);
    return p.unidadNombre.toUpperCase() === nombreU && f.getTime() === hoy.getTime();
  });
  if (idx >= 0) {
    parte.id = partes[idx].id;
    partes[idx] = parte;
  } else {
    parte.id = lsNextID(partes);
    partes.push(parte);
  }
  lsSaveAll(partes);
}

export async function obtenerPartesHoy(): Promise<ParteGeonumerico[]> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const mañana = new Date(hoy);
  mañana.setDate(mañana.getDate() + 1);

  const isHoy = (p: ParteGeonumerico) => {
    const f = new Date(p.fecha);
    return f >= hoy && f < mañana;
  };

  if (idbAvailable) {
    const store = await idbGetDB();
    return (await store.getAll('partes')).filter(isHoy);
  }
  return lsGetAll().filter(isHoy);
}

export async function obtenerTodosPartes(): Promise<ParteGeonumerico[]> {
  if (idbAvailable) {
    const store = await idbGetDB();
    return store.getAll('partes');
  }
  return lsGetAll();
}

export async function obtenerPartePorUnidad(unidad: string): Promise<ParteGeonumerico | undefined> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const match = (p: ParteGeonumerico) => {
    const f = new Date(p.fecha);
    f.setHours(0, 0, 0, 0);
    return p.unidadNombre.toUpperCase() === unidad.toUpperCase() && f.getTime() === hoy.getTime();
  };

  if (idbAvailable) {
    const store = await idbGetDB();
    return (await store.getAll('partes')).find(match);
  }
  return lsGetAll().find(match);
}

export async function borrarPartesHoy() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const mañana = new Date(hoy);
  mañana.setDate(mañana.getDate() + 1);

  if (idbAvailable) {
    const store = await idbGetDB();
    const all = await store.getAll('partes');
    for (const p of all) {
      const f = new Date(p.fecha);
      if (f >= hoy && f < mañana && p.id != null) {
        await store.delete('partes', p.id);
      }
    }
    return;
  }

  const partes = lsGetAll().filter((p) => {
    const f = new Date(p.fecha);
    return !(f >= hoy && f < mañana);
  });
  lsSaveAll(partes);
}
