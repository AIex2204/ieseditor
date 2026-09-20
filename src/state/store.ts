import { create } from 'zustand';
import type { PhotometryDoc } from '../core/ies/types';
import { toMeters } from '../core/ies/normalizeUnits';
import { saveDocEntry, deleteDocEntry, loadAllDocEntries } from './persistence';

export interface DocEntry {
  id: string;
  name: string;
  /** Состояние на момент загрузки/последнего сохранения — базовая точка для «Отменить изменения». */
  originalDoc: PhotometryDoc;
  /** Текущее рабочее состояние: инструменты пишут сюда постоянно, без истории шагов. */
  workingDoc: PhotometryDoc;
}

export function activeDoc(entry: DocEntry): PhotometryDoc {
  return entry.workingDoc;
}

export const MAX_DOCUMENTS = 20;

export type ViewMode = 'files' | 'compare' | 'reference' | 'about';

/**
 * Правки летят в рабочий документ на каждое движение ползунка и на каждый
 * символ в редакторе полей, а документ может нести сотни тысяч значений —
 * поэтому в IndexedDB пишем не на каждое изменение, а последним состоянием
 * после короткой паузы. В памяти состояние обновляется сразу.
 */
const PERSIST_DEBOUNCE_MS = 400;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistPending: DocEntry | null = null;

function persistSoon(entry: DocEntry): void {
  persistPending = entry;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const pending = persistPending;
    persistPending = null;
    if (pending) void saveDocEntry(pending);
  }, PERSIST_DEBOUNCE_MS);
}

function persistNow(entry: DocEntry): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
    persistPending = null;
  }
  void saveDocEntry(entry);
}

function deriveEditedName(name: string): string {
  const base = name.replace(/\.(ies|ldt)$/i, '');
  const m = base.match(/^(.*)\(edited v(\d+)\)\s*$/i);
  if (m) {
    const root = m[1].trim();
    const n = Number(m[2]) + 1;
    return `${root} (edited v${n}).ies`;
  }
  return `${base} (edited v1).ies`;
}

interface AppState {
  documents: DocEntry[];
  activeId: string | null;
  /**
   * Точка отсчёта для сравнения "было/стало", пока открыт инструмент правки —
   * рабочий документ на момент открытия инструмента, не более.
   */
  previewBaseline: PhotometryDoc | null;
  hydrated: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  /** Возвращает id нового документа, либо null, если достигнут лимит MAX_DOCUMENTS. */
  addDocument: (name: string, doc: PhotometryDoc) => string | null;
  removeDocument: (id: string) => void;
  setActive: (id: string) => void;
  /** Инструменты пишут сюда на каждое изменение параметров — рабочий документ всегда актуален. */
  updateWorking: (doc: PhotometryDoc) => void;
  /** Откатывает рабочий документ к состоянию на момент загрузки/последнего сохранения. */
  discardChanges: () => void;
  /** Создаёт новый документ "<имя> (edited vN).ies" из текущего рабочего состояния и делает его активным. */
  saveAsNewFile: () => { name: string; doc: PhotometryDoc } | null;
  renameDocument: (id: string, name: string) => void;
  setPreviewBaseline: (doc: PhotometryDoc | null) => void;
  hydrateFromStorage: () => Promise<void>;
}

let nextId = 1;

