import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import { auditDoc, formatAuditReport } from '../src/core/audit/auditDoc';

function check(doc: Parameters<typeof auditDoc>[0], id: string) {
  return auditDoc(doc).checks.find((c) => c.id === id);
}

describe('auditDoc — проверка файла перед публикацией', () => {
  it('на штатных образцах не находит критических проблем', () => {
    for (const name of ['V1-S1-7R710-40x32-6604040-a.ies', 'Эллипс.IES', '15 deg.IES']) {
      const report = auditDoc(loadSample(name));
      const errors = report.checks.filter((c) => c.severity === 'error');
      expect(errors, `${name}: ${errors.map((e) => e.detail).join(' | ')}`).toHaveLength(0);
    }
  });

  it('ловит расхождение заявленного и расчётного потока', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const inflated = { ...doc, lumensPerLamp: doc.lumensPerLamp * 2 };
    const result = check(inflated, 'declared-flux');
    expect(result?.severity).toBe('error');
    expect(result?.detail).toContain('расхождение');
  });

  it('ловит КПД выше 100%', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const impossible = { ...doc, lumensPerLamp: 100 };
    expect(check(impossible, 'efficiency')?.severity).toBe('error');
  });

  it('ловит нереалистичную удельную отдачу', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    expect(check({ ...doc, inputWatts: 5 }, 'efficacy')?.severity).toBe('error');
    expect(check({ ...doc, inputWatts: 1000 }, 'efficacy')?.severity).toBe('warning');
  });

  it('помечает Type B как ошибку — расчёты и обработка для него недостоверны', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const typeB = { ...doc, photometricType: 2 as const };
    const result = check(typeB, 'photometric-type');
    expect(result?.severity).toBe('error');
    expect(auditDoc(typeB).verdict).toBe('error');
  });

  it('ловит плоскость, целиком заполненную нулями', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const candela = Float64Array.from(doc.candela);
    const nv = doc.numVertAngles;
    for (let iG = 0; iG < nv; iG++) candela[2 * nv + iG] = 0;
    expect(check({ ...doc, candela }, 'empty-planes')?.severity).toBe('error');
  });

  it('ловит нулевые габариты и незаполненные ключевые слова', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    expect(check({ ...doc, width: 0, length: 0, height: 0 }, 'dimensions')?.severity).toBe('warning');
    expect(check({ ...doc, keywords: [] }, 'keywords')?.severity).toBe('warning');
  });

  it('ловит немонотонные углы и отрицательные значения', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const vertAngles = [...doc.vertAngles];
    vertAngles[5] = vertAngles[4] - 1;
    expect(check({ ...doc, vertAngles }, 'angle-grid')?.severity).toBe('error');

    const candela = Float64Array.from(doc.candela);
    candela[10] = -5;
    expect(check({ ...doc, candela }, 'angle-grid')?.severity).toBe('error');
  });

  it('находит полки одинаковых значений (артефакт гониометра в V1-S1)', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const candela = Float64Array.from(doc.candela);
    const nv = doc.numVertAngles;
    for (let iG = 10; iG < 16; iG++) candela[iG] = 1234.5;
    const result = check({ ...doc, candela }, 'plateaus');
    expect(result?.severity).toBe('warning');
    expect(nv).toBeGreaterThan(16);
  });

  it('текстовый отчёт содержит вердикт и строки проверок', () => {
    const doc = loadSample('Эллипс.IES');
    const text = formatAuditReport('Эллипс.IES', auditDoc(doc));
    expect(text).toContain('Проверка фотометрического файла: Эллипс.IES');
    expect(text).toContain('Итог:');
    expect(text).toContain('www.ieseditor.ru');
  });
});
