import { describe, expect, it } from 'vitest';
import { parseLdtText } from '../src/core/ldt/parseLdt';

function buildLdt(): string {
  const lines = [
    'ACME Lighting', // 1 company
    '1', // 2 Ityp
    '4', // 3 Isym — quadrant (C 0..90)
    '4', // 4 Mc
    '30', // 5 Dc
    '3', // 6 Ng
    '45', // 7 Dg
    'REPORT-001', // 8
    'Test Luminaire', // 9
    'CAT-123', // 10
    'test.ldt', // 11
    '2026-01-01/tester', // 12
    '300', // 13 luminaire length
    '300', // 14 luminaire width
    '100', // 15 luminaire height
    '280', // 16 luminous opening length
    '280', // 17 luminous opening width
    '50', // 18 height C0
    '50', // 19 height C90
    '50', // 20 height C180
    '50', // 21 height C270
    '60', // 22 DFF %
    '80', // 23 LORL %
    '1', // 24 conv factor
    '0', // 25 tilt
    '1', // 26 n lamp sets
    '1', // lamp set: num lamps
    'LED', // lamp type
    '1000', // total flux lm
    '4000', // CCT
    '80', // CRI
    '10', // wattage
    ...Array(10).fill('0'), // direct ratios
    '0', '30', '60', '90', // C-plane angles
    '0', '45', '90', // gamma angles
    '1000', '800', '0', // plane C=0
    '950', '750', '0', // plane C=30
    '900', '700', '0', // plane C=60
    '850', '650', '0', // plane C=90
  ];
  return lines.join('\r\n');
}

describe('parseLdtText — импорт EULUMDAT (.ldt)', () => {
  it('разбирает базовый квадрантно-симметричный файл', () => {
    const { doc } = parseLdtText(buildLdt(), 'utf-8');

    expect(doc.numHorizAngles).toBe(4);
    expect(doc.numVertAngles).toBe(3);
    expect(doc.horizAngles).toEqual([0, 30, 60, 90]);
    expect(doc.vertAngles).toEqual([0, 45, 90]);
    expect(doc.numLamps).toBe(1);
    expect(doc.lumensPerLamp).toBe(1000);
    expect(doc.candelaMultiplier).toBe(1);
    expect(doc.photometricType).toBe(1);
    expect(doc.format).toBe('LM-63-2002');

    // candela[iHoriz * numVert + iVert]; scale = conv * flux/1000 = 1
    expect(doc.candela[0 * 3 + 0]).toBeCloseTo(1000, 6); // C=0, γ=0
    expect(doc.candela[0 * 3 + 1]).toBeCloseTo(800, 6); // C=0, γ=45
    expect(doc.candela[3 * 3 + 0]).toBeCloseTo(850, 6); // C=90, γ=0

    expect(doc.width).toBeCloseTo(0.28, 6);
    expect(doc.length).toBeCloseTo(0.28, 6);
    expect(doc.height).toBeCloseTo(0.05, 6);

    expect(doc.warnings.some((w) => w.code === 'ldt-import')).toBe(true);
    expect(doc.keywords.find((k) => k.key === 'LUMINAIRE')?.value).toBe('Test Luminaire');
  });

  it('абсолютная фотометрия: отрицательное число ламп → lumensPerLamp = -1, значения в кд как есть', () => {
    const lines = buildLdt().split('\r\n');
    const setStart = 26; // индекс строки "1" (numLamps) в массиве (0-based, строка 27 файла)
    lines[setStart] = '-1';
    const { doc } = parseLdtText(lines.join('\r\n'), 'utf-8');
    expect(doc.lumensPerLamp).toBe(-1);
    expect(doc.candela[0]).toBeCloseTo(1000, 6); // conv=1, абсолютная — без деления на 1000
  });

  it('точечный источник: нулевые размеры светового отверстия дают width=length=height=0', () => {
    const lines = buildLdt().split('\r\n');
    lines[15] = '0'; // loLength (строка 16)
    lines[16] = '0'; // loWidth (строка 17)
    lines[17] = '0';
    lines[18] = '0';
    lines[19] = '0';
    lines[20] = '0';
    // и длина корпуса тоже 0, иначе сработает fallback lumLength
    lines[12] = '0';
    const { doc } = parseLdtText(lines.join('\r\n'), 'utf-8');
    expect(doc.width).toBe(0);
    expect(doc.length).toBe(0);
    expect(doc.height).toBe(0);
  });

  it('nSets=0 (файл без комплекта ламп) не сдвигает остаток файла — структура и последняя C-плоскость не искажены', () => {
    const lines = buildLdt().split('\r\n');
    lines[25] = '0'; // n lamp sets
    lines.splice(26, 6); // в реальном файле с nSets=0 эти 6 строк лампы просто отсутствуют

    const { doc } = parseLdtText(lines.join('\r\n'), 'utf-8');

    // Раньше здесь стоял Math.max(1, nSets), который всё равно читал 6
    // несуществующих строк лампы, утаскивая их с начала раздела Direct
    // Ratios — весь остаток файла уезжал на 6 строк, и к моменту чтения
    // последней C-плоскости строки заканчивались (обнулялась половина КСС).
    // Проверяем, что структура не поехала и не было аварийного обрыва.
    expect(doc.numLamps).toBe(1);
    expect(doc.numHorizAngles).toBe(4);
    expect(doc.numVertAngles).toBe(3);
    expect(doc.horizAngles).toEqual([0, 30, 60, 90]);
    // без данных о потоке таблица трактуется как уже абсолютные канделы
    // (scale = convFactor = 1) — значения последней плоскости (C=90) должны
    // быть реальными 850/650/0 из фикстуры, а не нулями из-за съехавших строк.
    expect(doc.candela[3 * 3 + 0]).toBeCloseTo(850, 6);
    expect(doc.candela[3 * 3 + 1]).toBeCloseTo(650, 6);
    expect(doc.lumensPerLamp).toBe(-1);
    expect(doc.warnings.some((w) => w.code === 'ldt-no-lampset')).toBe(true);
    expect(doc.warnings.some((w) => w.code === 'ldt-truncated')).toBe(false);
  });
});
