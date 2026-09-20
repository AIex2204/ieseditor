import { useState } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { useAppStore } from '../../state/store';
import { HeaderEditor } from './HeaderEditor';
import { TiltEditor } from './TiltEditor';
import { NumericFieldsEditor } from './NumericFieldsEditor';
import { AnglesEditor } from './AnglesEditor';
import { CandelaGrid } from './CandelaGrid';
import { ShapeEditor } from './ShapeEditor';

type Section = 'header' | 'tilt' | 'numeric' | 'shape' | 'angles' | 'grid';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'header', label: 'Формат и ключевые слова' },
  { id: 'numeric', label: 'Числовые поля' },
  { id: 'shape', label: 'Форма светильника' },
  { id: 'tilt', label: 'TILT' },
  { id: 'angles', label: 'Угловые сетки' },
  { id: 'grid', label: 'Таблица кд' },
];

export function FieldEditor({ entryId, doc }: { entryId: string; doc: PhotometryDoc }) {
  const updateWorking = useAppStore((s) => s.updateWorking);
  const [section, setSection] = useState<Section>('header');

  // Правки идут прямо в рабочий документ — как и в инструментах обработки.
  // Отдельного черновика с кнопкой «Применить» нет: зафиксировать состояние
  // новой версией можно кнопкой «Сохранить», откатить всё — «Отменить изменения».
  return (
    <div className="field-editor" key={entryId}>
      <div className="editor-tabs">
        {SECTIONS.map((s) => (
          <button key={s.id} className={`btn ${section === s.id ? 'active' : ''}`} onClick={() => setSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="editor-body">
        {section === 'header' && <HeaderEditor draft={doc} onChange={updateWorking} />}
        {section === 'numeric' && <NumericFieldsEditor draft={doc} onChange={updateWorking} />}
        {section === 'shape' && <ShapeEditor draft={doc} onChange={updateWorking} />}
        {section === 'tilt' && <TiltEditor draft={doc} onChange={updateWorking} />}
        {section === 'angles' && <AnglesEditor draft={doc} onChange={updateWorking} />}
        {section === 'grid' && <CandelaGrid draft={doc} onChange={updateWorking} />}
      </div>
    </div>
  );
}
