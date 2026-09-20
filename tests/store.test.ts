import { beforeEach, describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import { activeDoc, MAX_DOCUMENTS, useAppStore } from '../src/state/store';

beforeEach(() => {
  useAppStore.setState({ documents: [], activeId: null, previewBaseline: null, hydrated: true, viewMode: 'files' });
});

describe('useAppStore — рабочий документ без истории шагов', () => {
  it('addDocument создаёт документ, где originalDoc и workingDoc совпадают', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const id = useAppStore.getState().addDocument('test.ies', doc);
    const entry = useAppStore.getState().documents.find((d) => d.id === id)!;
    expect(entry.originalDoc).toBe(doc);
    expect(entry.workingDoc).toBe(doc);
    expect(activeDoc(entry)).toBe(doc);
  });

  it('updateWorking меняет только рабочий документ, не исходный', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    useAppStore.getState().addDocument('test.ies', doc);
    const doc2 = { ...doc, inputWatts: 999 };
    useAppStore.getState().updateWorking(doc2);

    const entry = useAppStore.getState().documents[0];
    expect(activeDoc(entry).inputWatts).toBe(999);
    expect(entry.originalDoc.inputWatts).toBe(doc.inputWatts);
  });

  it('повторные updateWorking накапливаются — каждое следующее видит предыдущее', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    useAppStore.getState().addDocument('test.ies', doc);
    useAppStore.getState().updateWorking({ ...doc, inputWatts: 111 });
    const afterFirst = activeDoc(useAppStore.getState().documents[0]);
    useAppStore.getState().updateWorking({ ...afterFirst, ballastFactor: 0.9 });

    const entry = useAppStore.getState().documents[0];
    expect(activeDoc(entry).inputWatts).toBe(111);
    expect(activeDoc(entry).ballastFactor).toBe(0.9);
  });

  it('discardChanges возвращает рабочий документ к исходному', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    useAppStore.getState().addDocument('test.ies', doc);
    useAppStore.getState().updateWorking({ ...doc, inputWatts: 111 });
    expect(activeDoc(useAppStore.getState().documents[0]).inputWatts).toBe(111);

    useAppStore.getState().discardChanges();
    const entry = useAppStore.getState().documents[0];
    expect(activeDoc(entry)).toBe(entry.originalDoc);
    expect(activeDoc(entry).inputWatts).toBe(doc.inputWatts);
  });

  it('saveAsNewFile создаёт "имя (edited v1).ies", делает его активным, старый файл откатывается к исходнику', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const originalId = useAppStore.getState().addDocument('test.ies', doc);
    useAppStore.getState().updateWorking({ ...doc, inputWatts: 111 });

    const result = useAppStore.getState().saveAsNewFile();
    expect(result?.name).toBe('test (edited v1).ies');
    expect(result?.doc.inputWatts).toBe(111);

    const state = useAppStore.getState();
    expect(state.documents).toHaveLength(2);
    expect(state.activeId).not.toBe(originalId);
    const newEntry = state.documents.find((d) => d.id === state.activeId)!;
    expect(newEntry.name).toBe('test (edited v1).ies');
    expect(activeDoc(newEntry).inputWatts).toBe(111);
    // исходный файл откатился к своему оригиналу — на вкладке "Сравнение"
    // теперь можно сопоставить "до" (старый файл) и "после" (новый)
    const oldEntry = state.documents.find((d) => d.id === originalId)!;
    expect(activeDoc(oldEntry)).toBe(oldEntry.originalDoc);
    expect(activeDoc(oldEntry).inputWatts).toBe(doc.inputWatts);
  });

  it('повторное saveAsNewFile увеличивает номер версии: (edited v1) → (edited v2)', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    useAppStore.getState().addDocument('test.ies', doc);
    useAppStore.getState().saveAsNewFile();
    const second = useAppStore.getState().saveAsNewFile();
    expect(second?.name).toBe('test (edited v2).ies');
  });

  it('removeDocument сбрасывает activeId на другой документ или null', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const id1 = useAppStore.getState().addDocument('a.ies', doc);
    useAppStore.getState().addDocument('b.ies', doc);
    useAppStore.getState().setActive(id1!);
    useAppStore.getState().removeDocument(id1!);
    expect(useAppStore.getState().activeId).not.toBe(id1);
    expect(useAppStore.getState().documents).toHaveLength(1);
  });

  it('addDocument отказывает после достижения MAX_DOCUMENTS', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    for (let i = 0; i < MAX_DOCUMENTS; i++) {
      const id = useAppStore.getState().addDocument(`f${i}.ies`, doc);
      expect(id).not.toBeNull();
    }
    expect(useAppStore.getState().documents).toHaveLength(MAX_DOCUMENTS);
    const rejected = useAppStore.getState().addDocument('overflow.ies', doc);
    expect(rejected).toBeNull();
    expect(useAppStore.getState().documents).toHaveLength(MAX_DOCUMENTS);
  });
});
