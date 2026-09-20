import { useEffect, useState } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { useAppStore } from '../../state/store';
import { fixDoc } from '../../core/photometry/quickFix';
import { FluxTool } from './FluxTool';
import { RotateTool } from './RotateTool';
import { AlignTool } from './AlignTool';
import { SymmetrizeTool } from './SymmetrizeTool';
import { SmoothTool } from './SmoothTool';
import { CleanTool } from './CleanTool';
import { useT, useLang } from '../../i18n/i18n';

type ToolId = 'none' | 'flux' | 'rotate' | 'align' | 'symmetrize' | 'smooth' | 'clean';

// Отдельные шаги — для детальной работы. Порядок как в конвейере «Исправить»:
// выравнивание → симметризация → сглаживание → чистка, затем поток. «Поворот»
// вынесен в самый низ отдельно — при упрощённом сценарии он почти не нужен.
const TOOLS: { id: ToolId; label: string }[] = [
  { id: 'align', label: 'Выравнивание' },
  { id: 'symmetrize', label: 'Симметризация' },
  { id: 'smooth', label: 'Сглаживание' },
  { id: 'clean', label: 'Чистка' },
  { id: 'flux', label: 'Поток' },
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
  const [fixed, setFixed] = useState(false);
  const discardChanges = useAppStore((s) => s.discardChanges);
  const updateWorking = useAppStore((s) => s.updateWorking);
  const t = useT();
  const lang = useLang();

  // сбрасываем открытый инструмент при переключении на другой файл (правки
  // внутри одного файла копятся и не должны закрывать панель) и когда
  // обработка стала недоступна — например, тип фотометрии сменили на B
  useEffect(() => {
    setActive('none');
    setFixed(false);
  }, [docId, geometryReady]);

  function handleDiscard() {
    discardChanges();
    setActive('none');
    setFixed(false);
  }

  function handleFix() {
    updateWorking(fixDoc(sourceDoc));
    setActive('none');
    setFixed(true);
    setTimeout(() => setFixed(false), 1600);
  }

  const typeBlockedHint =
    lang === 'en'
      ? `Tools are disabled: the file is stored as Type ${sourceDoc.photometricType === 2 ? 'B' : 'A'}, while processing relies on the Type C model. To process such a file it must first be converted to Type C.`
      : `Инструменты отключены: файл записан как Type ${sourceDoc.photometricType === 2 ? 'B' : 'A'}, а обработка опирается на модель Type C. Чтобы обработать такой файл, его нужно пересчитать в Type C.`;

  return (
    <div className="panel tools-panel">
      <div className="tools-panel-header">
        <div className="panel-title">{t('Инструменты')}</div>
        <button className="btn tools-discard" disabled={!hasPendingChanges} onClick={handleDiscard} title={t('Вернуть файл к исходному состоянию, отменив все правки')}>
          {t('Отменить изменения')}
        </button>
      </div>

      <button
        className="btn btn-accent tools-fix"
        disabled={!geometryReady}
        title={geometryReady ? t('Выравнивание, симметризация, сглаживание и чистка одним нажатием') : typeBlockedHint}
        onClick={handleFix}
      >
        {fixed ? t('Исправлено ✓') : t('Исправить IES')}
      </button>
      <p className="tools-fix-note">
        {t('Приводит файл в порядок автоматически. Ниже — те же шаги по отдельности, если нужна точная настройка.')}
      </p>

      <div className="tools-grid">
        {TOOLS.map((tItem) => (
          <button
            key={tItem.id}
            className={`btn ${active === tItem.id ? 'active' : ''}`}
            disabled={!geometryReady}
            title={geometryReady ? undefined : t('Недоступно для файлов Type A/B — обработка рассчитана на Type C')}
            onClick={() => setActive(active === tItem.id ? 'none' : tItem.id)}
          >
            {t(tItem.label)}
          </button>
        ))}
      </div>

      {!geometryReady && <p className="tool-hint tool-hint-blocked">{typeBlockedHint}</p>}

      {active === 'flux' && <FluxTool sourceDoc={sourceDoc} />}
      {active === 'align' && <AlignTool sourceDoc={sourceDoc} />}
      {active === 'symmetrize' && <SymmetrizeTool sourceDoc={sourceDoc} />}
      {active === 'smooth' && <SmoothTool sourceDoc={sourceDoc} />}
      {active === 'clean' && <CleanTool sourceDoc={sourceDoc} />}

      <div className="tools-rotate">
        <button
          className={`btn ${active === 'rotate' ? 'active' : ''}`}
          disabled={!geometryReady}
          title={geometryReady ? undefined : t('Недоступно для файлов Type A/B — обработка рассчитана на Type C')}
          onClick={() => setActive(active === 'rotate' ? 'none' : 'rotate')}
        >
          {t('Поворот')}
        </button>
        {active === 'rotate' && <RotateTool sourceDoc={sourceDoc} />}
      </div>
    </div>
  );
}
