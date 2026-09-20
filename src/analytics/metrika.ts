// Счётчик Яндекс.Метрики. Номер счётчика задаётся при сборке переменной
// VITE_METRIKA_ID — если её нет, код счётчика не подключается вовсе и
// страница остаётся полностью автономной (ни одного внешнего запроса).
// Так собранная кем-то ещё копия не отправляет статистику нам, а публичный
// сайт получает счётчик, который требует РСЯ.
//
// ВЕБВИЗОР СОЗНАТЕЛЬНО ВЫКЛЮЧЕН: он записывает DOM и пользовательский ввод,
// а здесь пользователь открывает свои фотометрические файлы — в запись
// попали бы имена файлов и содержимое таблиц силы света. Собираем только
// обезличенную статистику посещений.

declare global {
  interface Window {
    ym?: ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
  }
}

const SCRIPT_SRC = 'https://mc.yandex.ru/metrika/tag.js';

export function initMetrika(counterId: string | undefined): void {
  if (!counterId) return;

  // Стандартная схема Метрики: до загрузки скрипта вызовы копятся в очереди
  if (!window.ym) {
    const queue: ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number } = (...args: unknown[]) => {
      (queue.a = queue.a || []).push(args);
    };
    queue.l = Date.now();
    window.ym = queue;
  }

  window.ym(Number(counterId), 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: false,
  });

  const script = document.createElement('script');
  script.async = true;
  // Номер в адресе скрипта — как в сниппете, который выдаёт Метрика: так
  // счётчик отдаётся уже настроенным под конкретный идентификатор.
  script.src = `${SCRIPT_SRC}?id=${encodeURIComponent(counterId)}`;
  document.head.appendChild(script);
}

/** Включён ли счётчик в этой сборке — нужно для честного текста в «О программе». */
export const METRIKA_ID: string | undefined = import.meta.env.VITE_METRIKA_ID || undefined;
