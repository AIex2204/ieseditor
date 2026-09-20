import { useI18n } from '../../i18n/i18n';

// Переключатель языка RU/EN. Хранится в localStorage, меняет и <html lang>,
// и заголовок вкладки (через setLang → applyDocumentLang).
export function LangSwitch({ className = '' }: { className?: string }) {
  const lang = useI18n((s) => s.lang);
  const setLang = useI18n((s) => s.setLang);
  return (
    <div className={`lang-switch ${className}`.trim()} role="group" aria-label="Language">
      <button className={lang === 'ru' ? 'active' : ''} onClick={() => setLang('ru')} type="button">
        RU
      </button>
      <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')} type="button">
        EN
      </button>
    </div>
  );
}
