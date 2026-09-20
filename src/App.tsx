import { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Workspace } from './components/layout/Workspace';
import { CompareView } from './components/compare/CompareView';
import { AboutView } from './components/about/AboutView';
import { CookieNotice } from './components/common/CookieNotice';
import { MobileApp } from './components/mobile/MobileApp';
import { useIsMobile } from './hooks/useIsMobile';
import { useActiveDocEntry, useAppStore } from './state/store';

export function App() {
  const hydrateFromStorage = useAppStore((s) => s.hydrateFromStorage);
  const isMobile = useIsMobile();

  useEffect(() => {
    void hydrateFromStorage();
  }, [hydrateFromStorage]);

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
                <p>Загрузите один или несколько .ies / .ldt файлов, чтобы увидеть кривую силы света.</p>
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
