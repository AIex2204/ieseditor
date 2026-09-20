// Определение вида симметрии КСС по набору горизонтальных углов (C) и
// связанные с ней операции: заворот произвольного азимута в измеренный
// диапазон и азимутальное усреднение (используется в flux.ts).
//
// Ключевое наблюдение: усреднение силы света по азимуту за ПОЛНЫЙ круг
// совпадает с усреднением по одному измеренному симметричному диапазону —
// зеркальные/повторяющиеся копии имеют то же среднее, что и оригинал.
// Поэтому зональный поток можно считать без физического разворачивания
// сетки в полную сферу; разворачивать нужно только там, где важна именно
// геометрия (интерполяция при повороте — см. interpolate.ts).
import type { PhotometryDoc } from '../ies/types';

export type SymmetryKind = 'axial' | 'quadrant' | 'bilateral' | 'full';

const EPS = 0.05;

export function detectSymmetry(horizAngles: number[]): SymmetryKind {
  if (horizAngles.length <= 1) return 'axial';
  const max = horizAngles[horizAngles.length - 1];
  if (max <= 90 + EPS) return 'quadrant';
  if (max <= 180 + EPS) return 'bilateral';
  return 'full';
}

/** Заворачивает произвольный азимут C∈[0,360) в диапазон, реально хранимый
 *  в файле, согласно виду симметрии. */
export function foldAzimuth(c: number, kind: SymmetryKind): number {
  let x = c % 360;
  if (x < 0) x += 360;
  switch (kind) {
    case 'axial':
      return 0;
    case 'quadrant': {
      let y = x % 180;
      if (y > 90) y = 180 - y;
      return y;
    }
    case 'bilateral':
      return x <= 180 ? x : 360 - x;
    case 'full':
    default:
      return x;
  }
}

/**
 * Средняя по азимуту сила света в зоне iVert (индекс по vertAngles),
 * учитывающая полный круг 360° даже если файл хранит только часть
 * (например 0…355 с шагом 5° — сегмент 355…360° закрывается значениями
 * на границах C0 и C(n-1)).
 */
export function azimuthalAverage(doc: PhotometryDoc, iVert: number): number {
  const n = doc.numHorizAngles;
  const nv = doc.numVertAngles;
  if (n === 1) {
    return doc.candela[0 * nv + iVert];
  }
  const C = doc.horizAngles;
  const at = (iH: number) => doc.candela[iH * nv + iVert];
  const kind = detectSymmetry(C);

  let sum = 0;
  for (let k = 0; k < n - 1; k++) {
    const dC = C[k + 1] - C[k];
    if (dC <= 0) continue;
    sum += ((at(k) + at(k + 1)) / 2) * dC;
  }

  if (kind === 'full') {
    const closing = C[0] + 360 - C[n - 1];
    if (closing > EPS) {
      sum += ((at(n - 1) + at(0)) / 2) * closing;
    }
    return sum / 360;
  }

  const span = C[n - 1] - C[0];
  return span > 0 ? sum / span : at(0);
}
