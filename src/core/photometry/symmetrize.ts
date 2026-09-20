// Симметризация КСС (п. 3.8 ТЗ): по плоскости C0–C180, по плоскости
// C90–C270, либо осевая (полное усреднение по азимуту). Режимы: среднее
// (поток сохраняется точно), максимум (поток растёт), зеркалирование
// выбранной половины.
import type { PhotometryDoc } from '../ies/types';
import { cloneDoc } from '../ies/types';
import { azimuthalAverage } from './symmetry';
import { interpolateCandela } from './interpolate';

export type SymmetrizeMode = 'average' | 'max' | 'mirror';
export type MirrorHalf = 'first' | 'second';

export interface SymmetrizeAxes {
  /** Осевая (полная) симметризация — коллапсирует в одну C-плоскость, остальные флаги игнорируются. */
  axial: boolean;
  c0c180: boolean;
  c90c270: boolean;
}

function reflectC(c: number, axis: 'c0c180' | 'c90c270'): number {
  const base = axis === 'c0c180' ? 360 - c : 180 - c;
  let v = base % 360;
  if (v < 0) v += 360;
  return v;
}

/** "Первая" половина — та, что содержит C=0 (для c0c180 это [0,180], для c90c270 — окрестность C=0). */
function inFirstHalf(c: number, axis: 'c0c180' | 'c90c270'): boolean {
  const x = ((c % 360) + 360) % 360;
  return axis === 'c0c180' ? x <= 180 : x <= 90 || x >= 270;
}

function applyAxis(doc: PhotometryDoc, axis: 'c0c180' | 'c90c270', mode: SymmetrizeMode, keepHalf: MirrorHalf): PhotometryDoc {
  const next = cloneDoc(doc);
  const nv = doc.numVertAngles;
  for (let iH = 0; iH < doc.numHorizAngles; iH++) {
    const c = doc.horizAngles[iH];
    const cReflected = reflectC(c, axis);
    for (let iG = 0; iG < nv; iG++) {
      const gamma = doc.vertAngles[iG];
      const original = doc.candela[iH * nv + iG];
      const mirrored = interpolateCandela(doc, gamma, cReflected);

      let value: number;
      if (mode === 'average') {
        value = (original + mirrored) / 2;
      } else if (mode === 'max') {
        value = Math.max(original, mirrored);
      } else {
        const keepFirst = keepHalf === 'first';
        value = inFirstHalf(c, axis) === keepFirst ? original : mirrored;
      }
      next.candela[iH * nv + iG] = value;
    }
  }
  return next;
}

function collapseToAxial(doc: PhotometryDoc): PhotometryDoc {
  const next = cloneDoc(doc);
  const nv = doc.numVertAngles;
  next.horizAngles = [0];
  next.numHorizAngles = 1;
  next.candela = new Float64Array(nv);
  for (let iG = 0; iG < nv; iG++) {
    next.candela[iG] = azimuthalAverage(doc, iG);
  }
  return next;
}

export function symmetrizeDoc(
  doc: PhotometryDoc,
  mode: SymmetrizeMode,
  axes: SymmetrizeAxes,
  mirrorKeepHalf: MirrorHalf = 'first'
): PhotometryDoc {
  if (axes.axial) return collapseToAxial(doc);

  let result = doc;
  if (axes.c0c180) result = applyAxis(result, 'c0c180', mode, mirrorKeepHalf);
  if (axes.c90c270) result = applyAxis(result, 'c90c270', mode, mirrorKeepHalf);
  return result;
}

/**
 * После симметризации по C0–C180 (и, опционально, C90–C270) данные в
 * "лишней" половине/четверти избыточны — их можно не хранить в файле,
 * как это принято делать в стандартных IES-пакетах. Сжатие возможно только
 * если задействована ось C0–C180 — стандарт LM-63 не имеет собственного
 * представления для "хранить только 90…270°".
 */
export function compressAfterSymmetrize(doc: PhotometryDoc, axes: { c0c180: boolean; c90c270: boolean }): PhotometryDoc {
  if (!axes.c0c180) return doc;
  const targetMax = axes.c90c270 ? 90 : 180;
  const keptIndices = doc.horizAngles.reduce<number[]>((acc, c, i) => {
    if (c <= targetMax + 1e-6) acc.push(i);
    return acc;
  }, []);
  if (keptIndices.length === doc.horizAngles.length) return doc;

  const next = cloneDoc(doc);
  const nv = doc.numVertAngles;
  next.horizAngles = keptIndices.map((i) => doc.horizAngles[i]);
  next.numHorizAngles = keptIndices.length;
  const newCandela = new Float64Array(keptIndices.length * nv);
  keptIndices.forEach((srcIdx, dstIdx) => {
    newCandela.set(doc.candela.subarray(srcIdx * nv, srcIdx * nv + nv), dstIdx * nv);
  });
  next.candela = newCandela;
  return next;
}
