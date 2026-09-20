// Изменение светового потока светильника (п. 3.4 ТЗ).
// Масштабируется таблица силы света, candelaMultiplier приводится к 1,
// а lumensPerLamp обновляется на новое значение потока — так итоговый
// файл остаётся "честным": поле потока соответствует данным таблицы.
import type { PhotometryDoc } from '../ies/types';
import { cloneDoc } from '../ies/types';
import { computeFlux } from './flux';

export type FluxReference = 'computed' | 'declared';

export function currentFlux(doc: PhotometryDoc, reference: FluxReference): number {
  if (reference === 'declared' && doc.lumensPerLamp > 0) {
    return doc.lumensPerLamp * Math.max(doc.numLamps, 1);
  }
  return computeFlux(doc).totalLumens;
}

/**
 * Возвращает расчётный поток к заданному значению, масштабируя ТОЛЬКО силу
 * света. В отличие от scaleFluxTo не переписывает заявленный поток лампы:
 * при восстановлении потока после поворота, выравнивания или чистки
 * физический поток светильника не менялся — менять из-за этого шапку файла
 * (например 6000 лм на 5997,4) нечем, это была бы потеря исходных данных.
 */
export function restoreFluxTo(doc: PhotometryDoc, targetLumens: number): PhotometryDoc {
  const from = computeFlux(doc).totalLumens;
  if (!(from > 0) || !(targetLumens > 0)) return doc;
  const k = targetLumens / from;
  if (Math.abs(k - 1) < 1e-12) return doc;
  const next = cloneDoc(doc);
  for (let i = 0; i < next.candela.length; i++) next.candela[i] *= k;
  next.candelaMultiplier = 1;
  return next;
}

/**
 * Масштабирует силу света так, чтобы новый расчётный поток равнялся
 * targetLumens. reference определяет, от какого "текущего" потока
 * считать коэффициент (расчётного по КСС или заявленного в файле).
 */
export function scaleFluxTo(doc: PhotometryDoc, targetLumens: number, reference: FluxReference): PhotometryDoc {
  const from = currentFlux(doc, reference);
  if (!(from > 0) || !(targetLumens > 0)) {
    throw new Error('Некорректный поток: и текущее, и целевое значение должны быть положительными');
  }
  const k = targetLumens / from;
  const next = cloneDoc(doc);
  for (let i = 0; i < next.candela.length; i++) next.candela[i] *= k;
  next.candelaMultiplier = 1;
  if (next.lumensPerLamp > 0) {
    next.lumensPerLamp = targetLumens / Math.max(next.numLamps, 1);
  }
  return next;
}
