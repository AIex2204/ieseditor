// Таблица показателей файла в виде пар "показатель — значение": идёт и в
// архив (CSV для даташита), и в буфер обмена.
import type { PhotometryDoc } from '../ies/types';
import { computeFlux } from '../photometry/flux';
import { candelaPerKilolumen, classifyPlane, findImax, GOST_CURVE_NAMES } from '../photometry/metrics';
import { choosePlanes } from '../photometry/choosePlanes';

export interface MetricRow {
  label: string;
  value: string;
}

function fmt(n: number, digits = 1): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function keyword(doc: PhotometryDoc, key: string): string {
  return doc.keywords.find((k) => k.key.toUpperCase() === key)?.value.trim() ?? '';
}

export function metricRows(doc: PhotometryDoc): MetricRow[] {
  const flux = computeFlux(doc);
  const imax = findImax(doc);
  const cdPerKlm = candelaPerKilolumen(doc);
  const planes = choosePlanes(doc);
  const single = planes.length === 1;

  const rows: MetricRow[] = [];

  const manufac = keyword(doc, 'MANUFAC');
  const lumcat = keyword(doc, 'LUMCAT');
  const luminaire = keyword(doc, 'LUMINAIRE');
  if (manufac) rows.push({ label: 'Производитель', value: manufac });
  if (lumcat) rows.push({ label: 'Артикул', value: lumcat });
  if (luminaire) rows.push({ label: 'Светильник', value: luminaire });

  rows.push(
    { label: 'Световой поток, лм', value: fmt(flux.totalLumens) },
    { label: 'Поток вниз, лм', value: fmt(flux.downwardLumens) },
    { label: 'Поток вверх, лм', value: fmt(flux.upwardLumens) },
    { label: 'DFF, %', value: fmt(flux.dff * 100) },
    { label: 'UFF, %', value: fmt(flux.uff * 100) },
    { label: 'КПД, %', value: flux.efficiency !== null ? fmt(flux.efficiency * 100) : '—' },
    { label: 'Мощность, Вт', value: doc.inputWatts > 0 ? fmt(doc.inputWatts) : '—' },
    { label: 'Отдача, лм/Вт', value: flux.luminousEfficacy !== null ? fmt(flux.luminousEfficacy) : '—' },
    { label: 'Imax, кд', value: fmt(imax.value) },
    { label: 'Imax, кд/клм', value: cdPerKlm !== null ? fmt(cdPerKlm) : '—' },
    { label: 'Направление Imax, γ°', value: fmt(imax.gamma) },
    { label: 'Направление Imax, C°', value: fmt(imax.c) }
  );

  for (const p of planes) {
    const kss = classifyPlane(doc, p.cPlane);
    const suffix = single ? '' : ` (${p.label.replace(/\s–\s/, '–')})`;
    rows.push({
      label: `Полный угол 2γ½${suffix}, °`,
      value: kss.fullAngle !== null ? fmt(kss.fullAngle) : '—',
    });
    rows.push({
      label: `Тип КСС${suffix}`,
      value: kss.type !== null ? `${kss.type} — ${GOST_CURVE_NAMES[kss.type]}` : '—',
    });
  }

  rows.push(
    { label: 'Габариты светового отверстия Ш×Д×В, м', value: `${fmt(doc.width, 3)} × ${fmt(doc.length, 3)} × ${fmt(doc.height, 3)}` },
    { label: 'Углов γ × плоскостей C', value: `${doc.numVertAngles} × ${doc.numHorizAngles}` },
    { label: 'Версия формата', value: doc.format }
  );

  return rows;
}

/**
 * CSV для Excel: разделитель — точка с запятой (русская локаль Excel), с BOM,
 * иначе кириллица открывается кракозябрами.
 */
export function metricsCsv(doc: PhotometryDoc): string {
  const escape = (s: string) => (/[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = ['Показатель;Значение', ...metricRows(doc).map((r) => `${escape(r.label)};${escape(r.value)}`)];
  return `﻿${lines.join('\r\n')}\r\n`;
}
