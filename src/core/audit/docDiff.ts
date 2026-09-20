// Сводка "что сделано с файлом": сравнение текущего рабочего состояния с
// исходным, каким файл был загружен. Истории шагов мы не ведём, поэтому
// отчёт строится не по журналу операций, а по фактической разнице — это
// честнее: он описывает результат, а не намерения.
import type { PhotometryDoc } from '../ies/types';
import { computeFlux } from '../photometry/flux';
import { findImax } from '../photometry/metrics';

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

const NUMERIC_FIELDS: { key: keyof PhotometryDoc; label: string; digits?: number }[] = [
  { key: 'numLamps', label: 'Число ламп', digits: 0 },
  { key: 'lumensPerLamp', label: 'Поток лампы, лм' },
  { key: 'candelaMultiplier', label: 'Множитель силы света', digits: 3 },
  { key: 'inputWatts', label: 'Мощность, Вт' },
  { key: 'ballastFactor', label: 'Ballast factor', digits: 3 },
  { key: 'width', label: 'Ширина, м', digits: 3 },
  { key: 'length', label: 'Длина, м', digits: 3 },
  { key: 'height', label: 'Высота, м', digits: 3 },
];

/** Пустой массив означает, что файл не менялся. */
export function diffDocs(original: PhotometryDoc, working: PhotometryDoc): DiffItem[] {
  if (original === working) return [];
  const items: DiffItem[] = [];

  const fluxBefore = computeFlux(original);
  const fluxAfter = computeFlux(working);
  if (numbersDiffer(fluxBefore.totalLumens, fluxAfter.totalLumens, 0.05)) {
    const delta = fluxBefore.totalLumens > 0 ? (fluxAfter.totalLumens / fluxBefore.totalLumens - 1) * 100 : 0;
    items.push({
      label: 'Расчётный поток, лм',
      before: fmt(fluxBefore.totalLumens),
      after: `${fmt(fluxAfter.totalLumens)} (${delta >= 0 ? '+' : ''}${fmt(delta, 2)}%)`,
    });
  }

  const imaxBefore = findImax(original);
  const imaxAfter = findImax(working);
  if (numbersDiffer(imaxBefore.value, imaxAfter.value, 0.05)) {
    items.push({ label: 'Imax, кд', before: fmt(imaxBefore.value), after: fmt(imaxAfter.value) });
  }
  if (numbersDiffer(imaxBefore.gamma, imaxAfter.gamma, 0.01) || numbersDiffer(imaxBefore.c, imaxAfter.c, 0.01)) {
    items.push({
      label: 'Направление Imax',
      before: `γ=${fmt(imaxBefore.gamma)}° C=${fmt(imaxBefore.c)}°`,
      after: `γ=${fmt(imaxAfter.gamma)}° C=${fmt(imaxAfter.c)}°`,
    });
  }

  if (!anglesEqual(original.vertAngles, working.vertAngles) || !anglesEqual(original.horizAngles, working.horizAngles)) {
    items.push({ label: 'Угловая сетка (γ × C)', before: gridLabel(original), after: gridLabel(working) });
  }

  const changedCells = countChangedCells(original, working);
  if (changedCells === null) {
    items.push({
      label: 'Таблица силы света',
      before: `${original.candela.length} значений`,
      after: `${working.candela.length} значений (пересчитана)`,
    });
  } else if (changedCells > 0) {
    const share = (changedCells / Math.max(original.candela.length, 1)) * 100;
    items.push({
      label: 'Значения силы света',
      before: `${original.candela.length} значений`,
      after: `изменено ${changedCells} (${fmt(share, 1)}%)`,
    });
  }

  for (const f of NUMERIC_FIELDS) {
    const a = original[f.key] as number;
    const b = working[f.key] as number;
    if (numbersDiffer(a, b, 1e-9)) {
      items.push({ label: f.label, before: fmt(a, f.digits ?? 1), after: fmt(b, f.digits ?? 1) });
    }
  }

  if (original.photometricType !== working.photometricType) {
    items.push({ label: 'Тип фотометрии', before: String(original.photometricType), after: String(working.photometricType) });
  }
  if (original.format !== working.format) {
    items.push({ label: 'Версия формата', before: original.format, after: working.format });
  }
  if (original.tilt.mode !== working.tilt.mode) {
    items.push({ label: 'TILT', before: original.tilt.mode, after: working.tilt.mode });
  }

  const kwChanged = keywordsChanged(original, working);
  if (kwChanged > 0) {
    items.push({
      label: 'Ключевые слова шапки',
      before: `${original.keywords.length} шт.`,
      after: `изменено/добавлено ${kwChanged}`,
    });
  }

  return items;
}

/** Текстовый отчёт об обработке — кладётся в архив рядом с файлом. */
export function formatProcessingReport(
  originalName: string,
  exportName: string,
  items: DiffItem[],
  generatedAt = new Date()
): string {
  const lines = [
    'Отчёт об обработке фотометрического файла',
    '',
    `Выгружаемый файл: ${exportName}`,
    `Исходное состояние: ${originalName} (на момент загрузки или последнего сохранения версии)`,
    `Дата обработки: ${generatedAt.toLocaleString('ru-RU')}`,
    '',
  ];

  if (items.length === 0) {
    lines.push('Файл не изменялся — выгружен в том виде, в котором был загружен.');
  } else {
    lines.push('Изменения относительно исходного файла:', '');
    for (const item of items) {
      lines.push(`- ${item.label}: ${item.before} → ${item.after}`);
    }
    lines.push(
      '',
      'Исходный файл приложен в папке «Исходный файл» — обработку можно перепроверить, сравнив его с выгруженным.'
    );
  }

  lines.push('', 'Отчёт подготовлен в www.ieseditor.ru');
  return lines.join('\n');
}
