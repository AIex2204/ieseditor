// Проверка файла перед публикацией (п. "аудит файла"): в отличие от
// warnings парсера, которые отвечают за формат, здесь проверяется
// правдоподобность самой фотометрии — то, чем чаще всего грешат файлы от
// лабораторий и сторонних производителей.
//
// Пороги вынесены в константы: это инженерные ориентиры, а не требования
// стандарта, и их может понадобиться подстроить под практику компании.
import type { PhotometryDoc } from '../ies/types';
import { computeFlux } from '../photometry/flux';
import { beamAngleAtPlanePeak, findImax } from '../photometry/metrics';
import { detectSymmetry } from '../photometry/symmetry';

export type Lang = 'ru' | 'en';
type LFn = (ru: string, en: string) => string;

export type AuditSeverity = 'error' | 'warning' | 'info' | 'ok';

export interface AuditCheck {
  id: string;
  /** Короткое имя проверки для списка. */
  title: string;
  severity: AuditSeverity;
  /** Пояснение с числами: что именно найдено и почему это важно. */
  detail: string;
}

export interface AuditReport {
  checks: AuditCheck[];
  verdict: 'ok' | 'warning' | 'error';
}

/** Расхождение заявленного и расчётного потока, доли. */
const FLUX_MISMATCH_WARN = 0.02;
const FLUX_MISMATCH_ERROR = 0.1;
/** КПД светильника выше 100% физически невозможен (допуск на округление). */
const EFFICIENCY_MAX = 1.02;
/** Удельная отдача, лм/Вт: ориентиры для светодиодных светильников. */
const EFFICACY_SUSPICIOUS = 180;
const EFFICACY_IMPOSSIBLE = 220;
const EFFICACY_LOW = 40;
/** Сколько узлов сетки должно попадать в луч, чтобы максимум был описан достоверно. */
const MIN_POINTS_IN_BEAM = 4;
/** Длина серии одинаковых значений подряд, считающаяся следом ручной правки. */
const PLATEAU_RUN = 4;

// Артикул [LUMCAT] сознательно не требуем: у файлов от лаборатории и от
// сторонних производителей его обычно нет, а присваивается он уже своим
// каталогом — ругаться на каждый входящий файл смысла нет.
const REQUIRED_KEYWORDS = ['TEST', 'MANUFAC'];

function fmt(n: number, digits = 1): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function pct(n: number, digits = 1): string {
  return `${fmt(n * 100, digits)}%`;
}

/** Проверка типа фотометрии: вся расчётная математика построена на Type C. */
function checkPhotometricType(doc: PhotometryDoc, L: LFn): AuditCheck {
  if (doc.photometricType === 1) {
    return { id: 'photometric-type', title: L('Тип фотометрии', 'Photometric type'), severity: 'ok', detail: L('Type C — штатный режим работы.', 'Type C — the normal operating mode.') };
  }
  const name = doc.photometricType === 2 ? 'Type B' : 'Type A';
  return {
    id: 'photometric-type',
    title: L('Тип фотометрии', 'Photometric type'),
    severity: 'error',
    detail: L(
      `${name}: внутренняя модель и все расчётные величины (поток, КПД, 2γ½, тип КСС) построены на Type C, ` +
        'поэтому здесь они недостоверны, а геометрические инструменты отключены. Файл можно смотреть, ' +
        'править поля и сохранять; для обработки его нужно пересчитать в Type C.',
      `${name}: the internal model and all computed values (flux, efficiency, 2γ½, distribution type) are built on ` +
        'Type C, so here they are unreliable and the geometric tools are disabled. You can view the file, edit fields ' +
        'and save it; to process it, convert it to Type C first.'
    ),
  };
}

