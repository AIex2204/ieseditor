import { useEffect, useMemo, useState } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { rotateDoc } from '../../core/photometry/rotate';
import { computeFlux } from '../../core/photometry/flux';
import { DecimalInput } from '../common/DecimalInput';
import { useLiveEdit } from './useLiveEdit';
import { useT, useLang } from '../../i18n/i18n';

function fmt(n: number, digits = 2): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function RotateTool({ sourceDoc }: { sourceDoc: PhotometryDoc }) {
  const { baseDoc, write } = useLiveEdit(sourceDoc);
  const t = useT();
  const lang = useLang();

  const [spin, setSpin] = useState(0);
  const [tiltC0C180, setTiltC0C180] = useState(0);
  const [tiltC90C270, setTiltC90C270] = useState(0);

  const angles = { spinDeg: spin, tiltC0C180Deg: tiltC0C180, tiltC90C270Deg: tiltC90C270 };
  const isIdentity = spin === 0 && tiltC0C180 === 0 && tiltC90C270 === 0;

  const preview = useMemo(() => {
    if (isIdentity) return baseDoc;
    try {
      return rotateDoc(baseDoc, angles, { normalizeFlux: true });
    } catch {
      return null;
    }
  }, [baseDoc, spin, tiltC0C180, tiltC90C270]);

  useEffect(() => {
    if (preview) write(preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  const fluxBefore = useMemo(() => computeFlux(baseDoc).totalLumens, [baseDoc]);
  const fluxAfter = preview ? computeFlux(preview).totalLumens : fluxBefore;
  const fluxDeltaPct = ((fluxAfter - fluxBefore) / fluxBefore) * 100;

  return (
    <div className="tool-form">
      <label className="tool-field">
        <span>{t('Спин по азимуту C, °')}</span>
        <input type="range" min={-180} max={180} step={0.1} value={spin} onChange={(e) => setSpin(Number(e.target.value))} />
        <DecimalInput className="tool-number" value={spin} onChange={setSpin} />
      </label>

      <label className="tool-field">
        <span>{t('Наклон в плоскости C0–C180, °')}</span>
        <input type="range" min={-90} max={90} step={0.1} value={tiltC0C180} onChange={(e) => setTiltC0C180(Number(e.target.value))} />
        <DecimalInput className="tool-number" value={tiltC0C180} onChange={setTiltC0C180} />
      </label>

      <label className="tool-field">
        <span>{t('Наклон в плоскости C90–C270, °')}</span>
        <input type="range" min={-90} max={90} step={0.1} value={tiltC90C270} onChange={(e) => setTiltC90C270(Number(e.target.value))} />
        <DecimalInput className="tool-number" value={tiltC90C270} onChange={setTiltC90C270} />
      </label>

      {!isIdentity && preview && (
        <p className="tool-hint">
          {lang === 'en' ? 'Flux' : 'Поток'}: {fmt(fluxAfter, 1)} {lang === 'en' ? 'lm' : 'лм'} ({fluxDeltaPct >= 0 ? '+' : ''}
          {fmt(fluxDeltaPct, 2)}%) — {lang === 'en' ? 'preserved, normalized to the original.' : 'сохраняется, нормируется к исходному.'}
        </p>
      )}

      <div className="tool-actions">
        <button
          className="btn"
          disabled={isIdentity}
          title={t('Вернуть углы к нулю — КСС вернётся к состоянию на момент открытия инструмента')}
          onClick={() => {
            setSpin(0);
            setTiltC0C180(0);
            setTiltC90C270(0);
          }}
        >
          {lang === 'en' ? 'Reset angles' : 'Сбросить углы'}
        </button>
      </div>
    </div>
  );
}
