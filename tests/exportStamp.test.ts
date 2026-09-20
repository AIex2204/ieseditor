import { describe, expect, it } from 'vitest';
import { loadSample } from './helpers';
import { EDITOR_STAMP_KEY, EDITOR_STAMP_VALUE, withEditorStamp } from '../src/core/ies/exportFile';
import { serializeIes } from '../src/core/ies/serialize';
import { parseIesText } from '../src/core/ies/parse';

describe('метка редактора в сохраняемом файле', () => {
  it('попадает в шапку файла и читается обратно без ошибок', () => {
    const doc = loadSample('V1-S1-7R710-40x32-6604040-a.ies');
    const text = serializeIes(withEditorStamp(doc));
    expect(text).toContain(`[${EDITOR_STAMP_KEY}] ${EDITOR_STAMP_VALUE}`);

    const reparsed = parseIesText(text, doc.sourceEncoding).doc;
    expect(reparsed.warnings.filter((w) => w.severity === 'error')).toHaveLength(0);
    expect(reparsed.keywords.find((k) => k.key === EDITOR_STAMP_KEY)?.value).toBe(EDITOR_STAMP_VALUE);
    // фотометрия от метки не пострадала
    expect(reparsed.candela.length).toBe(doc.candela.length);
    expect(reparsed.numHorizAngles).toBe(doc.numHorizAngles);
  });

  it('повторное сохранение не копит дубли метки', () => {
    const doc = loadSample('Эллипс.IES');
    const twice = withEditorStamp(withEditorStamp(doc));
    expect(twice.keywords.filter((k) => k.key === EDITOR_STAMP_KEY)).toHaveLength(1);
  });

  it('не мутирует документ, открытый в приложении', () => {
    const doc = loadSample('Эллипс.IES');
    const countBefore = doc.keywords.length;
    withEditorStamp(doc);
    expect(doc.keywords).toHaveLength(countBefore);
  });
});
