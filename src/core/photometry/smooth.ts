// Сглаживание КСС (п. 3.9 ТЗ): локальная полиномиальная регрессия
// (обобщённый фильтр Савицкого–Голея, устойчивый к неравномерному шагу
// сетки) вдоль γ, опционально вдоль C, с сохранением потока.
import type { PhotometryDoc } from '../ies/types';
import { cloneDoc } from '../ies/types';
import { computeFlux } from './flux';
import { findImax } from './metrics';
import { interpolateCandela } from './interpolate';
import { deriveStep } from './rotate';

export interface SmoothOptions {
  /** Размер окна (число точек), нечётный, ≥3. */
  window: number;
  /** Степень полинома локальной регрессии, обычно 2. */
  degree: number;
  /** Также сглаживать вдоль азимута C (циклически). */
  smoothAzimuth?: boolean;
  /** Не трогать саму точку глобального максимума (оставить как есть). */
  protectPeak?: boolean;
}

/** Решает A·c = b методом Гаусса с выбором ведущего элемента, для маленьких плотных матриц. */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/** Значение (при x=0) локального полинома degree-й степени, подогнанного к точкам (x,y) методом наименьших квадратов. */
function fitCenterValue(xs: number[], ys: number[], degree: number): number | null {
  const p = degree + 1;
  if (xs.length < p) return null;
  const A: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const b: number[] = new Array(p).fill(0);
  for (let k = 0; k < xs.length; k++) {
    const x = xs[k];
    const y = ys[k];
    const powers = new Array(2 * p - 1);
    powers[0] = 1;
    for (let e = 1; e < 2 * p - 1; e++) powers[e] = powers[e - 1] * x;
    for (let i = 0; i < p; i++) {
      b[i] += powers[i] * y;
      for (let j = 0; j < p; j++) A[i][j] += powers[i + j];
    }
  }
  const coeffs = solveLinear(A, b);
  return coeffs ? coeffs[0] : null;
}

function smoothAlongGamma(doc: PhotometryDoc, window: number, degree: number): Float64Array {
  const nv = doc.numVertAngles;
  const half = Math.floor(window / 2);
  const out = new Float64Array(doc.candela.length);

  for (let iH = 0; iH < doc.numHorizAngles; iH++) {
    const c = doc.horizAngles[iH];
    for (let iG = 0; iG < nv; iG++) {
      const xs: number[] = [];
      const ys: number[] = [];
      const gammaCenter = doc.vertAngles[iG];

      for (let j = -half; j <= half; j++) {
        const idx = iG + j;
        if (idx < 0) {
          const mirrorIdx = -idx;
          if (mirrorIdx >= nv) continue;
          const gammaAbs = doc.vertAngles[mirrorIdx];
          xs.push(-gammaAbs - gammaCenter);
          ys.push(interpolateCandela(doc, gammaAbs, c + 180));
        } else if (idx >= nv) {
          continue; // нет физически корректного отражения у дальнего полюса — окно просто уже
        } else {
          xs.push(doc.vertAngles[idx] - gammaCenter);
          ys.push(doc.candela[iH * nv + idx]);
        }
      }

      const fitted = fitCenterValue(xs, ys, degree);
      out[iH * nv + iG] = fitted ?? doc.candela[iH * nv + iG];
    }
  }
  return out;
}

function smoothAlongAzimuth(doc: PhotometryDoc, candela: Float64Array, window: number, degree: number): Float64Array {
  const nv = doc.numVertAngles;
  const nh = doc.numHorizAngles;
  if (nh < 3) return candela;
  const half = Math.floor(window / 2);
  const out = new Float64Array(candela.length);
  const withInput = { ...doc, candela } as PhotometryDoc;

  for (let iG = 0; iG < nv; iG++) {
    const gamma = doc.vertAngles[iG];
    for (let iH = 0; iH < nh; iH++) {
      const cCenter = doc.horizAngles[iH];
      const xs: number[] = [];
      const ys: number[] = [];
      for (let j = -half; j <= half; j++) {
        const idx = iH + j;
        const c = idx >= 0 && idx < nh ? doc.horizAngles[idx] : cCenter + j * ((doc.horizAngles[nh - 1] - doc.horizAngles[0]) / (nh - 1));
        xs.push(((c - cCenter + 540) % 360) - 180); // ближайшее представление разницы углов на окружности
        ys.push(interpolateCandela(withInput, gamma, c));
      }
      const fitted = fitCenterValue(xs, ys, degree);
      out[iH * nv + iG] = fitted ?? candela[iH * nv + iG];
    }
  }
  return out;
}

/**
 * Окно вдоль C задаётся не тем же числом ТОЧЕК, что вдоль γ, а тем же
 * угловым охватом. Шаг по C обычно в 5–30 раз крупнее шага по γ: окно в
 * 11 точек при шаге 15° — это ±75°, то есть усреднение почти всей
 * азимутальной картины вместо сглаживания шума (у несимметричной КСС так
 * теряется вся азимутальная форма). Поэтому число точек по C подбирается
 * под шаг сетки.
 *
 * Минимум — 3 точки: при степени полинома ≥2 локальная регрессия проходит
 * через три точки точно и ничего не меняет, поэтому на грубой сетке по C
 * азимутальный проход становится нейтральным, а не разрушительным.
 */
export function azimuthWindowPoints(doc: PhotometryDoc, gammaWindow: number): number {
  const stepGamma = deriveStep(doc.vertAngles, 1);
  const stepC = deriveStep(doc.horizAngles, 5);
  if (!(stepC > 0)) return 3;
  let points = Math.round((gammaWindow * stepGamma) / stepC);
  if (points % 2 === 0) points += 1;
  return Math.max(3, Math.min(points, gammaWindow));
}

export function smoothDoc(doc: PhotometryDoc, options: SmoothOptions): PhotometryDoc {
  const window = Math.max(3, options.window | 1); // гарантируем нечётность
  const degree = Math.max(1, Math.min(options.degree, window - 1));

  let smoothed = smoothAlongGamma(doc, window, degree);
  if (options.smoothAzimuth) {
    const azWindow = azimuthWindowPoints(doc, window);
    smoothed = smoothAlongAzimuth(doc, smoothed, azWindow, Math.max(1, Math.min(degree, azWindow - 1)));
  }

  for (let i = 0; i < smoothed.length; i++) {
    if (smoothed[i] < 0) smoothed[i] = 0;
  }

  if (options.protectPeak) {
    const imax = findImax(doc);
    const iG = doc.vertAngles.indexOf(imax.gamma);
    const iH = doc.horizAngles.indexOf(imax.c);
    if (iG >= 0 && iH >= 0) {
      smoothed[iH * doc.numVertAngles + iG] = imax.value;
    }
  }

  const next = cloneDoc(doc);
  next.candela = smoothed;
  next.candelaMultiplier = 1;

  const fluxBefore = computeFlux(doc).totalLumens;
  const fluxAfter = computeFlux(next).totalLumens;
  if (fluxAfter > 0 && fluxBefore > 0) {
    const k = fluxBefore / fluxAfter;
    for (let i = 0; i < next.candela.length; i++) next.candela[i] *= k;
  }

  return next;
}