function checkDeclaredFlux(doc: PhotometryDoc, computed: number, L: LFn): AuditCheck {
  if (doc.lumensPerLamp < 0) {
    return {
      id: 'declared-flux',
      title: L('Заявленный поток', 'Declared flux'),
      severity: 'info',
      detail: L('Абсолютная фотометрия (поток лампы = −1): сверять расчётный поток с заявленным нечем.', 'Absolute photometry (lamp flux = −1): there is nothing to compare the computed flux against.'),
    };
  }
  const declared = doc.numLamps * doc.lumensPerLamp;
  if (!(declared > 0)) {
    return {
      id: 'declared-flux',
      title: L('Заявленный поток', 'Declared flux'),
      severity: 'warning',
      detail: L('В файле не указан поток лампы — расчётные пакеты не смогут посчитать КПД светильника.', 'The file has no lamp flux — calculation packages will not be able to compute the luminaire efficiency.'),
    };
  }
  const diff = (computed - declared) / declared;
  const detail = L(
    `Заявлено ${fmt(declared)} лм, по таблице силы света получается ${fmt(computed)} лм (расхождение ${diff >= 0 ? '+' : ''}${pct(diff, 2)}).`,
    `Declared ${fmt(declared)} lm, the intensity table gives ${fmt(computed)} lm (mismatch ${diff >= 0 ? '+' : ''}${pct(diff, 2)}).`
  );
  if (Math.abs(diff) > FLUX_MISMATCH_ERROR) {
    return {
      id: 'declared-flux',
      title: L('Заявленный поток', 'Declared flux'),
      severity: 'error',
      detail: `${detail} ${L('Такое расхождение означает, что шапка файла и таблица описывают разные светильники.', 'A mismatch this large means the file header and the table describe different luminaires.')}`,
    };
  }
  if (Math.abs(diff) > FLUX_MISMATCH_WARN) {
    return {
      id: 'declared-flux',
      title: L('Заявленный поток', 'Declared flux'),
      severity: 'warning',
      detail: `${detail} ${L('Стоит выяснить причину до публикации.', 'Worth finding out the reason before publishing.')}`,
    };
  }
  return { id: 'declared-flux', title: L('Заявленный поток', 'Declared flux'), severity: 'ok', detail };
}

function checkEfficiency(efficiency: number | null, L: LFn): AuditCheck | null {
  if (efficiency === null) return null;
  if (efficiency > EFFICIENCY_MAX) {
    return {
      id: 'efficiency',
      title: L('КПД светильника', 'Luminaire efficiency'),
      severity: 'error',
      detail: L(
        `КПД ${pct(efficiency)} — светильник не может излучать больше, чем даёт лампа. ` +
          'Обычно это значит, что поток лампы в шапке занижен или таблица силы света масштабирована.',
        `Efficiency ${pct(efficiency)} — a luminaire cannot emit more than its lamp provides. ` +
          'Usually this means the header lamp flux is understated or the intensity table was rescaled.'
      ),
    };
  }
  return { id: 'efficiency', title: L('КПД светильника', 'Luminaire efficiency'), severity: 'ok', detail: L(`КПД ${pct(efficiency)} — правдоподобно.`, `Efficiency ${pct(efficiency)} — plausible.`) };
}

function checkEfficacy(efficacy: number | null, L: LFn): AuditCheck | null {
  if (efficacy === null) {
    return {
      id: 'efficacy',
      title: L('Удельная отдача', 'Luminous efficacy'),
      severity: 'warning',
      detail: L('Потребляемая мощность в файле не указана — отдачу лм/Вт посчитать нельзя.', 'Input power is not set in the file — lm/W efficacy cannot be computed.'),
    };
  }
  const value = `${fmt(efficacy)} ${L('лм/Вт', 'lm/W')}`;
  if (efficacy > EFFICACY_IMPOSSIBLE) {
    return {
      id: 'efficacy',
      title: L('Удельная отдача', 'Luminous efficacy'),
      severity: 'error',
      detail: `${value} — ${L('выше практического предела для светильника. Проверьте поток и мощность в шапке.', 'above the practical limit for a luminaire. Check the flux and power in the header.')}`,
    };
  }
  if (efficacy > EFFICACY_SUSPICIOUS) {
    return {
      id: 'efficacy',
      title: L('Удельная отдача', 'Luminous efficacy'),
      severity: 'warning',
      detail: `${value} — ${L('очень высоко: достижимо только для лучших моделей, стоит проверить исходные данные.', 'very high: reached only by the best models — worth checking the source data.')}`,
    };
  }
  if (efficacy < EFFICACY_LOW) {
    return {
      id: 'efficacy',
      title: L('Удельная отдача', 'Luminous efficacy'),
      severity: 'warning',
      detail: `${value} — ${L('подозрительно низко: возможно, мощность указана для всей системы или поток занижен.', 'suspiciously low: power may be given for the whole system, or the flux is understated.')}`,
    };
  }
  return { id: 'efficacy', title: L('Удельная отдача', 'Luminous efficacy'), severity: 'ok', detail: `${value} — ${L('правдоподобно.', 'plausible.')}` };
}

