// Разбор текста IES-файла (LM-63-1986/1991/1995/2002/2019) в PhotometryDoc.
import { NumberTokenizer } from './tokenizer';
import type {
  IesFormat,
  Keyword,
  PhotometryDoc,
  PhotometricType,
  SourceEncoding,
  TiltData,
  UnitsType,
  WarningItem,
} from './types';

function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/);
}

function detectFormat(firstLine: string): { format: IesFormat; consumedFirstLine: boolean } {
  const line = firstLine.trim().toUpperCase();
  if (line.startsWith('IESNA:LM-63-2025')) {
    return { format: 'LM-63-2025', consumedFirstLine: true };
  }
  if (line.startsWith('IESNA:LM-63-2002')) {
    return { format: 'LM-63-2002', consumedFirstLine: true };
  }
  if (line.startsWith('IESNA:LM-63-1995')) {
    return { format: 'LM-63-1995', consumedFirstLine: true };
  }
  if (line === 'IESNA:LM-63-19' || line.startsWith('IESNA:LM-63-2019')) {
    return { format: 'LM-63-2019', consumedFirstLine: true };
  }
  if (line.startsWith('IESNA91') || line.startsWith('IESNA:LM-63-1991')) {
    return { format: 'LM-63-1991', consumedFirstLine: true };
  }
  if (line.startsWith('IESNA')) {
    // неизвестный вариант заголовка IESNA — считаем ближайшим известным (2002)
    return { format: 'LM-63-2002', consumedFirstLine: true };
  }
  // LM-63-1986 не имеет строки формата — первая строка уже является
  // ключевым словом или TILT=
  return { format: 'LM-63-1986', consumedFirstLine: false };
}

const KEYWORD_RE = /^\s*\[([A-Za-z0-9_]+)\]\s?(.*)$/;
const TILT_RE = /^\s*TILT\s*=\s*(.+?)\s*$/i;

interface HeaderParseResult {
  keywords: Keyword[];
  tiltMode: 'NONE' | 'INCLUDE' | 'FILE';
  tiltFileName?: string;
  nextLineIndex: number;
}

function parseHeader(lines: string[], startIndex: number, warnings: WarningItem[]): HeaderParseResult {
  const keywords: Keyword[] = [];
  let i = startIndex;
  for (; i < lines.length; i++) {
    const line = lines[i];
    const tiltMatch = TILT_RE.exec(line);
    if (tiltMatch) {
      const raw = tiltMatch[1].trim();
      const rawUpper = raw.toUpperCase();
      if (rawUpper === 'NONE') {
        return { keywords, tiltMode: 'NONE', nextLineIndex: i + 1 };
      }
      if (rawUpper === 'INCLUDE') {
        return { keywords, tiltMode: 'INCLUDE', nextLineIndex: i + 1 };
      }
      return { keywords, tiltMode: 'FILE', tiltFileName: raw, nextLineIndex: i + 1 };
    }

    const kwMatch = KEYWORD_RE.exec(line);
    if (kwMatch) {
      const key = kwMatch[1].toUpperCase();
      const value = kwMatch[2];
      if (key === 'MORE' && keywords.length > 0) {
        // [MORE] — продолжение значения предыдущего ключа (LM-63-2002+)
        const last = keywords[keywords.length - 1];
        last.value = last.value.length > 0 ? `${last.value} ${value}`.trim() : value;
      } else {
        keywords.push({ key, value });
      }
      continue;
    }

    if (line.trim().length === 0) continue;

    if (keywords.length > 0) {
      // старый стиль продолжения строки без [MORE]
      const last = keywords[keywords.length - 1];
      last.value = last.value.length > 0 ? `${last.value} ${line.trim()}`.trim() : line.trim();
    } else {
      warnings.push({
        code: 'unexpected-line',
        message: `Нераспознанная строка до TILT=: "${line}"`,
        messageEn: `Unrecognized line before TILT=: "${line}"`,
        severity: 'warning',
      });
    }
  }

  warnings.push({ code: 'no-tilt-line', message: 'Не найдена строка TILT=', messageEn: 'No TILT= line found', severity: 'error' });
  return { keywords, tiltMode: 'NONE', nextLineIndex: i };
}

export interface ParseResult {
  doc: PhotometryDoc;
}

