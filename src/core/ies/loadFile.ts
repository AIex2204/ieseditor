// Загрузка File (браузерный File API) в PhotometryDoc.
import { detectEncoding, decodeBytes } from './encoding';
import { parseIesText } from './parse';
import { toTypeC } from './typeConvert';
import type { PhotometryDoc } from './types';

export interface LoadedFile {
  name: string;
  doc: PhotometryDoc;
}

export async function loadIesFile(file: File): Promise<LoadedFile> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const encoding = detectEncoding(bytes);
  const text = decodeBytes(bytes, encoding);
  const { doc } = parseIesText(text, encoding);
  // Type A/B не пересчитываем, но помечаем предупреждением — UI по нему
  // блокирует обработку, чтобы не выдать молча неверную геометрию.
  return { name: file.name, doc: toTypeC(doc).doc };
}
