// Выравнивание КСС (п. 3.7 ТЗ): максимальное значение — в надире, по
// одной или обеим плоскостям (C0–C180 и/или C90–C270).
import type { PhotometryDoc } from '../ies/types';
import { findImax } from './metrics';
import { zoneBounds, zoneSolidAngle } from './flux';
import { interpolateCandela } from './interpolate';
import { fullAzimuth, rotateDoc, type RotateOptions } from './rotate';
import { decomposeToNadir, directionFromAngles, type Vec3 } from './rotationMath';

export interface AlignAxes {
  alignC0C180: boolean;
  alignC90C270: boolean;
}

export interface AlignResult {
  doc: PhotometryDoc;
  /** Наклон, который был устранён в каждой плоскости (для отчёта "было/стало" в UI). */
  appliedTiltC0C180Deg: number;
  appliedTiltC90C270Deg: number;
  sourceGamma: number;
  sourceC: number;
}

function parabolicVertexOffset(yPrev: number, yMid: number, yNext: number): number {
  const denom = yPrev - 2 * yMid + yNext;
  if (Math.abs(denom) < 1e-12) return 0;
  const off = (0.5 * (yPrev - yNext)) / denom;
  return Math.max(-0.5, Math.min(0.5, off));
}

/** Направление максимума с субугловым уточнением параболой по трём соседним узлам сетки. */
export function findRefinedPeakDirection(doc: PhotometryDoc): { gamma: number; c: number; value: number } {
  const imax = findImax(doc);
  const nv = doc.numVertAngles;
  const iG0 = doc.vertAngles.indexOf(imax.gamma);
  const iH0 = doc.horizAngles.indexOf(imax.c);

  let gamma = imax.gamma;
  if (iG0 > 0 && iG0 < doc.numVertAngles - 1) {
    const hPrev = imax.gamma - doc.vertAngles[iG0 - 1];
    const hNext = doc.vertAngles[iG0 + 1] - imax.gamma;
    if (hPrev > 0 && Math.abs(hPrev - hNext) < 1e-6) {
      const yPrev = doc.candela[iH0 * nv + iG0 - 1];
      const yNext = doc.candela[iH0 * nv + iG0 + 1];
      gamma = imax.gamma + parabolicVertexOffset(yPrev, imax.value, yNext) * hPrev;
    }
  }

  let c = imax.c;
  if (iH0 > 0 && iH0 < doc.numHorizAngles - 1) {
    const hPrev = imax.c - doc.horizAngles[iH0 - 1];
    const hNext = doc.horizAngles[iH0 + 1] - imax.c;
    if (hPrev > 0 && Math.abs(hPrev - hNext) < 1e-6) {
      const yPrev = doc.candela[(iH0 - 1) * nv + iG0];
      const yNext = doc.candela[(iH0 + 1) * nv + iG0];
      c = imax.c + parabolicVertexOffset(yPrev, imax.value, yNext) * hPrev;
    }
  }

  return { gamma: Math.max(0, gamma), c, value: imax.value };
}

function azimuthWeights(cAngles: number[]): number[] {
  const n = cAngles.length;
  if (n === 1) return [360];
  const w = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const prev = i === 0 ? cAngles[n - 1] - 360 : cAngles[i - 1];
    const next = i === n - 1 ? cAngles[0] + 360 : cAngles[i + 1];
    w[i] = (next - prev) / 2;
  }
  return w;
}

/**
 * Энергетический центроид направления излучения, ограниченный конусом
 * γ, где сила света ≥ coneFraction·Imax (по умолчанию 50%) — так широкие
 * малоинтенсивные хвосты не оттягивают центр.
 */
export function findCentroidDirection(doc: PhotometryDoc, coneFraction = 0.5): Vec3 {
  const imax = findImax(doc).value;
  const threshold = coneFraction * imax;
  const cAngles = fullAzimuth(doc);
  const wC = azimuthWeights(cAngles);

  let sx = 0, sy = 0, sz = 0, weightSum = 0;
  for (let iG = 0; iG < doc.numVertAngles; iG++) {
    const gamma = doc.vertAngles[iG];
    const { lo, hi } = zoneBounds(doc.vertAngles, iG);
    const dOmega = zoneSolidAngle(lo, hi);
    for (let iC = 0; iC < cAngles.length; iC++) {
      const c = cAngles[iC];
      const I = interpolateCandela(doc, gamma, c);
      if (I < threshold) continue;
      const weight = I * dOmega * (wC[iC] / 360);
      const n = directionFromAngles(gamma, c);
      sx += weight * n[0];
      sy += weight * n[1];
      sz += weight * n[2];
      weightSum += weight;
    }
  }

  if (weightSum <= 0) return [0, 0, 1];
  return [sx / weightSum, sy / weightSum, sz / weightSum];
}

function alignToDirection(doc: PhotometryDoc, v: Vec3, axes: AlignAxes, options: RotateOptions): AlignResult {
  const { tiltXDeg, tiltYDeg } = decomposeToNadir(v); // X = C90–C270, Y = C0–C180
  const appliedTiltC90C270Deg = axes.alignC90C270 ? tiltXDeg : 0;
  const appliedTiltC0C180Deg = axes.alignC0C180 ? tiltYDeg : 0;

  const rotated = rotateDoc(
    doc,
    { spinDeg: 0, tiltC0C180Deg: appliedTiltC0C180Deg, tiltC90C270Deg: appliedTiltC90C270Deg },
    options
  );

  const { gamma, c } = { gamma: Math.acos(Math.max(-1, Math.min(1, v[2]))) * (180 / Math.PI), c: Math.atan2(v[1], v[0]) * (180 / Math.PI) };

  return {
    doc: rotated,
    appliedTiltC0C180Deg,
    appliedTiltC90C270Deg,
    sourceGamma: gamma,
    sourceC: c < 0 ? c + 360 : c,
  };
}

export function alignByMax(doc: PhotometryDoc, axes: AlignAxes, options: RotateOptions = {}): AlignResult {
  const peak = findRefinedPeakDirection(doc);
  const v = directionFromAngles(peak.gamma, peak.c);
  return alignToDirection(doc, v, axes, options);
}

export function alignByCentroid(
  doc: PhotometryDoc,
  axes: AlignAxes,
  coneFraction = 0.5,
  options: RotateOptions = {}
): AlignResult {
  const v = findCentroidDirection(doc, coneFraction);
  return alignToDirection(doc, v, axes, options);
}
