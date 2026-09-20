import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import { cleanDoc, detectCutoff, previewClean } from '../src/core/photometry/clean';
import { computeFlux } from '../src/core/photometry/flux';

describe('detectCutoff + cleanDoc на V1-G1-72441 (известные мусорные хвосты 0.03/0.13/0.01 после нулей)', () => {
  it('находит мусор и обнуляет его при потере потока < 0.01%, не трогая законный плавный спад луча', () => {
    const doc = loadSample('V1-G1-72441-04L10-6601040-a.ies');
    const detection = detectCutoff(doc);
    // мусор в этом файле находится далеко за пределами основного луча (не на 38.5°,
    // как ошибочно находил старый алгоритм по одной лишь величине относительно Imax)
    expect(detection.cutoffGamma).toBeGreaterThan(80);

    const options = { cutoffGamma: detection.cutoffGamma, dropRatio: detection.dropRatio, magnitudeCapFraction: detection.magnitudeCapFraction };
    const preview = previewClean(doc, options);
    expect(preview.affectedCount).toBeGreaterThan(0);
    expect(preview.lostFraction).toBeLessThan(0.0001);

    const cleaned = cleanDoc(doc, options);
    const fluxBefore = computeFlux(doc).totalLumens;
    const fluxAfter = computeFlux(cleaned).totalLumens;
    expect(Math.abs(fluxAfter - fluxBefore) / fluxBefore).toBeLessThan(0.0001);

    // законный плавный спад луча (напр. ~67 кд на 40°) должен остаться нетронутым
    const iG40 = doc.vertAngles.findIndex((g) => Math.abs(g - 40) < 1e-6);
    expect(iG40).toBeGreaterThanOrEqual(0);
    let rowMaxAt40Before = 0;
    let rowMaxAt40After = 0;
    for (let iH = 0; iH < doc.numHorizAngles; iH++) {
      rowMaxAt40Before = Math.max(rowMaxAt40Before, doc.candela[iH * doc.numVertAngles + iG40]);
      rowMaxAt40After = Math.max(rowMaxAt40After, cleaned.candela[iH * doc.numVertAngles + iG40]);
    }
    expect(rowMaxAt40After).toBeCloseTo(rowMaxAt40Before, 6);
    expect(rowMaxAt40Before).toBeGreaterThan(50); // сверяемся, что это и правда значимый сигнал, а не мусор
  });

  it('не трогает значения, не являющиеся резким обрывом (например, монотонно убывающие)', () => {
    const doc = loadSample('V1-G1-72441-04L10-6601040-a.ies');
    const detection = detectCutoff(doc);
    const cleaned = cleanDoc(doc, {
      cutoffGamma: detection.cutoffGamma,
      dropRatio: detection.dropRatio,
      magnitudeCapFraction: detection.magnitudeCapFraction,
    });
    let unchangedSignificant = 0;
    for (let i = 0; i < doc.candela.length; i++) {
      if (doc.candela[i] > 10) {
        expect(cleaned.candela[i]).toBeCloseTo(doc.candela[i], 9);
        unchangedSignificant++;
      }
    }
    expect(unchangedSignificant).toBeGreaterThan(1000);
  });

  it('плавный спад (smoothFalloff) не даёт отрицательных значений', () => {
    const doc = loadSample('V1-G1-72441-04L10-6601040-a.ies');
    const detection = detectCutoff(doc);
    const cleaned = cleanDoc(doc, {
      cutoffGamma: detection.cutoffGamma,
      dropRatio: detection.dropRatio,
      magnitudeCapFraction: detection.magnitudeCapFraction,
      smoothFalloff: true,
      falloffWidthDeg: 3,
    });
    for (let i = 0; i < cleaned.candela.length; i++) {
      expect(cleaned.candela[i]).toBeGreaterThanOrEqual(0);
    }
  });

  it('normalizeFlux восстанавливает исходный поток после чистки', () => {
    const doc = loadSample('V1-G1-72441-04L10-6601040-a.ies');
    const detection = detectCutoff(doc);
    const fluxBefore = computeFlux(doc).totalLumens;
    const cleaned = cleanDoc(doc, {
      cutoffGamma: detection.cutoffGamma,
      dropRatio: detection.dropRatio,
      magnitudeCapFraction: detection.magnitudeCapFraction,
      normalizeFlux: true,
    });
    expect(computeFlux(cleaned).totalLumens).toBeCloseTo(fluxBefore, 3);
  });

  it('на файле без мусорного хвоста ничего не меняет', () => {
    const doc = loadSample('Эллипс.IES');
    const detection = detectCutoff(doc);
    const cleaned = cleanDoc(doc, {
      cutoffGamma: detection.cutoffGamma,
      dropRatio: detection.dropRatio,
      magnitudeCapFraction: detection.magnitudeCapFraction,
    });
    for (let i = 0; i < doc.candela.length; i++) {
      expect(cleaned.candela[i]).toBeCloseTo(doc.candela[i], 9);
    }
  });
});
