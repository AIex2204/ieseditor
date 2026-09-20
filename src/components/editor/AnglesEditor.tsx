import { useState } from 'react';
import { useT, useLang } from '../../i18n/i18n';
import type { PhotometryDoc } from '../../core/ies/types';
import { resampleAngles } from '../../core/photometry/resample';

function parseAngles(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

export function AnglesEditor({ draft, onChange }: { draft: PhotometryDoc; onChange: (next: PhotometryDoc) => void }) {
  const [vertText, setVertText] = useState(() => draft.vertAngles.join(' '));
  const [horizText, setHorizText] = useState(() => draft.horizAngles.join(' '));

  const parsedVert = parseAngles(vertText);
  const parsedHoriz = parseAngles(horizText);
  const changed =
    parsedVert.length !== draft.vertAngles.length ||
    parsedHoriz.length !== draft.horizAngles.length ||
    parsedVert.some((v, i) => v !== draft.vertAngles[i]) ||
    parsedHoriz.some((v, i) => v !== draft.horizAngles[i]);

  const valid = parsedVert.length >= 2 && parsedHoriz.length >= 1;

  function apply() {
    if (!valid) return;
    onChange(resampleAngles(draft, parsedVert, parsedHoriz));
  }

  const t = useT();
  const lang = useLang();
  return (
    <div className="editor-section">
      <h4>{t('Угловые сетки γ и C')}</h4>
      <p className="tool-hint">
        {lang === 'en'
          ? 'Changing the grid resamples the intensity with bilinear interpolation over the current data — values are recomputed at the new angles, not just copied over.'
          : 'Изменение сетки пересчитывает силу света билинейной интерполяцией по текущим данным — числа не подставляются заново, а вычисляются заново на новых углах.'}
      </p>

      <label className="editor-field">
        <span>{t('γ (надир → зенит), °, через пробел')}</span>
        <textarea rows={4} value={vertText} onChange={(e) => setVertText(e.target.value)} />
      </label>

      <label className="editor-field">
        <span>{t('C (азимут), °, через пробел')}</span>
        <textarea rows={4} value={horizText} onChange={(e) => setHorizText(e.target.value)} />
      </label>

      {!valid && <p className="tool-hint tool-hint-error">{t('Нужно минимум 2 угла γ и 1 угол C')}</p>}

      <div className="tool-actions">
        <button className="btn btn-accent" disabled={!valid || !changed} onClick={apply}>
          {t('Пересчитать КСС на новую сетку')}
        </button>
        <button
          className="btn"
          onClick={() => {
            setVertText(draft.vertAngles.join(' '));
            setHorizText(draft.horizAngles.join(' '));
          }}
        >
          {t('Сбросить текст')}
        </button>
      </div>
    </div>
  );
}
