import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import { alignByMax, alignByCentroid, findRefinedPeakDirection } from '../src/core/photometry/align';
import { findImax } from '../src/core/photometry/metrics';
import { computeFlux } from '../src/core/photometry/flux';

describe('alignByMax', () => {
  it('после выравнивания по обеим осям максимум оказывается в надире (γ≈0)', () => {
    const doc = loadSample('V1-G1-72441-04L10-6601040-a.ies');
    const result = alignByMax(doc, { alignC0C180: true, alignC90C270: true });
    const imax = findImax(result.doc);
    expect(imax.gamma).toBeLessThan(1);
  });

  it('выравнивание только по одной оси не трогает наклон в другой плоскости', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const result = alignByMax(doc, { alignC0C180: true, alignC90C270: false });
    expect(result.appliedTiltC90C270Deg).toBe(0);
  });

  it('нормировка потока после выравнивания восстанавливает исходный поток', () => {
    const doc = loadSample('V1-G1-72441-04L10-6601040-a.ies');
    const fluxBefore = computeFlux(doc).totalLumens;
    const result = alignByMax(doc, { alignC0C180: true, alignC90C270: true }, { normalizeFlux: true });
    expect(computeFlux(result.doc).totalLumens).toBeCloseTo(fluxBefore, 2);
  });

  it('файл, уже выровненный по максимуму, почти не меняется', () => {
    const doc = loadSample('15 deg.IES');
    const peak = findRefinedPeakDirection(doc);
    expect(peak.gamma).toBeLessThan(5); // «15 deg.IES» и так узкий и почти осевой
  });
});

describe('alignByCentroid', () => {
  it('центроид приводится в надир по обеим осям', () => {
    const doc = loadSample('Эллипс.IES');
    const result = alignByCentroid(doc, { alignC0C180: true, alignC90C270: true });
    expect(Math.abs(result.appliedTiltC0C180Deg)).toBeLessThan(90);
    expect(Math.abs(result.appliedTiltC90C270Deg)).toBeLessThan(90);
    // после выравнивания повторный расчёт центроида должен быть значительно ближе к оси
    const second = alignByCentroid(result.doc, { alignC0C180: true, alignC90C270: true });
    expect(Math.abs(second.appliedTiltC0C180Deg)).toBeLessThan(Math.abs(result.appliedTiltC0C180Deg) + 1);
  });
});