/** Достаточно ли узлов сетки попадает в луч, чтобы максимум не "проскочил" между углами. */
function checkPeakResolution(doc: PhotometryDoc, L: LFn): AuditCheck | null {
  if (doc.photometricType !== 1) return null;
  const imax = findImax(doc);
  const beam = beamAngleAtPlanePeak(doc, imax.c);
  if (beam.fullAngle === null || beam.fullAngle <= 0) return null;

  const steps: number[] = [];
  for (let i = 1; i < doc.vertAngles.length; i++) {
    const d = doc.vertAngles[i] - doc.vertAngles[i - 1];
    if (d > 1e-9) steps.push(d);
  }
  if (steps.length === 0) return null;
  const step = steps.reduce((a, b) => a + b, 0) / steps.length;
  const points = beam.fullAngle / step;

  const detail = L(`Шаг по γ ≈ ${fmt(step, 2)}°, ширина луча 2γ½ = ${fmt(beam.fullAngle)}° — в луч попадает ≈${fmt(points, 1)} узлов сетки.`, `γ step ≈ ${fmt(step, 2)}°, beam width 2γ½ = ${fmt(beam.fullAngle)}° — about ${fmt(points, 1)} grid nodes fall inside the beam.`);
  if (points < MIN_POINTS_IN_BEAM) {
    return {
      id: 'peak-resolution',
      title: L('Разрешение по углу', 'Angular resolution'),
      severity: 'warning',
      detail: `${detail} ${L('Для узкой оптики этого мало: истинный максимум может лежать между измеренными углами.', 'That is too few for narrow optics: the true peak may sit between measured angles.')}`,
    };
  }
  return { id: 'peak-resolution', title: L('Разрешение по углу', 'Angular resolution'), severity: 'ok', detail };
}

/** Длинные серии одинаковых ненулевых значений — типичный след ручной правки или интерполяции. */
function checkPlateaus(doc: PhotometryDoc, L: LFn): AuditCheck {
  const nv = doc.numVertAngles;
  let runs = 0;
  let longest = 0;
  for (let iH = 0; iH < doc.numHorizAngles; iH++) {
    let runLen = 1;
    for (let iG = 1; iG < nv; iG++) {
      const prev = doc.candela[iH * nv + iG - 1];
      const cur = doc.candela[iH * nv + iG];
      if (cur > 0 && cur === prev) {
        runLen++;
      } else {
        if (runLen >= PLATEAU_RUN) {
          runs++;
          longest = Math.max(longest, runLen);
        }
        runLen = 1;
      }
    }
    if (runLen >= PLATEAU_RUN) {
      runs++;
      longest = Math.max(longest, runLen);
    }
  }

  if (runs > 0) {
    return {
      id: 'plateaus',
      title: L('Полки в таблице', 'Plateaus in the table'),
      severity: 'warning',
      detail: L(
        `Найдено ${runs} участков подряд идущих одинаковых значений (самый длинный — ${longest} точек). ` +
          'Обычно это артефакт гониометра или ручной правки, а не реальная форма КСС.',
        `Found ${runs} runs of consecutive equal values (longest — ${longest} points). ` +
          'This is usually a goniometer or manual-editing artifact, not the real distribution shape.'
      ),
    };
  }
  return { id: 'plateaus', title: L('Полки в таблице', 'Plateaus in the table'), severity: 'ok', detail: L('Подряд идущих одинаковых значений не найдено.', 'No runs of consecutive equal values found.') };
}

/** Плоскость целиком в нулях при ненулевых соседях — признак битого или обрезанного файла. */
function checkEmptyPlanes(doc: PhotometryDoc, L: LFn): AuditCheck | null {
  if (doc.numHorizAngles < 2) return null;
  const nv = doc.numVertAngles;
  const empty: number[] = [];
  let anyNonEmpty = false;
  for (let iH = 0; iH < doc.numHorizAngles; iH++) {
    let sum = 0;
    for (let iG = 0; iG < nv; iG++) sum += doc.candela[iH * nv + iG];
    if (sum <= 0) empty.push(doc.horizAngles[iH]);
    else anyNonEmpty = true;
  }
  if (empty.length > 0 && anyNonEmpty) {
    return {
      id: 'empty-planes',
      title: L('Пустые плоскости', 'Empty planes'),
      severity: 'error',
      detail: L(
        `Плоскости C = ${empty.slice(0, 8).map((c) => fmt(c, 0)).join(', ')}${empty.length > 8 ? '…' : ''} ` +
          'заполнены нулями, хотя остальные содержат данные — файл обрезан или собран с ошибкой.',
        `Planes C = ${empty.slice(0, 8).map((c) => fmt(c, 0)).join(', ')}${empty.length > 8 ? '…' : ''} ` +
          'are all zeros while the others hold data — the file is truncated or built incorrectly.'
      ),
    };
  }
  return null;
}

