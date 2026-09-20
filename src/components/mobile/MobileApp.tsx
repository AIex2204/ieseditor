import { useRef, useState } from 'react';
import { useActiveDocEntry, useAppStore } from '../../state/store';
import { ACCEPTED_EXTENSIONS, isAcceptedFileName, loadPhotometryFile } from '../../core/loadPhotometryFile';
import { saveIesFile } from '../../core/ies/exportFile';
import type { PhotometryDoc } from '../../core/ies/types';
import { alignByCentroid } from '../../core/photometry/align';
import { compressAfterSymmetrize, symmetrizeDoc } from '../../core/photometry/symmetrize';
import { smoothDoc } from '../../core/photometry/smooth';
import { cleanDoc, detectCutoff } from '../../core/photometry/clean';
import { rotateDoc } from '../../core/photometry/rotate';
import { currentFlux, scaleFluxTo } from '../../core/photometry/scaleFlux';
import { MobilePolarChart } from './MobilePolarChart';
import { useLoadDemo } from '../../hooks/useLoadDemo';
import { useT } from '../../i18n/i18n';
import { LangSwitch } from '../common/LangSwitch';

const MAX_FILE_SIZE = 30 * 1024 * 1024;

// Инструменты с дефолтными параметрами — те же ядровые функции, что на
// десктопе, но без настроек: применяются к текущему рабочему документу.
// Поток при любой операции сохраняется (normalizeFlux у ядра).
function applyAlign(doc: PhotometryDoc): PhotometryDoc {
  return alignByCentroid(doc, { alignC0C180: true, alignC90C270: true }, 0.5, { normalizeFlux: true }).doc;
}
function applySymmetrize(doc: PhotometryDoc): PhotometryDoc {
  const r = symmetrizeDoc(doc, 'average', { axial: false, c0c180: true, c90c270: true });
  return compressAfterSymmetrize(r, { c0c180: true, c90c270: true });
}
function applySmooth(doc: PhotometryDoc): PhotometryDoc {
  return smoothDoc(doc, { window: 11, degree: 2, smoothAzimuth: false, protectPeak: true });
}
function applyClean(doc: PhotometryDoc): PhotometryDoc {
  const d = detectCutoff(doc);
  return cleanDoc(doc, {
    cutoffGamma: d.cutoffGamma,
    dropRatio: d.dropRatio,
    magnitudeCapFraction: d.magnitudeCapFraction,
    smoothFalloff: false,
    falloffWidthDeg: 3,
    normalizeFlux: true,
  });
}

type ToolId = 'flux' | 'rotate' | 'align' | 'symmetrize' | 'smooth' | 'clean';

const ONE_TAP: { id: ToolId; label: string; note: string; run: (d: PhotometryDoc) => PhotometryDoc }[] = [
  { id: 'align', label: 'Выравнивание', note: 'Совместит максимум КСС с осью — по центру тяжести потока.', run: applyAlign },
  { id: 'symmetrize', label: 'Симметризация', note: 'Усреднит КСС по плоскостям C0–C180 и C90–C270.', run: applySymmetrize },
  { id: 'smooth', label: 'Сглаживание', note: 'Уберёт шум гониометра вдоль γ (окно 11 точек).', run: applySmooth },
  { id: 'clean', label: 'Чистка', note: 'Обнулит мусорные хвосты в широких углах (автоопределение).', run: applyClean },
];

