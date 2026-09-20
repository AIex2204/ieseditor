import { useMemo } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { computeFlux } from '../../core/photometry/flux';
import { candelaPerKilolumen, classifyPlane, findImax, GOST_CURVE_NAMES } from '../../core/photometry/metrics';
import { choosePlanes } from '../../core/photometry/choosePlanes';
import { useT, useLang } from '../../i18n/i18n';

function fmt(n: number, digits = 1): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function MetricsPanel({ doc }: { doc: PhotometryDoc }) {
  const t = useT();
  const lang = useLang();
  const flux = useMemo(() => computeFlux(doc), [doc]);
  const imax = useMemo(() => findImax(doc), [doc]);
  const cdPerKlm = useMemo(() => candelaPerKilolumen(doc), [doc]);

  // Тип КСС считается для каждой плоскости отдельно: у несимметричной КСС
  // C0–C180 и C90–C270 могут попадать в разные типы.
  const planes = useMemo(() => choosePlanes(doc), [doc]);
  const planeKss = useMemo(
    () => planes.map((p) => ({ ...p, ...classifyPlane(doc, p.cPlane) })),
    [doc, planes]
  );
  const single = planeKss.length === 1;

  const rows: [string, string, string?][] = [
    ['Поток Φ, лм', fmt(flux.totalLumens)],
    ['Поток вниз / вверх, лм', `${fmt(flux.downwardLumens)} / ${fmt(flux.upwardLumens)}`],
    [
      'Доля вниз/вверх (DFF/UFF)',
      `${fmt(flux.dff * 100)}% / ${fmt(flux.uff * 100)}%`,
      'DFF (Downward Flux Fraction) — доля светового потока, уходящая в нижнюю полусферу (γ < 90°); UFF (Upward Flux Fraction) — в верхнюю (γ > 90°). В сумме дают 100%.',
    ],
    ['КПД', flux.efficiency !== null ? `${fmt(flux.efficiency * 100)}%` : '—'],
    ['Отдача, лм/Вт', flux.luminousEfficacy !== null ? fmt(flux.luminousEfficacy) : '—'],
    ['Imax, кд', fmt(imax.value)],
    ['Imax, кд/клм', cdPerKlm !== null ? fmt(cdPerKlm) : '—'],
    ['Направление Imax', `γ=${fmt(imax.gamma)}° C=${fmt(imax.c)}°`],
  ];

  for (const p of planeKss) {
    const planeLabel = single ? '' : `, ${p.label.replace(/\s–\s/, '–')}`;
    rows.push([
      single ? 'Полный угол 2γ½' : `2γ½${planeLabel}`,
      p.fullAngle !== null ? `${fmt(p.fullAngle)}°` : t('не достигается'),
      'Полный угол на половине максимума силы света этой плоскости.',
    ]);
  }
  for (const p of planeKss) {
    const planeLabel = single ? '' : `, ${p.label.replace(/\s–\s/, '–')}`;
    rows.push([
      `Тип КСС${planeLabel}`,
      p.type !== null ? p.type : '—',
      p.type !== null
        ? `${p.type} — ${t(GOST_CURVE_NAMES[p.type])}. ` +
          `Определён по направлению максимума этой плоскости (γ = ${fmt(p.peakGamma)}°)` +
          (p.fullAngle !== null ? ` и полному углу 2γ½ = ${fmt(p.fullAngle)}°` : '') +
          `; Imin/Imax = ${fmt(p.uniformity * 100, 0)}%. Справочно, по границам ГОСТ Р 54350 — для сертификации нужен первоисточник.`
        : undefined,
    ]);
  }

  return (
    <div className="panel metrics-panel">
      <div className="panel-title">{t('Показатели')}</div>
      {doc.photometricType !== 1 && (
        <p className="tool-hint tool-hint-blocked">
          {lang === 'en'
            ? `The file is stored as Type ${doc.photometricType === 2 ? 'B' : 'A'} — the values below are computed with the Type C model and are unreliable.`
            : `Файл записан как Type ${doc.photometricType === 2 ? 'B' : 'A'} — величины ниже посчитаны по модели Type C и недостоверны.`}
        </p>
      )}
      <table>
        <tbody>
          {rows.map(([k, v, hint]) => {
            const ci = k.indexOf(', C');
            const label = ci >= 0 ? t(k.slice(0, ci)) + k.slice(ci) : t(k);
            return (
            <tr key={k} title={hint}>
              <td className="metric-key">{label}</td>
              <td className="metric-val">{v}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