export const useAppStore = create<AppState>((set, get) => ({
  documents: [],
  activeId: null,
  previewBaseline: null,
  hydrated: false,
  viewMode: 'files',
  setViewMode: (mode) => set({ viewMode: mode }),

  addDocument: (name, doc) => {
    if (get().documents.length >= MAX_DOCUMENTS) return null;
    const id = `doc-${nextId++}`;
    const entry: DocEntry = { id, name, originalDoc: doc, workingDoc: doc };
    set((s) => ({ documents: [...s.documents, entry], activeId: id, previewBaseline: null }));
    void saveDocEntry(entry);
    return id;
  },

  removeDocument: (id) => {
    set((s) => {
      const documents = s.documents.filter((d) => d.id !== id);
      const activeId = s.activeId === id ? (documents[0]?.id ?? null) : s.activeId;
      return { documents, activeId, previewBaseline: s.activeId === id ? null : s.previewBaseline };
    });
    void deleteDocEntry(id);
  },

  setActive: (id) => set({ activeId: id, previewBaseline: null }),

  updateWorking: (doc) => {
    const { activeId, documents } = get();
    if (!activeId) return;
    const entry = documents.find((d) => d.id === activeId);
    if (!entry) return;
    const nextEntry: DocEntry = { ...entry, workingDoc: doc };
    set((s) => ({ documents: s.documents.map((d) => (d.id === activeId ? nextEntry : d)) }));
    persistSoon(nextEntry);
  },

  discardChanges: () => {
    const { activeId, documents } = get();
    if (!activeId) return;
    const entry = documents.find((d) => d.id === activeId);
    if (!entry) return;
    const nextEntry: DocEntry = { ...entry, workingDoc: entry.originalDoc };
    set((s) => ({
      documents: s.documents.map((d) => (d.id === activeId ? nextEntry : d)),
      previewBaseline: null,
    }));
    persistNow(nextEntry);
  },

  saveAsNewFile: () => {
    if (get().documents.length >= MAX_DOCUMENTS) return null;
    const { activeId, documents } = get();
    const entry = documents.find((d) => d.id === activeId);
    if (!entry) return null;
    const name = deriveEditedName(entry.name);
    const id = `doc-${nextId++}`;
    const newEntry: DocEntry = { id, name, originalDoc: entry.workingDoc, workingDoc: entry.workingDoc };
    // Исходный файл откатывается к своему оригиналу — так на вкладке
    // "Сравнение" можно сопоставить "до" (исходный файл) и "после" (новый).
    const resetSourceEntry: DocEntry = { ...entry, workingDoc: entry.originalDoc };
    set((s) => ({
      documents: [...s.documents.map((d) => (d.id === entry.id ? resetSourceEntry : d)), newEntry],
      activeId: id,
      previewBaseline: null,
    }));
    persistNow(resetSourceEntry);
    void saveDocEntry(newEntry);
    return { name, doc: newEntry.workingDoc };
  },

  renameDocument: (id, name) => {
    set((s) => ({ documents: s.documents.map((d) => (d.id === id ? { ...d, name } : d)) }));
    const entry = get().documents.find((d) => d.id === id);
    if (entry) void saveDocEntry(entry);
  },

  setPreviewBaseline: (doc) => set({ previewBaseline: doc }),

  hydrateFromStorage: async () => {
    if (get().hydrated) return;
    const entries = await loadAllDocEntries();
    if (entries.length === 0) {
      set({ hydrated: true });
      return;
    }
    let maxDocId = 0;
    for (const e of entries) {
      const dn = Number(e.id.replace('doc-', ''));
      if (Number.isFinite(dn)) maxDocId = Math.max(maxDocId, dn);
    }
    nextId = maxDocId + 1;
    // Записи могли быть сохранены до перехода на «только метры» — пересчёт
    // применяем и к ним. Общую ссылку originalDoc/workingDoc сохраняем,
    // иначе файл без правок после перезагрузки выглядел бы изменённым.
    const normalized = entries.map((e) => {
      const originalDoc = toMeters(e.originalDoc);
      const workingDoc = e.workingDoc === e.originalDoc ? originalDoc : toMeters(e.workingDoc);
      return { ...e, originalDoc, workingDoc };
    });
    set({ documents: normalized, activeId: normalized[0]?.id ?? null, hydrated: true });
  },
}));

export function useActiveDocEntry(): DocEntry | null {
  const documents = useAppStore((s) => s.documents);
  const activeId = useAppStore((s) => s.activeId);
  return documents.find((d) => d.id === activeId) ?? null;
}
