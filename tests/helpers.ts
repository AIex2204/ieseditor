import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { detectEncoding, decodeBytes } from '../src/core/ies/encoding';
import { parseIesText } from '../src/core/ies/parse';
import type { PhotometryDoc } from '../src/core/ies/types';

const INPUT_DIR = fileURLToPath(new URL('../Input/', import.meta.url));

export const SAMPLE_FILES = [
  '1006000290_evoline_led_300_12w_a15_827_sl.ies',
  '15 deg.IES',
  'V1-G1-72441-04L10-6601040-a.ies',
  'V1-S1-7R710-40x32-6604040-a.ies',
  'Эллипс-2.IES',
  'Эллипс.IES',
] as const;

/**
 * Образцы фотометрии в репозиторий не входят — это файлы производителей и
 * лабораторий. Тесты, которым они нужны, пропускаются, если каталога нет:
 * вызывайте это в describe.skipIf / it.skipIf (см. README, раздел «Тесты»).
 */
export function samplesAvailable(): boolean {
  return existsSync(INPUT_DIR);
}

export function loadSample(fileName: string): PhotometryDoc {
  const bytes = new Uint8Array(readFileSync(INPUT_DIR + fileName));
  const encoding = detectEncoding(bytes);
  const text = decodeBytes(bytes, encoding);
  return parseIesText(text, encoding).doc;
}
