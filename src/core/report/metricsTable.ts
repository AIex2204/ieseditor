// Таблица показателей файла в виде пар "показатель — значение": идёт и в
// архив (CSV для даташита), и в буфер обмена.
import type { PhotometryDoc } from '../ies/types';
import { computeFlux } from '../photometry/flux';
import { candelaPerKilolumen, classifyPlane, findImax, GOST_CURVE_NAMES } from '../photometry/metrics';
import { choosePlanes } from '../photometry/choosePlanes';

export type Lang = 'ru' | 'en';
const L = (lang: Lang, ru: string, en: string): string => (lang === 'en' ? en : ru);

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

export function metricRows(doc: PhotometryDoc, lang: Lang = 'ru'): MetricRow[] {
  const flux = computeFlux(doc);
  const imax = findImax(doc);
  const cdPerKlm = candelaPerKilolumen(doc);
  const planes = choosePlanes(doc);
  const single = planes.length === 1;

  const rows: MetricRow[] = [];

  const manufac = keyword(doc, 'MANUFAC');
  const lumcat = keyword(doc, 'LUMCAT');
  const luminaire = keyword(doc, 'LUMINAIRE');
  if (manufac) rows.push({ label: L(lang, 'Производитель', 'Manufacturer'), value: manufac });
  if (lumcat) rows.push({ label: L(lang, 'Артикул', 'Catalog no.'), value: lumcat });
  if (luminaire) rows.push({ label: L(lang, 'Светильник', 'Luminaire'), value: luminaire });

  rows.push(
    { label: L(lang, 'Световой поток, лм', 'Luminous flux, lm'), value: fmt(flux.totalLumens) },
    { label: L(lang, 'Поток вниз, лм', 'Downward flux, lm'), value: fmt(flux.downwardLumens) },
    { label: L(lang, 'Поток вверх, лм', 'Upward flux, lm'), value: fmt(flux.upwardLumens) },
    { label: 'DFF, %', value: fmt(flux.dff * 100) },
    { label: 'UFF, %', value: fmt(flux.uff * 100) },
    { label: L(lang, 'КПД, %', 'Efficiency, %'), value: flux.efficiency !== null ? fmt(flux.efficiency * 100) : '—' },
    { label: L(lang, 'Мощность, Вт', 'Power, W'), value: doc.inputWatts > 0 ? fmt(doc.inputWatts) : '—' },
    { label: L(lang, 'Отдача, лм/Вт', 'Efficacy, lm/W'), value: flux.luminousEfficacy !== null ? fmt(flux.luminousEfficacy) : '—' },
    { label: L(lang, 'Imax, кд', 'Imax, cd'), value: fmt(imax.value) },
    { label: L(lang, 'Imax, кд/клм', 'Imax, cd/klm'), value: cdPerKlm !== null ? fmt(cdPerKlm) : '—' },
    { label: L(lang, 'Направление Imax, γ°', 'Imax direction, γ°'), value: fmt(imax.gamma) },
    { label: L(lang, 'Направление Imax, C°', 'Imax direction, C°'), value: fmt(imax.c) }
  );

  for (const p of planes) {
    const kss = classifyPlane(doc, p.cPlane);
    const suffix = single ? '' : ` (${p.label.replace(/\s–\s/, '–')})`;
    rows.push({
      label: `${L(lang, 'Полный угол 2γ½', 'Beam angle 2γ½')}${suffix}, °`,
      value: kss.fullAngle !== null ? fmt(kss.fullAngle) : '—',
    });
    rows.push({
      label: `${L(lang, 'Тип КСС', 'Distribution type')}${suffix}`,
      value: kss.type !== null ? `${kss.type} — ${GOST_CURVE_NAMES[kss.type]}` : '—',
    });
  }

  rows.push(
    { label: L(lang, 'Габариты светового отверстия Ш×Д×В, м', 'Luminous opening W×L×H, m'), value: `${fmt(doc.width, 3)} × ${fmt(doc.length, 3)} × ${fmt(doc.height, 3)}` },
    { label: L(lang, 'Углов γ × плоскостей C', 'γ angles × C planes'), value: `${doc.numVertAngles} × ${doc.numHorizAngles}` },
    { label: L(lang, 'Версия формата', 'Format version'), value: doc.format }
  );

  return rows;
}

/**
 * CSV для Excel: разделитель — точка с запятой (русская локаль Excel), с BOM,
 * иначе кириллица открывается кракозябрами.
 */
export function metricsCsv(doc: PhotometryDoc, lang: Lang = 'ru'): string {
  const escape = (s: string) => (/[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = [L(lang, 'Показатель;Значение', 'Metric;Value'), ...metricRows(doc, lang).map((r) => `${escape(r.label)};${escape(r.value)}`)];
  return `﻿${lines.join('\r\n')}\r\n`;
}
