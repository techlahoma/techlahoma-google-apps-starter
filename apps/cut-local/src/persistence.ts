import {
  type HistoryState,
  type Project,
  createInitialProject,
  createHistory,
} from './model.js';

const STORAGE_KEY = 'cut_local_v2_project_state';
const DB_NAME = 'cut_local_media_db';
const STORE_NAME = 'blobs';

interface PersistedPayload {
  version: 2;
  history: {
    past: Project[];
    present: Project;
    future: Project[];
  };
}

// IndexedDB Helper
function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMediaBlob(
  assetId: string,
  blob: Blob | File,
): Promise<void> {
  try {
    const db = await openMediaDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, assetId);
    await new Promise<void>(resolve => {
      tx.oncomplete = () => resolve();
    });
  } catch {
    // IndexedDB store fallback
  }
}

export async function getMediaBlob(
  assetId: string,
): Promise<Blob | File | null> {
  try {
    const db = await openMediaDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(assetId);
    return new Promise(resolve => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteMediaBlob(assetId: string): Promise<void> {
  try {
    const db = await openMediaDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(assetId);
  } catch {
    // Ignore
  }
}

export function isValidProject(project: unknown): project is Project {
  if (typeof project !== 'object' || project === null) return false;
  const p = project as Record<string, unknown>;
  if (p.version !== 2) return false;
  if (typeof p.title !== 'string') return false;
  if (p.aspect !== '16:9' && p.aspect !== '1:1' && p.aspect !== '9:16')
    return false;
  if (
    !Array.isArray(p.tracks) ||
    !Array.isArray(p.assets) ||
    !Array.isArray(p.clips)
  )
    return false;
  return true;
}

export function loadHistory(): HistoryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createHistory(createInitialProject());

    const data = JSON.parse(raw) as PersistedPayload;
    if (!data || data.version !== 2 || !data.history) {
      return createHistory(createInitialProject());
    }

    const {past, present, future} = data.history;

    if (!isValidProject(present)) {
      return createHistory(createInitialProject());
    }

    const validPast = Array.isArray(past) ? past.filter(isValidProject) : [];
    const validFuture = Array.isArray(future)
      ? future.filter(isValidProject)
      : [];

    return {
      past: validPast,
      present,
      future: validFuture,
    };
  } catch {
    return createHistory(createInitialProject());
  }
}

export function saveHistory(history: HistoryState): void {
  try {
    const payload: PersistedPayload = {
      version: 2,
      history,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed to save project to localStorage:', err);
  }
}

export function resetHistory(): HistoryState {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
  return createHistory(createInitialProject());
}
