// Сохранение результата в файл: .ies (п. "функция сохранения финальной
// версии файла"). LDT мы только читаем — на запись всегда IES.
import { serializeIes } from './serialize';
import { encodeString } from './encoding';
import type { PhotometryDoc } from './types';

export function triggerDownload(bytes: Uint8Array, fileName: string, mime: string): void {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ensureIesExtension(name: string): string {
  return /\.ies$/i.test(name) ? name : `${name}.ies`;
}

export const EDITOR_STAMP_KEY = '_EDITOR';
export const EDITOR_STAMP_VALUE = 'www.ieseditor.ru';

/**
 * Ставит в шапку файла метку редактора. Ключ с подчёркиванием — ровно то,
 * что LM-63-2002 отводит под пользовательские ключевые слова: расчётные
 * пакеты (DIALux, Relux, AGi32) такие строки игнорируют, так что метка
 * ничему не мешает. Повторное сохранение не копит дубли — старая метка
 * заменяется. Метка живёт только в выгружаемом файле и не подмешивается
 * в документ, открытый в приложении.
 */
export function withEditorStamp(doc: PhotometryDoc): PhotometryDoc {
  const keywords = doc.keywords.filter((k) => k.key.toUpperCase() !== EDITOR_STAMP_KEY);
  keywords.push({ key: EDITOR_STAMP_KEY, value: EDITOR_STAMP_VALUE });
  return { ...doc, keywords };
}

/** Сохраняет текущую версию документа как .ies-файл (сохраняя исходную кодировку). */
export function saveIesFile(doc: PhotometryDoc, fileName: string): void {
  const text = serializeIes(withEditorStamp(doc));
  const bytes = encodeString(text, doc.sourceEncoding);
  triggerDownload(bytes, ensureIesExtension(fileName), 'application/octet-stream');
}
