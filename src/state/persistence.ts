// Персистентность истории документов в IndexedDB (п. 3.10 ТЗ): все
// промежуточные снимки переживают перезагрузку вкладки. Float64Array
// внутри PhotometryDoc сохраняется структурным клонированием IndexedDB
// без ручной сериализации.
import { openDB, type IDBPDatabase } from 'idb';
import type { DocEntry } from './store';

const DB_NAME = 'iesedit';
// v2: DocEntry сменил форму (snapshots[] → originalDoc/workingDoc) — старые
// записи несовместимы, при апгрейде хранилище просто пересоздаётся.
const DB_VERSION = 2;
const STORE = 'documents';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (db.objectStoreNames.contains(STORE)) {
          db.deleteObjectStore(STORE);
        }
        db.createObjectStore(STORE, { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function saveDocEntry(entry: DocEntry): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE, entry);
  } catch {
    // IndexedDB недоступен (приватный режим, ограничения браузера) — работаем
    // только в памяти текущей вкладки, без падения приложения.
  }
}

export async function deleteDocEntry(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE, id);
  } catch {
    // см. saveDocEntry
  }
}

export async function loadAllDocEntries(): Promise<DocEntry[]> {
  try {
    const db = await getDb();
    return await db.getAll(STORE);
  } catch {
    return [];
  }
}
