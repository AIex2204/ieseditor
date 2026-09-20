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
function checkPhotometricType(doc: PhotometryDoc): AuditCheck {
  if (doc.photometricType === 1) {
    return { id: 'photometric-type', title: 'Тип фотометрии', severity: 'ok', detail: 'Type C — штатный режим работы.' };
  }
  const name = doc.photometricType === 2 ? 'Type B' : 'Type A';
  return {
    id: 'photometric-type',
    title: 'Тип фотометрии',
    severity: 'error',
    detail:
      `${name}: внутренняя модель и все расчётные величины (поток, КПД, 2γ½, тип КСС) построены на Type C, ` +
      'поэтому здесь они недостоверны, а геометрические инструменты отключены. Файл можно смотреть, ' +
      'править поля и сохранять; для обработки его нужно пересчитать в Type C.',
  };
}

function checkDeclaredFlux(doc: PhotometryDoc, computed: number): AuditCheck {
  if (doc.lumensPerLamp < 0) {
    return {
      id: 'declared-flux',
      title: 'Заявленный поток',
      severity: 'info',
      detail: 'Абсолютная фотометрия (поток лампы = −1): сверять расчётный поток с заявленным нечем.',
    };
  }
  const declared = doc.numLamps * doc.lumensPerLamp;
  if (!(declared > 0)) {
    return {
      id: 'declared-flux',
      title: 'Заявленный поток',
      severity: 'warning',
      detail: 'В файле не указан поток лампы — расчётные пакеты не смогут посчитать КПД светильника.',
    };
  }
  const diff = (computed - declared) / declared;
  const detail =
    `Заявлено ${fmt(declared)} лм, по таблице силы света получается ${fmt(computed)} лм ` +
    `(расхождение ${diff >= 0 ? '+' : ''}${pct(diff, 2)}).`;
  if (Math.abs(diff) > FLUX_MISMATCH_ERROR) {
    return {
      id: 'declared-flux',
      title: 'Заявленный поток',
      severity: 'error',
      detail: `${detail} Такое расхождение означает, что шапка файла и таблица описывают разные светильники.`,
    };
  }
  if (Math.abs(diff) > FLUX_MISMATCH_WARN) {
    return {
      id: 'declared-flux',
      title: 'Заявленный поток',
      severity: 'warning',
      detail: `${detail} Стоит выяснить причину до публикации.`,
    };
  }
  return { id: 'declared-flux', title: 'Заявленный поток', severity: 'ok', detail };
}

function checkEfficiency(efficiency: number | null): AuditCheck | null {
  if (efficiency === null) return null;
  if (efficiency > EFFICIENCY_MAX) {
    return {
      id: 'efficiency',
      title: 'КПД светильника',
      severity: 'error',
      detail:
        `КПД ${pct(efficiency)} — светильник не может излучать больше, чем даёт лампа. ` +
        'Обычно это значит, что поток лампы в шапке занижен или таблица силы света масштабирована.',
    };
  }
  return { id: 'efficiency', title: 'КПД светильника', severity: 'ok', detail: `КПД ${pct(efficiency)} — правдоподобно.` };
}

function checkEfficacy(efficacy: number | null): AuditCheck | null {
  if (efficacy === null) {
    return {
      id: 'efficacy',
      title: 'Удельная отдача',
      severity: 'warning',
      detail: 'Потребляемая мощность в файле не указана — отдачу лм/Вт посчитать нельзя.',
    };
  }
  const value = `${fmt(efficacy)} лм/Вт`;
  if (efficacy > EFFICACY_IMPOSSIBLE) {
    return {
      id: 'efficacy',
      title: 'Удельная отдача',
      severity: 'error',
      detail: `${value} — выше практического предела для светильника. Проверьте поток и мощность в шапке.`,
    };
  }
  if (efficacy > EFFICACY_SUSPICIOUS) {
    return {
      id: 'efficacy',
      title: 'Удельная отдача',
      severity: 'warning',
      detail: `${value} — очень высоко: достижимо только для лучших моделей, стоит проверить исходные данные.`,
    };
  }
  if (efficacy < EFFICACY_LOW) {
    return {
      id: 'efficacy',
      title: 'Удельная отдача',
      severity: 'warning',
      detail: `${value} — подозрительно низко: возможно, мощность указана для всей системы или поток занижен.`,
    };
  }
  return { id: 'efficacy', title: 'Удельная отдача', severity: 'ok', detail: `${value} — правдоподобно.` };
}

