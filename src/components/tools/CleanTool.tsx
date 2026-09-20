import { useEffect, useMemo, useState } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { cleanDoc, detectCutoff, previewClean } from '../../core/photometry/clean';
import { useLiveEdit } from './useLiveEdit';

function fmt(n: number, digits = 1): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function CleanTool({ sourceDoc }: { sourceDoc: PhotometryDoc }) {
  const { baseDoc, write } = useLiveEdit(sourceDoc);

  const detection = useMemo(() => detectCutoff(baseDoc), [baseDoc]);
  const gMax = baseDoc.vertAngles[baseDoc.vertAngles.length - 1] ?? 180;

  const [cutoffGamma, setCutoffGamma] = useState(() => detection.cutoffGamma);
  const [dropRatio, setDropRatio] = useState(() => detection.dropRatio);
  const [magnitudeCapFraction, setMagnitudeCapFraction] = useState(() => detection.magnitudeCapFraction * 100);
  const [smoothFalloff, setSmoothFalloff] = useState(false);

  const options = {
    cutoffGamma,
    dropRatio,
    magnitudeCapFraction: magnitudeCapFraction / 100,
    smoothFalloff,
    falloffWidthDeg: 3,
    normalizeFlux: true,
  };

  const preview = useMemo(() => {
    try {
      return cleanDoc(baseDoc, options);
    } catch {
      return null;
    }
  }, [baseDoc, cutoffGamma, dropRatio, magnitudeCapFraction, smoothFalloff]);

  const report = useMemo(() => {
    try {
      return previewClean(baseDoc, options);
    } catch {
      return null;
    }
  }, [baseDoc, cutoffGamma, dropRatio, magnitudeCapFraction, smoothFalloff]);

  useEffect(() => {
    if (preview) write(preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  return (
    <div className="tool-form">
      <p className="tool-hint">
        Автоопределение: мусор обнаружен начиная примерно с <b>{fmt(detection.cutoffGamma)}°</b>
      </p>

      <label className="tool-field">
        <span>Не трогать до угла, °</span>
        <input type="range" min={0} max={gMax} step={0.5} value={cutoffGamma} onChange={(e) => setCutoffGamma(Number(e.target.value))} />
        <span className="tool-number-static">{fmt(cutoffGamma)}</span>
      </label>

      <label className="tool-field">
        <span>Порог "внезапности" обрыва</span>
        <input type="range" min={0.05} max={0.8} step={0.05} value={dropRatio} onChange={(e) => setDropRatio(Number(e.target.value))} />
        <span className="tool-number-static">{fmt(dropRatio * 100, 0)}%</span>
      </label>

      <label className="tool-field">
        <span>Потолок по модулю, % от Imax</span>
        <input
          type="range"
          min={0.5}
          max={10}
          step={0.5}
          value={magnitudeCapFraction}
          onChange={(e) => setMagnitudeCapFraction(Number(e.target.value))}
        />
        <span className="tool-number-static">{fmt(magnitudeCapFraction, 1)}%</span>
      </label>

      <label className="tool-checkbox">
        <input type="checkbox" checked={smoothFalloff} onChange={(e) => setSmoothFalloff(e.target.checked)} />
        <span>Плавный спад вместо жёсткого нуля</span>
      </label>

      {report && (
        <p className="tool-hint">
          Будет обнулено/уменьшено ячеек: <b>{report.affectedCount}</b>
          <br />
          Потеря потока до компенсации: {fmt(report.lostLumens, 3)} лм ({fmt(report.lostFraction * 100, 4)}%) — поток сохраняется, нормируется к исходному.
        </p>
      )}
    </div>
  );
}
