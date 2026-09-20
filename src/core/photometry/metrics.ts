// Метрики КСС для панели показателей и графиков: Imax и его направление,
// полный угол половинной силы света (2·γ½), cd/klm, приближённый тип КСС
// по светотехническому справочнику (ГОСТ 17677 / ГОСТ Р 54350).
import type { PhotometryDoc } from '../ies/types';
import { computeFlux } from './flux';
import { interpolateCandela } from './interpolate';

export interface ImaxResult {
  value: number;
  gamma: number;
  c: number;
}

export function findImax(doc: PhotometryDoc): ImaxResult {
  let best = -Infinity;
  let iH = 0;
  let iG = 0;
  const nv = doc.numVertAngles;
  for (let h = 0; h < doc.numHorizAngles; h++) {
    for (let g = 0; g < nv; g++) {
      const v = doc.candela[h * nv + g];
      if (v > best) {
        best = v;
        iH = h;
        iG = g;
      }
    }
  }
  return { value: best, gamma: doc.vertAngles[iG] ?? 0, c: doc.horizAngles[iH] ?? 0 };
}

export function candelaPerKilolumen(doc: PhotometryDoc): number | null {
  const flux = computeFlux(doc).totalLumens;
  if (!(flux > 0)) return null;
  const imax = findImax(doc).value;
  return imax / (flux / 1000);
}

export interface MeridianPoint {
  /** Азимут ветви, на которой лежит точка (cPlane либо cPlane+180). */
  c: number;
  /** Угол от надира на этой ветви, ≥0. */
  gamma: number;
  value: number;
}

/**
 * Меридиан — это полный "разрез" КСС через полюс γ=0 плоскостью (cPlane,
 * cPlane+180): одна ветвь идёт по азимуту cPlane, другая, зеркально
 * относительно полюса — по cPlane+180. Работаем с ним как с одной
 * непрерывной кривой по знаковому углу s∈[-γmax, +γmax], где s≥0 — ветвь
 * cPlane, s<0 — ветвь cPlane+180 на угле |s|.
 */
function meridianAt(doc: PhotometryDoc, cPlane: number, signedGamma: number): MeridianPoint {
  const gamma = Math.abs(signedGamma);
  const c = signedGamma >= 0 ? cPlane : cPlane + 180;
  return { c, gamma, value: interpolateCandela(doc, gamma, c) };
}

function toSigned(cPlane: number, p: MeridianPoint): number {
  return p.c === cPlane ? p.gamma : -p.gamma;
}

/** Пик меридиана (может лежать на любой из двух ветвей — т.е. не обязательно в γ=0). */
export function meridianPeak(doc: PhotometryDoc, cPlane: number, step = 0.25): MeridianPoint {
  const gMax = doc.vertAngles[doc.vertAngles.length - 1];
  let best: MeridianPoint | null = null;
  for (let s = -gMax; s <= gMax + 1e-9; s += step) {
    const p = meridianAt(doc, cPlane, s);
    if (!best || p.value > best.value) best = p;
  }
  return best ?? meridianAt(doc, cPlane, 0);
}

export interface HalfWidthResult {
  /** Полный угол ширины луча на уровне thresholdValue, градусы; null — если пик меридиана ниже порога. */
  fullAngle: number | null;
  lo: MeridianPoint | null;
  hi: MeridianPoint | null;
  peak: MeridianPoint;
  thresholdValue: number;
}

/**
 * Полная угловая ширина меридиана на заданном абсолютном уровне силы света
 * (thresholdValue), измеренная от пика меридиана в обе стороны до первого
 * пересечения уровня. Работает и для пиков вне оси (γ_peak ≠ 0).
 */
export function meridianHalfWidth(
  doc: PhotometryDoc,
  cPlane: number,
  thresholdValue: number,
  step = 0.25
): HalfWidthResult {
  const gMax = doc.vertAngles[doc.vertAngles.length - 1];
  const peak = meridianPeak(doc, cPlane, step);
  if (peak.value < thresholdValue) {
    return { fullAngle: null, lo: null, hi: null, peak, thresholdValue };
  }

  // Берём КРАЙНИЕ пересечения уровня: самую левую и самую правую точки
  // меридиана, где сила света достигает порога. Раньше мерили от пика до
  // ПЕРВОГО падения ниже порога — у двугорбых (batwing) КСС провал между
  // рогами уходит ниже 50%, и ширина считалась только по одному рогу. Крайние
  // пересечения охватывают оба рога; для однолепестковых КСС результат тот же.
  let lo: MeridianPoint | null = null;
  for (let s = -gMax; s <= gMax + 1e-9; s += step) {
    const p = meridianAt(doc, cPlane, s);
    if (p.value >= thresholdValue) {
      lo = p;
      break;
    }
  }
  let hi: MeridianPoint | null = null;
  for (let s = gMax; s >= -gMax - 1e-9; s -= step) {
    const p = meridianAt(doc, cPlane, s);
    if (p.value >= thresholdValue) {
      hi = p;
      break;
    }
  }

  const hiSigned = hi ? toSigned(cPlane, hi) : null;
  const loSigned = lo ? toSigned(cPlane, lo) : null;
  const fullAngle = hiSigned !== null && loSigned !== null ? hiSigned - loSigned : null;
  return { fullAngle, lo, hi, peak, thresholdValue };
}

