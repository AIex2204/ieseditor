import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import { resampleAngles } from '../src/core/photometry/resample';
import { computeFlux } from '../src/core/photometry/flux';
import { interpolateCandela } from '../src/core/photometry/interpolate';

describe('resampleAngles', () => {
  it('пересчитывает КСС на более редкую сетку с сохранимым потоком (≈, не точно — интерполяция)', () => {
    const doc = loadSample('Эллипс.IES');
    const fluxBefore = computeFlux(doc).totalLumens;
    const vertAngles = Array.from({ length: 19 }, (_, i) => i * 5); // 0..90 шаг 5
    const horizAngles = Array.from({ length: 13 }, (_, i) => i * 30); // 0..360 шаг 30
    const resampled = resampleAngles(doc, vertAngles, horizAngles);
    expect(resampled.numVertAngles).toBe(19);
    expect(resampled.numHorizAngles).toBe(13);
    const fluxAfter = computeFlux(resampled).totalLumens;
    expect(Math.abs(fluxAfter - fluxBefore) / fluxBefore).toBeLessThan(0.05);
  });

  it('значения на пересчитанной сетке совпадают с интерполяцией по исходнику', () => {
    const doc = loadSample('V1-G1-72441-04L10-6601040-a.ies');
    const vertAngles = [0, 10, 20, 30];
    const horizAngles = [0, 90, 180, 270];
    const resampled = resampleAngles(doc, vertAngles, horizAngles);
    for (const g of vertAngles) {
      for (const c of horizAngles) {
        const expected = interpolateCandela(doc, g, c);
        expect(interpolateCandela(resampled, g, c)).toBeCloseTo(expected, 6);
      }
    }
  });

  it('сортирует углы независимо от порядка на входе', () => {
    const doc = loadSample('Эллипс-2.IES');
    const resampled = resampleAngles(doc, [30, 0, 60], [180, 0, 90]);
    expect(resampled.vertAngles).toEqual([0, 30, 60]);
    expect(resampled.horizAngles).toEqual([0, 90, 180]);
  });
});
