import { useMemo } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { interpolateCandela } from '../../core/photometry/interpolate';
import { beamAngleAtPlanePeak, findImax, meridianPeak } from '../../core/photometry/metrics';
import { projectGridPoint, projectMeridianPoint, radiusFraction } from './polarGeometry';

export type ScaleBasis = 'shared' | 'ownFileMax' | 'ownPlaneMax';

export interface PolarChartProps {
  doc: PhotometryDoc;
  /** Азимут правой ветви (левая = cPlane + 180). */
  cPlane: number;
  label: string;
  /** Общий для всех графиков светильника максимум шкалы (обычно глобальный Imax), для сравнимости. */
  radialMax: number;
  size?: number;
  /** Вторая кривая (было — до правки, либо файл B при сравнении). */
  compareDoc?: PhotometryDoc;
  /**
   * 'shared' — обе кривые в общей шкале radialMax (абсолютные канделы);
   * 'ownFileMax' — каждая кривая к своему глобальному Imax (сравнение разных светильников);
   * 'ownPlaneMax' — каждая кривая к максимуму именно этой плоскости (сравнение формы луча).
   */
  scaleBasis?: ScaleBasis;
  /** Направление истинного максимума КСС светильника — накладывается спицей поверх графика. */
  maxDirection?: { gamma: number; c: number };
  /** Цвет основной кривой. */
  curveColor?: string;
  /** Цвет второй кривой (compareDoc). */
  compareColor?: string;
  /** Пунктир для второй кривой (true — правка "было", false — сплошная линия сравнения файлов). */
  compareDashed?: boolean;
  /** Показывать ли порог 50%, точки пересечения и подпись 2γ½ (в сравнении файлов не нужно). */
  showBeamAngle?: boolean;
}

const GRID_RINGS = [0.25, 0.5, 0.75, 1.0];
const ANGLE_TICKS = [0, 30, 60, 90, 120, 150, 180];
const MODE = 'linear' as const;

function fmt(n: number, digits = 0): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function scaleFor(doc: PhotometryDoc, cPlane: number, basis: ScaleBasis, radialMax: number): number {
  if (basis === 'ownFileMax') return findImax(doc).value || 1;
  if (basis === 'ownPlaneMax') return meridianPeak(doc, cPlane).value || 1;
  return radialMax;
}

