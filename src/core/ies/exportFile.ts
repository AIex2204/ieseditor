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

const EDITOR_STAMP_KEY = '_EDITOR';

/**
 * Убирает из шапки метку нашего редактора, если она там оказалась (файлы,
 * сохранённые прежними версиями, добавляли `[_EDITOR] www.ieseditor.ru`).
 * Сознательно НИЧЕГО не добавляем: адрес нашего сайта внутри чужого
 * фотометрического файла мог бы поставить человека в неловкое положение при
 * передаче файла заказчику. Другие пользовательские ключи `_EDITOR` не
 * трогаем — вычищаем только своё упоминание.
 */
export function stripEditorStamp(doc: PhotometryDoc): PhotometryDoc {
  const keywords = doc.keywords.filter(
    (k) => !(k.key.toUpperCase() === EDITOR_STAMP_KEY && /ieseditor\.ru/i.test(k.value))
  );
  return keywords.length === doc.keywords.length ? doc : { ...doc, keywords };
}

/** Сохраняет текущую версию документа как .ies-файл (сохраняя исходную кодировку). */
export function saveIesFile(doc: PhotometryDoc, fileName: string): void {
  const text = serializeIes(stripEditorStamp(doc));
  const bytes = encodeString(text, doc.sourceEncoding);
  triggerDownload(bytes, ensureIesExtension(fileName), 'application/octet-stream');
}