export function MobileApp() {
  const entry = useActiveDocEntry();
  const documents = useAppStore((s) => s.documents);
  const addDocument = useAppStore((s) => s.addDocument);
  const removeDocument = useAppStore((s) => s.removeDocument);
  const updateWorking = useAppStore((s) => s.updateWorking);
  const discardChanges = useAppStore((s) => s.discardChanges);
  const loadDemo = useLoadDemo();
  const t = useT();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openTool, setOpenTool] = useState<ToolId | null>(null);
  const [done, setDone] = useState<ToolId | null>(null);

  const doc = entry?.workingDoc ?? null;
  const changed = entry !== null && entry.workingDoc !== entry.originalDoc;

  async function loadOne(file: File) {
    setError(null);
    if (!isAcceptedFileName(file.name)) {
      setError(t('Это не .ies и не .ldt файл'));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(t('Файл слишком большой'));
      return;
    }
    try {
      const { name, doc: loaded } = await loadPhotometryFile(file);
      // мобильная версия работает с одним файлом — прежние убираем
      for (const d of documents) removeDocument(d.id);
      addDocument(name, loaded);
      setOpenTool(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function runOneTap(id: ToolId, run: (d: PhotometryDoc) => PhotometryDoc) {
    if (!doc) return;
    updateWorking(run(doc));
    setDone(id);
    setTimeout(() => setDone((cur) => (cur === id ? null : cur)), 1400);
  }

  return (
    <div className="m-app">
      <header className="m-header">
        <span className="m-title">{t('Редактор IES файлов')}</span>
        <div className="m-header-right">
          <LangSwitch />
        {entry && (
          <button className="btn btn-accent m-dl" onClick={() => saveIesFile(entry.workingDoc, entry.name)}>
            {t('Выгрузить IES')}
          </button>
        )}
        </div>
      </header>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void loadOne(f);
          e.target.value = '';
        }}
      />

      {!entry ? (
        <div className="m-empty">
          <button className="btn btn-accent m-load" onClick={() => inputRef.current?.click()}>
            {t('Загрузить .ies / .ldt')}
          </button>
          <p className="m-empty-note">{t('Файл обрабатывается прямо на телефоне и никуда не отправляется.')}</p>
          <button className="m-demo-link" onClick={() => void loadDemo()}>
            {t('Открыть демо-файл')}
          </button>
          {error && <p className="m-error">{error}</p>}
        </div>
      ) : (
        <>
          <div className="m-filename" title={entry.name}>
            {entry.name}
            <button className="m-replace" onClick={() => inputRef.current?.click()}>
              {t('заменить')}
            </button>
          </div>

          {doc && <MobilePolarChart doc={doc} />}

          <div className="m-tools">
            {ONE_TAP.map((tItem) => (
              <button
                key={tItem.id}
                className={`m-tool ${openTool === tItem.id ? 'active' : ''}`}
                onClick={() => setOpenTool((cur) => (cur === tItem.id ? null : tItem.id))}
              >
                {t(tItem.label)}
              </button>
            ))}
            <button
              className={`m-tool ${openTool === 'flux' ? 'active' : ''}`}
              onClick={() => setOpenTool((cur) => (cur === 'flux' ? null : 'flux'))}
            >
              {t('Поток')}
            </button>
            <button
              className={`m-tool ${openTool === 'rotate' ? 'active' : ''}`}
              onClick={() => setOpenTool((cur) => (cur === 'rotate' ? null : 'rotate'))}
            >
              {t('Поворот')}
            </button>
          </div>

          {openTool && ONE_TAP.some((t) => t.id === openTool) && (
            <ToolPanelOneTap tool={ONE_TAP.find((t) => t.id === openTool)!} done={done === openTool} onRun={runOneTap} />
          )}
          {openTool === 'flux' && doc && <FluxPanel doc={doc} onApply={updateWorking} />}
          {openTool === 'rotate' && doc && <RotatePanel doc={doc} onApply={updateWorking} />}

          {changed && (
            <button className="btn m-reset" onClick={() => discardChanges()}>
              {t('Отменить изменения')}
            </button>
          )}
          {error && <p className="m-error">{error}</p>}
        </>
      )}

      <footer className="m-footer">
        <a href="/politika-obrabotki-dannyh.html">{t('Политика данных')}</a> · <a href="/polzovatelskoe-soglashenie.html">{t('Соглашение')}</a>
      </footer>
    </div>
  );
}

function ToolPanelOneTap({
  tool,
  done,
  onRun,
}: {
  tool: { id: ToolId; label: string; note: string; run: (d: PhotometryDoc) => PhotometryDoc };
  done: boolean;
  onRun: (id: ToolId, run: (d: PhotometryDoc) => PhotometryDoc) => void;
}) {
  const t = useT();
  return (
    <div className="m-panel">
      <p className="m-panel-note">{t(tool.note)}</p>
      <button className="btn btn-accent m-apply" onClick={() => onRun(tool.id, tool.run)}>
        {done ? t('Применено ✓') : t('Применить')}
      </button>
    </div>
  );
}

function FluxPanel({ doc, onApply }: { doc: PhotometryDoc; onApply: (d: PhotometryDoc) => void }) {
  const t = useT();
  const [value, setValue] = useState(() => Math.round(currentFlux(doc, 'computed')));
  const [done, setDone] = useState(false);
  return (
    <div className="m-panel">
      <label className="m-field">
        <span>{t('Световой поток, лм')}</span>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            setValue(Number(e.target.value));
            setDone(false);
          }}
        />
      </label>
      <button
        className="btn btn-accent m-apply"
        disabled={!(value > 0)}
        onClick={() => {
          onApply(scaleFluxTo(doc, value, 'computed'));
          setDone(true);
        }}
      >
        {done ? t('Применено ✓') : t('Применить')}
      </button>
    </div>
  );
}

function RotatePanel({ doc, onApply }: { doc: PhotometryDoc; onApply: (d: PhotometryDoc) => void }) {
  const t = useT();
  const [spin, setSpin] = useState(0);
  const [tilt1, setTilt1] = useState(0);
  const [tilt2, setTilt2] = useState(0);
  const [done, setDone] = useState(false);
  const identity = spin === 0 && tilt1 === 0 && tilt2 === 0;
  const field = (label: string, v: number, set: (n: number) => void) => (
    <label className="m-field">
      <span>{t(label)}</span>
      <input
        type="number"
        inputMode="decimal"
        value={v}
        onChange={(e) => {
          set(Number(e.target.value));
          setDone(false);
        }}
      />
    </label>
  );
  return (
    <div className="m-panel">
      {field('Спин по азимуту C, °', spin, setSpin)}
      {field('Наклон C0–C180, °', tilt1, setTilt1)}
      {field('Наклон C90–C270, °', tilt2, setTilt2)}
      <button
        className="btn btn-accent m-apply"
        disabled={identity}
        onClick={() => {
          onApply(rotateDoc(doc, { spinDeg: spin, tiltC0C180Deg: tilt1, tiltC90C270Deg: tilt2 }, { normalizeFlux: true }));
          setDone(true);
        }}
      >
        {done ? t('Применено ✓') : t('Применить')}
      </button>
    </div>
  );
}