/** Достаточно ли узлов сетки попадает в луч, чтобы максимум не "проскочил" между углами. */
function checkPeakResolution(doc: PhotometryDoc): AuditCheck | null {
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

  const detail = `Шаг по γ ≈ ${fmt(step, 2)}°, ширина луча 2γ½ = ${fmt(beam.fullAngle)}° — в луч попадает ≈${fmt(points, 1)} узлов сетки.`;
  if (points < MIN_POINTS_IN_BEAM) {
    return {
      id: 'peak-resolution',
      title: 'Разрешение по углу',
      severity: 'warning',
      detail: `${detail} Для узкой оптики этого мало: истинный максимум может лежать между измеренными углами.`,
    };
  }
  return { id: 'peak-resolution', title: 'Разрешение по углу', severity: 'ok', detail };
}

/** Длинные серии одинаковых ненулевых значений — типичный след ручной правки или интерполяции. */
function checkPlateaus(doc: PhotometryDoc): AuditCheck {
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
      title: 'Полки в таблице',
      severity: 'warning',
      detail:
        `Найдено ${runs} участков подряд идущих одинаковых значений (самый длинный — ${longest} точек). ` +
        'Обычно это артефакт гониометра или ручной правки, а не реальная форма КСС.',
    };
  }
  return { id: 'plateaus', title: 'Полки в таблице', severity: 'ok', detail: 'Подряд идущих одинаковых значений не найдено.' };
}

/** Плоскость целиком в нулях при ненулевых соседях — признак битого или обрезанного файла. */
function checkEmptyPlanes(doc: PhotometryDoc): AuditCheck | null {
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
      title: 'Пустые плоскости',
      severity: 'error',
      detail:
        `Плоскости C = ${empty.slice(0, 8).map((c) => fmt(c, 0)).join(', ')}${empty.length > 8 ? '…' : ''} ` +
        'заполнены нулями, хотя остальные содержат данные — файл обрезан или собран с ошибкой.',
    };
  }
  return null;
}

function checkDimensions(doc: PhotometryDoc): AuditCheck {
  if (doc.width === 0 && doc.length === 0 && doc.height === 0) {
    return {
      id: 'dimensions',
      title: 'Габариты светового отверстия',
      severity: 'warning',
      detail:
        'Все три размера нулевые — расчётные пакеты примут светильник за точечный источник. ' +
        'Для расчётов в ближней зоне и учёта самозатенения размеры стоит указать (вкладка «Форма светильника»).',
    };
  }
  return {
    id: 'dimensions',
    title: 'Габариты светового отверстия',
    severity: 'ok',
    detail: `Ш×Д×В = ${fmt(doc.width, 3)} × ${fmt(doc.length, 3)} × ${fmt(doc.height, 3)} м.`,
  };
}

function checkKeywords(doc: PhotometryDoc): AuditCheck {
  const present = new Set(doc.keywords.map((k) => k.key.toUpperCase()));
  const missing = REQUIRED_KEYWORDS.filter((k) => !present.has(k) || !doc.keywords.find((kw) => kw.key.toUpperCase() === k)?.value.trim());
  if (missing.length > 0) {
    return {
      id: 'keywords',
      title: 'Ключевые слова шапки',
      severity: 'warning',
      detail: `Не заполнены: ${missing.map((k) => `[${k}]`).join(', ')}. Для каталога и выгрузки в базы их обычно требуют.`,
    };
  }
  return { id: 'keywords', title: 'Ключевые слова шапки', severity: 'ok', detail: 'Обязательные ключевые слова заполнены.' };
}

