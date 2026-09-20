import { useRef, useState } from 'react';
import { activeDoc, MAX_DOCUMENTS, useActiveDocEntry, useAppStore } from '../../state/store';
import { ACCEPTED_EXTENSIONS, isAcceptedFileName, loadPhotometryFile } from '../../core/loadPhotometryFile';
import { AuditPanel } from '../panels/AuditPanel';
import { useT } from '../../i18n/i18n';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 МБ — с запасом даже для файлов с сотнями тысяч значений

/**
 * Длинные имена обрезаются не с конца, а в середине: в хвосте лежит
 * расширение и суффикс версии (" (edited v2).ies") — то единственное, чем
 * версии одного файла отличаются в списке. Полное имя остаётся в tooltip.
 */
const NAME_TAIL_CHARS = 16;

function splitFileName(name: string): { head: string; tail: string } {
  if (name.length <= NAME_TAIL_CHARS + 8) return { head: name, tail: '' };
  return { head: name.slice(0, name.length - NAME_TAIL_CHARS), tail: name.slice(-NAME_TAIL_CHARS) };
}

export function Sidebar() {
  const documents = useAppStore((s) => s.documents);
  const activeId = useAppStore((s) => s.activeId);
  const addDocument = useAppStore((s) => s.addDocument);
  const removeDocument = useAppStore((s) => s.removeDocument);
  const setActive = useAppStore((s) => s.setActive);
  const entry = useActiveDocEntry();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    for (const file of Array.from(files)) {
      if (useAppStore.getState().documents.length >= MAX_DOCUMENTS) {
        setError(t('Достигнут лимит в N файлов — удалите один из списка, чтобы загрузить новый.').replace('N', String(MAX_DOCUMENTS)));
        break;
      }
      if (!isAcceptedFileName(file.name)) {
        setError(`${file.name}: ${t('это не .ies и не .ldt файл')}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name}: ${t('файл слишком большой')} (${(file.size / 1024 / 1024).toFixed(1)} ${t('МБ')})`);
        continue;
      }
      try {
        const { name, doc } = await loadPhotometryFile(file);
        const id = addDocument(name, doc);
        if (id === null) {
          setError(`Достигнут лимит в ${MAX_DOCUMENTS} файлов — удалите один из списка, чтобы загрузить новый.`);
          break;
        }
      } catch (e) {
        setError(`${file.name}: ${(e as Error).message}`);
      }
    }
  }

  return (
    <div className="sidebar">
      <div className="panel file-panel">
        <div className="panel-title">
          {t('Файлы')} ({documents.length}/{MAX_DOCUMENTS})
        </div>
        <div
          className={`dropzone ${isDragOver ? 'dropzone-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
        >
          {t('Перетащите .ies/.ldt или нажмите, чтобы выбрать')}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) void handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {error && <div className="sidebar-error">{error}</div>}

        <ul className="file-list">
          {documents.map((d) => {
            const { head, tail } = splitFileName(d.name);
            return (
            <li key={d.id} className={`file-item ${d.id === activeId ? 'file-item-active' : ''}`} onClick={() => setActive(d.id)}>
              <span className="file-name" title={d.name}>
                <span className="file-name-head">{head}</span>
                {tail && <span className="file-name-tail">{tail}</span>}
              </span>
              <button
                className="file-remove"
                title={t('Убрать из списка')}
                onClick={(e) => {
                  e.stopPropagation();
                  removeDocument(d.id);
                }}
              >
                ×
              </button>
            </li>
            );
          })}
          {documents.length === 0 && <li className="file-list-empty">{t('Файлы не загружены')}</li>}
        </ul>
      </div>

      {/* Проверка живёт здесь, а не в правой колонке: там она уезжала под
          показатели и оставалась незамеченной, а внизу списка файлов место
          свободно и светофор виден всегда. */}
      {entry && <AuditPanel doc={activeDoc(entry)} fileName={entry.name} />}
    </div>
  );
}
