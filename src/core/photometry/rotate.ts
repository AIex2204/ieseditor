// Поворот КСС по трём углам (п. 3.6 ТЗ) и общий низкоуровневый механизм
// применения произвольного поворота — переиспользуется выравниванием
// (align.ts), которое сводится к повороту, приводящему направление
// максимума/центра тяжести в надир.
import type { PhotometryDoc } from '../ies/types';
import { cloneDoc } from '../ies/types';
import { detectSymmetry } from './symmetry';
import { interpolateCandela } from './interpolate';
import { computeFlux } from './flux';
import { restoreFluxTo } from './scaleFlux';
import {
  anglesFromDirection,
  directionFromAngles,
  matTranspose,
  matVec,
  rotX,
  rotY,
  rotZ,
  matMul,
  type Mat3,
} from './rotationMath';

export interface RotateAngles {
  /** Поворот вокруг вертикальной оси (спин по азимуту C), градусы. */
  spinDeg: number;
  /** Наклон в плоскости C0–C180 (поворот вокруг оси C90), градусы. */
  tiltC0C180Deg: number;
  /** Наклон в плоскости C90–C270 (поворот вокруг оси C0), градусы. */
  tiltC90C270Deg: number;
}

/** R = Rz(spin) · Ry(tiltC0C180) · Rx(tiltC90C270), применяется как R·v. */
export function composeRotationMatrix(a: RotateAngles): Mat3 {
  return matMul(matMul(rotZ(a.spinDeg), rotY(a.tiltC0C180Deg)), rotX(a.tiltC90C270Deg));
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function deriveStep(angles: number[], fallback: number): number {
  if (angles.length < 2) return fallback;
  const diffs: number[] = [];
  for (let i = 1; i < angles.length; i++) {
    const d = angles[i] - angles[i - 1];
    if (d > 1e-6) diffs.push(d);
  }
  return diffs.length ? median(diffs) : fallback;
}

export function range(from: number, to: number, step: number, includeEnd: boolean): number[] {
  const out: number[] = [];
  const n = Math.round((to - from) / step);
  for (let i = 0; i <= n; i++) {
    const v = from + i * step;
    if (!includeEnd && v >= to - 1e-9) break;
    out.push(Math.min(v, to));
  }
  if (includeEnd && Math.abs(out[out.length - 1] - to) > 1e-6) out.push(to);
  return out;
}

/**
 * Целевая сетка для результата поворота. Азимут расширяется до полного
 * круга, если исходная симметрия была неполной (иначе часть повёрнутой
 * картины некуда будет записать). Вертикальный диапазон расширяется до
 * 0…180°, если в повороте участвует наклон (иначе часть КСС, "перетёкшая"
 * через горизонт, будет обрезана).
 */
function targetGrid(doc: PhotometryDoc, hasTilt: boolean): { vertAngles: number[]; horizAngles: number[] } {
  const kind = detectSymmetry(doc.horizAngles);
  const horizAngles =
    kind === 'full'
      ? doc.horizAngles
      : range(0, 360, deriveStep(doc.horizAngles, 5), false);

  const lastGamma = doc.vertAngles[doc.vertAngles.length - 1] ?? 180;
  const vertAngles =
    !hasTilt || lastGamma >= 180 - 0.05
      ? doc.vertAngles
      : range(0, 180, deriveStep(doc.vertAngles, 1), true);

  return { vertAngles, horizAngles };
}

/** Азимутальная сетка, покрывающая полный круг: исходная, если симметрия уже полная, иначе достроенная. */
export function fullAzimuth(doc: PhotometryDoc): number[] {
  const kind = detectSymmetry(doc.horizAngles);
  return kind === 'full' ? doc.horizAngles : range(0, 360, deriveStep(doc.horizAngles, 5), false);
}

export interface RotateOptions {
  /** Восстановить исходный поток после поворота (интерполяция немного его меняет). */
  normalizeFlux?: boolean;
}

/** Низкоуровневое применение произвольной матрицы поворота ко всей КСС. */
export function applyRotationMatrix(doc: PhotometryDoc, R: Mat3, options: RotateOptions = {}): PhotometryDoc {
  const isIdentity = R.every((v, i) => Math.abs(v - (i % 4 === 0 ? 1 : 0)) < 1e-12);
  const hasTilt = !isIdentity;
  const { vertAngles, horizAngles } = targetGrid(doc, hasTilt);

  const next = cloneDoc(doc);
  next.vertAngles = vertAngles;
  next.horizAngles = horizAngles;
  next.numVertAngles = vertAngles.length;
  next.numHorizAngles = horizAngles.length;
  next.candela = new Float64Array(vertAngles.length * horizAngles.length);
  next.candelaMultiplier = 1;

  const Rt = matTranspose(R);

  for (let iH = 0; iH < horizAngles.length; iH++) {
    const c = horizAngles[iH];
    for (let iG = 0; iG < vertAngles.length; iG++) {
      const gamma = vertAngles[iG];
      const nTarget = directionFromAngles(gamma, c);
      const nSource = matVec(Rt, nTarget);
      const { gamma: gSrc, c: cSrc } = anglesFromDirection(nSource);
      next.candela[iH * vertAngles.length + iG] = interpolateCandela(doc, gSrc, cSrc);
    }
  }

  if (options.normalizeFlux) {
    const targetFlux = computeFlux(doc).totalLumens;
    if (targetFlux > 0) {
      return restoreFluxTo(next, targetFlux);
    }
  }

  return next;
}

export function rotateDoc(doc: PhotometryDoc, angles: RotateAngles, options: RotateOptions = {}): PhotometryDoc {
  const isPureSpin = angles.tiltC0C180Deg === 0 && angles.tiltC90C270Deg === 0;

  if (isPureSpin) {
    // Точный сдвиг по азимуту, без интерполяции: просто переносим значения C.
    const kind = detectSymmetry(doc.horizAngles);
    if (kind === 'full') {
      const nv = doc.numVertAngles;
      const n = doc.horizAngles.length;
      // Многие 'full'-файлы явно дублируют шов 0°/360° (последняя точка
      // повторяет первую) — при сдвиге ровно на 360° это дало бы две
      // одинаковые точки вместо одной и потерю точки на противоположном
      // конце. Убираем дубль перед сдвигом и восстанавливаем его после.
      const hasClosingSeam =
        n > 1 && Math.abs(doc.horizAngles[0]) < 1e-6 && Math.abs(doc.horizAngles[n - 1] - 360) < 1e-6;
      const workCount = hasClosingSeam ? n - 1 : n;

      const shifted = Array.from({ length: workCount }, (_, i) => {
        let v = (doc.horizAngles[i] + angles.spinDeg) % 360;
        if (v < 0) v += 360;
        return { angle: v, srcIdx: i };
      }).sort((a, b) => a.angle - b.angle);

      const workHoriz = shifted.map((s) => s.angle);
      const workCandela = new Float64Array(workCount * nv);
      shifted.forEach((s, dstIdx) => {
        workCandela.set(doc.candela.subarray(s.srcIdx * nv, s.srcIdx * nv + nv), dstIdx * nv);
      });

      const next = cloneDoc(doc);
      if (hasClosingSeam) {
        next.horizAngles = [...workHoriz, workHoriz[0] + 360];
        next.candela = new Float64Array((workCount + 1) * nv);
        next.candela.set(workCandela);
        next.candela.set(workCandela.subarray(0, nv), workCount * nv);
      } else {
        next.horizAngles = workHoriz;
        next.candela = workCandela;
      }
      next.numHorizAngles = next.horizAngles.length;

      if (options.normalizeFlux) {
        const targetFlux = computeFlux(doc).totalLumens;
        return targetFlux > 0 ? restoreFluxTo(next, targetFlux) : next;
      }
      return next;
    }
    // симметрия неполная — спин всё равно ломает её, идём общим путём
  }

  return applyRotationMatrix(doc, composeRotationMatrix(angles), options);
}
