/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DB_NAME = 'CivicPulseOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

export interface DraftReport {
  id: string;
  file: File;
  mediaType: 'image' | 'video';
  location: { lat: number; lng: number };
  createdAt: string;
  title: string;
  category: string;
  description: string;
  severity: number;
  status: 'pending' | 'uploading' | 'failed' | 'completed';
  errorMessage?: string;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveDraft = async (draft: DraftReport): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(draft);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getDrafts = async (): Promise<DraftReport[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const deleteDraft = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearCompletedDrafts = async (): Promise<void> => {
  const drafts = await getDrafts();
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const draft of drafts) {
    if (draft.status === 'completed') {
      store.delete(draft.id);
    }
  }
};
