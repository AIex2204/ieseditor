import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import { azimuthWindowPoints, smoothDoc } from '../src/core/photometry/smooth';
import { computeFlux } from '../src/core/photometry/flux';

describe('azimuthWindowPoints — окно по азимуту подбирается под шаг сетки C', () => {
  it('на грубой сетке C сужается до 3 точек, а не берёт окно по γ', () => {
    // V1-S1: γ шаг 1°, C шаг 15° — окно 11 точек по C было бы ±75°
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    expect(doc.numHorizAngles).toBe(24);
    expect(azimuthWindowPoints(doc, 11)).toBe(3);
  });

  it('на плотной сетке C окно шире, но не больше окна по γ', () => {
    // Эллипс: γ шаг 0,5°, C шаг 5° — 11·0,5 / 5 ≈ 1 → минимум 3
    const ellipse = loadSample('Эллипс.IES');
    expect(azimuthWindowPoints(ellipse, 11)).toBeGreaterThanOrEqual(3);
    expect(azimuthWindowPoints(ellipse, 11)).toBeLessThanOrEqual(11);

    // при одинаковом шаге по обеим осям окно совпадает с окном по γ
    const uniform = { ...ellipse, horizAngles: ellipse.vertAngles.slice(0, ellipse.numHorizAngles) };
    expect(azimuthWindowPoints(uniform, 11)).toBe(11);
  });

  it('окно всегда нечётное и не меньше трёх', () => {
    const doc = loadSample('V1-G1-72441-04L10-6601040-a.ies');
    for (const w of [3, 5, 7, 9, 11, 13, 15]) {
      const points = azimuthWindowPoints(doc, w);
      expect(points % 2).toBe(1);
      expect(points).toBeGreaterThanOrEqual(3);
    }
  });

  it('на грубой сетке азимутальный проход не искажает КСС (окно 3 + степень 2 проходит точно)', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const alongGamma = smoothDoc(doc, { window: 11, degree: 2, smoothAzimuth: false });
    const withAzimuth = smoothDoc(doc, { window: 11, degree: 2, smoothAzimuth: true });

    let maxDiff = 0;
    for (let i = 0; i < alongGamma.candela.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(alongGamma.candela[i] - withAzimuth.candela[i]));
    }
    const imax = Math.max(...alongGamma.candela);
    // расхождение в пределах численной погрешности регрессии, а не усреднение
    expect(maxDiff / imax).toBeLessThan(0.01);
  });

  it('поток сохраняется и при азимутальном сглаживании с окном 11', () => {
    for (const name of ['Эллипс-2.IES', 'V1-S1-7R710-40x32-6604040-a.ies']) {
      const doc = loadSample(name);
      const before = computeFlux(doc).totalLumens;
      const smoothed = smoothDoc(doc, { window: 11, degree: 2, smoothAzimuth: true });
      expect(computeFlux(smoothed).totalLumens).toBeCloseTo(before, 3);
    }
  });
});
