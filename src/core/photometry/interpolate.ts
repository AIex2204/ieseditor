// Билинейная выборка I(γ, C) по хранимой сетке КСС, с заворотом азимута
// по симметрии и корректной обработкой границ по вертикальному углу.
import type { PhotometryDoc } from '../ies/types';
import { detectSymmetry, foldAzimuth } from './symmetry';

interface Bracket {
  i0: number;
  i1: number;
  t: number; // 0..1, вес второй точки
}

/** Бинарный поиск интервала в возрастающем массиве, с зажимом на краях. */
function findBracketClamped(arr: number[], x: number): Bracket {
  const n = arr.length;
  if (n === 1) return { i0: 0, i1: 0, t: 0 };
  if (x <= arr[0]) return { i0: 0, i1: 0, t: 0 };
  if (x >= arr[n - 1]) return { i0: n - 1, i1: n - 1, t: 0 };
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= x) lo = mid;
    else hi = mid;
  }
  const span = arr[hi] - arr[lo];
  const t = span > 0 ? (x - arr[lo]) / span : 0;
  return { i0: lo, i1: hi, t };
}

/**
 * Бинарный поиск интервала по вертикальному углу γ. По конвенции LM-63,
 * если максимальный измеренный угол < 180°, за его пределами сила света
 * считается нулевой (полностью экранированный верх), а не "размазанной"
 * по последнему измеренному значению.
 */
function findGammaBracket(vertAngles: number[], gamma: number): Bracket | 'zero' {
  const n = vertAngles.length;
  const last = vertAngles[n - 1];
  if (gamma > last + 1e-9 && last < 180 - 0.05) return 'zero';
  if (gamma < vertAngles[0]) return { i0: 0, i1: 0, t: 0 };
  return findBracketClamped(vertAngles, Math.min(gamma, last));
}

function findAzimuthBracket(horizAngles: number[], cFold: number, isFull: boolean): Bracket {
  const n = horizAngles.length;
  if (n === 1) return { i0: 0, i1: 0, t: 0 };
  const first = horizAngles[0];
  const last = horizAngles[n - 1];
  if (!isFull || (cFold >= first - 1e-9 && cFold <= last + 1e-9)) {
    return findBracketClamped(horizAngles, cFold);
  }
  // Полная симметрия, но диапазон не доходит до 360° (напр. 0…355 шаг 5°):
  // сегмент между последним и первым+360 замыкает круг.
  const span = first + 360 - last;
  if (cFold > last) {
    const t = span > 0 ? (cFold - last) / span : 0;
    return { i0: n - 1, i1: 0, t };
  }
  // cFold < first (first > 0, редкий случай)
  const t = span > 0 ? (cFold + 360 - last) / span : 0;
  return { i0: n - 1, i1: 0, t };
}

/**
 * Возвращает силу света в направлении (γ, C) в градусах, интерполируя
 * билинейно по хранимой сетке. C может быть любым — заворачивается
 * согласно симметрии файла.
 */
export function interpolateCandela(doc: PhotometryDoc, gamma: number, c: number): number {
  const gBracket = findGammaBracket(doc.vertAngles, gamma);
  if (gBracket === 'zero') return 0;

  const kind = detectSymmetry(doc.horizAngles);
  const cFold = foldAzimuth(c, kind);
  const hBracket = findAzimuthBracket(doc.horizAngles, cFold, kind === 'full');

  const nv = doc.numVertAngles;
  const at = (iH: number, iG: number) => doc.candela[iH * nv + iG];

  const v00 = at(hBracket.i0, gBracket.i0);
  const v01 = at(hBracket.i0, gBracket.i1);
  const v10 = at(hBracket.i1, gBracket.i0);
  const v11 = at(hBracket.i1, gBracket.i1);

  const vG0 = v00 + (v01 - v00) * gBracket.t;
  const vG1 = v10 + (v11 - v10) * gBracket.t;
  return vG0 + (vG1 - vG0) * hBracket.t;
}
