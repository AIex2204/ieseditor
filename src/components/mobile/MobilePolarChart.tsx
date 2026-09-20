import { useMemo } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { interpolateCandela } from '../../core/photometry/interpolate';
import { findImax } from '../../core/photometry/metrics';
import { projectGridPoint, projectMeridianPoint } from '../charts/polarGeometry';
import { useT } from '../../i18n/i18n';

const GRID_RINGS = [0.25, 0.5, 0.75, 1.0];
const ANGLE_TICKS = [30, 60, 90, 120, 150];
const LONGITUDINAL = 'var(--curve-primary)'; // C0–C180 — продольная
const TRANSVERSE = 'var(--accent)'; // C90–C270 — поперечная

/**
 * Мобильная диаграмма: обе главные плоскости на одном полярном графике
 * двумя цветами. Продольная (C0–C180) и поперечная (C90–C270) КСС в одной
 * шкале (общий Imax светильника), чтобы соотношение форм читалось верно.
 * Надир (γ=0) внизу — как светит светильник.
 */
export function MobilePolarChart({ doc, size = 320 }: { doc: PhotometryDoc; size?: number }) {
  const t = useT();
  const cx = size / 2;
  const outerR = size / 2 - 26;
  const cy = size / 2;

  const scale = useMemo(() => findImax(doc).value || 1, [doc]);

  function curve(cPlane: number): string {
    const gMax = doc.vertAngles[doc.vertAngles.length - 1] ?? 180;
    const step = gMax > 90 ? 1 : 0.5;
    const pts: string[] = [];
    for (let s = -gMax; s <= gMax + 1e-9; s += step) {
      const gamma = Math.abs(s);
      const c = s >= 0 ? cPlane : cPlane + 180;
      const value = interpolateCandela(doc, gamma, c);
      const p = projectMeridianPoint(cx, cy, outerR, s, value, scale, 'linear');
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    return pts.join(' ');
  }

  const longitudinal = useMemo(() => curve(0), [doc, scale]);
  const transverse = useMemo(() => curve(90), [doc, scale]);

  return (
    <div className="m-chart">
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ display: 'block' }}>
        {GRID_RINGS.map((f) => (
          <circle key={f} cx={cx} cy={cy} r={outerR * f} fill="none" stroke="var(--border)" strokeWidth={1} />
        ))}
        {ANGLE_TICKS.map((a) => {
          const r = projectGridPoint(cx, cy, outerR, a);
          const l = projectGridPoint(cx, cy, outerR, -a);
          return (
            <g key={a}>
              <line x1={cx} y1={cy} x2={r.x} y2={r.y} stroke="var(--border)" strokeWidth={1} />
              {a !== 180 && <line x1={cx} y1={cy} x2={l.x} y2={l.y} stroke="var(--border)" strokeWidth={1} />}
            </g>
          );
        })}
        {/* вертикаль надир↕зенит */}
        <line x1={cx} y1={cy - outerR} x2={cx} y2={cy + outerR} stroke="var(--border)" strokeWidth={1} />

        <polyline points={longitudinal} fill="none" stroke={LONGITUDINAL} strokeWidth={2} strokeLinejoin="round" />
        <polyline points={transverse} fill="none" stroke={TRANSVERSE} strokeWidth={2} strokeLinejoin="round" />
        <circle cx={cx} cy={cy} r={2.5} fill="var(--text)" />
      </svg>
      <div className="m-chart-legend">
        <span>
          <i style={{ background: '#1a1a1a' }} /> {t('C0–C180 (продольная)')}
        </span>
        <span>
          <i style={{ background: 'var(--accent)' }} /> {t('C90–C270 (поперечная)')}
        </span>
      </div>
    </div>
  );
}