export function parseIesText(text: string, sourceEncoding: SourceEncoding): ParseResult {
  const warnings: WarningItem[] = [];
  const lines = splitLines(text);

  const firstNonEmptyIndex = lines.findIndex((l) => l.trim().length > 0);
  const { format, consumedFirstLine } = detectFormat(lines[firstNonEmptyIndex] ?? '');
  const headerStart = consumedFirstLine ? firstNonEmptyIndex + 1 : firstNonEmptyIndex;

  const header = parseHeader(lines, Math.max(headerStart, 0), warnings);

  const restText = lines.slice(header.nextLineIndex).join('\n');
  const tok = new NumberTokenizer(restText);

  const tilt: TiltData = { mode: header.tiltMode, fileName: header.tiltFileName };
  if (header.tiltMode === 'INCLUDE') {
    try {
      const geometry = tok.nextInt() as 1 | 2 | 3;
      const numPairs = tok.nextInt();
      const angles = tok.nextNumbers(numPairs);
      const factors = tok.nextNumbers(numPairs);
      tilt.lampToLuminaireGeometry = geometry;
      tilt.angles = angles;
      tilt.factors = factors;
    } catch (e) {
      warnings.push({ code: 'tilt-parse-error', message: `Ошибка разбора TILT=INCLUDE: ${(e as Error).message}`, messageEn: `Error parsing TILT=INCLUDE: ${(e as Error).message}`, severity: 'error' });
    }
  }

  let numLamps = 0;
  let lumensPerLamp = 0;
  let candelaMultiplier = 1;
  let numVertAngles = 0;
  let numHorizAngles = 0;
  let photometricType: PhotometricType = 1;
  let unitsType: UnitsType = 2;
  let width = 0;
  let length = 0;
  let height = 0;
  let ballastFactor = 1;
  let futureUse = 1;
  let inputWatts = 0;
  let vertAngles: number[] = [];
  let horizAngles: number[] = [];
  let candela = new Float64Array(0);

  try {
    numLamps = tok.nextInt();
    lumensPerLamp = tok.nextNumber();
    candelaMultiplier = tok.nextNumber();
    numVertAngles = tok.nextInt();
    numHorizAngles = tok.nextInt();
    photometricType = tok.nextInt() as PhotometricType;
    unitsType = tok.nextInt() as UnitsType;
    width = tok.nextNumber();
    length = tok.nextNumber();
    height = tok.nextNumber();

    ballastFactor = tok.nextNumber();
    futureUse = tok.nextNumber();
    inputWatts = tok.nextNumber();

    vertAngles = tok.nextNumbers(numVertAngles);
    horizAngles = tok.nextNumbers(numHorizAngles);

    const total = numVertAngles * numHorizAngles;
    candela = new Float64Array(total);
    for (let i = 0; i < total; i++) {
      candela[i] = tok.nextNumber() * candelaMultiplier;
    }

    if (tok.hasNext()) {
      warnings.push({
        code: 'trailing-data',
        message: `После таблицы силы света осталось ${tok.remaining()} лишних чисел`,
        messageEn: `${tok.remaining()} extra numbers left after the intensity table`,
        severity: 'warning',
      });
    }
  } catch (e) {
    warnings.push({ code: 'numeric-parse-error', message: (e as Error).message, severity: 'error' });
  }

  validateMonotonic(vertAngles, 'вертикальных углов (γ)', 'vertical angles (γ)', warnings);
  validateMonotonic(horizAngles, 'горизонтальных углов (C)', 'horizontal angles (C)', warnings);
  for (let i = 0; i < candela.length; i++) {
    if (candela[i] < 0) {
      warnings.push({ code: 'negative-candela', message: 'В таблице силы света есть отрицательные значения', messageEn: 'The intensity table contains negative values', severity: 'error' });
      break;
    }
  }

  const doc: PhotometryDoc = {
    format,
    keywords: header.keywords,
    tilt,
    numLamps,
    lumensPerLamp,
    candelaMultiplier,
    numVertAngles,
    numHorizAngles,
    photometricType,
    unitsType,
    width,
    length,
    height,
    ballastFactor,
    futureUse,
    inputWatts,
    vertAngles,
    horizAngles,
    candela,
    sourceEncoding,
    warnings,
  };

  return { doc };
}

function validateMonotonic(values: number[], label: string, labelEn: string, warnings: WarningItem[]): void {
  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) {
      warnings.push({
        code: 'non-monotonic-angles',
        message: `Таблица ${label} не является неубывающей (индекс ${i}: ${values[i - 1]} → ${values[i]})`,
        messageEn: `The ${labelEn} array is not non-decreasing (index ${i}: ${values[i - 1]} → ${values[i]})`,
        severity: 'error',
      });
      return;
    }
  }
}