function checkAngleGrid(doc: PhotometryDoc): AuditCheck {
  const problems: string[] = [];
  for (let i = 1; i < doc.vertAngles.length; i++) {
    if (doc.vertAngles[i] <= doc.vertAngles[i - 1]) {
      problems.push(`углы γ не возрастают (позиция ${i}: ${doc.vertAngles[i - 1]} → ${doc.vertAngles[i]})`);
      break;
    }
  }
  for (let i = 1; i < doc.horizAngles.length; i++) {
    if (doc.horizAngles[i] <= doc.horizAngles[i - 1]) {
      problems.push(`углы C не возрастают (позиция ${i}: ${doc.horizAngles[i - 1]} → ${doc.horizAngles[i]})`);
      break;
    }
  }
  for (let i = 0; i < doc.candela.length; i++) {
    if (doc.candela[i] < 0) {
      problems.push('в таблице есть отрицательные значения силы света');
      break;
    }
  }
  if (problems.length > 0) {
    return { id: 'angle-grid', title: 'Угловая сетка и значения', severity: 'error', detail: `${problems.join('; ')}.` };
  }

  const gMax = doc.vertAngles[doc.vertAngles.length - 1] ?? 0;
  const kindName: Record<string, string> = {
    axial: 'осевая (одна плоскость)',
    quadrant: 'четверть (C 0…90°)',
    bilateral: 'половина (C 0…180°)',
    full: 'полный круг по C',
  };
  const kind = detectSymmetry(doc.horizAngles);
  return {
    id: 'angle-grid',
    title: 'Угловая сетка и значения',
    severity: 'ok',
    detail: `γ 0…${fmt(gMax, 0)}°, ${doc.numVertAngles} углов; симметрия — ${kindName[kind]}, ${doc.numHorizAngles} плоскостей.`,
  };
}

/** Замечания парсера (формат файла) — включаем в общий отчёт, чтобы проверка была одна. */
function checksFromWarnings(doc: PhotometryDoc): AuditCheck[] {
  return doc.warnings
    .filter((w) => w.code !== 'negative-candela' && w.code !== 'non-monotonic-angles') // уже покрыты checkAngleGrid
    .map((w, i) => ({
      id: `parse-${w.code}-${i}`,
      title: 'При чтении файла',
      severity: w.severity === 'error' ? ('error' as const) : w.severity === 'warning' ? ('warning' as const) : ('info' as const),
      detail: w.message,
    }));
}

export function auditDoc(doc: PhotometryDoc): AuditReport {
  const flux = computeFlux(doc);

  const checks: AuditCheck[] = [
    checkPhotometricType(doc),
    checkAngleGrid(doc),
    checkDeclaredFlux(doc, flux.totalLumens),
    checkEfficiency(flux.efficiency),
    checkEfficacy(flux.luminousEfficacy),
    checkPeakResolution(doc),
    checkEmptyPlanes(doc),
    checkPlateaus(doc),
    checkDimensions(doc),
    checkKeywords(doc),
    ...checksFromWarnings(doc),
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

const SEVERITY_MARK: Record<AuditSeverity, string> = {
  error: '[!]',
  warning: '[?]',
  info: '[i]',
  ok: '[+]',
};

/** Отчёт в виде текста — чтобы отправить поставщику или приложить к задаче. */
export function formatAuditReport(fileName: string, report: AuditReport): string {
  const lines = [`Проверка фотометрического файла: ${fileName}`, `Итог: ${VERDICT_TEXT[report.verdict]}`, ''];
  for (const c of report.checks) {
    lines.push(`${SEVERITY_MARK[c.severity]} ${c.title}: ${c.detail}`);
  }
  lines.push('', 'Отчёт подготовлен в www.ieseditor.ru');
  return lines.join('\n');
}

export { VERDICT_TEXT };
