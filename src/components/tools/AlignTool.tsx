import { useEffect, useMemo, useState } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { alignByCentroid, alignByMax, type AlignResult } from '../../core/photometry/align';
import { useLiveEdit } from './useLiveEdit';
import { useT, useLang } from '../../i18n/i18n';

type Method = 'max' | 'centroid';

function fmt(n: number, digits = 2): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function AlignTool({ sourceDoc }: { sourceDoc: PhotometryDoc }) {
  const { baseDoc, write } = useLiveEdit(sourceDoc);
  const t = useT();
  const lang = useLang();

  const [method, setMethod] = useState<Method>('centroid');
  const [alignC0C180, setAlignC0C180] = useState(true);
  const [alignC90C270, setAlignC90C270] = useState(true);

  const result: AlignResult | null = useMemo(() => {
    const axes = { alignC0C180, alignC90C270 };
    if (!alignC0C180 && !alignC90C270) return null;
    try {
      return method === 'max'
        ? alignByMax(baseDoc, axes, { normalizeFlux: true })
        : alignByCentroid(baseDoc, axes, 0.5, { normalizeFlux: true });
    } catch {
      return null;
    }
  }, [baseDoc, method, alignC0C180, alignC90C270]);

  useEffect(() => {
    if (result) write(result.doc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  return (
    <div className="tool-form">
      <label className="tool-field">
        <span>{t('Метод')}</span>
        <select value={method} onChange={(e) => setMethod(e.target.value as Method)}>
          <option value="max">{t('По максимуму силы света')}</option>
          <option value="centroid">{t('По центру тяжести потока')}</option>
        </select>
      </label>

      <label className="tool-checkbox">
        <input type="checkbox" checked={alignC0C180} onChange={(e) => setAlignC0C180(e.target.checked)} />
        <span>{t('Выровнять в плоскости C0–C180')}</span>
      </label>
      <label className="tool-checkbox">
        <input type="checkbox" checked={alignC90C270} onChange={(e) => setAlignC90C270(e.target.checked)} />
        <span>{t('Выровнять в плоскости C90–C270')}</span>
      </label>

      {result && (
        <p className="tool-hint">
          {lang === 'en' ? 'Was' : 'Было'}: γ={fmt(result.sourceGamma)}° C={fmt(result.sourceC)}°
          <br />
          {lang === 'en' ? 'Removed tilt' : 'Устранённый наклон'}: C0–C180 {fmt(result.appliedTiltC0C180Deg)}°, C90–C270 {fmt(result.appliedTiltC90C270Deg)}°
          <br />
          {lang === 'en' ? 'Flux is preserved — normalized to the original.' : 'Поток сохраняется — нормируется к исходному.'}
        </p>
      )}
      {!alignC0C180 && !alignC90C270 && <p className="tool-hint tool-hint-error">{t('Выберите хотя бы одну плоскость')}</p>}
    </div>
  );
}
