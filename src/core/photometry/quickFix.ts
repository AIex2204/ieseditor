// Конвейер «одной кнопки» (Исправить IES) — приводит файл в порядок дефолтными
// настройками. Позиционирование продукта: не сотня настроек, а одно нажатие.
//
// Важно: конвейер НЕ ломает намеренно несимметричные и боковые КСС (уличная,
// заливающая оптика, wall-washer). Для этого выравнивание и симметризация
// работают «по одному сечению»: выравниваем только ту плоскость, где наклон
// мал (значит, это погрешность установки, а не задумка), а симметризуем только
// ту, относительно которой КСС и так почти симметрична. Плоскость с сильным
// боковым забросом остаётся как есть.
import type { PhotometryDoc } from '../ies/types';
import { alignByCentroid, findCentroidDirection } from './align';
import { decomposeToNadir } from './rotationMath';
import { fullAzimuth } from './rotate';
import { interpolateCandela } from './interpolate';
import { compressAfterSymmetrize, symmetrizeDoc } from './symmetrize';
import { smoothDoc } from './smooth';
import { cleanDoc, detectCutoff } from './clean';

// Плоскость с наклоном больше этого считаем намеренным боковым забросом и не
// выравниваем. Мелкие наклоны (перекос при измерении) по-прежнему исправляются.
const ALIGN_TILT_MAX_DEG = 20;
// Плоскость, относительно которой КСС отличается сильнее этого, не симметризуем —
// это реальная асимметрия светильника, а не шум.
const SYMM_ASYMMETRY_MAX = 0.35;

const mirrorAboutC0 = (c: number): number => {
  const v = (360 - c) % 360;
  return v < 0 ? v + 360 : v;
};
const mirrorAboutC90 = (c: number): number => {
  const v = (180 - c) % 360;
  return v < 0 ? v + 360 : v;
};

/** Насколько КСС несимметрична относительно плоскости (0 — идеально, 1 — совсем). */
function planeAsymmetry(doc: PhotometryDoc, mirror: (c: number) => number): number {
  const cAngles = fullAzimuth(doc);
  let num = 0;
  let den = 0;
  for (let iG = 0; iG < doc.numVertAngles; iG++) {
    const g = doc.vertAngles[iG];
    for (const c of cAngles) {
      const a = interpolateCandela(doc, g, c);
      const b = interpolateCandela(doc, g, mirror(c));
      num += Math.abs(a - b);
      den += a;
    }
  }
  return den > 0 ? num / den : 0;
}

// --- отдельные шаги (используются мобильными кнопками «в один тап») ---
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

// --- «умные» шаги конвейера: не трогают намеренную асимметрию ---
export function smartAlign(doc: PhotometryDoc): PhotometryDoc {
  try {
    const { tiltXDeg, tiltYDeg } = decomposeToNadir(findCentroidDirection(doc));
    const alignC0C180 = Math.abs(tiltYDeg) <= ALIGN_TILT_MAX_DEG; // Y — плоскость C0–C180
    const alignC90C270 = Math.abs(tiltXDeg) <= ALIGN_TILT_MAX_DEG; // X — плоскость C90–C270
    if (!alignC0C180 && !alignC90C270) return doc; // обе плоскости — боковой заброс, не трогаем
    return alignByCentroid(doc, { alignC0C180, alignC90C270 }, 0.5, { normalizeFlux: true }).doc;
  } catch {
    return doc;
  }
}

export function smartSymmetrize(doc: PhotometryDoc): PhotometryDoc {
  try {
    const c0c180 = planeAsymmetry(doc, mirrorAboutC0) <= SYMM_ASYMMETRY_MAX;
    const c90c270 = planeAsymmetry(doc, mirrorAboutC90) <= SYMM_ASYMMETRY_MAX;
    if (!c0c180 && !c90c270) return doc;
    const r = symmetrizeDoc(doc, 'average', { axial: false, c0c180, c90c270 });
    return compressAfterSymmetrize(r, { c0c180, c90c270 });
  } catch {
    return doc;
  }
}

/**
 * «Исправить IES»: выравнивание → симметризация → сглаживание → чистка. Первые
 * два шага «умные» — плоскость с намеренным боковым забросом не трогают, чтобы
 * не сломать несимметричную/боковую оптику.
 */
export function fixDoc(doc: PhotometryDoc): PhotometryDoc {
  return applyClean(applySmooth(smartSymmetrize(smartAlign(doc))));
}
