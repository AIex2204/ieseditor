import { useMemo } from 'react';
import { useT } from '../../i18n/i18n';
import type { PhotometryDoc } from '../../core/ies/types';
import { interpolateCandela } from '../../core/photometry/interpolate';
import { beamAngleAtPlanePeak, findImax, meridianPeak } from '../../core/photometry/metrics';
import { circularDelta } from './polarGeometry';
import type { ScaleBasis } from './PolarChart';

export interface CartesianChartProps {
  doc: PhotometryDoc;
  cPlane: number;
  label: string;
  radialMax: number;
  size?: { w: number; h: number };
  /** Вторая кривая (было — до правки, либо файл B при сравнении). */
  compareDoc?: PhotometryDoc;
  scaleBasis?: ScaleBasis;
  /** Направление истинного максимума КСС светильника — вертикальная отметка на графике. */
  maxDirection?: { gamma: number; c: number };
  curveColor?: string;
  compareColor?: string;
  compareDashed?: boolean;
  showBeamAngle?: boolean;
}

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function scaleFor(doc: PhotometryDoc, cPlane: number, basis: ScaleBasis, radialMax: number): number {
  if (basis === 'ownFileMax') return findImax(doc).value || 1;
  if (basis === 'ownPlaneMax') return meridianPeak(doc, cPlane).value || 1;
  return radialMax;
}

export function CartesianChart({
  doc,
  cPlane,
  label,
  radialMax,
  size = { w: 460, h: 340 },
  compareDoc,
  scaleBasis = 'shared',
  maxDirection,
  curveColor = 'var(--curve-primary)',
  compareColor = 'var(--curve-history)',
  compareDashed = true,
  showBeamAngle = true,
}: CartesianChartProps) {
  const t = useT();
  const padL = 50;
  const padB = 50;
  const padT = 26;
  const padR: number = 16;
  const plotW = size.w - padL - padR;
  const plotH = size.h - padT - padB;

  const gMax = doc.vertAngles[doc.vertAngles.length - 1] ?? 180;

  const x = (signedGamma: number) => padL + plotW / 2 + (signedGamma / gMax) * (plotW / 2);
  function yFor(scale: number) {
    return (v: number) => padT + plotH - Math.min(Math.max(v, 0) / scale, 1) * plotH;
  }

  const mainScale = scaleFor(doc, cPlane, scaleBasis, radialMax);
  const compareScale = compareDoc ? scaleFor(compareDoc, cPlane, scaleBasis, radialMax) : radialMax;
  const yMain = yFor(mainScale);
  const yCompare = yFor(compareScale);

  function buildPath(source: PhotometryDoc, y: (v: number) => number): string {
    const sourceGMax = source.vertAngles[source.vertAngles.length - 1] ?? gMax;
    const step = sourceGMax > 90 ? 1 : 0.5;
    const pts: string[] = [];
    for (let s = -sourceGMax; s <= sourceGMax + 1e-9; s += step) {
      const gamma = Math.abs(s);
      const c = s >= 0 ? cPlane : cPlane + 180;
      pts.push(`${x(s).toFixed(2)},${y(interpolateCandela(source, gamma, c)).toFixed(2)}`);
    }
    return pts.join(' ');
  }

  const mainPath = useMemo(() => buildPath(doc, yMain), [doc, cPlane, gMax, mainScale]);
  const comparePath = useMemo(
    () => (compareDoc ? buildPath(compareDoc, yCompare) : null),
    [compareDoc, cPlane, gMax, compareScale]
  );

  const beam = useMemo(() => beamAngleAtPlanePeak(doc, cPlane), [doc, cPlane]);
  const yThreshold = yMain(beam.thresholdValue);

  const maxAxisX = useMemo(() => {
    if (!maxDirection) return null;
    const distRight = circularDelta(maxDirection.c, cPlane);
    const distLeft = circularDelta(maxDirection.c, cPlane + 180);
    const signedGamma = distRight <= distLeft ? maxDirection.gamma : -maxDirection.gamma;
    return x(signedGamma);
  }, [maxDirection, cPlane, gMax]);

  const ticksY = [0, 0.25, 0.5, 0.75, 1];
  const ticksX = Array.from({ length: Math.floor(gMax / 30) * 2 + 1 }, (_, i) => (i - Math.floor(gMax / 30)) * 30);

  return (
    <div className="cartesian-chart" data-chart-label={label}>
      <svg viewBox={`0 0 ${size.w} ${size.h}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <text x={size.w / 2} y={16} fontSize={13} fill="var(--text)" textAnchor="middle" fontWeight={700}>
          {label}
        </text>

        {ticksY.map((f) => (
          <g key={f}>
            <line x1={padL} y1={padT + plotH * (1 - f)} x2={padL + plotW} y2={padT + plotH * (1 - f)} stroke="var(--border)" strokeWidth={1} />
            <text x={padL - 8} y={padT + plotH * (1 - f) + 3} fontSize={10} fill="var(--muted)" textAnchor="end">
              {fmt(f * mainScale)}
            </text>
          </g>
        ))}
        {ticksX.map((g) => (
          <g key={g}>
            <line x1={x(g)} y1={padT} x2={x(g)} y2={padT + plotH} stroke="var(--border)" strokeWidth={g === 0 ? 1.2 : 0.5} />
            <text x={x(g)} y={padT + plotH + 16} fontSize={10} fill="var(--muted)" textAnchor="middle">
              {g}°
            </text>
          </g>
        ))}

        {maxAxisX !== null && (
          <line x1={maxAxisX} y1={padT} x2={maxAxisX} y2={padT + plotH} stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="1 4" strokeLinecap="round" />
        )}

        {showBeamAngle && beam.fullAngle !== null && (
          <line x1={padL} y1={yThreshold} x2={padL + plotW} y2={yThreshold} stroke="var(--curve-secondary)" strokeWidth={1} strokeDasharray="4 3" opacity={0.8} />
        )}

        {comparePath && (
          <polyline
            points={comparePath}
            fill="none"
            stroke={compareColor}
            strokeWidth={compareDashed ? 1.1 : 1.8}
            strokeDasharray={compareDashed ? '5 3' : undefined}
          />
        )}

        <polyline points={mainPath} fill="none" stroke={curveColor} strokeWidth={1.8} strokeLinejoin="round" />

        {/* подписи под графиком, в один ряд ниже подписей углов — свободное место, наложений не бывает */}
        {maxDirection && (
          <text x={padL} y={padT + plotH + 34} fontSize={10.5} fill="var(--accent)" fontWeight={700}>
            γmax = {fmt(maxDirection.gamma, 1)}°
          </text>
        )}
        {showBeamAngle && (
          <text x={padL + plotW} y={padT + plotH + 34} fontSize={12} fill="var(--curve-secondary)" textAnchor="end" fontWeight={700}>
            {beam.fullAngle !== null ? `2γ½ = ${fmt(beam.fullAngle, 1)}°` : `2γ½ — ${t('н/д')}`}
          </text>
        )}
      </svg>
    </div>
  );
}
