import { useMemo, useState } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { auditDoc, formatAuditReport, VERDICT_TEXT, type AuditSeverity } from '../../core/audit/auditDoc';
import { useT } from '../../i18n/i18n';

const MARK: Record<AuditSeverity, string> = {
  error: '⛔',
  warning: '⚠',
  info: 'ℹ',
  ok: '✓',
};

export function AuditPanel({ doc, fileName }: { doc: PhotometryDoc; fileName: string }) {
  const t = useT();
  const report = useMemo(() => auditDoc(doc), [doc]);
  const [showPassed, setShowPassed] = useState(false);
  const [copied, setCopied] = useState(false);

  const problems = report.checks.filter((c) => c.severity !== 'ok');
  const passed = report.checks.filter((c) => c.severity === 'ok');

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(formatAuditReport(fileName, report));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="panel audit-panel">
      <div className="panel-title">{t('Проверка файла')}</div>

      <div className={`audit-verdict audit-verdict-${report.verdict}`}>
        <span className="audit-verdict-mark">{MARK[report.verdict === 'ok' ? 'ok' : report.verdict]}</span>
        <span>{t(VERDICT_TEXT[report.verdict])}</span>
      </div>

      <ul className="audit-list">
        {problems.map((c) => (
          <li key={c.id} className={`audit-item audit-${c.severity}`}>
            <span className="audit-mark">{MARK[c.severity]}</span>
            <span>
              <b>{c.title}.</b> {c.detail}
            </span>
          </li>
        ))}
        {showPassed &&
          passed.map((c) => (
            <li key={c.id} className="audit-item audit-ok">
              <span className="audit-mark">{MARK.ok}</span>
              <span>
                <b>{c.title}.</b> {c.detail}
              </span>
            </li>
          ))}
      </ul>

      <div className="audit-actions">
        {passed.length > 0 && (
          <button className="btn audit-toggle" onClick={() => setShowPassed((v) => !v)}>
            {showPassed ? t('Скрыть пройденные') : `${t('Пройдено проверок')}: ${passed.length}`}
          </button>
        )}
        <button className="btn audit-toggle" onClick={() => void copyReport()} title={t('Скопировать отчёт, чтобы отправить поставщику')}>
          {copied ? t('Скопировано') : t('Скопировать отчёт')}
        </button>
      </div>
    </div>
  );
}
