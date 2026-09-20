import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import { restoreFluxTo, scaleFluxTo } from '../src/core/photometry/scaleFlux';
import { rotateDoc } from '../src/core/photometry/rotate';
import { cleanDoc, detectCutoff } from '../src/core/photometry/clean';
import { computeFlux } from '../src/core/photometry/flux';

const SAMPLES = [
  '1006000290_evoline_led_300_12w_a15_827_sl.ies',
  'V1-S1-7R710-40x32-6604040-a.ies',
  'Эллипс.IES',
];

describe('операции не трогают лишнего', () => {
  it('восстановление потока не переписывает заявленный поток лампы', () => {
    for (const name of SAMPLES) {
      const doc = loadSample(name);
      const target = computeFlux(doc).totalLumens * 1.05;
      const restored = restoreFluxTo(doc, target);

      expect(restored.lumensPerLamp, name).toBe(doc.lumensPerLamp);
      expect(computeFlux(restored).totalLumens).toBeCloseTo(target, 3);
      // а вот scaleFluxTo — инструмент «Поток» — шапку обновляет намеренно
      const rescaled = scaleFluxTo(doc, target, 'computed');
      expect(rescaled.lumensPerLamp).not.toBe(doc.lumensPerLamp);
    }
  });

  it('поворот с нормировкой потока сохраняет заявленный поток лампы', () => {
    for (const name of SAMPLES) {
      const doc = loadSample(name);
      const rotated = rotateDoc(doc, { spinDeg: 0, tiltC0C180Deg: 3, tiltC90C270Deg: 0 }, { normalizeFlux: true });
      expect(rotated.lumensPerLamp, name).toBe(doc.lumensPerLamp);
      expect(computeFlux(rotated).totalLumens).toBeCloseTo(computeFlux(doc).totalLumens, 3);
    }
  });

  it('чистка на файле без мусора возвращает исходный документ как есть', () => {
    for (const name of ['Эллипс.IES', '1006000290_evoline_led_300_12w_a15_827_sl.ies']) {
      const doc = loadSample(name);
      const detection = detectCutoff(doc);
      const cleaned = cleanDoc(doc, {
        cutoffGamma: detection.cutoffGamma,
        dropRatio: detection.dropRatio,
        magnitudeCapFraction: detection.magnitudeCapFraction,
        normalizeFlux: true,
      });
      // тот же объект — значит ни одно поле файла не изменилось
      expect(cleaned, name).toBe(doc);
    }
  });

  it('чистка на файле с мусором чистит таблицу, но не заявленный поток', () => {
    const doc = loadSample('V1-G1-72441-04L10-6601040-a.ies');
    const detection = detectCutoff(doc);
    const cleaned = cleanDoc(doc, {
      cutoffGamma: detection.cutoffGamma,
      dropRatio: detection.dropRatio,
      magnitudeCapFraction: detection.magnitudeCapFraction,
      normalizeFlux: true,
    });
    expect(cleaned).not.toBe(doc);
    expect(cleaned.lumensPerLamp).toBe(doc.lumensPerLamp);
    expect(computeFlux(cleaned).totalLumens).toBeCloseTo(computeFlux(doc).totalLumens, 3);
  });

  it('поворот на нулевые углы возвращает документ без изменений', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const rotated = rotateDoc(doc, { spinDeg: 0, tiltC0C180Deg: 0, tiltC90C270Deg: 0 }, { normalizeFlux: true });
    expect(rotated.numVertAngles).toBe(doc.numVertAngles);
    expect(rotated.numHorizAngles).toBe(doc.numHorizAngles);
    expect(rotated.lumensPerLamp).toBe(doc.lumensPerLamp);
    for (let i = 0; i < doc.candela.length; i++) {
      expect(rotated.candela[i]).toBeCloseTo(doc.candela[i], 6);
    }
  });
});
