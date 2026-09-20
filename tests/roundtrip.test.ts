import { describe, expect, it } from 'vitest';
import { SAMPLE_FILES, loadSample } from './helpers';
import { serializeIes } from '../src/core/ies/serialize';
import { parseIesText } from '../src/core/ies/parse';

describe('round-trip: разбор → сериализация → разбор', () => {
  for (const fileName of SAMPLE_FILES) {
    it(`сохраняет структуру и числа: ${fileName}`, () => {
      const doc1 = loadSample(fileName);

      const errors1 = doc1.warnings.filter((w) => w.severity === 'error');
      expect(errors1, JSON.stringify(errors1)).toHaveLength(0);

      const text2 = serializeIes(doc1);
      const doc2 = parseIesText(text2, doc1.sourceEncoding).doc;

      const errors2 = doc2.warnings.filter((w) => w.severity === 'error');
      expect(errors2, JSON.stringify(errors2)).toHaveLength(0);

      expect(doc2.format).toBe(doc1.format);
      expect(doc2.numLamps).toBe(doc1.numLamps);
      expect(doc2.lumensPerLamp).toBeCloseTo(doc1.lumensPerLamp, 6);
      expect(doc2.candelaMultiplier).toBeCloseTo(doc1.candelaMultiplier, 6);
      expect(doc2.numVertAngles).toBe(doc1.numVertAngles);
      expect(doc2.numHorizAngles).toBe(doc1.numHorizAngles);
      expect(doc2.photometricType).toBe(doc1.photometricType);
      expect(doc2.unitsType).toBe(doc1.unitsType);
      expect(doc2.width).toBeCloseTo(doc1.width, 6);
      expect(doc2.length).toBeCloseTo(doc1.length, 6);
      expect(doc2.height).toBeCloseTo(doc1.height, 6);
      expect(doc2.ballastFactor).toBeCloseTo(doc1.ballastFactor, 6);
      expect(doc2.inputWatts).toBeCloseTo(doc1.inputWatts, 6);

      expect(doc2.vertAngles).toHaveLength(doc1.vertAngles.length);
      for (let i = 0; i < doc1.vertAngles.length; i++) {
        expect(doc2.vertAngles[i]).toBeCloseTo(doc1.vertAngles[i], 6);
      }
      expect(doc2.horizAngles).toHaveLength(doc1.horizAngles.length);
      for (let i = 0; i < doc1.horizAngles.length; i++) {
        expect(doc2.horizAngles[i]).toBeCloseTo(doc1.horizAngles[i], 6);
      }

      expect(doc2.candela.length).toBe(doc1.candela.length);
      for (let i = 0; i < doc1.candela.length; i++) {
        // допуск учитывает округление при выводе (6 знаков после запятой)
        expect(doc2.candela[i]).toBeCloseTo(doc1.candela[i], 3);
      }

      expect(doc2.keywords.length).toBe(doc1.keywords.length);
      for (let i = 0; i < doc1.keywords.length; i++) {
        expect(doc2.keywords[i].key).toBe(doc1.keywords[i].key);
        expect(doc2.keywords[i].value.trim()).toBe(doc1.keywords[i].value.trim());
      }

      expect(doc2.tilt.mode).toBe(doc1.tilt.mode);
    });
  }
});
