import { describe, expect, it } from 'vitest';
import { projectGridPoint, projectMeridianPoint } from '../src/components/charts/polarGeometry';

// Светильник светит вниз, поэтому и КСС на полярной диаграмме уходит вниз:
// надир (γ=0) — под центром, γ=180 — над центром. Ось Y в SVG растёт вниз.
describe('ориентация полярной диаграммы', () => {
  const cx = 100;
  const cy = 100;
  const r = 80;

  it('надир рисуется ниже центра', () => {
    const p = projectMeridianPoint(cx, cy, r, 0, 1, 1, 'linear');
    expect(p.x).toBeCloseTo(cx, 6);
    expect(p.y).toBeCloseTo(cy + r, 6);
  });

  it('γ=180 рисуется выше центра', () => {
    const p = projectMeridianPoint(cx, cy, r, 180, 1, 1, 'linear');
    expect(p.x).toBeCloseTo(cx, 6);
    expect(p.y).toBeCloseTo(cy - r, 6);
  });

  it('γ=90 уходит в правый край, ветвь C+180 — в левый', () => {
    const right = projectMeridianPoint(cx, cy, r, 90, 1, 1, 'linear');
    const left = projectMeridianPoint(cx, cy, r, -90, 1, 1, 'linear');
    expect(right.x).toBeCloseTo(cx + r, 6);
    expect(left.x).toBeCloseTo(cx - r, 6);
    expect(right.y).toBeCloseTo(cy, 6);
    expect(left.y).toBeCloseTo(cy, 6);
  });

  it('сетка ориентирована так же, как кривая', () => {
    expect(projectGridPoint(cx, cy, r, 0).y).toBeCloseTo(cy + r, 6);
    expect(projectGridPoint(cx, cy, r, 180).y).toBeCloseTo(cy - r, 6);
    expect(projectGridPoint(cx, cy, r, 30).x).toBeGreaterThan(cx);
    expect(projectGridPoint(cx, cy, r, -30).x).toBeLessThan(cx);
  });
});