export function PolarChart({
  doc,
  cPlane,
  label,
  radialMax,
  size = 440,
  compareDoc,
  scaleBasis = 'shared',
  maxDirection,
  curveColor = 'var(--curve-primary)',
  compareColor = 'var(--curve-history)',
  compareDashed = true,
  showBeamAngle = true,
}: PolarChartProps) {
  const cx = size / 2;
  const cyTop = 40;
  const outerR = size / 2 - 56;
  const cy = cyTop + outerR;
  const captionH = 50;

  const mainScale = scaleFor(doc, cPlane, scaleBasis, radialMax);
  const compareScale = compareDoc ? scaleFor(compareDoc, cPlane, scaleBasis, radialMax) : radialMax;

  function buildCurvePath(source: PhotometryDoc, scale: number): string {
    const sourceGMax = source.vertAngles[source.vertAngles.length - 1] ?? 180;
    const step = sourceGMax > 90 ? 1 : 0.5;
    const pts: string[] = [];
    for (let s = -sourceGMax; s <= sourceGMax + 1e-9; s += step) {
      const gamma = Math.abs(s);
      const c = s >= 0 ? cPlane : cPlane + 180;
      const value = interpolateCandela(source, gamma, c);
      const p = projectMeridianPoint(cx, cy, outerR, s, value, scale, MODE);
      pts.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
    }
    return pts.join(' ');
  }

  const curvePath = useMemo(() => buildCurvePath(doc, mainScale), [doc, cPlane, mainScale, cx, cy, outerR]);
  const comparePath = useMemo(
    () => (compareDoc ? buildCurvePath(compareDoc, compareScale) : null),
    [compareDoc, cPlane, compareScale, cx, cy, outerR]
  );

  const beam = useMemo(() => beamAngleAtPlanePeak(doc, cPlane), [doc, cPlane]);
  const thresholdFrac = radiusFraction(beam.thresholdValue, mainScale, MODE);

  return (
    <div className="polar-chart" data-chart-label={label}>
      <svg viewBox={`0 0 ${size} ${size + captionH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {/* сетка: кольца */}
        {GRID_RINGS.map((f) => (
          <circle key={f} cx={cx} cy={cy} r={outerR * f} fill="none" stroke="var(--border)" strokeWidth={1} />
        ))}

        {/* сетка: спицы + подписи углов */}
        {ANGLE_TICKS.map((a) => {
          const pRight = projectGridPoint(cx, cy, outerR, a);
          const pLeft = projectGridPoint(cx, cy, outerR, -a);
          const labelRight = projectGridPoint(cx, cy, outerR + 13, a);
          const labelLeft = projectGridPoint(cx, cy, outerR + 13, -a);
          const skipLabel = a === 0 || a === 90; // 0° закрыт заголовком сверху, 90° — подписью азимута сбоку
          return (
            <g key={a}>
              <line x1={cx} y1={cy} x2={pRight.x} y2={pRight.y} stroke="var(--border)" strokeWidth={1} />
              {a !== 0 && a !== 180 && (
                <line x1={cx} y1={cy} x2={pLeft.x} y2={pLeft.y} stroke="var(--border)" strokeWidth={1} />
              )}
              {!skipLabel && (
                <text x={labelRight.x} y={labelRight.y} fontSize={10} fill="var(--muted)" textAnchor="middle" dominantBaseline="middle">
                  {a}°
                </text>
              )}
              {!skipLabel && a !== 180 && (
                <text x={labelLeft.x} y={labelLeft.y} fontSize={10} fill="var(--muted)" textAnchor="middle" dominantBaseline="middle">
                  {a}°
                </text>
              )}
            </g>
          );
        })}

        {/* подписи азимутов на горизонтали (за пределами подписей углов, чтобы не наползали) */}
        <text x={cx + outerR + 32} y={cy + 4} fontSize={12} fill="var(--text)" textAnchor="middle" fontWeight={700}>
          C{fmt(cPlane)}
        </text>
        <text x={cx - outerR - 32} y={cy + 4} fontSize={12} fill="var(--text)" textAnchor="middle" fontWeight={700}>
          C{fmt((cPlane + 180) % 360)}
        </text>

        {/* пунктирная окружность уровня 50% максимума этой плоскости */}
        {showBeamAngle && beam.fullAngle !== null && (
          <circle cx={cx} cy={cy} r={outerR * thresholdFrac} fill="none" stroke="var(--curve-secondary)" strokeWidth={1} strokeDasharray="4 3" opacity={0.8} />
        )}

        {/* вторая кривая — было / файл B */}
        {comparePath && (
          <polyline
            points={comparePath}
            fill="none"
            stroke={compareColor}
            strokeWidth={compareDashed ? 1.1 : 1.8}
            strokeDasharray={compareDashed ? '5 3' : undefined}
            strokeLinejoin="round"
          />
        )}

        {/* основная кривая КСС */}
        <polyline points={curvePath} fill="none" stroke={curveColor} strokeWidth={1.8} strokeLinejoin="round" />

        {/* точки пересечения на уровне половины максимума */}
        {showBeamAngle && beam.lo && (
          <circle
            cx={projectMeridianPoint(cx, cy, outerR, beam.lo.c === cPlane ? beam.lo.gamma : -beam.lo.gamma, beam.lo.value, mainScale, MODE).x}
            cy={projectMeridianPoint(cx, cy, outerR, beam.lo.c === cPlane ? beam.lo.gamma : -beam.lo.gamma, beam.lo.value, mainScale, MODE).y}
            r={3.5}
            fill="var(--curve-secondary)"
          />
        )}
        {showBeamAngle && beam.hi && (
          <circle
            cx={projectMeridianPoint(cx, cy, outerR, beam.hi.c === cPlane ? beam.hi.gamma : -beam.hi.gamma, beam.hi.value, mainScale, MODE).x}
            cy={projectMeridianPoint(cx, cy, outerR, beam.hi.c === cPlane ? beam.hi.gamma : -beam.hi.gamma, beam.hi.value, mainScale, MODE).y}
            r={3.5}
            fill="var(--curve-secondary)"
          />
        )}

        {/* центр = надир */}
        <circle cx={cx} cy={cy} r={2.5} fill="var(--text)" />

        {/* заголовок */}
        <text x={size / 2} y={18} fontSize={14} fill="var(--text)" textAnchor="middle" fontWeight={700}>
          {label}
        </text>

        {/* подписи под графиком — фиксированное, всегда свободное место, наложений быть не может */}
        {showBeamAngle && (
          <text x={size / 2} y={size + 22} fontSize={13} fill="var(--curve-secondary)" textAnchor="middle" fontWeight={700}>
            {beam.fullAngle !== null ? `2γ½ = ${fmt(beam.fullAngle, 1)}°` : '2γ½ — не достигается'}
          </text>
        )}
        {maxDirection && (
          <text x={size / 2} y={size + 40} fontSize={11} fill="var(--accent)" textAnchor="middle" fontWeight={700}>
            γmax = {fmt(maxDirection.gamma, 1)}°, Cmax = {fmt(maxDirection.c, 1)}°
          </text>
        )}
      </svg>
    </div>
  );
}
