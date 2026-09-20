// Сводка "что сделано с файлом": сравнение текущего рабочего состояния с
// исходным, каким файл был загружен. Истории шагов мы не ведём, поэтому
// отчёт строится не по журналу операций, а по фактической разнице — это
// честнее: он описывает результат, а не намерения.
import type { PhotometryDoc } from '../ies/types';
import { computeFlux } from '../photometry/flux';
import { findImax } from '../photometry/metrics';

export type Lang = 'ru' | 'en';
const L = (lang: Lang, ru: string, en: string): string => (lang === 'en' ? en : ru);

export interface DiffItem {
  label: string;
  before: string;
  after: string;
}

function fmt(n: number, digits = 1): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function numbersDiffer(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) > eps;
}

function gridLabel(doc: PhotometryDoc): string {
  return `${doc.numVertAngles} × ${doc.numHorizAngles}`;
}

function anglesEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => !numbersDiffer(v, b[i], 1e-6));
}

/** Сколько ячеек таблицы силы света отличается (если сетка совпадает). */
function countChangedCells(a: PhotometryDoc, b: PhotometryDoc): number | null {
  if (a.candela.length !== b.candela.length) return null;
  let count = 0;
  for (let i = 0; i < a.candela.length; i++) {
    // допуск на уровне точности записи в файл (6 знаков)
    if (Math.abs(a.candela[i] - b.candela[i]) > 1e-6) count++;
  }
  return count;
}

function keywordsChanged(a: PhotometryDoc, b: PhotometryDoc): number {
  const key = (doc: PhotometryDoc) => doc.keywords.map((k) => `${k.key}=${k.value}`).join('\n');
  if (key(a) === key(b)) return 0;
  const before = new Map(a.keywords.map((k) => [k.key.toUpperCase(), k.value]));
  const after = new Map(b.keywords.map((k) => [k.key.toUpperCase(), k.value]));
  let changed = 0;
  for (const [k, v] of after) if (before.get(k) !== v) changed++;
  for (const k of before.keys()) if (!after.has(k)) changed++;
  return changed;
}

const NUMERIC_FIELDS: { key: keyof PhotometryDoc; label: string; en: string; digits?: number }[] = [
  { key: 'numLamps', label: 'Число ламп', en: 'Number of lamps', digits: 0 },
  { key: 'lumensPerLamp', label: 'Поток лампы, лм', en: 'Lamp flux, lm' },
  { key: 'candelaMultiplier', label: 'Множитель силы света', en: 'Candela multiplier', digits: 3 },
  { key: 'inputWatts', label: 'Мощность, Вт', en: 'Power, W' },
  { key: 'ballastFactor', label: 'Ballast factor', en: 'Ballast factor', digits: 3 },
  { key: 'width', label: 'Ширина, м', en: 'Width, m', digits: 3 },
  { key: 'length', label: 'Длина, м', en: 'Length, m', digits: 3 },
  { key: 'height', label: 'Высота, м', en: 'Height, m', digits: 3 },
];

