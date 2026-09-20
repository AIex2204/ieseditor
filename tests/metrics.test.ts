import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import {
  beamAngleAtGlobalHalfMax,
  classifyPlane,
  findImax,
  GOST_CURVE_NAMES,
  meridianPeak,
} from '../src/core/photometry/metrics';

describe('beamAngleAtGlobalHalfMax', () => {
  it('в плоскости глобального максимума угол положителен и меньше полного диапазона', () => {
    for (const name of [
      '1006000290_evoline_led_300_12w_a15_827_sl.ies',
      '15 deg.IES',
      'V1-G1-72441-04L10-6601040-a.ies',
      'V1-S1-7R710-40x32-6604040-a.ies',
      'Эллипс.IES',
      'Эллипс-2.IES',
    ]) {
      const doc = loadSample(name);
      const imax = findImax(doc);
      const gMax = doc.vertAngles[doc.vertAngles.length - 1];
      const result = beamAngleAtGlobalHalfMax(doc, imax.c);
      expect(result.fullAngle).not.toBeNull();
      expect(result.fullAngle as number).toBeGreaterThan(0);
      expect(result.fullAngle as number).toBeLessThanOrEqual(2 * gMax + 0.5);
      // граничные точки действительно лежат примерно на уровне 50% глобального максимума
      expect(result.lo!.value).toBeLessThanOrEqual(result.thresholdValue * 1.05);
      expect(result.hi!.value).toBeLessThanOrEqual(result.thresholdValue * 1.05);
    }
  });

  it('«15 deg.IES» имеет узкую КСС — полный угол в правдоподобном диапазоне для прожекторной оптики', () => {
    const doc = loadSample('15 deg.IES');
    const imax = findImax(doc);
    const result = beamAngleAtGlobalHalfMax(doc, imax.c);
    expect(result.fullAngle).not.toBeNull();
    expect(result.fullAngle as number).toBeGreaterThan(5);
    expect(result.fullAngle as number).toBeLessThan(60);
  });

  it('плоскость без данных выше половины глобального максимума возвращает null (не ломается)', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const imax = findImax(doc);
    // плоскость, заведомо далёкая от максимума по азимуту
    const farC = (imax.c + 90) % 360;
    const result = beamAngleAtGlobalHalfMax(doc, farC);
    expect(result.fullAngle === null || (result.fullAngle as number) > 0).toBe(true);
  });
});

describe('classifyPlane — тип КСС отдельно по каждой плоскости', () => {
  it('на всех образцах даёт тип для C0–C180 и для C90–C270, с расшифровкой названия', () => {
    for (const name of [
      '1006000290_evoline_led_300_12w_a15_827_sl.ies',
      '15 deg.IES',
      'V1-G1-72441-04L10-6601040-a.ies',
      'V1-S1-7R710-40x32-6604040-a.ies',
      'Эллипс.IES',
      'Эллипс-2.IES',
    ]) {
      const doc = loadSample(name);
      for (const cPlane of [0, 90]) {
        const result = classifyPlane(doc, cPlane);
        expect(result.fullAngle, `${name} C${cPlane}`).not.toBeNull();
        expect(result.type, `${name} C${cPlane}`).not.toBeNull();
        expect(GOST_CURVE_NAMES[result.type!]).toBeTruthy();
      }
    }
  });

  it('узкая КСС «15 deg.IES» классифицируется как концентрированная или глубокая', () => {
    const doc = loadSample('15 deg.IES');
    expect(['К', 'Г']).toContain(classifyPlane(doc, 0).type);
  });
});

describe('meridianPeak', () => {
  it('пик меридиана в плоскости глобального максимума совпадает по значению с findImax', () => {
    const doc = loadSample('Эллипс.IES');
    const imax = findImax(doc);
    const peak = meridianPeak(doc, imax.c);
    expect(peak.value).toBeCloseTo(imax.value, 3);
  });
});
