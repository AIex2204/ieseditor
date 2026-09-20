// Чистая геометрия полярного фотометрического графика — вынесена из
// компонента, чтобы её можно было использовать в тестах и в других видах
// (сравнение, экспорт) без DOM.
export type ScaleMode = 'linear' | 'log';

export function radiusFraction(value: number, radialMax: number, mode: ScaleMode): number {
  if (!(radialMax > 0)) return 0;
  const v = Math.max(value, 0);
  if (mode === 'linear') {
    return Math.min(v / radialMax, 1);
  }
  const num = Math.log10(1 + v);
  const den = Math.log10(1 + radialMax);
  return den > 0 ? Math.min(num / den, 1) : 0;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Проецирует точку меридиана (signedGamma: ≥0 — ветвь cPlane, <0 — ветвь
 * cPlane+180, |signedGamma| — угол от надира) в пиксели SVG.
 * 0° — верх, 90° — левый/правый край, 180° — низ.
 */
export function projectMeridianPoint(
  cx: number,
  cy: number,
  outerR: number,
  signedGamma: number,
  value: number,
  radialMax: number,
  mode: ScaleMode
): Point {
  const gammaAbs = Math.abs(signedGamma);
  const side = signedGamma >= 0 ? 1 : -1;
  const angleRad = (gammaAbs * Math.PI) / 180;
  const frac = radiusFraction(value, radialMax, mode);
  const dx = side * frac * outerR * Math.sin(angleRad);
  const dy = -frac * outerR * Math.cos(angleRad);
  return { x: cx + dx, y: cy + dy };
}

/** Точка на самой сетке (без учёта значения) — для сеточных окружностей/спиц. */
export function projectGridPoint(cx: number, cy: number, r: number, signedGammaDeg: number): Point {
  const gammaAbs = Math.abs(signedGammaDeg);
  const side = signedGammaDeg >= 0 ? 1 : -1;
  const angleRad = (gammaAbs * Math.PI) / 180;
  return { x: cx + side * r * Math.sin(angleRad), y: cy - r * Math.cos(angleRad) };
}

/** Кратчайшее угловое расстояние между двумя азимутами по кругу, градусы в [0,180]. */
export function circularDelta(a: number, b: number): number {
  return Math.abs((((a - b + 180) % 360) + 360) % 360 - 180);
}
