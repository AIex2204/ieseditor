// Пересчёт КСС на новую угловую сетку (используется редактором полей при
// правке таблиц γ/C вручную) — билинейная интерполяция по исходным данным.
import type { PhotometryDoc } from '../ies/types';
import { cloneDoc } from '../ies/types';
import { interpolateCandela } from './interpolate';

export function resampleAngles(doc: PhotometryDoc, vertAngles: number[], horizAngles: number[]): PhotometryDoc {
  const next = cloneDoc(doc);
  next.vertAngles = [...vertAngles].sort((a, b) => a - b);
  next.horizAngles = [...horizAngles].sort((a, b) => a - b);
  next.numVertAngles = next.vertAngles.length;
  next.numHorizAngles = next.horizAngles.length;
  next.candela = new Float64Array(next.numVertAngles * next.numHorizAngles);
  next.candelaMultiplier = 1;

  for (let iH = 0; iH < next.numHorizAngles; iH++) {
    const c = next.horizAngles[iH];
    for (let iG = 0; iG < next.numVertAngles; iG++) {
      const gamma = next.vertAngles[iG];
      next.candela[iH * next.numVertAngles + iG] = interpolateCandela(doc, gamma, c);
    }
  }

  return next;
}
