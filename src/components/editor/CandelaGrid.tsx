import { useCallback, useMemo, useRef, useState } from 'react';
import { VariableSizeGrid, type GridChildComponentProps } from 'react-window';
import type { PhotometryDoc } from '../../core/ies/types';
import { DecimalInput } from '../common/DecimalInput';

const CELL_W = 76;
const CELL_H = 26;
const HEADER_W = 64;
const HEADER_H = 26;

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : '';
}

interface CellData {
  doc: PhotometryDoc;
  touched: Set<number>;
  setValue: (iH: number, iG: number, n: number) => void;
}

/**
 * Рендерер ячейки объявлен на уровне модуля, а данные приходят через
 * itemData: если пересоздавать его на каждое изменение документа (как было
 * раньше через useMemo), react-window видит новый тип компонента и
 * перемонтирует все поля ввода — ввод терял фокус после первого символа, и
 * набрать в ячейке многозначное число было невозможно.
 */
function Cell({ columnIndex, rowIndex, style, data }: GridChildComponentProps<CellData>) {
  const { doc, touched, setValue } = data;
  // columnIndex 0 = заголовок строки (γ), rowIndex 0 = заголовок столбца (C)
  if (rowIndex === 0 && columnIndex === 0) {
    return (
      <div style={style} className="grid-cell grid-corner">
        γ \ C
      </div>
    );
  }
  if (rowIndex === 0) {
    return (
      <div style={style} className="grid-cell grid-header">
        {fmt(doc.horizAngles[columnIndex - 1])}
      </div>
    );
  }
  if (columnIndex === 0) {
    return (
      <div style={style} className="grid-cell grid-header">
        {fmt(doc.vertAngles[rowIndex - 1])}
      </div>
    );
  }

  const iH = columnIndex - 1;
  const iG = rowIndex - 1;
  const idx = iH * doc.numVertAngles + iG;
  return (
    <div style={style} className={`grid-cell ${touched.has(idx) ? 'grid-cell-dirty' : ''}`}>
      <DecimalInput value={doc.candela[idx]} onChange={(n) => setValue(iH, iG, n)} />
    </div>
  );
}

export function CandelaGrid({ draft, onChange }: { draft: PhotometryDoc; onChange: (next: PhotometryDoc) => void }) {
  const nv = draft.numVertAngles;
  const nh = draft.numHorizAngles;
  /** Только для подсветки — какие ячейки правились в этом сеансе. */
  const [touched, setTouched] = useState<Set<number>>(new Set());

  // setValue должен видеть свежий документ, но не менять свою идентичность
  // на каждое нажатие — иначе react-window снова начнёт перерисовывать всё.
  const docRef = useRef(draft);
  docRef.current = draft;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setValue = useCallback((iH: number, iG: number, n: number) => {
    const doc = docRef.current;
    const idx = iH * doc.numVertAngles + iG;
    const value = Math.max(0, n);
    if (value === doc.candela[idx]) return;

    const candela = Float64Array.from(doc.candela);
    candela[idx] = value;
    onChangeRef.current({ ...doc, candela });
    setTouched((prev) => (prev.has(idx) ? prev : new Set(prev).add(idx)));
  }, []);

  const cellData = useMemo<CellData>(() => ({ doc: draft, touched, setValue }), [draft, touched, setValue]);

  return (
    <div className="editor-section">
      <h4>Таблица силы света (кд)</h4>
      <p className="tool-hint">
        {nh} плоскостей × {nv} углов = {(nh * nv).toLocaleString('ru-RU')} значений. Правка ячейки сразу попадает в
        файл; отменить всё можно кнопкой «Отменить изменения».
      </p>
      <VariableSizeGrid
        columnCount={nh + 1}
        rowCount={nv + 1}
        columnWidth={(i) => (i === 0 ? HEADER_W : CELL_W)}
        rowHeight={(i) => (i === 0 ? HEADER_H : CELL_H)}
        width={720}
        height={420}
        className="candela-grid"
        itemData={cellData}
      >
        {Cell}
      </VariableSizeGrid>
    </div>
  );
}
