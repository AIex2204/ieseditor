import { useEffect, useState } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { useAppStore } from '../../state/store';
import { FluxTool } from './FluxTool';
import { RotateTool } from './RotateTool';
import { AlignTool } from './AlignTool';
import { SymmetrizeTool } from './SymmetrizeTool';
import { SmoothTool } from './SmoothTool';
import { CleanTool } from './CleanTool';

type ToolId = 'none' | 'flux' | 'rotate' | 'align' | 'symmetrize' | 'smooth' | 'clean';

const TOOLS: { id: ToolId; label: string }[] = [
  { id: 'flux', label: 'Поток' },
  { id: 'rotate', label: 'Поворот' },
  { id: 'align', label: 'Выравнивание' },
  { id: 'symmetrize', label: 'Симметризация' },
  { id: 'smooth', label: 'Сглаживание' },
  { id: 'clean', label: 'Чистка' },
];

export interface ToolsPanelProps {
  docId: string;
  sourceDoc: PhotometryDoc;
  /** Есть ли несохранённые правки (рабочий документ отличается от исходного) — включает кнопку "Отменить изменения". */
  hasPendingChanges: boolean;
  /**
   * Готова ли геометрия к обработке (Type C). Для Type A/B инструменты
   * блокируются: и геометрические операции, и расчёт потока опираются на
   * сферическую модель Type C и дали бы молча неверный результат.
   */
  geometryReady: boolean;
}

export function ToolsPanel({ docId, sourceDoc, hasPendingChanges, geometryReady }: ToolsPanelProps) {
  const [active, setActive] = useState<ToolId>('none');
  const discardChanges = useAppStore((s) => s.discardChanges);

  // сбрасываем открытый инструмент при переключении на другой файл (правки
  // внутри одного файла копятся и не должны закрывать панель) и когда
  // обработка стала недоступна — например, тип фотометрии сменили на B
  useEffect(() => {
    setActive('none');
  }, [docId, geometryReady]);

  function handleDiscard() {
    discardChanges();
    setActive('none');
  }

  return (
    <div className="panel tools-panel">
      <div className="tools-panel-header">
        <div className="panel-title">Инструменты</div>
        <button className="btn tools-discard" disabled={!hasPendingChanges} onClick={handleDiscard} title="Вернуть файл к исходному состоянию, отменив все правки">
          Отменить изменения
        </button>
      </div>
      <div className="tools-grid">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`btn ${active === t.id ? 'active' : ''}`}
            disabled={!geometryReady}
            title={geometryReady ? undefined : 'Недоступно для файлов Type A/B — обработка рассчитана на Type C'}
            onClick={() => setActive(active === t.id ? 'none' : t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {!geometryReady && (
        <p className="tool-hint tool-hint-blocked">
          Инструменты отключены: файл записан как Type {sourceDoc.photometricType === 2 ? 'B' : 'A'}, а обработка
          опирается на модель Type C. Чтобы обработать такой файл, его нужно пересчитать в Type C.
        </p>
      )}

      {active === 'flux' && <FluxTool sourceDoc={sourceDoc} />}
      {active === 'rotate' && <RotateTool sourceDoc={sourceDoc} />}
      {active === 'align' && <AlignTool sourceDoc={sourceDoc} />}
      {active === 'symmetrize' && <SymmetrizeTool sourceDoc={sourceDoc} />}
      {active === 'smooth' && <SmoothTool sourceDoc={sourceDoc} />}
      {active === 'clean' && <CleanTool sourceDoc={sourceDoc} />}
    </div>
  );
}
