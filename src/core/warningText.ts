// Текст предупреждения на нужном языке. Переводим в момент ПОКАЗА, а не при
// разборе: предупреждения хранятся внутри документа и переживают перезагрузку
// (IndexedDB). Документ, разобранный старой версией парсера, не имеет поля
// messageEn — тогда переводим по коду, извлекая числа из русского сообщения.
import type { WarningItem } from './ies/types';

export type Lang = 'ru' | 'en';

function byCode(w: WarningItem): string | null {
  const m = w.message;
  const nums = m.match(/\d+(?:[.,]\d+)?/g) ?? [];
  const pcts = m.match(/\d+(?:[.,]\d+)?%/g) ?? [];
  switch (w.code) {
    case 'units-converted':
      return 'Dimensions in the file were in feet — converted to meters on load.';
    case 'no-tilt-line':
      return 'No TILT= line found';
    case 'negative-candela':
      return 'The intensity table contains negative values';
    case 'unexpected-line':
      return `Unrecognized line before TILT=: "${m.match(/"([^"]*)"/)?.[1] ?? ''}"`;
    case 'tilt-parse-error':
      return m.replace('Ошибка разбора TILT=INCLUDE:', 'Error parsing TILT=INCLUDE:');
    case 'trailing-data':
      return `${nums[0] ?? ''} extra numbers left after the intensity table`;
    case 'non-monotonic-angles': {
      const mm = m.match(/индекс (\d+): (.+?) → (.+?)\)/);
      const label = /вертикальн/.test(m) ? 'vertical angles (γ)' : 'horizontal angles (C)';
      return mm
        ? `The ${label} array is not non-decreasing (index ${mm[1]}: ${mm[2]} → ${mm[3]})`
        : `The ${label} array is not non-decreasing`;
    }
    case 'ldt-no-lampset':
      return 'The file has no lamp-set data (number of sets = 0) — defaults used (1 lamp, flux unset).';
    case 'ldt-multi-lampset':
      return `The file has ${nums[0] ?? ''} lamp sets — only the first is used`;
    case 'ldt-truncated':
      return 'The file is shorter than the EULUMDAT header requires (Mc/Ng) — missing values filled with zeros. Check the result.';
    case 'ldt-isym3-shift':
      return "LDT symmetry about the C90–C270 plane: azimuth reindexed by −90° to match the internal representation. C0 in the editor corresponds to the original file's C90.";
    case 'ldt-import':
      return (
        `Imported from EULUMDAT (.ldt) and converted to the LM-63 model. ` +
        `Downward Flux Fraction ${pcts[0] ?? ''} and Light Output Ratio ${pcts[1] ?? ''} from the source file are ` +
        `not carried into LM-63 fields — verify separately if needed. Output is always saved as IES.`
      );
    default:
      return null; // numeric-parse-error и прочее без стабильного текста
  }
}

export function warningText(w: WarningItem, lang: Lang): string {
  if (lang !== 'en') return w.message;
  return byCode(w) ?? w.messageEn ?? w.message;
}
