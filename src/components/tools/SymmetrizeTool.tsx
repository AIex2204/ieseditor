import { useEffect, useMemo, useState } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { compressAfterSymmetrize, symmetrizeDoc } from '../../core/photometry/symmetrize';
import { useLiveEdit } from './useLiveEdit';

export function SymmetrizeTool({ sourceDoc }: { sourceDoc: PhotometryDoc }) {
  const { baseDoc, write } = useLiveEdit(sourceDoc);

  const [axial, setAxial] = useState(false);
  const [c0c180, setC0c180] = useState(true);
  const [c90c270, setC90c270] = useState(true);
  const [compress, setCompress] = useState(true);

  const hasSelection = axial || c0c180 || c90c270;

  const preview = useMemo(() => {
    if (!hasSelection) return null;
    try {
      let result = symmetrizeDoc(baseDoc, 'average', { axial, c0c180, c90c270 });
      if (compress && !axial) {
        result = compressAfterSymmetrize(result, { c0c180, c90c270 });
      }
      return result;
    } catch {
      return null;
    }
  }, [baseDoc, axial, c0c180, c90c270, compress, hasSelection]);

  useEffect(() => {
    if (preview) write(preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  return (
    <div className="tool-form">
      <label className="tool-checkbox">
        <input
          type="checkbox"
          checked={axial}
          onChange={(e) => {
            setAxial(e.target.checked);
            if (e.target.checked) {
              setC0c180(false);
              setC90c270(false);
            }
          }}
        />
        <span>Осевая (полная, схлопнуть в одну плоскость)</span>
      </label>
      <label className="tool-checkbox">
        <input type="checkbox" checked={c0c180} disabled={axial} onChange={(e) => setC0c180(e.target.checked)} />
        <span>По плоскости C0–C180</span>
      </label>
      <label className="tool-checkbox">
        <input type="checkbox" checked={c90c270} disabled={axial} onChange={(e) => setC90c270(e.target.checked)} />
        <span>По плоскости C90–C270</span>
      </label>

      {!axial && (
        <label className="tool-checkbox">
          <input type="checkbox" checked={compress} disabled={!c0c180} onChange={(e) => setCompress(e.target.checked)} />
          <span>Сжать таблицу C после симметризации</span>
        </label>
      )}

      {!hasSelection && <p className="tool-hint tool-hint-error">Выберите хотя бы одну ось</p>}
    </div>
  );
}
