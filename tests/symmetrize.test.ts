import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import { compressAfterSymmetrize, symmetrizeDoc } from '../src/core/photometry/symmetrize';
import { computeFlux } from '../src/core/photometry/flux';
import { interpolateCandela } from '../src/core/photometry/interpolate';

describe('symmetrizeDoc — режим "среднее"', () => {
  it('сохраняет поток с точностью до 1e-9 (относительная ошибка)', () => {
    for (const name of ['V1-G1-72441-04L10-6601040-a.ies', 'V1-S1-7R710-40x32-6604040-a.ies']) {
      const doc = loadSample(name);
      const fluxBefore = computeFlux(doc).totalLumens;
      const symmetrized = symmetrizeDoc(doc, 'average', { axial: false, c0c180: true, c90c270: true });
      const fluxAfter = computeFlux(symmetrized).totalLumens;
      expect(Math.abs(fluxAfter - fluxBefore) / fluxBefore).toBeLessThan(1e-9);
    }
  });

  it('после симметризации по обеим осям КСС инвариантна к обоим отражениям', () => {
    const doc = loadSample('Эллипс.IES');
    const symmetrized = symmetrizeDoc(doc, 'average', { axial: false, c0c180: true, c90c270: true });
    for (const gamma of [10, 45, 80]) {
      for (const c of [17, 63, 210, 305]) {
        const a = interpolateCandela(symmetrized, gamma, c);
        const b = interpolateCandela(symmetrized, gamma, (360 - c) % 360);
        const d = interpolateCandela(symmetrized, gamma, (180 - c + 360) % 360);
        expect(b).toBeCloseTo(a, 4);
        expect(d).toBeCloseTo(a, 4);
      }
    }
  });
});

describe('symmetrizeDoc — режим "максимум"', () => {
  it('поток после симметризации по максимуму не меньше исходного', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const fluxBefore = computeFlux(doc).totalLumens;
    const symmetrized = symmetrizeDoc(doc, 'max', { axial: false, c0c180: true, c90c270: false });
    const fluxAfter = computeFlux(symmetrized).totalLumens;
    expect(fluxAfter).toBeGreaterThanOrEqual(fluxBefore - 1e-6);
  });
});

describe('symmetrizeDoc — осевая', () => {
  it('коллапсирует КСС в одну плоскость, поток сохраняется', () => {
    const doc = loadSample('Эллипс-2.IES');
    const fluxBefore = computeFlux(doc).totalLumens;
    const symmetrized = symmetrizeDoc(doc, 'average', { axial: true, c0c180: false, c90c270: false });
    expect(symmetrized.numHorizAngles).toBe(1);
    const fluxAfter = computeFlux(symmetrized).totalLumens;
    expect(Math.abs(fluxAfter - fluxBefore) / fluxBefore).toBeLessThan(1e-6);
  });
});

describe('compressAfterSymmetrize', () => {
  it('после симметризации по обеим осям сжимает таблицу C примерно до четверти', () => {
    const doc = loadSample('Эллипс.IES');
    const symmetrized = symmetrizeDoc(doc, 'average', { axial: false, c0c180: true, c90c270: true });
    const compressed = compressAfterSymmetrize(symmetrized, { c0c180: true, c90c270: true });
    expect(compressed.numHorizAngles).toBeLessThan(symmetrized.numHorizAngles);
    expect(Math.max(...compressed.horizAngles)).toBeLessThanOrEqual(90 + 1e-6);
    // значения на оставшейся сетке не изменились — это просто обрезка, не пересэмплирование
    for (let i = 0; i < compressed.numHorizAngles; i++) {
      expect(compressed.candela[i]).toBeCloseTo(symmetrized.candela[i], 9);
    }
  });

  it('без симметрии по C0-C180 сжатие не выполняется (нет представления в LM-63)', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const symmetrized = symmetrizeDoc(doc, 'average', { axial: false, c0c180: false, c90c270: true });
    const compressed = compressAfterSymmetrize(symmetrized, { c0c180: false, c90c270: true });
    expect(compressed.numHorizAngles).toBe(symmetrized.numHorizAngles);
  });
});