/**
 * Полный угол на половине ГЛОБАЛЬНОГО максимума силы света всей КСС —
 * то, что в даташитах обычно называют "углом раскрытия" (beam angle).
 * Один и тот же порог (0.5·Imax) используется для всех плоскостей, поэтому
 * пунктирная окружность 50% на разных графиках светильника — одна и та же
 * физическая величина.
 */
export function beamAngleAtGlobalHalfMax(doc: PhotometryDoc, cPlane: number, step = 0.25): HalfWidthResult {
  const globalImax = findImax(doc).value;
  return meridianHalfWidth(doc, cPlane, 0.5 * globalImax, step);
}

/** Угол на половине ЛОКАЛЬНОГО пика этой конкретной плоскости (для сравнения плоскостей между собой). */
export function beamAngleAtPlanePeak(doc: PhotometryDoc, cPlane: number, threshold = 0.5, step = 0.25): HalfWidthResult {
  const peak = meridianPeak(doc, cPlane, step);
  return meridianHalfWidth(doc, cPlane, threshold * peak.value, step);
}

export type GostCurveType = 'К' | 'Г' | 'Д' | 'Л' | 'Ш' | 'М';

export const GOST_CURVE_NAMES: Record<GostCurveType, string> = {
  'К': 'концентрированная',
  'Г': 'глубокая',
  'Д': 'косинусная',
  'Л': 'полуширокая',
  'Ш': 'широкая',
  'М': 'равномерная',
};

export interface PlaneKssResult {
  /** Полный угол 2γ½ в этой плоскости (по её собственному пику); null — если не достигается. */
  fullAngle: number | null;
  /** Угол направления максимума этой плоскости — основной признак типа по ГОСТ Р 54350. */
  peakGamma: number;
  /** Imin/Imax по меридиану: ≥0.7 — признак равномерной (М) КСС. */
  uniformity: number;
  type: GostCurveType | null;
}

/** Минимум и максимум силы света по всему меридиану плоскости (обе ветви). */
function meridianExtremes(doc: PhotometryDoc, cPlane: number, step = 1): { min: number; max: number } {
  const gMax = doc.vertAngles[doc.vertAngles.length - 1] ?? 0;
  let min = Infinity;
  let max = -Infinity;
  for (let s = -gMax; s <= gMax + 1e-9; s += step) {
    const v = interpolateCandela(doc, Math.abs(s), s >= 0 ? cPlane : cPlane + 180);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min: Number.isFinite(min) ? min : 0, max: Number.isFinite(max) ? max : 0 };
}

/**
 * Тип КСС отдельной C-плоскости. У несимметричных светильников плоскости
 * относятся к разным типам (например, C0–C180 — полуширокая, C90–C270 —
 * концентрированная), поэтому единственное значение "на весь файл" для них
 * смысла не имеет.
 *
 * Основной признак по ГОСТ Р 54350 — зона, в которую попадает направление
 * максимальной силы света; равномерная (М) дополнительно требует Imin ≥
 * 0.7·Imax. Семейство с максимумом у надира (К/Г/Д) разделяется по полному
 * углу 2γ½: только по зоне максимума их не различить. Границы справочные:
 * по тексту действующего ГОСТ не выверялись, для сертификации нужен
 * первоисточник.
 */
export function classifyPlane(doc: PhotometryDoc, cPlane: number): PlaneKssResult {
  const beam = beamAngleAtPlanePeak(doc, cPlane);
  const peakGamma = beam.peak.gamma;
  const { min, max } = meridianExtremes(doc, cPlane);
  const uniformity = max > 0 ? min / max : 0;

  let type: GostCurveType | null;
  if (max <= 0) {
    type = null; // плоскость без света — классифицировать нечего
  } else if (uniformity >= 0.7) {
    type = 'М';
  } else if (peakGamma >= 55) {
    type = 'Ш';
  } else if (peakGamma >= 35) {
    type = 'Л';
  } else if (beam.fullAngle === null) {
    type = null;
  } else if (beam.fullAngle <= 30) {
    type = 'К';
  } else if (beam.fullAngle <= 75) {
    type = 'Г';
  } else {
    type = 'Д';
  }

  return { fullAngle: beam.fullAngle, peakGamma, uniformity, type };
}
