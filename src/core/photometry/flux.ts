// Зональный метод расчёта светового потока.
import type { PhotometryDoc } from '../ies/types';
import { azimuthalAverage } from './symmetry';

const DEG2RAD = Math.PI / 180;

export interface FluxResult {
  /** Полный расчётный поток, лм. */
  totalLumens: number;
  /** Поток в нижнюю полусферу (γ < 90°), лм. */
  downwardLumens: number;
  /** Поток в верхнюю полусферу (γ > 90°), лм. */
  upwardLumens: number;
  /** Downward Flux Fraction = downwardLumens / totalLumens. */
  dff: number;
  /** Upward Flux Fraction = upwardLumens / totalLumens. */
  uff: number;
  /** КПД = totalLumens / (numLamps * lumensPerLamp), null если абсолютная фотометрия. */
  efficiency: number | null;
  /** Отдача, лм/Вт, null если ватты не заданы. */
  luminousEfficacy: number | null;
}

/** Границы зоны i: середины между соседними углами, крайние = сами крайние измеренные углы. */
export function zoneBounds(vertAngles: number[], i: number): { lo: number; hi: number } {
  const n = vertAngles.length;
  const lo = i === 0 ? vertAngles[0] : (vertAngles[i - 1] + vertAngles[i]) / 2;
  const hi = i === n - 1 ? vertAngles[n - 1] : (vertAngles[i] + vertAngles[i + 1]) / 2;
  return { lo, hi };
}

export function zoneSolidAngle(lo: number, hi: number): number {
  return 2 * Math.PI * (Math.cos(lo * DEG2RAD) - Math.cos(hi * DEG2RAD));
}

export function computeFlux(doc: PhotometryDoc): FluxResult {
  let total = 0;
  let downward = 0;
  let upward = 0;

  for (let i = 0; i < doc.numVertAngles; i++) {
    const gamma = doc.vertAngles[i];
    const iAvg = azimuthalAverage(doc, i);
    const { lo, hi } = zoneBounds(doc.vertAngles, i);
    const domega = zoneSolidAngle(lo, hi);
    const zoneLumens = iAvg * domega;
    total += zoneLumens;
    if (gamma < 90 - 1e-6) downward += zoneLumens;
    else if (gamma > 90 + 1e-6) upward += zoneLumens;
    else {
      // угол ровно 90° лежит на границе — делим зону пополам между полусферами
      downward += zoneLumens / 2;
      upward += zoneLumens / 2;
    }
  }

  const isAbsolute = doc.lumensPerLamp < 0;
  const efficiency = isAbsolute || doc.numLamps <= 0 || doc.lumensPerLamp <= 0
    ? null
    : total / (doc.numLamps * doc.lumensPerLamp);
  const luminousEfficacy = doc.inputWatts > 0 ? total / doc.inputWatts : null;

  return {
    totalLumens: total,
    downwardLumens: downward,
    upwardLumens: upward,
    dff: total > 0 ? downward / total : 0,
    uff: total > 0 ? upward / total : 0,
    efficiency,
    luminousEfficacy,
  };
}
