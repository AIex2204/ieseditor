import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';

// Регрессия: detectFormat() в parse.ts проверял line.startsWith('IESNA:LM-63-19'),
// что перехватывало и "...1995", и "...1991" раньше их точных веток и всегда
// давало LM-63-2019. Обнаружено визуально в редакторе полей — заголовок файла
// с "IESNA:LM-63-1995" показывался как LM-63-2019.
describe('detectFormat — точное соответствие версии заголовку файла', () => {
  it.each([
    ['1006000290_evoline_led_300_12w_a15_827_sl.ies', 'LM-63-1995'],
    ['15 deg.IES', 'LM-63-2002'],
    ['V1-G1-72441-04L10-6601040-a.ies', 'LM-63-1995'],
    ['V1-S1-7R710-40x32-6604040-a.ies', 'LM-63-1995'],
    ['Эллипс-2.IES', 'LM-63-1995'],
    ['Эллипс.IES', 'LM-63-2002'],
  ] as const)('%s → %s', (fileName, expected) => {
    const doc = loadSample(fileName);
    expect(doc.format).toBe(expected);
  });
});
