import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import { toMeters } from '../src/core/ies/normalizeUnits';

describe('toMeters — работаем только в метрах', () => {
  it('файл в футах пересчитывается, единица становится метрами', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    // 1 фут = 0,3048 м; берём круглые числа, чтобы проверка читалась
    const inFeet = { ...doc, unitsType: 1 as const, width: 2, length: 4, height: 1 };
    const result = toMeters(inFeet);

    expect(result.unitsType).toBe(2);
    expect(result.width).toBeCloseTo(0.6096, 6);
    expect(result.length).toBeCloseTo(1.2192, 6);
    expect(result.height).toBeCloseTo(0.3048, 6);
    expect(result.warnings.some((w) => w.code === 'units-converted')).toBe(true);
  });

  it('знак сохраняется — он кодирует круглую форму светового отверстия', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const roundInFeet = { ...doc, unitsType: 1 as const, width: -2, length: 0, height: 0 };
    const result = toMeters(roundInFeet);
    expect(result.width).toBeCloseTo(-0.6096, 6);
    expect(result.length).toBe(0);
    expect(result.height).toBe(0);
  });

  it('файл в метрах возвращается тем же объектом — без лишних перерисовок и ложных «правок»', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    expect(doc.unitsType).toBe(2);
    expect(toMeters(doc)).toBe(doc);
  });

  it('фотометрия и таблица силы света не затрагиваются', () => {
    const doc = loadSample('Эллипс.IES');
    const result = toMeters({ ...doc, unitsType: 1 as const });
    expect(result.candela).toBe(doc.candela);
    expect(result.vertAngles).toBe(doc.vertAngles);
    expect(result.lumensPerLamp).toBe(doc.lumensPerLamp);
  });
});
