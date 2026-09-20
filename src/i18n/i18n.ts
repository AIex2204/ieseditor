import { useMemo } from 'react';
import { create } from 'zustand';
import { EN } from './en';

export type Lang = 'ru' | 'en';

const STORAGE_KEY = 'ies-lang';

function detectInitial(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ru' || saved === 'en') return saved;
  } catch {
    /* приватный режим */
  }
  // русскоязычный браузер → русский; остальные → английский (сайт для
  // международной аудитории, но домен .ru и первичная аудитория — рунет)
  if (typeof navigator !== 'undefined' && /^ru\b/i.test(navigator.language || '')) return 'ru';
  return 'en';
}

interface I18nState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useI18n = create<I18nState>((set) => ({
  lang: detectInitial(),
  setLang: (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* приватный режим */
    }
    applyDocumentLang(lang);
    set({ lang });
  },
}));

/** Перевод по русскому оригиналу. Нет перевода — показываем русский. */
export function translate(lang: Lang, ru: string): string {
  return lang === 'en' ? EN[ru] ?? ru : ru;
}

/** Неблокирующий перевод для кода вне React (экспорт, заголовок вкладки). */
export function t(ru: string): string {
  return translate(useI18n.getState().lang, ru);
}

/** Реактивный переводчик для компонентов — ре-рендер при смене языка. */
export function useT(): (ru: string) => string {
  const lang = useI18n((s) => s.lang);
  return useMemo(() => (ru: string) => translate(lang, ru), [lang]);
}

const META = {
  ru: {
    title: 'Редактор IES файлов',
    description:
      'Просмотр, проверка и обработка фотометрических файлов светильников (.ies, .ldt) прямо в браузере — файлы не покидают ваш компьютер.',
  },
  en: {
    title: 'IES File Editor',
    description:
      'View, check and process photometric luminaire files (.ies, .ldt) right in your browser — files never leave your computer.',
  },
} as const;

export function applyDocumentLang(lang: Lang): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.title = META[lang].title;
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', META[lang].description);
}

/** Текущий язык для ветвления длинной прозы в компонентах. */
export function useLang(): Lang {
  return useI18n((s) => s.lang);
}
