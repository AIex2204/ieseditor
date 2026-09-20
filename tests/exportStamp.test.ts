import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import { stripEditorStamp } from '../src/core/ies/exportFile';
import { serializeIes } from '../src/core/ies/serialize';
import { parseIesText } from '../src/core/ies/parse';

describe('сохраняемый файл не содержит упоминания редактора', () => {
  it('в выгружаемый .ies не подмешивается адрес сайта', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const text = serializeIes(stripEditorStamp(doc));
    expect(text.toLowerCase()).not.toContain('ieseditor.ru');
    // файл остаётся валидным
    const reparsed = parseIesText(text, doc.sourceEncoding).doc;
    expect(reparsed.warnings.filter((w) => w.severity === 'error')).toHaveLength(0);
    expect(reparsed.candela.length).toBe(doc.candela.length);
  });

  it('метка, оставшаяся от прежних версий, вычищается при сохранении', () => {
    const doc = loadSample('Эллипс.IES');
    const stamped = { ...doc, keywords: [...doc.keywords, { key: '_EDITOR', value: 'www.ieseditor.ru' }] };
    const cleaned = stripEditorStamp(stamped);
    expect(cleaned.keywords.some((k) => /ieseditor\.ru/i.test(k.value))).toBe(false);
    expect(serializeIes(cleaned).toLowerCase()).not.toContain('ieseditor.ru');
  });

  it('чужие ключевые слова не трогаются, документ не мутируется', () => {
    const doc = loadSample('Эллипс.IES');
    const countBefore = doc.keywords.length;
    const out = stripEditorStamp(doc);
    // нет нашей метки — возвращается тот же документ без изменений
    expect(out).toBe(doc);
    expect(doc.keywords).toHaveLength(countBefore);
  });
});
