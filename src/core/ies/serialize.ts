// Сериализация PhotometryDoc обратно в текст IES (LM-63).
// Формат не обязан побайтово совпадать с исходником (перенос строк
// нормализуется), но все числа и структура должны разбираться заново
// в эквивалентный документ — это и проверяют round-trip тесты.
import type { IesFormat, PhotometryDoc } from './types';

const FORMAT_HEADER: Record<IesFormat, string | null> = {
  'LM-63-1986': null,
  'LM-63-1991': 'IESNA91',
  'LM-63-1995': 'IESNA:LM-63-1995',
  'LM-63-2002': 'IESNA:LM-63-2002',
  'LM-63-2019': 'IESNA:LM-63-19',
  'LM-63-2025': 'IESNA:LM-63-2025',
};

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (Number.isInteger(n)) return String(n);
  // toFixed(6) + обрезка хвостовых нулей — избегаем экспоненциальной записи
  // и лишнего шума двоичного округления при типичных фотометрических величинах.
  let s = n.toFixed(6);
  s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

function wrapNumbers(values: number[] | Float64Array, perLine = 10): string {
  const lines: string[] = [];
  for (let i = 0; i < values.length; i += perLine) {
    const chunk: string[] = [];
    for (let j = i; j < Math.min(i + perLine, values.length); j++) {
      chunk.push(formatNumber(values[j]));
    }
    lines.push(chunk.join(' '));
  }
  return lines.join('\n');
}

export function serializeIes(doc: PhotometryDoc): string {
  const out: string[] = [];

  const formatLine = FORMAT_HEADER[doc.format];
  if (formatLine) out.push(formatLine);

  for (const kw of doc.keywords) {
    out.push(`[${kw.key}] ${kw.value}`.trimEnd());
  }

  if (doc.tilt.mode === 'NONE') {
    out.push('TILT=NONE');
  } else if (doc.tilt.mode === 'INCLUDE') {
    out.push('TILT=INCLUDE');
    out.push(`${doc.tilt.lampToLuminaireGeometry ?? 1} ${(doc.tilt.angles ?? []).length}`);
    out.push(wrapNumbers(doc.tilt.angles ?? []));
    out.push(wrapNumbers(doc.tilt.factors ?? []));
  } else {
    out.push(`TILT=${doc.tilt.fileName ?? ''}`);
  }

  out.push(
    [
      doc.numLamps,
      formatNumber(doc.lumensPerLamp),
      formatNumber(doc.candelaMultiplier),
      doc.numVertAngles,
      doc.numHorizAngles,
      doc.photometricType,
      doc.unitsType,
      formatNumber(doc.width),
      formatNumber(doc.length),
      formatNumber(doc.height),
    ].join(' ')
  );
  out.push([formatNumber(doc.ballastFactor), formatNumber(doc.futureUse), formatNumber(doc.inputWatts)].join(' '));

  out.push(wrapNumbers(doc.vertAngles));
  out.push(wrapNumbers(doc.horizAngles));

  const m = doc.candelaMultiplier === 0 ? 1 : doc.candelaMultiplier;
  const raw = new Float64Array(doc.candela.length);
  for (let i = 0; i < doc.candela.length; i++) raw[i] = doc.candela[i] / m;

  for (let iH = 0; iH < doc.numHorizAngles; iH++) {
    const start = iH * doc.numVertAngles;
    const slice = raw.subarray(start, start + doc.numVertAngles);
    out.push(wrapNumbers(slice));
  }

  return out.join('\n') + '\n';
}
