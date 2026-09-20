// Чистка файла (п. 3.11 ТЗ): удаление мусорных ненулевых значений в
// широких углах.
//
// Первая версия отбирала "мусор" только по величине (< % от Imax). Это
// оказалось некорректно: у узких/асимметричных КСС законный плавный спад
// луча на 30-90° от оси сам по себе может быть <0.5% Imax на протяжении
// половины углового диапазона — такой критерий срезал реальные данные
// (проверено на V1-G1-72441: потеря потока 8.6% вместо ожидаемых <0.01%).
//
// Настоящий признак мусора — не малая величина сама по себе, а РЕЗКИЙ
// обрыв тренда прямо перед тем, как столбец окончательно уходит в
// точный ноль (типичный артефакт округления/экспорта: "...0.59 0.13 0.01
// 0 0..." — падение на порядок за один шаг, а не плавное затухание).
// Поэтому ячейка считается мусором, только если ОДНОВРЕМЕННО:
//   1) она мала по модулю (< magnitudeCapFraction·Imax) — простая страховка;
//   2) она в разы (< dropRatio) меньше своего соседа "изнутри" (более
//      близкого к оси) — то есть представляет собой скачок, а не
//      продолжение плавного спада.
import type { PhotometryDoc } from '../ies/types';
import { cloneDoc } from '../ies/types';
import { findImax } from './metrics';
import { computeFlux } from './flux';
import { restoreFluxTo } from './scaleFlux';

export interface CleanDetection {
  /** Самый ранний угол, с которого где-либо (в любом азимуте) начинается обнаруженный мусор. */
  cutoffGamma: number;
  dropRatio: number;
  magnitudeCapFraction: number;
}

function isGarbageCell(doc: PhotometryDoc, iH: number, iG: number, magnitudeCap: number, dropRatio: number): boolean {
  if (iG === 0) return false;
  const nv = doc.numVertAngles;
  const v = doc.candela[iH * nv + iG];
  if (v <= 0 || v > magnitudeCap) return false;
  const inner = doc.candela[iH * nv + iG - 1];
  if (inner <= 0) return true; // сосед изнутри уже ноль, а тут что-то есть — явный шум
  return v < dropRatio * inner;
}

/** Ищет самый ранний угол, начиная с которого где-либо встречается ячейка-кандидат в мусор. */
export function detectCutoff(doc: PhotometryDoc, dropRatio = 0.3, magnitudeCapFraction = 0.05): CleanDetection {
  const imax = findImax(doc).value;
  const magnitudeCap = magnitudeCapFraction * imax;
  const nv = doc.numVertAngles;

  let earliestGamma = doc.vertAngles[nv - 1];
  let anyFound = false;
  for (let iH = 0; iH < doc.numHorizAngles; iH++) {
    for (let iG = 1; iG < nv; iG++) {
      if (isGarbageCell(doc, iH, iG, magnitudeCap, dropRatio)) {
        if (doc.vertAngles[iG] < earliestGamma || !anyFound) earliestGamma = doc.vertAngles[iG];
        anyFound = true;
        break;
      }
    }
  }

  return { cutoffGamma: anyFound ? earliestGamma : doc.vertAngles[nv - 1], dropRatio, magnitudeCapFraction };
}

export interface CleanOptions {
  /** Не трогать ничего до этого угла — пользовательская нижняя граница поиска. */
  cutoffGamma: number;
  dropRatio: number;
  magnitudeCapFraction: number;
  /** Плавный косинусный спад к нулю вместо жёсткого обнуления. */
  smoothFalloff?: boolean;
  falloffWidthDeg?: number;
  normalizeFlux?: boolean;
}

export interface CleanPreview {
  affectedCount: number;
  lostLumens: number;
  lostFraction: number;
}

function computeCleaned(doc: PhotometryDoc, options: CleanOptions): { doc: PhotometryDoc; affectedCount: number } {
  const imax = findImax(doc).value;
  const magnitudeCap = options.magnitudeCapFraction * imax;
  const next = cloneDoc(doc);
  const nv = doc.numVertAngles;
  const falloffWidth = options.falloffWidthDeg ?? 3;
  let affectedCount = 0;

  for (let iH = 0; iH < doc.numHorizAngles; iH++) {
    for (let iG = 1; iG < nv; iG++) {
      const gamma = doc.vertAngles[iG];
      if (gamma < options.cutoffGamma - 1e-9) continue;
      if (!isGarbageCell(doc, iH, iG, magnitudeCap, options.dropRatio)) continue;

      const idx = iH * nv + iG;
      const v = doc.candela[idx];
      if (options.smoothFalloff && gamma < options.cutoffGamma + falloffWidth) {
        const t = (gamma - options.cutoffGamma) / falloffWidth;
        const w = 0.5 * (1 + Math.cos(Math.PI * t));
        next.candela[idx] = v * w;
      } else {
        next.candela[idx] = 0;
      }
      if (next.candela[idx] !== v) affectedCount++;
    }
  }

  return { doc: next, affectedCount };
}

export function previewClean(doc: PhotometryDoc, options: CleanOptions): CleanPreview {
  const { doc: cleaned, affectedCount } = computeCleaned(doc, options);
  const fluxBefore = computeFlux(doc).totalLumens;
  const fluxAfter = computeFlux(cleaned).totalLumens;
  const lostLumens = fluxBefore - fluxAfter;
  return {
    affectedCount,
    lostLumens,
    lostFraction: fluxBefore > 0 ? lostLumens / fluxBefore : 0,
  };
}

export function cleanDoc(doc: PhotometryDoc, options: CleanOptions): PhotometryDoc {
  const { doc: cleaned, affectedCount } = computeCleaned(doc, options);
  // мусора не нашлось — возвращаем исходный документ, а не его копию:
  // иначе открытие инструмента на чистом файле уже считалось бы правкой
  if (affectedCount === 0) return doc;
  cleaned.candelaMultiplier = 1;
  if (options.normalizeFlux) {
    const targetFlux = computeFlux(doc).totalLumens;
    if (targetFlux > 0) return restoreFluxTo(cleaned, targetFlux);
  }
  return cleaned;
}
