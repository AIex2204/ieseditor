import { useEffect, useMemo, useState } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { azimuthWindowPoints, smoothDoc } from '../../core/photometry/smooth';
import { findImax } from '../../core/photometry/metrics';
import { deriveStep } from '../../core/photometry/rotate';
import { useLiveEdit } from './useLiveEdit';
import { useT, useLang } from '../../i18n/i18n';

function fmt(n: number, digits = 1): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function SmoothTool({ sourceDoc }: { sourceDoc: PhotometryDoc }) {
  const { baseDoc, write } = useLiveEdit(sourceDoc);
  const t = useT();
  const lang = useLang();

  const [window, setWindow] = useState(11);
  const [degree, setDegree] = useState(2);
  // по умолчанию выключено: азимутальный проход трогает реальную
  // азимутальную форму (резкая отсечка дорожной оптики, wall-washer), а шум
  // гониометра почти всегда сидит вдоль γ
  const [smoothAzimuth, setSmoothAzimuth] = useState(false);
  const [protectPeak, setProtectPeak] = useState(true);

  // сглаживать по азимуту нечего, если плоскостей меньше трёх
  const canSmoothAzimuth = baseDoc.numHorizAngles >= 3;
  const azWindow = azimuthWindowPoints(baseDoc, window);
  const azSpan = ((azWindow - 1) / 2) * deriveStep(baseDoc.horizAngles, 5);

  const preview = useMemo(() => {
    try {
      return smoothDoc(baseDoc, { window, degree, smoothAzimuth: smoothAzimuth && canSmoothAzimuth, protectPeak });
    } catch {
      return null;
    }
  }, [baseDoc, window, degree, smoothAzimuth, canSmoothAzimuth, protectPeak]);

  useEffect(() => {
    if (preview) write(preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  const imaxBefore = useMemo(() => findImax(baseDoc).value, [baseDoc]);
  const imaxAfter = preview ? findImax(preview).value : imaxBefore;

  return (
    <div className="tool-form">
      <label className="tool-field">
        <span>{t('Окно (точек)')}</span>
        <input
          type="range"
          min={3}
          max={15}
          step={2}
          value={window}
          onChange={(e) => setWindow(Number(e.target.value) | 1)}
        />
        <span className="tool-number-static">{window}</span>
      </label>

      <label className="tool-field">
        <span>{t('Степень полинома')}</span>
        <input type="range" min={1} max={4} step={1} value={degree} onChange={(e) => setDegree(Number(e.target.value))} />
        <span className="tool-number-static">{degree}</span>
      </label>

      <label className="tool-checkbox">
        <input
          type="checkbox"
          checked={smoothAzimuth && canSmoothAzimuth}
          disabled={!canSmoothAzimuth}
          onChange={(e) => setSmoothAzimuth(e.target.checked)}
        />
        <span>{t('Также сглаживать по азимуту C')}</span>
      </label>
      {smoothAzimuth && canSmoothAzimuth && (
        <p className="tool-hint">
          {lang === 'en' ? (
            <>
              Along azimuth the window matches the C grid step: <b>{azWindow} points (±{fmt(azSpan, 0)}°)</b> — the same
              angular span as the γ window. Otherwise the same 11 points at a 15° step would average ±75° and erase the
              azimuthal shape.
            </>
          ) : (
            <>
              По азимуту окно подбирается под шаг сетки C: <b>{azWindow} точек (±{fmt(azSpan, 0)}°)</b> — столько же по углу,
              сколько окно по γ. Иначе те же 11 точек при шаге 15° усреднили бы ±75° и стёрли азимутальную форму.
            </>
          )}
        </p>
      )}
      {!canSmoothAzimuth && (
        <p className="tool-hint">
          {lang === 'en'
            ? `C planes in the file: ${baseDoc.numHorizAngles} — nothing to smooth along azimuth.`
            : `Плоскостей C в файле: ${baseDoc.numHorizAngles} — сглаживать по азимуту нечего.`}
        </p>
      )}
      <label className="tool-checkbox">
        <input type="checkbox" checked={protectPeak} onChange={(e) => setProtectPeak(e.target.checked)} />
        <span>{t('Не трогать пик')}</span>
      </label>

      {preview && (
        <p className="tool-hint">
          Imax: {fmt(imaxBefore)} → {fmt(imaxAfter)} {lang === 'en' ? 'cd' : 'кд'} ({((imaxAfter / imaxBefore - 1) * 100).toFixed(1)}%). {lang === 'en' ? 'Flux preserved exactly.' : 'Поток сохранён точно.'}
        </p>
      )}
    </div>
  );
}
