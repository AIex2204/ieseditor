import type { WarningItem } from '../../core/ies/types';
import { useT } from '../../i18n/i18n';

const ICON: Record<WarningItem['severity'], string> = {
  error: '⛔',
  warning: '⚠',
  info: 'ℹ',
};

export function WarningsPanel({ warnings }: { warnings: WarningItem[] }) {
  const t = useT();
  if (warnings.length === 0) {
    return (
      <div className="panel warnings-panel">
        <div className="panel-title">{t('Предупреждения')}</div>
        <div className="warnings-empty">{t('Проблем не обнаружено')}</div>
      </div>
    );
  }
  return (
    <div className="panel warnings-panel">
      <div className="panel-title">{t('Предупреждения')} ({warnings.length})</div>
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
