import { useMemo } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { diffDocs } from '../../core/audit/docDiff';

/**
 * Что именно отличается от исходного файла. Нужна не ради красоты: перед
 * выгрузкой в каталог видно, какие правки накопились — в том числе те, что
 * появились от простого захода в инструмент.
 */
export function ChangesPanel({ originalDoc, workingDoc }: { originalDoc: PhotometryDoc; workingDoc: PhotometryDoc }) {
  const items = useMemo(() => diffDocs(originalDoc, workingDoc), [originalDoc, workingDoc]);
  if (items.length === 0) return null;

  return (
    <div className="panel changes-panel">
      <div className="panel-title">Изменения относительно исходного</div>
      <table>
        <tbody>
          {items.map((item) => (
            <tr key={item.label}>
              <td className="metric-key">{item.label}</td>
              <td className="changes-val">
                <span className="changes-before">{item.before}</span>
                <span className="changes-arrow">→</span>
                <span className="changes-after">{item.after}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
