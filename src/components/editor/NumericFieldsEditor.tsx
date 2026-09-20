import type { PhotometryDoc } from '../../core/ies/types';
import { DecimalInput } from '../common/DecimalInput';

type NumKey =
  | 'numLamps'
  | 'lumensPerLamp'
  | 'candelaMultiplier'
  | 'width'
  | 'length'
  | 'height'
  | 'ballastFactor'
  | 'futureUse'
  | 'inputWatts';

// Габариты всегда в метрах: файлы в футах пересчитываются при загрузке
// (core/ies/normalizeUnits.ts), поэтому выбора единицы здесь нет.
const FIELDS: { key: NumKey; label: string }[] = [
  { key: 'numLamps', label: 'Число ламп' },
  { key: 'lumensPerLamp', label: 'Поток лампы, лм (−1 = абсолютная фотометрия)' },
  { key: 'candelaMultiplier', label: 'Множитель силы света' },
  { key: 'width', label: 'Ширина, м' },
  { key: 'length', label: 'Длина, м' },
  { key: 'height', label: 'Высота, м' },
  { key: 'ballastFactor', label: 'Ballast factor' },
  { key: 'futureUse', label: 'Future use / BLPF' },
  { key: 'inputWatts', label: 'Потребляемая мощность, Вт' },
];

export function NumericFieldsEditor({ draft, onChange }: { draft: PhotometryDoc; onChange: (next: PhotometryDoc) => void }) {
  function setNum(key: NumKey, n: number) {
    onChange({ ...draft, [key]: n });
  }

  return (
    <div className="editor-section">
      <h4>Числовые поля</h4>
      <div className="editor-grid">
        {FIELDS.map((f) => (
          <label className="editor-field" key={f.key}>
            <span>{f.label}</span>
            <DecimalInput value={draft[f.key]} onChange={(n) => setNum(f.key, n)} />
          </label>
        ))}

        <label className="editor-field">
          <span>Тип фотометрии</span>
          <select
            value={draft.photometricType}
            onChange={(e) => onChange({ ...draft, photometricType: Number(e.target.value) as 1 | 2 | 3 })}
          >
            <option value={1}>1 — Type C</option>
            <option value={2}>2 — Type B</option>
            <option value={3}>3 — Type A</option>
          </select>
          <span className="editor-note">
            Меняет только отметку в файле, не пересчитывая углы. Ставьте другой тип лишь если знаете, что в файле
            указан неверный — иначе таблица начнёт трактоваться неправильно.
          </span>
        </label>
      </div>
    </div>
  );
}
