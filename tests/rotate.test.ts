import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import { computeFlux } from '../src/core/photometry/flux';
import { rotateDoc } from '../src/core/photometry/rotate';
import { findImax } from '../src/core/photometry/metrics';
import type { PhotometryDoc } from '../src/core/ies/types';

describe('rotateDoc — сохранение потока', () => {
  it('поворот на 0° по всем осям не меняет поток (точно)', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const rotated = rotateDoc(doc, { spinDeg: 0, tiltC0C180Deg: 0, tiltC90C270Deg: 0 });
    const fluxBefore = computeFlux(doc).totalLumens;
    const fluxAfter = computeFlux(rotated).totalLumens;
    expect(fluxAfter).toBeCloseTo(fluxBefore, 6);
  });

  it('поворот на 30° по наклону меняет поток не более чем на 0.5% (интерполяция)', () => {
    for (const name of ['V1-G1-72441-04L10-6601040-a.ies', 'Эллипс.IES']) {
      const doc = loadSample(name);
      const fluxBefore = computeFlux(doc).totalLumens;
      const rotated = rotateDoc(doc, { spinDeg: 0, tiltC0C180Deg: 30, tiltC90C270Deg: 0 });
      const fluxAfter = computeFlux(rotated).totalLumens;
      const relError = Math.abs(fluxAfter - fluxBefore) / fluxBefore;
      expect(relError).toBeLessThan(0.005);
    }
  });

  it('опция normalizeFlux восстанавливает поток точно после поворота', () => {
    const doc = loadSample('V1-G1-72441-04L10-6601040-a.ies');
    const fluxBefore = computeFlux(doc).totalLumens;
    const rotated = rotateDoc(doc, { spinDeg: 15, tiltC0C180Deg: 20, tiltC90C270Deg: 10 }, { normalizeFlux: true });
    const fluxAfter = computeFlux(rotated).totalLumens;
    expect(fluxAfter).toBeCloseTo(fluxBefore, 3);
  });
});

describe('rotateDoc — спин по азимуту', () => {
  it('спин на 360° по C воспроизводит исходную КСС (точный сдвиг индексов, без интерполяции)', () => {
    const doc = loadSample('Эллипс-2.IES');
    const rotated = rotateDoc(doc, { spinDeg: 360, tiltC0C180Deg: 0, tiltC90C270Deg: 0 });
    expect(rotated.horizAngles).toHaveLength(doc.horizAngles.length);
    for (let i = 0; i < doc.horizAngles.length; i++) {
      expect(rotated.horizAngles[i]).toBeCloseTo(doc.horizAngles[i], 6);
    }
    for (let i = 0; i < doc.candela.length; i++) {
      expect(rotated.candela[i]).toBeCloseTo(doc.candela[i], 6);
    }
  });

  it('спин на 90°, затем на -90° возвращает поток и направление максимума к исходным', () => {
    const doc = loadSample('15 deg.IES');
    const spun = rotateDoc(doc, { spinDeg: 90, tiltC0C180Deg: 0, tiltC90C270Deg: 0 });
    const back = rotateDoc(spun, { spinDeg: -90, tiltC0C180Deg: 0, tiltC90C270Deg: 0 });
    const imaxBefore = findImax(doc);
    const imaxAfter = findImax(back);
    expect(imaxAfter.value).toBeCloseTo(imaxBefore.value, 3);
    expect(computeFlux(back).totalLumens).toBeCloseTo(computeFlux(doc).totalLumens, 3);
  });

  it('спин смещает направление максимума на заданный угол по азимуту', () => {
    const doc = loadSample('15 deg.IES');
    const imaxBefore = findImax(doc);
    const rotated = rotateDoc(doc, { spinDeg: 40, tiltC0C180Deg: 0, tiltC90C270Deg: 0 });
    const imaxAfter = findImax(rotated);
    const expectedC = (imaxBefore.c + 40 + 360) % 360;
    const diff = Math.min(Math.abs(imaxAfter.c - expectedC), 360 - Math.abs(imaxAfter.c - expectedC));
    expect(diff).toBeLessThan(1);
  });
});

describe('rotateDoc — частичная симметрия расширяется в полный круг', () => {
  function makeQuadrantDoc(): PhotometryDoc {
    // синтетический светильник с квадрантной симметрией (C: 0..90),
    // максимум на оси (γ=0) — такой файл нет среди образцов, но
    // логика расширения сетки должна отрабатывать и на нём.
    const vertAngles = [0, 15, 30, 45, 60, 75, 90];
    const horizAngles = [0, 30, 60, 90];
    const candela = new Float64Array(vertAngles.length * horizAngles.length);
    for (let iH = 0; iH < horizAngles.length; iH++) {
      for (let iG = 0; iG < vertAngles.length; iG++) {
        candela[iH * vertAngles.length + iG] = 1000 * Math.cos((vertAngles[iG] * Math.PI) / 180);
      }
    }
    return {
      format: 'LM-63-2002',
      keywords: [],
      tilt: { mode: 'NONE' },
      numLamps: 1,
      lumensPerLamp: 1000,
      candelaMultiplier: 1,
      numVertAngles: vertAngles.length,
      numHorizAngles: horizAngles.length,
      photometricType: 1,
      unitsType: 2,
      width: 0,
      length: 0,
      height: 0,
      ballastFactor: 1,
      futureUse: 1,
      inputWatts: 10,
      vertAngles,
      horizAngles,
      candela,
      sourceEncoding: 'utf-8',
      warnings: [],
    };
  }

  it('спин квадрантного файла на 45° не падает и даёт полный круг азимутов', () => {
    const doc = makeQuadrantDoc();
    const rotated = rotateDoc(doc, { spinDeg: 45, tiltC0C180Deg: 0, tiltC90C270Deg: 0 });
    expect(rotated.horizAngles.length).toBeGreaterThan(doc.horizAngles.length);
    expect(Math.max(...rotated.horizAngles)).toBeGreaterThan(300);
    const fluxBefore = computeFlux(doc).totalLumens;
    const fluxAfter = computeFlux(rotated).totalLumens;
    expect(Math.abs(fluxAfter - fluxBefore) / fluxBefore).toBeLessThan(0.02);
  });

  it('наклон на 90° квадрантного файла расширяет вертикальную сетку до 180° (свет "перетекает" за горизонт)', () => {
    const doc = makeQuadrantDoc();
    const rotated = rotateDoc(doc, { spinDeg: 0, tiltC0C180Deg: 90, tiltC90C270Deg: 0 });
    expect(rotated.vertAngles[rotated.vertAngles.length - 1]).toBeGreaterThanOrEqual(179);
    // после наклона на 90° часть потока оказывается в "верхней" полусфере — она не должна потеряться
    const fluxAfter = computeFlux(rotated);
    expect(fluxAfter.upwardLumens).toBeGreaterThan(0);
  });
});
