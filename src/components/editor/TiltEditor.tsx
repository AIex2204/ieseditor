import { useEffect, useRef, useState } from 'react';
import { useT } from '../../i18n/i18n';
import type { PhotometryDoc, TiltMode } from '../../core/ies/types';

function parseList(text: string): number[] {
  return text
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

/**
 * Список чисел с сохранением сырого текста. Собирать value обратно из
 * массива на каждый символ нельзя: незавершённый ввод («0 90 180 ») тут же
 * схлопывается, и дописать в конец новое число невозможно — последняя цифра
 * приклеивается к предыдущему числу. Поэтому текст живёт локально и
 * синхронизируется извне только когда значение поменялось не нашими руками.
 */
function NumberListInput({ values, onChange }: { values: number[]; onChange: (next: number[]) => void }) {
  const [text, setText] = useState(() => values.join(' '));
  const lastEmitted = useRef(values.join(' '));

  useEffect(() => {
    const incoming = values.join(' ');
    if (incoming !== lastEmitted.current) {
      setText(incoming);
      lastEmitted.current = incoming;
    }
  }, [values]);

  return (
    <textarea
      rows={2}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const parsed = parseList(raw);
        lastEmitted.current = parsed.join(' ');
        onChange(parsed);
      }}
    />
  );
}

export function TiltEditor({ draft, onChange }: { draft: PhotometryDoc; onChange: (next: PhotometryDoc) => void }) {
  const t = useT();
  const tilt = draft.tilt;

  function setMode(mode: TiltMode) {
    if (mode === 'INCLUDE' && tilt.mode !== 'INCLUDE') {
      onChange({ ...draft, tilt: { mode, lampToLuminaireGeometry: 1, angles: [0, 90, 180], factors: [1, 1, 1] } });
    } else if (mode === 'FILE') {
      onChange({ ...draft, tilt: { mode, fileName: tilt.fileName ?? '' } });
    } else {
      onChange({ ...draft, tilt: { mode: 'NONE' } });
    }
  }

  function setPairs(values: number[], field: 'angles' | 'factors') {
    onChange({ ...draft, tilt: { ...tilt, [field]: values } });
  }

  return (
    <div className="editor-section">
      <h4>TILT</h4>
      <label className="editor-field">
        <span>{t('Режим')}</span>
        <select value={tilt.mode} onChange={(e) => setMode(e.target.value as TiltMode)}>
          <option value="NONE">NONE</option>
          <option value="INCLUDE">{t('INCLUDE (пары угол/множитель в этом файле)')}</option>
          <option value="FILE">{t('Внешний файл')}</option>
        </select>
      </label>

      {tilt.mode === 'FILE' && (
        <label className="editor-field">
          <span>{t('Имя файла')}</span>
          <input value={tilt.fileName ?? ''} onChange={(e) => onChange({ ...draft, tilt: { ...tilt, fileName: e.target.value } })} />
        </label>
      )}

      {tilt.mode === 'INCLUDE' && (
        <>
          <label className="editor-field">
            <span>{t('Геометрия лампы-светильника')}</span>
            <select
              value={tilt.lampToLuminaireGeometry ?? 1}
              onChange={(e) => onChange({ ...draft, tilt: { ...tilt, lampToLuminaireGeometry: Number(e.target.value) as 1 | 2 | 3 } })}
            >
              <option value={1}>{t('1 — вертикальная')}</option>
              <option value={2}>{t('2 — горизонтальная симметричная')}</option>
              <option value={3}>{t('3 — горизонтальная несимметричная')}</option>
            </select>
          </label>
          <label className="editor-field">
            <span>{t('Углы, °')}</span>
            <NumberListInput values={tilt.angles ?? []} onChange={(v) => setPairs(v, 'angles')} />
          </label>
          <label className="editor-field">
            <span>{t('Множители')}</span>
            <NumberListInput values={tilt.factors ?? []} onChange={(v) => setPairs(v, 'factors')} />
          </label>
        </>
      )}
    </div>
  );
}
