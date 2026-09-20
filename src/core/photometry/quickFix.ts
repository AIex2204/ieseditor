// Конвейер «одной кнопки» — приводит файл в порядок дефолтными настройками,
// теми же, что у отдельных инструментов. Позиционирование продукта: не сотня
// настроек, а одно нажатие «Исправить IES». Отдельные шаги доступны рядом для
// более тонкой работы.
import type { PhotometryDoc } from '../ies/types';
import { alignByCentroid } from './align';
import { compressAfterSymmetrize, symmetrizeDoc } from './symmetrize';
import { smoothDoc } from './smooth';
import { cleanDoc, detectCutoff } from './clean';

// Каждый шаг сохраняет поток (normalizeFlux) и совпадает по дефолтам с
// одноимённым инструментом. Обёрнуты в try/catch: сбой одного шага (например,
// нечего симметризовать) не должен ронять весь конвейер.
export function applyAlign(doc: PhotometryDoc): PhotometryDoc {
  try {
    return alignByCentroid(doc, { alignC0C180: true, alignC90C270: true }, 0.5, { normalizeFlux: true }).doc;
  } catch {
    return doc;
  }
}

export function applySymmetrize(doc: PhotometryDoc): PhotometryDoc {
  try {
    const r = symmetrizeDoc(doc, 'average', { axial: false, c0c180: true, c90c270: true });
    return compressAfterSymmetrize(r, { c0c180: true, c90c270: true });
  } catch {
    return doc;
  }
}

export function applySmooth(doc: PhotometryDoc): PhotometryDoc {
  try {
    return smoothDoc(doc, { window: 11, degree: 2, smoothAzimuth: false, protectPeak: true });
  } catch {
    return doc;
  }
}

export function applyClean(doc: PhotometryDoc): PhotometryDoc {
  try {
    const d = detectCutoff(doc);
    return cleanDoc(doc, {
      cutoffGamma: d.cutoffGamma,
      dropRatio: d.dropRatio,
      magnitudeCapFraction: d.magnitudeCapFraction,
      smoothFalloff: false,
      falloffWidthDeg: 3,
      normalizeFlux: true,
    });
  } catch {
    return doc;
  }
}

/**
 * «Исправить IES»: последовательно выравнивает, симметризует, сглаживает и
 * чистит. Порядок важен — сначала центрируем и делаем симметричным, затем
 * убираем шум и мусорные хвосты.
 */
export function fixDoc(doc: PhotometryDoc): PhotometryDoc {
  return applyClean(applySmooth(applySymmetrize(applyAlign(doc))));
}
