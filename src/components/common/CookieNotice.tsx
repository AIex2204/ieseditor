import { useState } from 'react';
import { METRIKA_ID } from '../../analytics/metrika';

const STORAGE_KEY = 'ies-cookie-ack';

function alreadyAcked(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Узкая полоса снизу с уведомлением о cookie. Показывается только когда в
 * сборке подключён счётчик (METRIKA_ID) — то есть когда cookie действительно
 * ставятся; в автономной сборке без аналитики полосы нет. Факт закрытия
 * запоминается в localStorage, работу приложения полоса не блокирует.
 */
export function CookieNotice() {
  const [hidden, setHidden] = useState(() => !METRIKA_ID || alreadyAcked());

  if (hidden) return null;

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* приватный режим — просто закрываем на эту сессию */
    }
    setHidden(true);
  }

  return (
    <div className="cookie-notice" role="region" aria-label="Уведомление о файлах cookie">
      <span className="cookie-notice-text">
        Сайт использует cookie только для обезличенной статистики посещений (Яндекс.Метрика).{' '}
        <a href="/politika-obrabotki-dannyh.html" target="_blank" rel="noopener noreferrer">
          Политика обработки данных
        </a>
        .
      </span>
      <button type="button" className="btn cookie-notice-btn" onClick={accept}>
        Понятно
      </button>
    </div>
  );
}