/** Пустой массив означает, что файл не менялся. */
export function diffDocs(original: PhotometryDoc, working: PhotometryDoc, lang: Lang = 'ru'): DiffItem[] {
  if (original === working) return [];
  const items: DiffItem[] = [];

  const fluxBefore = computeFlux(original);
  const fluxAfter = computeFlux(working);
  if (numbersDiffer(fluxBefore.totalLumens, fluxAfter.totalLumens, 0.05)) {
    const delta = fluxBefore.totalLumens > 0 ? (fluxAfter.totalLumens / fluxBefore.totalLumens - 1) * 100 : 0;
    items.push({
      label: L(lang, 'Расчётный поток, лм', 'Computed flux, lm'),
      before: fmt(fluxBefore.totalLumens),
      after: `${fmt(fluxAfter.totalLumens)} (${delta >= 0 ? '+' : ''}${fmt(delta, 2)}%)`,
    });
  }

  const imaxBefore = findImax(original);
  const imaxAfter = findImax(working);
  if (numbersDiffer(imaxBefore.value, imaxAfter.value, 0.05)) {
    items.push({ label: L(lang, 'Imax, кд', 'Imax, cd'), before: fmt(imaxBefore.value), after: fmt(imaxAfter.value) });
  }
  if (numbersDiffer(imaxBefore.gamma, imaxAfter.gamma, 0.01) || numbersDiffer(imaxBefore.c, imaxAfter.c, 0.01)) {
    items.push({
      label: L(lang, 'Направление Imax', 'Imax direction'),
      before: `γ=${fmt(imaxBefore.gamma)}° C=${fmt(imaxBefore.c)}°`,
      after: `γ=${fmt(imaxAfter.gamma)}° C=${fmt(imaxAfter.c)}°`,
    });
  }

  if (!anglesEqual(original.vertAngles, working.vertAngles) || !anglesEqual(original.horizAngles, working.horizAngles)) {
    items.push({ label: L(lang, 'Угловая сетка (γ × C)', 'Angle grid (γ × C)'), before: gridLabel(original), after: gridLabel(working) });
  }

  const changedCells = countChangedCells(original, working);
  if (changedCells === null) {
    items.push({
      label: L(lang, 'Таблица силы света', 'Intensity table'),
      before: `${original.candela.length} ${L(lang, 'значений', 'values')}`,
      after: `${working.candela.length} ${L(lang, 'значений (пересчитана)', 'values (resampled)')}`,
    });
  } else if (changedCells > 0) {
    const share = (changedCells / Math.max(original.candela.length, 1)) * 100;
    items.push({
      label: L(lang, 'Значения силы света', 'Intensity values'),
      before: `${original.candela.length} ${L(lang, 'значений', 'values')}`,
      after: `${L(lang, 'изменено', 'changed')} ${changedCells} (${fmt(share, 1)}%)`,
    });
  }

  for (const f of NUMERIC_FIELDS) {
    const a = original[f.key] as number;
    const b = working[f.key] as number;
    if (numbersDiffer(a, b, 1e-9)) {
      items.push({ label: L(lang, f.label, f.en), before: fmt(a, f.digits ?? 1), after: fmt(b, f.digits ?? 1) });
    }
  }

  if (original.photometricType !== working.photometricType) {
    items.push({ label: L(lang, 'Тип фотометрии', 'Photometric type'), before: String(original.photometricType), after: String(working.photometricType) });
  }
  if (original.format !== working.format) {
    items.push({ label: L(lang, 'Версия формата', 'Format version'), before: original.format, after: working.format });
  }
  if (original.tilt.mode !== working.tilt.mode) {
    items.push({ label: 'TILT', before: original.tilt.mode, after: working.tilt.mode });
  }

  const kwChanged = keywordsChanged(original, working);
  if (kwChanged > 0) {
    items.push({
      label: L(lang, 'Ключевые слова шапки', 'Header keywords'),
      before: `${original.keywords.length} ${L(lang, 'шт.', 'total')}`,
      after: `${L(lang, 'изменено/добавлено', 'changed/added')} ${kwChanged}`,
    });
  }

  return items;
}

/** Текстовый отчёт об обработке — кладётся в архив рядом с файлом. */
export function formatProcessingReport(
  originalName: string,
  exportName: string,
  items: DiffItem[],
  generatedAt = new Date(),
  lang: Lang = 'ru'
): string {
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  const lines =
    lang === 'en'
      ? [
          'Photometric file processing report',
          '',
          `Exported file: ${exportName}`,
          `Original state: ${originalName} (at load time or last saved version)`,
          `Processed on: ${generatedAt.toLocaleString(locale)}`,
          '',
        ]
      : [
          'Отчёт об обработке фотометрического файла',
          '',
          `Выгружаемый файл: ${exportName}`,
          `Исходное состояние: ${originalName} (на момент загрузки или последнего сохранения версии)`,
          `Дата обработки: ${generatedAt.toLocaleString(locale)}`,
          '',
        ];

  if (items.length === 0) {
    lines.push(L(lang, 'Файл не изменялся — выгружен в том виде, в котором был загружен.', 'The file was not changed — exported exactly as loaded.'));
  } else {
    lines.push(L(lang, 'Изменения относительно исходного файла:', 'Changes vs. the original file:'), '');
    for (const item of items) {
      lines.push(`- ${item.label}: ${item.before} → ${item.after}`);
    }
    lines.push(
      '',
      L(lang, 'Исходный файл приложен в папке «Исходный файл» — обработку можно перепроверить, сравнив его с выгруженным.',
        'The source file is included in the “Source file” folder — the processing can be re-verified by comparing it with the export.')
    );
  }

  lines.push('', L(lang, 'Отчёт подготовлен в www.ieseditor.ru', 'Report generated at www.ieseditor.ru'));
  return lines.join('\n');
}
