import { useRef, useState } from 'react';
import { useMemo } from 'react';
import { activeDoc, useAppStore } from '../../state/store';
import { choosePlanes } from '../../core/photometry/choosePlanes';
import { findImax } from '../../core/photometry/metrics';
import { computeFlux } from '../../core/photometry/flux';
import { PolarChart } from '../charts/PolarChart';
import { ACCEPTED_EXTENSIONS, loadPhotometryFile } from '../../core/loadPhotometryFile';

function fmt(n: number, digits = 1): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function CompareView() {
  const documents = useAppStore((s) => s.documents);
  const addDocument = useAppStore((s) => s.addDocument);
  const [idA, setIdA] = useState<string>('');
  const [idB, setIdB] = useState<string>('');
  const [absolute, setAbsolute] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const entryA = documents.find((d) => d.id === idA) ?? documents[0] ?? null;
  const entryB = documents.find((d) => d.id === idB) ?? documents[1] ?? null;

  const docA = entryA ? activeDoc(entryA) : null;
  const docB = entryB ? activeDoc(entryB) : null;

  const planes = useMemo(() => (docA ? choosePlanes(docA) : []), [docA]);
  const radialMax = useMemo(() => {
    const a = docA ? findImax(docA).value : 0;
    const b = docB ? findImax(docB).value : 0;
    return Math.max(a, b);
  }, [docA, docB]);

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    for (const file of Array.from(files)) {
      try {
        const { name, doc } = await loadPhotometryFile(file);
        addDocument(name, doc);
      } catch (e) {
        setError(`${file.name}: ${(e as Error).message}`);
      }
    }
  }

  const addFileControl = (
    <div className="compare-add-file">
      <button className="btn" onClick={() => inputRef.current?.click()}>
        + Добавить файл
      </button>
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
      {error && <span className="sidebar-error">{error}</span>}
    </div>
  );

  if (documents.length < 2) {
    return (
      <div className="compare-empty">
        <p>Для сравнения нужно как минимум два файла.</p>
        {addFileControl}
      </div>
    );
  }

  const rows =
    docA && docB
      ? ([
          ['Поток Φ, лм', computeFlux(docA).totalLumens, computeFlux(docB).totalLumens, 1],
          ['Imax, кд', findImax(docA).value, findImax(docB).value, 1],
          ['КПД, %', (computeFlux(docA).efficiency ?? NaN) * 100, (computeFlux(docB).efficiency ?? NaN) * 100, 1],
        ] as [string, number, number, number][])
      : [];

  return (
    <div className="compare-view">
      <div className="compare-toolbar">
        <label className="compare-select">
          <span>Файл A</span>
          <select value={entryA?.id ?? ''} onChange={(e) => setIdA(e.target.value)}>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="compare-select">
          <span>Файл B</span>
          <select value={entryB?.id ?? ''} onChange={(e) => setIdB(e.target.value)}>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        {addFileControl}
        <div className="toolbar-spacer" />
        <button
          className={`btn ${absolute ? 'active' : ''}`}
          onClick={() => setAbsolute((v) => !v)}
          title={
            absolute
              ? 'Обе кривые в реальных канделах — если светильники сильно различаются по яркости, слабая кривая может быть почти не видна'
              : 'Каждая кривая нормирована к своему максимуму — форма луча сравнима, даже если яркость различается в разы'
          }
        >
          Шкала: {absolute ? 'абсолютная (кд)' : 'относительная (%)'}
        </button>
      </div>

      {docA && docB && (
        <>
          <div className="compare-legend">
            <span>
              <i className="legend-swatch legend-a" /> A: {entryA!.name}
            </span>
            <span>
              <i className="legend-swatch legend-b" /> B: {entryB!.name}
            </span>
          </div>

          <div className="chart-grid">
            {planes.map((p) => (
              <PolarChart
                key={p.cPlane}
                doc={docA}
                compareDoc={docB}
                cPlane={p.cPlane}
                label={p.label}
                radialMax={radialMax}
                scaleBasis={absolute ? 'shared' : 'ownFileMax'}
                curveColor="var(--text)"
                compareColor="var(--accent)"
                compareDashed={false}
                showBeamAngle={false}
              />
            ))}
          </div>

          <table className="compare-table">
            <thead>
              <tr>
                <th>Показатель</th>
                <th>A</th>
                <th>B</th>
                <th>Δ (B − A)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, a, b]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{fmt(a)}</td>
                  <td>{fmt(b)}</td>
                  <td className={b - a > 0 ? 'diff-pos' : b - a < 0 ? 'diff-neg' : ''}>
                    {b - a >= 0 ? '+' : ''}
                    {fmt(b - a)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
