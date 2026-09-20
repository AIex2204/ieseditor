import type { WarningItem } from '../../core/ies/types';

const ICON: Record<WarningItem['severity'], string> = {
  error: '⛔',
  warning: '⚠',
  info: 'ℹ',
};

export function WarningsPanel({ warnings }: { warnings: WarningItem[] }) {
  if (warnings.length === 0) {
    return (
      <div className="panel warnings-panel">
        <div className="panel-title">Предупреждения</div>
        <div className="warnings-empty">Проблем не обнаружено</div>
      </div>
    );
  }
  return (
    <div className="panel warnings-panel">
      <div className="panel-title">Предупреждения ({warnings.length})</div>
      <ul className="warnings-list">
        {warnings.map((w, i) => (
          <li key={i} className={`warning-item warning-${w.severity}`}>
            <span className="warning-icon">{ICON[w.severity]}</span>
            <span>{w.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
