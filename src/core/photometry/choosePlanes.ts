// Выбор набора C-плоскостей для отображения (п. 3.2 ТЗ): осевая
// симметрия → 1 график; иначе — фиксированные C0–C180 и C90–C270. Азимут
// истинного максимума КСС не подменяет вторую плоскость, а накладывается
// на неё отдельной отметкой (см. PolarChart.maxDirection).
import { detectSymmetry } from './symmetry';
import type { PhotometryDoc } from '../ies/types';

export interface PlaneSpec {
  cPlane: number;
  label: string;
}

export function choosePlanes(doc: PhotometryDoc): PlaneSpec[] {
  const kind = detectSymmetry(doc.horizAngles);

  if (kind === 'axial') {
    return [{ cPlane: 0, label: 'КСС (осесимметричная)' }];
  }

  return [
    { cPlane: 0, label: 'C0 – C180' },
    { cPlane: 90, label: 'C90 – C270' },
  ];
}
