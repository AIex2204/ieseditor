import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import { findImax } from '../src/core/photometry/metrics';
import { computeFlux } from '../src/core/photometry/flux';
import { fixDoc } from '../src/core/photometry/quickFix';

describe('«Исправить IES» (fixDoc)', () => {
  it('не ломает направленную вбок КСС: боковой заброс сохраняется', () => {
    // V1-I0-703X3: Imax при γ≈57° (уличная/боковая оптика). Полное выравнивание
    // утащило бы пик к надиру; умный конвейер оставляет заброс на месте.
    const doc = loadSample('V1-I0-703X3-04L50-6564040-a.ies');
    const before = findImax(doc);
    const fixed = fixDoc(doc);
    const after = findImax(fixed);
    expect(before.gamma).toBeGreaterThan(45);
    // пик остаётся сильно от надира, а не притянут к 0°
    expect(after.gamma).toBeGreaterThan(45);
    // поток сохраняется
    expect(computeFlux(fixed).totalLumens).toBeCloseTo(computeFlux(doc).totalLumens, 0);
  });

  it('обычную КСС у надира по-прежнему центрирует', () => {
    const doc = loadSample('Эллипс.IES');
    const fixed = fixDoc(doc);
    // после исправления максимум у надира (симметричный светильник центрируется)
    expect(findImax(fixed).gamma).toBeLessThan(15);
    expect(computeFlux(fixed).totalLumens).toBeCloseTo(computeFlux(doc).totalLumens, 0);
  });
});
