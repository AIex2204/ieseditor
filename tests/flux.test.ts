import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import { computeFlux } from '../src/core/photometry/flux';
import { scaleFluxTo } from '../src/core/photometry/scaleFlux';
import { findImax } from '../src/core/photometry/metrics';

describe('computeFlux', () => {
  it('расчётный поток «Эллипс.IES» (LM-63-2002, 181×73) близок к заявленному 1031.6 лм', () => {
    const doc = loadSample('Эллипс.IES');
    const flux = computeFlux(doc);
    expect(flux.totalLumens).toBeGreaterThan(0);
    const declared = doc.lumensPerLamp * doc.numLamps;
    const relError = Math.abs(flux.totalLumens - declared) / declared;
    expect(relError).toBeLessThan(0.05);
  });

  it('расчётные потоки «Эллипс.IES» и «Эллипс-2.IES» (тот же светильник, два формата) совпадают между собой', () => {
    const docA = loadSample('Эллипс.IES'); // LM-63-2002, 181×73, γ 0..90
    const docB = loadSample('Эллипс-2.IES'); // LM-63-1995, 361×73, γ 0..180 (полный меридиан)
    const fluxA = computeFlux(docA);
    const fluxB = computeFlux(docB);
    const relError = Math.abs(fluxA.totalLumens - fluxB.totalLumens) / fluxA.totalLumens;
    expect(relError).toBeLessThan(0.02);
  });

  it('downwardLumens + upwardLumens === totalLumens', () => {
    for (const name of ['15 deg.IES', 'V1-G1-72441-04L10-6601040-a.ies', 'V1-S1-7R710-40x32-6604040-a.ies']) {
      const doc = loadSample(name);
      const flux = computeFlux(doc);
      expect(flux.downwardLumens + flux.upwardLumens).toBeCloseTo(flux.totalLumens, 6);
      expect(flux.dff + flux.uff).toBeCloseTo(1, 6);
    }
  });

  it('КПД лежит в физически разумных пределах (0, 1.2] для всех образцов', () => {
    for (const name of [
      '1006000290_evoline_led_300_12w_a15_827_sl.ies',
      '15 deg.IES',
      'V1-G1-72441-04L10-6601040-a.ies',
      'V1-S1-7R710-40x32-6604040-a.ies',
      'Эллипс.IES',
      'Эллипс-2.IES',
    ]) {
      const doc = loadSample(name);
      const flux = computeFlux(doc);
      if (flux.efficiency !== null) {
        expect(flux.efficiency).toBeGreaterThan(0);
        expect(flux.efficiency).toBeLessThanOrEqual(1.2);
      }
    }
  });
});

describe('scaleFluxTo', () => {
  it('после масштабирования расчётный поток равен целевому, multiplier=1', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const scaled = scaleFluxTo(doc, 2000, 'computed');
    const flux = computeFlux(scaled);
    expect(flux.totalLumens).toBeCloseTo(2000, 3);
    expect(scaled.candelaMultiplier).toBe(1);
    expect(scaled.lumensPerLamp * scaled.numLamps).toBeCloseTo(2000, 3);
  });

  it('масштабирование сохраняет форму КСС (Imax растёт в том же соотношении, что и поток)', () => {
    const doc = loadSample('V1-G1-72441-04L10-6601040-a.ies');
    const before = findImax(doc);
    const fluxBefore = computeFlux(doc).totalLumens;
    const scaled = scaleFluxTo(doc, fluxBefore * 2, 'computed');
    const after = findImax(scaled);
    expect(after.value / before.value).toBeCloseTo(2, 3);
    expect(after.gamma).toBeCloseTo(before.gamma, 6);
    expect(after.c).toBeCloseTo(before.c, 6);
  });

  it('бросает исключение для некорректного целевого потока', () => {
    const doc = loadSample('Эллипс.IES');
    expect(() => scaleFluxTo(doc, 0, 'computed')).toThrow();
    expect(() => scaleFluxTo(doc, -100, 'computed')).toThrow();
  });
});

describe('findImax', () => {
  it('находит максимум КСС в разумном направлении (не на самом широком угле)', () => {
    const doc = loadSample('15 deg.IES');
    const imax = findImax(doc);
    expect(imax.value).toBeGreaterThan(0);
    expect(imax.gamma).toBeGreaterThanOrEqual(0);
    expect(imax.gamma).toBeLessThanOrEqual(90);
  });
});
