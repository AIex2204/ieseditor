// Единая точка загрузки файла фотометрии: .ies читаем как есть, .ldt
// (EULUMDAT) конвертируем в ту же модель PhotometryDoc. Сохранение всегда
// выполняется в IES — см. core/ldt/parseLdt.ts.
import { loadIesFile } from './ies/loadFile';
import { loadLdtFile } from './ldt/loadLdtFile';
import { toMeters } from './ies/normalizeUnits';
import type { PhotometryDoc } from './ies/types';

export interface LoadedFile {
  name: string;
  doc: PhotometryDoc;
}

export const ACCEPTED_EXTENSIONS = '.ies,.ldt';

export function isAcceptedFileName(name: string): boolean {
  return /\.(ies|ldt)$/i.test(name);
}

export async function loadPhotometryFile(file: File): Promise<LoadedFile> {
  const loaded = /\.ldt$/i.test(file.name) ? await loadLdtFile(file) : await loadIesFile(file);
  // в приложении габариты всегда в метрах — пересчитываем сразу на входе
  return { ...loaded, doc: toMeters(loaded.doc) };
}
