// Загрузка File (браузерный File API) в PhotometryDoc из EULUMDAT (.ldt).
import { detectEncoding, decodeBytes } from '../ies/encoding';
import { parseLdtText } from './parseLdt';
import type { PhotometryDoc } from '../ies/types';

export interface LoadedFile {
  name: string;
  doc: PhotometryDoc;
}

export async function loadLdtFile(file: File): Promise<LoadedFile> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const encoding = detectEncoding(bytes);
  const text = decodeBytes(bytes, encoding);
  const { doc } = parseLdtText(text, encoding);
  return { name: file.name, doc };
}
