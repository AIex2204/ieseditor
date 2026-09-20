import { useEffect, useRef } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Workspace } from './components/layout/Workspace';
import { CompareView } from './components/compare/CompareView';
import { AboutView } from './components/about/AboutView';
import { CookieNotice } from './components/common/CookieNotice';
import { MobileApp } from './components/mobile/MobileApp';
import { useIsMobile } from './hooks/useIsMobile';
import { useLoadDemo } from './hooks/useLoadDemo';
import { demoSeen } from './core/demo';
import { useActiveDocEntry, useAppStore } from './state/store';
import { useT } from './i18n/i18n';

export function App() {
  const hydrateFromStorage = useAppStore((s) => s.hydrateFromStorage);
  const hydrated = useAppStore((s) => s.hydrated);
  const docsCount = useAppStore((s) => s.documents.length);
  const isMobile = useIsMobile();
  const loadDemo = useLoadDemo();
  const demoTried = useRef(false);

  useEffect(() => {
    void hydrateFromStorage();
  }, [hydrateFromStorage]);

  // Первый заход с пустым хранилищем встречает не пустой экран, а демо-файл —
  // несимметричную КСС с шумом, на которой сразу видно, что делают инструменты.
  // Один раз на браузер: если человек удалит демо, повторно не подсовываем.
  useEffect(() => {
    if (!hydrated || demoTried.current) return;
    demoTried.current = true;
    if (docsCount === 0 && !demoSeen()) void loadDemo();
  }, [hydrated, docsCount, loadDemo]);

  return (
    <>
      {isMobile ? <MobileApp /> : <DesktopShell />}
      <CookieNotice />
    </>
  );
}

function DesktopShell() {
  const active = useActiveDocEntry();
  const viewMode = useAppStore((s) => s.viewMode);
  const loadDemo = useLoadDemo();
  const t = useT();

  return (
    <div className="app-shell">
      <Header />
      <div className="app-body">
        {viewMode === 'files' && (
          <>
            <Sidebar />
            {active ? (
              <Workspace entry={active} />
            ) : (
              <div className="empty-state">
                <p>{t('Загрузите один или несколько .ies / .ldt файлов, чтобы увидеть кривую силы света.')}</p>
                <button className="btn btn-accent" onClick={() => void loadDemo()}>
                  {t('Открыть демо-файл')}
                </button>
              </div>
            )}
          </>
        )}
        {viewMode === 'compare' && <CompareView />}
        {viewMode === 'about' && <AboutView />}
      </div>
    </div>
  );
}
