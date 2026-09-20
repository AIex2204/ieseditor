import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import { diffDocs, formatProcessingReport } from '../src/core/audit/docDiff';
import { scaleFluxTo } from '../src/core/photometry/scaleFlux';
import { rotateDoc } from '../src/core/photometry/rotate';

describe('diffDocs — сводка обработки', () => {
  it('на неизменённом документе пуста', () => {
    const doc = loadSample('Эллипс.IES');
    expect(diffDocs(doc, doc)).toHaveLength(0);
    expect(diffDocs(doc, { ...doc })).toHaveLength(0);
  });

  it('показывает изменение потока и правки числовых полей', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const scaled = scaleFluxTo(doc, 8000, 'computed');
    const items = diffDocs(doc, { ...scaled, inputWatts: 55 });

    const labels = items.map((i) => i.label);
    expect(labels).toContain('Расчётный поток, лм');
    expect(labels).toContain('Мощность, Вт');
    expect(items.find((i) => i.label === 'Мощность, Вт')?.after).toContain('55');
  });

  it('показывает пересчёт сетки после поворота с наклоном', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const rotated = rotateDoc(doc, { spinDeg: 0, tiltC0C180Deg: 10, tiltC90C270Deg: 0 }, { normalizeFlux: true });
    const labels = diffDocs(doc, rotated).map((i) => i.label);
    expect(labels).toContain('Угловая сетка (γ × C)');
  });

  it('считает число изменённых ячеек таблицы', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const candela = Float64Array.from(doc.candela);
    candela[0] += 100;
    candela[5] += 100;
    const item = diffDocs(doc, { ...doc, candela }).find((i) => i.label === 'Значения силы света');
    expect(item?.after).toContain('изменено 2');
  });

  it('замечает правку ключевых слов', () => {
    const doc = loadSample('Эллипс.IES');
    const keywords = [...doc.keywords, { key: 'LUMCAT', value: 'НОВЫЙ-АРТИКУЛ' }];
    const item = diffDocs(doc, { ...doc, keywords }).find((i) => i.label === 'Ключевые слова шапки');
    expect(item).toBeDefined();
  });

  it('отчёт об обработке описывает и отсутствие правок, и список изменений', () => {
    const doc = loadSample('Эллипс.IES');
    const empty = formatProcessingReport('Эллипс.IES', 'Эллипс (edited v1).ies', [], new Date(2026, 0, 15));
    expect(empty).toContain('Файл не изменялся');

    const withItems = formatProcessingReport(
      'Эллипс.IES',
      'Эллипс (edited v1).ies',
      diffDocs(doc, { ...doc, inputWatts: 77 }),
      new Date(2026, 0, 15)
    );
    expect(withItems).toContain('Мощность, Вт');
    expect(withItems).toContain('Исходный файл');
  });
});
