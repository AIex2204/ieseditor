// В редакторе работаем только в метрах. Файлы в футах (unitsType = 1)
// пересчитываются один раз при загрузке, дальше единица в приложении одна и
// в интерфейсе не упоминается — меньше полей, меньше поводов ошибиться.
import type { PhotometryDoc } from './types';

const FEET_TO_M = 0.3048;

/** Округление до 0,1 мм: габариты светового отверстия точнее не измеряют. */
function toMetersValue(v: number): number {
  if (v === 0) return 0;
  // знак несёт форму светового отверстия (круг/эллипс) — сохраняем его
  return Math.sign(v) * (Math.round(Math.abs(v) * FEET_TO_M * 10000) / 10000);
}

export function toMeters(doc: PhotometryDoc): PhotometryDoc {
  if (doc.unitsType === 2) return doc;
  return {
    ...doc,
    unitsType: 2,
    width: toMetersValue(doc.width),
    length: toMetersValue(doc.length),
    height: toMetersValue(doc.height),
    warnings: [
      ...doc.warnings,
      {
        code: 'units-converted',
        message: 'Габариты в файле были заданы в футах — пересчитаны в метры при загрузке.',
        severity: 'info',
      },
    ],
  };
}
