import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { loadSample } from './helpers';
import { buildArchive } from '../src/core/ies/exportArchive';
import { parseIesText } from '../src/core/ies/parse';
import { scaleFluxTo } from '../src/core/photometry/scaleFlux';

describe('buildArchive — выгрузка одним архивом', () => {
  it('без правок: файл, отчёты и показатели, без папки исходника', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const zip = unzipSync(
      buildArchive({
        fileName: 'V1-S1.ies',
        doc,
        originalName: 'V1-S1.ies',
        originalDoc: doc,
        generatedAt: new Date(2026, 0, 15),
      })
    );
    const names = Object.keys(zip);

    expect(names).toContain('V1-S1.ies');
    expect(names).toContain('Проверка файла.txt');
    expect(names).toContain('Отчёт об обработке.txt');
    expect(names).toContain('Показатели.csv');
    expect(names.some((n) => n.startsWith('Исходный файл/'))).toBe(false);

    expect(strFromU8(zip['Отчёт об обработке.txt'])).toContain('Файл не изменялся');
  });

  it('с правками: кладёт исходный файл и описывает разницу в отчёте', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const edited = scaleFluxTo(doc, 7000, 'computed');
    const zip = unzipSync(
      buildArchive({
        fileName: 'V1-S1 (edited v1).ies',
        doc: edited,
        originalName: 'V1-S1.ies',
        originalDoc: doc,
        generatedAt: new Date(2026, 0, 15),
      })
    );

    expect(Object.keys(zip)).toContain('Исходный файл/V1-S1.ies');
    const report = strFromU8(zip['Отчёт об обработке.txt']);
    expect(report).toContain('Расчётный поток, лм');
    expect(report).toContain('www.ieseditor.ru');

    // .ies внутри архива — валидный файл БЕЗ упоминания нашего сайта внутри
    const iesText = strFromU8(zip['V1-S1 (edited v1).ies']);
    expect(iesText.toLowerCase()).not.toContain('ieseditor.ru');
    const reparsed = parseIesText(iesText, edited.sourceEncoding).doc;
    expect(reparsed.warnings.filter((w) => w.severity === 'error')).toHaveLength(0);
    expect(reparsed.numVertAngles).toBe(edited.numVertAngles);

    // исходник в архиве остался прежним
    const originalText = strFromU8(zip['Исходный файл/V1-S1.ies']);
    const originalReparsed = parseIesText(originalText, doc.sourceEncoding).doc;
    expect(originalReparsed.candela[0]).toBeCloseTo(doc.candela[0], 2);
  });

  it('диаграммы попадают в папку «Диаграммы»', () => {
    const doc = loadSample('Эллипс.IES');
    const zip = unzipSync(
      buildArchive({
        fileName: 'Эллипс.ies',
        doc,
        originalName: 'Эллипс.ies',
        originalDoc: doc,
        charts: [{ label: 'C0 – C180', svg: '<svg/>', png: new Uint8Array([1, 2, 3]) }],
      })
    );
    const names = Object.keys(zip);
    expect(names).toContain('Диаграммы/C0 – C180.svg');
    expect(names).toContain('Диаграммы/C0 – C180.png');
  });

  it('CSV показателей — с BOM и точкой с запятой для Excel', () => {
    const doc = loadSample('Эллипс.IES');
    const zip = unzipSync(
      buildArchive({ fileName: 'Эллипс.ies', doc, originalName: 'Эллипс.ies', originalDoc: doc })
    );
    // BOM проверяем по байтам: TextDecoder при чтении его отбрасывает
    const bytes = zip['Показатели.csv'];
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);

    const csv = strFromU8(bytes);
    expect(csv).toContain('Показатель;Значение');
    expect(csv).toContain('Световой поток, лм;');
  });
});
