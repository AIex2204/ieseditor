import type { IesFormat, Keyword, PhotometryDoc } from '../../core/ies/types';
import { useT } from '../../i18n/i18n';
import { STANDARD_KEYWORDS } from '../../core/ies/keywords';

const FORMATS: IesFormat[] = ['LM-63-1986', 'LM-63-1991', 'LM-63-1995', 'LM-63-2002', 'LM-63-2019', 'LM-63-2025'];

export function HeaderEditor({ draft, onChange }: { draft: PhotometryDoc; onChange: (next: PhotometryDoc) => void }) {
  function setKeyword(index: number, patch: Partial<Keyword>) {
    const keywords = draft.keywords.map((k, i) => (i === index ? { ...k, ...patch } : k));
    onChange({ ...draft, keywords });
  }
  function removeKeyword(index: number) {
    onChange({ ...draft, keywords: draft.keywords.filter((_, i) => i !== index) });
  }
  function addKeyword() {
    onChange({ ...draft, keywords: [...draft.keywords, { key: 'OTHER', value: '' }] });
  }

  const t = useT();
  return (
    <div className="editor-section">
      <h4>{t('Формат и ключевые слова')}</h4>

      <label className="editor-field">
        <span>{t('Версия LM-63')}</span>
        <select value={draft.format} onChange={(e) => onChange({ ...draft, format: e.target.value as IesFormat })}>
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>

      <table className="editor-table">
        <thead>
          <tr>
            <th>{t('Ключ')}</th>
            <th>{t('Значение')}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {draft.keywords.map((kw, i) => (
            <tr key={i}>
              <td>
                <input
                  list="standard-keywords"
                  value={kw.key}
                  onChange={(e) => setKeyword(i, { key: e.target.value.toUpperCase() })}
                />
              </td>
              <td>
                <input value={kw.value} onChange={(e) => setKeyword(i, { value: e.target.value })} />
              </td>
              <td>
                <button className="editor-row-remove" onClick={() => removeKeyword(i)} title={t('Удалить')}>
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <datalist id="standard-keywords">
        {STANDARD_KEYWORDS.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      <button className="btn" onClick={addKeyword}>
        {t('+ ключевое слово')}
      </button>
    </div>
  );
}
