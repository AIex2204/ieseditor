import { useMemo, useState } from 'react';
import { activeDoc, useAppStore } from '../../state/store';
import type { DocEntry } from '../../state/store';
import { choosePlanes } from '../../core/photometry/choosePlanes';
import { findImax } from '../../core/photometry/metrics';
import { PolarChart, type ScaleBasis } from '../charts/PolarChart';
import { CartesianChart } from '../charts/CartesianChart';
import { MetricsPanel } from '../panels/MetricsPanel';
import { ChangesPanel } from '../panels/ChangesPanel';
import { ToolsPanel } from '../tools/ToolsPanel';
import { FieldEditor } from '../editor/FieldEditor';
import { isGeometryReady } from '../../core/ies/typeConvert';
import { useT, useLang } from '../../i18n/i18n';

type ViewTab = 'polar' | 'cartesian' | 'editor';

export function Workspace({ entry }: { entry: DocEntry }) {
  const [tab, setTab] = useState<ViewTab>('polar');
  const [scaleBasis, setScaleBasis] = useState<ScaleBasis>('shared');
  const previewBaseline = useAppStore((s) => s.previewBaseline);
  const t = useT();
  const lang = useLang();

  const doc = activeDoc(entry); // всегда рабочий документ — инструменты пишут в него живьём
  const compareDoc = previewBaseline ?? undefined; // "было" на момент открытия текущего инструмента
  const planes = useMemo(() => choosePlanes(doc), [doc]);
  const radialMax = useMemo(() => Math.max(findImax(doc).value, compareDoc ? findImax(compareDoc).value : 0), [doc, compareDoc]);
  const maxDirection = useMemo(() => {
    const m = findImax(doc);
    return { gamma: m.gamma, c: m.c };
  }, [doc]);

  const geometryReady = isGeometryReady(doc);

  return (
    <div className="workspace">
      <div className="workspace-main">
        {!geometryReady && (
          <div className="type-banner">
            {lang === 'en' ? (
              <>
                <b>{doc.photometricType === 2 ? 'Type B' : 'Type A'} photometry.</b> All of the editor's math is built on
                Type C, so the charts and metrics below are unreliable for this file and the processing tools are
                disabled. Viewing the table, editing fields and saving still work as usual.
              </>
            ) : (
              <>
                <b>Фотометрия {doc.photometricType === 2 ? 'Type B' : 'Type A'}.</b> Вся расчётная математика редактора
                построена на Type C, поэтому графики и показатели ниже для этого файла недостоверны, а инструменты
                обработки отключены. Просмотр таблицы, правка полей и сохранение работают как обычно.
              </>
            )}
          </div>
        )}

        <div className="workspace-toolbar">
          <div className="tabs">
            {(
              [
                ['polar', 'Полярные'],
                ['cartesian', 'Декарт'],
                ['editor', 'Редактор полей'],
              ] as [ViewTab, string][]
            ).map(([id, label]) => (
              <button key={id} className={`btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
                {t(label)}
              </button>
            ))}
          </div>
          <div className="toolbar-spacer" />
          {tab !== 'editor' && (
            <button
              className={`btn ${scaleBasis === 'ownPlaneMax' ? 'active' : ''}`}
              onClick={() => setScaleBasis(scaleBasis === 'shared' ? 'ownPlaneMax' : 'shared')}
              title={
                scaleBasis === 'shared'
                  ? t('Обе плоскости в общей шкале (Imax всей КСС) — можно сравнивать величину между плоскостями')
                  : t('Каждая плоскость нормирована к своему собственному максимуму — форма луча всегда доходит до края')
              }
            >
              {t('Шкала')}: {scaleBasis === 'shared' ? t('абсолютная') : t('относительная')}
            </button>
          )}
        </div>

        {tab === 'polar' && (
          <div className="chart-grid">
            {planes.map((p, i) => (
              <PolarChart
                key={p.cPlane}
                doc={doc}
                compareDoc={compareDoc}
                cPlane={p.cPlane}
                label={p.label}
                radialMax={radialMax}
                scaleBasis={scaleBasis}
                maxDirection={i === 1 ? maxDirection : undefined}
              />
            ))}
          </div>
        )}

        {tab === 'cartesian' && (
          <div className="chart-grid">
            {planes.map((p, i) => (
              <CartesianChart
                key={p.cPlane}
                doc={doc}
                compareDoc={compareDoc}
                cPlane={p.cPlane}
                label={p.label}
                radialMax={radialMax}
                scaleBasis={scaleBasis}
                maxDirection={i === 1 ? maxDirection : undefined}
              />
            ))}
          </div>
        )}

        {tab === 'editor' && <FieldEditor entryId={entry.id} doc={doc} />}
      </div>

      <div className="workspace-side">
        <ToolsPanel
          docId={entry.id}
          sourceDoc={doc}
          hasPendingChanges={doc !== entry.originalDoc}
          geometryReady={geometryReady}
        />
        <ChangesPanel originalDoc={entry.originalDoc} workingDoc={doc} />
        <MetricsPanel doc={doc} />
      </div>
    </div>
  );
}