function checkDimensions(doc: PhotometryDoc, L: LFn): AuditCheck {
  if (doc.width === 0 && doc.length === 0 && doc.height === 0) {
    return {
      id: 'dimensions',
      title: L('Габариты светового отверстия', 'Luminous opening size'),
      severity: 'warning',
      detail: L(
        'Все три размера нулевые — расчётные пакеты примут светильник за точечный источник. ' +
          'Для расчётов в ближней зоне и учёта самозатенения размеры стоит указать (вкладка «Форма светильника»).',
        'All three sizes are zero — calculation packages will treat the luminaire as a point source. ' +
          'For near-field calculations and self-shadowing it is worth setting the sizes (the “Luminaire shape” tab).'
      ),
    };
  }
  return {
    id: 'dimensions',
    title: L('Габариты светового отверстия', 'Luminous opening size'),
    severity: 'ok',
    detail: L(`Ш×Д×В = ${fmt(doc.width, 3)} × ${fmt(doc.length, 3)} × ${fmt(doc.height, 3)} м.`, `W×L×H = ${fmt(doc.width, 3)} × ${fmt(doc.length, 3)} × ${fmt(doc.height, 3)} m.`),
  };
}

function checkKeywords(doc: PhotometryDoc, L: LFn): AuditCheck {
  const present = new Set(doc.keywords.map((k) => k.key.toUpperCase()));
  const missing = REQUIRED_KEYWORDS.filter((k) => !present.has(k) || !doc.keywords.find((kw) => kw.key.toUpperCase() === k)?.value.trim());
  if (missing.length > 0) {
    return {
      id: 'keywords',
      title: L('Ключевые слова шапки', 'Header keywords'),
      severity: 'warning',
      detail: L(
        `Не заполнены: ${missing.map((k) => `[${k}]`).join(', ')}. Для каталога и выгрузки в базы их обычно требуют.`,
        `Missing: ${missing.map((k) => `[${k}]`).join(', ')}. Catalogs and database uploads usually require them.`
      ),
    };
  }
  return { id: 'keywords', title: L('Ключевые слова шапки', 'Header keywords'), severity: 'ok', detail: L('Обязательные ключевые слова заполнены.', 'Required keywords are present.') };
}

function checkAngleGrid(doc: PhotometryDoc, L: LFn): AuditCheck {
  const problems: string[] = [];
  for (let i = 1; i < doc.vertAngles.length; i++) {
    if (doc.vertAngles[i] <= doc.vertAngles[i - 1]) {
      problems.push(L(`углы γ не возрастают (позиция ${i}: ${doc.vertAngles[i - 1]} → ${doc.vertAngles[i]})`, `γ angles are not increasing (position ${i}: ${doc.vertAngles[i - 1]} → ${doc.vertAngles[i]})`));
      break;
    }
  }
  for (let i = 1; i < doc.horizAngles.length; i++) {
    if (doc.horizAngles[i] <= doc.horizAngles[i - 1]) {
      problems.push(L(`углы C не возрастают (позиция ${i}: ${doc.horizAngles[i - 1]} → ${doc.horizAngles[i]})`, `C angles are not increasing (position ${i}: ${doc.horizAngles[i - 1]} → ${doc.horizAngles[i]})`));
      break;
    }
  }
  for (let i = 0; i < doc.candela.length; i++) {
    if (doc.candela[i] < 0) {
      problems.push(L('в таблице есть отрицательные значения силы света', 'the table contains negative intensity values'));
      break;
    }
  }
  if (problems.length > 0) {
    return { id: 'angle-grid', title: L('Угловая сетка и значения', 'Angle grid & values'), severity: 'error', detail: `${problems.join('; ')}.` };
  }

  const gMax = doc.vertAngles[doc.vertAngles.length - 1] ?? 0;
  const kindName: Record<string, string> = {
    axial: L('осевая (одна плоскость)', 'axial (one plane)'),
    quadrant: L('четверть (C 0…90°)', 'quadrant (C 0…90°)'),
    bilateral: L('половина (C 0…180°)', 'half (C 0…180°)'),
    full: L('полный круг по C', 'full circle in C'),
  };
  const kind = detectSymmetry(doc.horizAngles);
  return {
    id: 'angle-grid',
    title: L('Угловая сетка и значения', 'Angle grid & values'),
    severity: 'ok',
    detail: L(
      `γ 0…${fmt(gMax, 0)}°, ${doc.numVertAngles} углов; симметрия — ${kindName[kind]}, ${doc.numHorizAngles} плоскостей.`,
      `γ 0…${fmt(gMax, 0)}°, ${doc.numVertAngles} angles; symmetry — ${kindName[kind]}, ${doc.numHorizAngles} planes.`
    ),
  };
}

