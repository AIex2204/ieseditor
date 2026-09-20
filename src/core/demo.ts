import { loadPhotometryFile, type LoadedFile } from './loadPhotometryFile';

// Демонстрационный файл лежит статикой в public/. Грузим его через тот же
// путь, что и пользовательский (fetch → File → loadPhotometryFile), чтобы
// он вёл себя как обычный открытый файл — с ним можно крутить инструменты.
export const DEMO_URL = '/demo-asymmetric.ies';
export const DEMO_SEEN_KEY = 'ies-demo-seen';

export async function loadDemoFile(): Promise<LoadedFile> {
  const res = await fetch(DEMO_URL);
  if (!res.ok) throw new Error('демо-файл недоступен');
  const blob = await res.blob();
  const file = new File([blob], 'Демо — несимметричная КСС.ies', { type: 'text/plain' });
  return loadPhotometryFile(file);
}

/** Показывали ли демо этому браузеру (чтобы не подсовывать повторно). */
export function demoSeen(): boolean {
  try {
    return localStorage.getItem(DEMO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markDemoSeen(): void {
  try {
    localStorage.setItem(DEMO_SEEN_KEY, '1');
  } catch {
    /* приватный режим — ничего страшного */
  }
}
