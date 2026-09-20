// Приведение фотометрии к внутреннему представлению Type C (γ, C).
//
// ВАЖНО: среди образцов в Input/ нет ни одного файла Type A или Type B —
// все шесть являются Type C. Формулы пересчёта A/B → C требуют вращения
// системы координат вокруг разных осей и различаются в разных источниках
// нюансами знака/ориентации; без эталонного файла для сверки риск тихой
// геометрической ошибки выше, чем польза от "оптимистичной" реализации.
//
// Поэтому сейчас: Type C проходит как есть, а для Type A/B возвращается
// исходный документ без геометрического пересчёта плюс предупреждение —
// инструменты, зависящие от единой сферической модели (поворот,
// выравнивание, симметризация, автоочистка), должны эту ситуацию
// проверять через isGeometryReady() и блокироваться в UI с пояснением.
// Загрузка, просмотр, редактирование полей и сохранение работают всегда.
import type { PhotometryDoc, WarningItem } from './types';

export function isGeometryReady(doc: PhotometryDoc): boolean {
  return doc.photometricType === 1;
}

export interface TypeCResult {
  doc: PhotometryDoc;
  converted: boolean;
}

export function toTypeC(doc: PhotometryDoc): TypeCResult {
  if (doc.photometricType === 1) {
    return { doc, converted: false };
  }

  const warning: WarningItem = {
    code: 'type-ab-not-converted',
    message:
      'Фотометрия Type A/B: геометрические операции (поворот, выравнивание, ' +
      'симметризация, автоочистка) недоступны — конвертация в Type C для ' +
      'этого типа пока не реализована и не проверена на эталонных файлах.',
    severity: 'warning',
  };
  const alreadyWarned = doc.warnings.some((w) => w.code === warning.code);
  const nextDoc: PhotometryDoc = alreadyWarned ? doc : { ...doc, warnings: [...doc.warnings, warning] };
  return { doc: nextDoc, converted: false };
}
