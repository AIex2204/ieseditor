// Автодетект и (де)кодирование текстовой кодировки IES-файлов.
// Образцы из Input/ показывают both: чистый UTF-8 (без BOM) и однобайтовый
// windows-1251 (кириллица в [TEST]/[MANUFAC]). Реализуем cp1251 вручную,
// потому что TextEncoder в браузере/Node умеет кодировать только в UTF-8 —
// обратной дороги "строка → windows-1251 байты" стандартный API не даёт.
import type { SourceEncoding } from './types';

// Таблица cp1251 0x80..0xFF → кодпоинт Unicode (CP1251.TXT, unicode.org).
// undefined = байт не определён в cp1251.
const CP1251_HIGH: (number | undefined)[] = [
  0x0402, 0x0403, 0x201a, 0x0453, 0x201e, 0x2026, 0x2020, 0x2021, // 80-87
  0x20ac, 0x2030, 0x0409, 0x2039, 0x040a, 0x040c, 0x040b, 0x040f, // 88-8F
  0x0452, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, // 90-97
  undefined, 0x2122, 0x0459, 0x203a, 0x045a, 0x045c, 0x045b, 0x045f, // 98-9F
  0x00a0, 0x040e, 0x045e, 0x0408, 0x00a4, 0x0490, 0x00a6, 0x00a7, // A0-A7
  0x0401, 0x00a9, 0x0404, 0x00ab, 0x00ac, 0x00ad, 0x00ae, 0x0407, // A8-AF
  0x00b0, 0x00b1, 0x0406, 0x0456, 0x0491, 0x00b5, 0x00b6, 0x00b7, // B0-B7
  0x0451, 0x2116, 0x0454, 0x00bb, 0x0458, 0x0405, 0x0455, 0x0457, // B8-BF
];
// C0-FF: подряд U+0410..U+044F (А..Я, а..я)

const decodeTable = new Map<number, string>();
const encodeTable = new Map<string, number>();
for (let b = 0x80; b <= 0xbf; b++) {
  const cp = CP1251_HIGH[b - 0x80];
  if (cp === undefined) continue;
  const ch = String.fromCodePoint(cp);
  decodeTable.set(b, ch);
  encodeTable.set(ch, b);
}
for (let b = 0xc0; b <= 0xff; b++) {
  const cp = 0x0410 + (b - 0xc0);
  const ch = String.fromCodePoint(cp);
  decodeTable.set(b, ch);
  encodeTable.set(ch, b);
}

function decodeWindows1251(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
    } else {
      out += decodeTable.get(b) ?? '�';
    }
  }
  return out;
}

function encodeWindows1251(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      out[i] = code;
    } else {
      out[i] = encodeTable.get(text[i]) ?? 0x3f; // '?' для непредставимых символов
    }
  }
  return out;
}

const UTF8_BOM = [0xef, 0xbb, 0xbf];

function hasUtf8Bom(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === UTF8_BOM[0] && bytes[1] === UTF8_BOM[1] && bytes[2] === UTF8_BOM[2];
}

/**
 * Определяет кодировку по содержимому: если байты — валидная UTF-8
 * последовательность, считаем файл UTF-8; иначе — windows-1251
 * (единственная другая кодировка, реально встречающаяся в IES-файлах
 * светотехнических лабораторий СНГ).
 */
export function detectEncoding(bytes: Uint8Array): SourceEncoding {
  if (hasUtf8Bom(bytes)) return 'utf-8';
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return 'utf-8';
  } catch {
    return 'windows-1251';
  }
}

export function decodeBytes(bytes: Uint8Array, encoding: SourceEncoding): string {
  if (encoding === 'utf-8') {
    const start = hasUtf8Bom(bytes) ? 3 : 0;
    return new TextDecoder('utf-8').decode(bytes.subarray(start));
  }
  return decodeWindows1251(bytes);
}

export function encodeString(text: string, encoding: SourceEncoding): Uint8Array {
  if (encoding === 'utf-8') return new TextEncoder().encode(text);
  return encodeWindows1251(text);
}
