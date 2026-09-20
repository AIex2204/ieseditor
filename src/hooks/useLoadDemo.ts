import { useCallback } from 'react';
import { useAppStore } from '../state/store';
import { loadDemoFile, markDemoSeen } from '../core/demo';

/** Загрузка демонстрационного файла как обычного документа. */
export function useLoadDemo(): () => Promise<void> {
  const addDocument = useAppStore((s) => s.addDocument);
  return useCallback(async () => {
    try {
      const { name, doc } = await loadDemoFile();
      addDocument(name, doc);
      markDemoSeen();
    } catch {
      /* демо недоступно — не мешаем работе */
    }
  }, [addDocument]);
}
