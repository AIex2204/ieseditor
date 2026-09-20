import { useCallback } from 'react';
import { useAppStore } from '../state/store';
import { loadDemoFile, markDemoSeen } from '../core/demo';
import { useI18n } from '../i18n/i18n';

/** Загрузка демонстрационного файла как обычного документа. */
export function useLoadDemo(): () => Promise<void> {
  const addDocument = useAppStore((s) => s.addDocument);
  return useCallback(async () => {
    try {
      const { name, doc } = await loadDemoFile();
      const displayName =
        useI18n.getState().lang === 'en' ? 'Demo — asymmetric distribution.ies' : name;
      addDocument(displayName, doc);
      markDemoSeen();
    } catch {
      /* демо недоступно — не мешаем работе */
    }
  }, [addDocument]);
}
