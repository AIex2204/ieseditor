// Выгрузка результата работы одним архивом: сам .ies плюс всё, что нужно,
// чтобы обработку можно было перепроверить и сразу положить в каталог —
// отчёт о проверке, отчёт об обработке, показатели и диаграммы. Журнал
// правок в сам .ies не пишем: он лежит рядом отдельным файлом.
import { zipSync, strToU8 } from 'fflate';
import { serializeIes } from './serialize';
import { encodeString } from './encoding';
import { triggerDownload, withEditorStamp } from './exportFile';
import type { PhotometryDoc } from './types';
import { auditDoc, formatAuditReport } from '../audit/auditDoc';
import { diffDocs, formatProcessingReport } from '../audit/docDiff';
import { metricsCsv } from '../report/metricsTable';

export interface ArchiveChartImage {
  label: string;
  svg: string;
  png: Uint8Array | null;
}

export interface BuildArchiveInput {
  /** Имя выгружаемого .ies (с расширением). */
  fileName: string;
  doc: PhotometryDoc;
  /** Имя и состояние файла на момент загрузки — для отчёта и папки «Исходный файл». */
  originalName: string;
  originalDoc: PhotometryDoc;
  charts?: ArchiveChartImage[];
  generatedAt?: Date;
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

function safeEntryName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim();
}

function iesBytes(doc: PhotometryDoc): Uint8Array {
  return encodeString(serializeIes(withEditorStamp(doc)), doc.sourceEncoding);
}

export function buildArchive(input: BuildArchiveInput): Uint8Array {
  const { fileName, doc, originalName, originalDoc, charts = [], generatedAt = new Date() } = input;
  const diff = diffDocs(originalDoc, doc);

  const files: Record<string, Uint8Array> = {
    [safeEntryName(fileName)]: iesBytes(doc),
    'Проверка файла.txt': strToU8(formatAuditReport(fileName, auditDoc(doc))),
    'Отчёт об обработке.txt': strToU8(formatProcessingReport(originalName, fileName, diff, generatedAt)),
    'Показатели.csv': strToU8(metricsCsv(doc)),
  };

  // Одинаковые имена молча затирали бы друг друга в архиве — разводим их.
  const usedLabels = new Set<string>();
  charts.forEach((chart, i) => {
    let label = safeEntryName(chart.label) || `Диаграмма ${i + 1}`;
    if (usedLabels.has(label)) {
      let n = 2;
      while (usedLabels.has(`${label} (${n})`)) n++;
      label = `${label} (${n})`;
    }
    usedLabels.add(label);
    files[`Диаграммы/${label}.svg`] = strToU8(chart.svg);
    if (chart.png) files[`Диаграммы/${label}.png`] = chart.png;
  });

  // Исходный файл кладём только если он реально отличается — иначе в архиве
  // просто лежала бы вторая копия того же самого.
  if (diff.length > 0) {
    files[`Исходный файл/${safeEntryName(originalName)}`] = iesBytes(originalDoc);
  }

  return zipSync(files, { level: 6 });
}

export function saveArchive(input: BuildArchiveInput): void {
  const bytes = buildArchive(input);
  triggerDownload(bytes, `${stripExtension(input.fileName)}.zip`, 'application/zip');
}