/** Замечания парсера (формат файла) — включаем в общий отчёт, чтобы проверка была одна. */
function checksFromWarnings(doc: PhotometryDoc, L: LFn, lang: Lang): AuditCheck[] {
  return doc.warnings
    .filter((w) => w.code !== 'negative-candela' && w.code !== 'non-monotonic-angles') // уже покрыты checkAngleGrid
    .map((w, i) => ({
      id: `parse-${w.code}-${i}`,
      title: L('При чтении файла', 'While reading the file'),
      severity: w.severity === 'error' ? ('error' as const) : w.severity === 'warning' ? ('warning' as const) : ('info' as const),
      detail: lang === 'en' && w.messageEn ? w.messageEn : w.message,
    }));
}

export function auditDoc(doc: PhotometryDoc, lang: Lang = 'ru'): AuditReport {
  const L: LFn = (ru, en) => (lang === 'en' ? en : ru);
  const flux = computeFlux(doc);

  const checks: AuditCheck[] = [
    checkPhotometricType(doc, L),
    checkAngleGrid(doc, L),
    checkDeclaredFlux(doc, flux.totalLumens, L),
    checkEfficiency(flux.efficiency, L),
    checkEfficacy(flux.luminousEfficacy, L),
    checkPeakResolution(doc, L),
    checkEmptyPlanes(doc, L),
    checkPlateaus(doc, L),
    checkDimensions(doc, L),
    checkKeywords(doc, L),
    ...checksFromWarnings(doc, L, lang),
  ].filter((c): c is AuditCheck => c !== null);

  const hasError = checks.some((c) => c.severity === 'error');
  const hasWarning = checks.some((c) => c.severity === 'warning');
  return { checks, verdict: hasError ? 'error' : hasWarning ? 'warning' : 'ok' };
}

const VERDICT_TEXT: Record<AuditReport['verdict'], string> = {
  ok: 'Проблем не найдено',
  warning: 'Есть замечания',
  error: 'Найдены проблемы',
};
const VERDICT_TEXT_EN: Record<AuditReport['verdict'], string> = {
  ok: 'No problems found',
  warning: 'Some remarks',
  error: 'Problems found',
};

const SEVERITY_MARK: Record<AuditSeverity, string> = {
  error: '[!]',
  warning: '[?]',
  info: '[i]',
  ok: '[+]',
};

/** Отчёт в виде текста — чтобы отправить поставщику или приложить к задаче. */
export function formatAuditReport(fileName: string, report: AuditReport, lang: Lang = 'ru'): string {
  const verdict = lang === 'en' ? VERDICT_TEXT_EN[report.verdict] : VERDICT_TEXT[report.verdict];
  const head =
    lang === 'en'
      ? [`Photometric file check: ${fileName}`, `Result: ${verdict}`, '']
      : [`Проверка фотометрического файла: ${fileName}`, `Итог: ${verdict}`, ''];
  const lines = head;
  for (const c of report.checks) {
    lines.push(`${SEVERITY_MARK[c.severity]} ${c.title}: ${c.detail}`);
  }
  lines.push('', lang === 'en' ? 'Report generated at www.ieseditor.ru' : 'Отчёт подготовлен в www.ieseditor.ru');
  return lines.join('\n');
}

export { VERDICT_TEXT };
