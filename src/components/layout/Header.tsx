import { useState } from 'react';
import { activeDoc, useActiveDocEntry, useAppStore, type ViewMode } from '../../state/store';
import { saveIesFile } from '../../core/ies/exportFile';
import { saveArchive } from '../../core/ies/exportArchive';
import { renderChartsForExport } from '../charts/renderForExport';
import { useT, useI18n } from '../../i18n/i18n';
import { LangSwitch } from '../common/LangSwitch';

const NAV: { id: ViewMode; label: string }[] = [
  { id: 'files', label: 'Файлы' },
  { id: 'compare', label: 'Сравнение' },
  { id: 'about', label: 'О программе' },
];

const DOWNLOAD_ICON = (
  <svg
    className="btn-export-icon"
    viewBox="0 0 16 16"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M8 1.8v7.4" />
    <path d="M4.6 6.2 8 9.6l3.4-3.4" />
    <path d="M2.4 13.4h11.2" />
  </svg>
);

export function Header() {
  const entry = useActiveDocEntry();
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const saveAsNewFile = useAppStore((s) => s.saveAsNewFile);
  const [busy, setBusy] = useState(false);
  const t = useT();

  const hasPendingChanges = entry !== null && activeDoc(entry) !== entry.originalDoc;

  async function handleExportArchive() {
    if (!entry || busy) return;
    setBusy(true);
    try {
      const doc = activeDoc(entry);
      const charts = await renderChartsForExport(doc);
      saveArchive({
        fileName: entry.name,
        doc,
        originalName: entry.name,
        originalDoc: entry.originalDoc,
        charts,
        lang: useI18n.getState().lang,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="app-header">
      <span className="app-title">{t('Редактор IES файлов')}</span>
      <nav className="app-nav">
        {NAV.map((item) => (
          <span
            key={item.id}
            className={`app-nav-item ${viewMode === item.id ? 'active' : ''}`}
            onClick={() => setViewMode(item.id)}
          >
            {t(item.label)}
          </span>
        ))}
      </nav>
      <div className="app-header-spacer" />
      <LangSwitch />
      {viewMode === 'files' && entry && (
        <div className="app-header-actions">
          <button
            className="btn btn-accent btn-export"
            disabled={!hasPendingChanges}
            title={t('Зафиксировать правки как новую версию файла «…(edited vN).ies». Исходный файл вернётся к первоначальному виду — их можно сравнить на вкладке «Сравнение».')}
            onClick={() => saveAsNewFile()}
          >
            {t('Сохранить')}
          </button>
          <button
            className="btn btn-accent btn-export"
            title={t('Скачать только фотометрический файл .ies, без отчётов и диаграмм')}
            onClick={() => saveIesFile(activeDoc(entry), entry.name)}
          >
            {DOWNLOAD_ICON}
            {t('Выгрузить IES')}
          </button>
          <button
            className="btn btn-accent btn-export"
            disabled={busy}
            title={t('Скачать архив: файл .ies, отчёт о проверке, отчёт об обработке, показатели для даташита, диаграммы и исходный файл')}
            onClick={() => void handleExportArchive()}
          >
            {DOWNLOAD_ICON}
            {busy ? t('Готовим архив…') : t('Выгрузить все')}
          </button>
        </div>
      )}
    </header>
  );
}
