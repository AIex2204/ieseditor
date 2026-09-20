// Словарь стандартных ключевых слов LM-63-2002 (используется для выпадающего
// списка в редакторе полей). Файл может содержать и нестандартные ключи —
// парсер их не отбрасывает, просто редактор подсвечивает их как "прочее".

export const STANDARD_KEYWORDS = [
  'TEST',
  'TESTLAB',
  'TESTDATE',
  'ISSUEDATE',
  'NEARFIELD',
  'LAMPPOSITION',
  'MANUFAC',
  'LUMCAT',
  'LUMINAIRE',
  'LAMPCAT',
  'LAMP',
  'BALLAST',
  'BALLASTCAT',
  'MAINTCAT',
  'DISTRIBUTION',
  'FLASHAREA',
  'COLORCONSTANT',
  'CRI',
  'CCT',
  'BUGRATING',
  'BALLASTBIN',  // некоторые каталоги ЕСС
  'OTHER',
  'MORE',
  'SEARCH',
] as const;

export type StandardKeyword = (typeof STANDARD_KEYWORDS)[number];

export function isStandardKeyword(key: string): boolean {
  return (STANDARD_KEYWORDS as readonly string[]).includes(key.toUpperCase());
}
