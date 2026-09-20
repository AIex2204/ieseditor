/*
 * Редактор IES файлов — просмотр, проверка и обработка фотометрических
 * файлов светильников.
 * Copyright (C) 2026 Александр Устинов
 *
 * Эта программа — свободное программное обеспечение: вы можете
 * распространять и/или изменять её на условиях GNU Affero General Public
 * License версии 3, опубликованной Free Software Foundation.
 *
 * Программа распространяется в надежде, что будет полезной, но БЕЗ КАКИХ
 * ЛИБО ГАРАНТИЙ. Подробности — в файле LICENSE и в тексте лицензии:
 * https://www.gnu.org/licenses/agpl-3.0.html
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initMetrika, METRIKA_ID } from './analytics/metrika';
import './styles/tokens.css';
import './styles/layout.css';
import './styles/mobile.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root не найден');

// без VITE_METRIKA_ID ничего не подключается — сборка остаётся автономной
initMetrika(METRIKA_ID);

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
