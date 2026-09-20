// Разбор файлов EULUMDAT (.ldt) — читаем и конвертируем в общую модель
// PhotometryDoc того же приложения. Формат построчно-позиционный (в отличие
// от IES, где числа — свободный поток токенов): каждая строка = одно поле.
//
// Юридический момент см. в описании задачи пользователю: EULUMDAT — открытый,
// повсеместно задокументированный формат (создан в 1990 г., TU Berlin),
// его структура — общедоступный технический факт, а не охраняемый авторским
// правом код; чтение файлов в этом формате не требует лицензии — так же,
// как чтение .ies не требует лицензии на текст стандарта IESNA LM-63.
//
// Сохраняем мы всегда в IES (LM-63) — LDT только читаем.
import type { PhotometryDoc, WarningItem } from '../ies/types';
import type { SourceEncoding } from '../ies/types';

function toNum(s: string | undefined): number {
  const v = Number((s ?? '').trim().replace(',', '.'));
  return Number.isFinite(v) ? v : 0;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export interface ParseLdtResult {
  doc: PhotometryDoc;
}

export function parseLdtText(text: string, sourceEncoding: SourceEncoding): ParseLdtResult {
  const lines = text.split(/\r\n|\r|\n/).map((l) => l.trim());
  let i = 0;
  let overrun = false;
  const next = (): string => {
    if (i >= lines.length) {
      overrun = true;
      return '';
    }
    return lines[i++];
  };

  const warnings: WarningItem[] = [];

  const company = next(); // 1
  next(); // 2 — Ityp (классификация формы, не используется — LDT всегда Type C)
  const isym = Math.round(toNum(next())) as 0 | 1 | 2 | 3 | 4; // 3
  const mc = Math.max(1, Math.round(toNum(next()))); // 4
  next(); // 5 — Dc (не нужен: реальные углы читаются явным списком ниже)
  const ng = Math.max(1, Math.round(toNum(next()))); // 6
  next(); // 7 — Dg (аналогично)
  const reportNo = next(); // 8
  const luminaireName = next(); // 9
  const luminaireNo = next(); // 10
  const fileName = next(); // 11
  const dateUser = next(); // 12
  const lumLength = toNum(next()); // 13
  next(); // 14 — ширина корпуса (не нужна для luminous opening)
  next(); // 15 — высота корпуса
  const loLength = toNum(next()); // 16 — длина/диаметр светящей поверхности, мм
  const loWidth = toNum(next()); // 17 — ширина светящей поверхности, мм (0 = круглая)
  const loHeightC0 = toNum(next()); // 18
  const loHeightC90 = toNum(next()); // 19
  const loHeightC180 = toNum(next()); // 20
  const loHeightC270 = toNum(next()); // 21
  const dff = toNum(next()); // 22 — Downward Flux Fraction, %
  const lorl = toNum(next()); // 23 — Light Output Ratio Luminaire, %
  const convFactor = toNum(next()) || 1; // 24
  next(); // 25 — угол наклона при измерении (дорожное освещение)
  // ВАЖНО: nSets определяет, сколько 6-строчных блоков лампы реально
  // записано в файле дальше. Раньше здесь стоял Math.max(1, ...), из-за
  // чего при nSets=0 (файлы без данных о комплекте ламп — такое реально
  // встречается) мы всё равно читали 6 несуществующих строк как "блок
  // лампы", утаскивая на них первые 6 строк раздела Direct Ratios. Это
  // сдвигало ВСЁ, что идёт дальше по файлу, на 6 строк — в итоге к
  // моменту чтения ПОСЛЕДНЕЙ C-плоскости (обычно C180/последний азимут)
  // строки заканчивались, и она читалась нулями: КСС "обрывалась
  // пополам". Читаем ровно столько блоков, сколько реально указано.
  const nSets = Math.max(0, Math.round(toNum(next()))); // 26

  let numLampsRaw = 1;
  let lampType = '';
  let totalFluxLm = 0;
  let cct = '';
  let cri = '';
  let wattage = 0;
  for (let s = 0; s < nSets; s++) {
    const nl = toNum(next());
    const lt = next();
    const fl = toNum(next());
    const cc = next();
    const cr = next();
    const w = toNum(next());
    if (s === 0) {
      numLampsRaw = nl;
      lampType = lt;
      totalFluxLm = fl;
      cct = cc;
      cri = cr;
      wattage = w;
    }
  }
  if (nSets === 0) {
    warnings.push({
      code: 'ldt-no-lampset',
      message: 'Файл не содержит данных о комплекте ламп (число наборов = 0) — использованы значения по умолчанию (1 лампа, поток не задан).',
      severity: 'info',
    });
  } else if (nSets > 1) {
    warnings.push({
      code: 'ldt-multi-lampset',
      message: `Файл содержит ${nSets} наборов ламп — использован только первый`,
      severity: 'info',
    });
  }

  for (let k = 0; k < 10; k++) next(); // Direct ratios для индекса помещения — не переносим

  const cAngles: number[] = [];
  for (let k = 0; k < mc; k++) cAngles.push(toNum(next()));
  const gAngles: number[] = [];
  for (let k = 0; k < ng; k++) gAngles.push(toNum(next()));

  const planeCount = isym === 1 ? 1 : mc;
  const rawPlanes: number[][] = [];
  for (let p = 0; p < planeCount; p++) {
    const row: number[] = [];
    for (let g = 0; g < ng; g++) row.push(toNum(next()));
    rawPlanes.push(row);
  }

  if (overrun) {
    warnings.push({
      code: 'ldt-truncated',
      message: 'Файл короче, чем требует заголовок EULUMDAT (Mc/Ng) — недостающие значения заменены нулями. Проверьте результат.',
      severity: 'error',
    });
  }

  let horizAngles: number[];
  if (isym === 1) {
    horizAngles = [0];
  } else if (isym === 3) {
    // Хранится в порядке 270°→90° (убывание). Разворачиваем в стандартную
    // "двустороннюю" симметрию 0…180° сдвигом системы отсчёта на -90°:
    // I(C) = I(180−C) в исходных координатах ⇔ I'(C′) = I'(360−C′) при
    // C′ = C−90 — приложение уже умеет разворачивать такую симметрию
    // (см. core/photometry/symmetry.ts). C=0 в редакторе после импорта
    // соответствует исходному C=90 файла.
    horizAngles = cAngles.map((c) => {
      let v = (c - 90) % 360;
      if (v < 0) v += 360;
      return v;
    });
    warnings.push({
      code: 'ldt-isym3-shift',
      message:
        'Симметрия LDT относительно плоскости C90–C270: азимут переиндексирован на −90°, чтобы совпасть с внутренним представлением. C0 в редакторе соответствует исходному C90 файла.',
      severity: 'info',
    });
  } else {
    horizAngles = cAngles.slice(0, planeCount);
  }

  const order = horizAngles.map((_, idx) => idx).sort((a, b) => horizAngles[a] - horizAngles[b]);
  const sortedHoriz = order.map((idx) => horizAngles[idx]);
  const sortedRaw = order.map((idx) => rawPlanes[idx] ?? rawPlanes[0] ?? new Array(ng).fill(0));

  // Если поток лампы неизвестен (nSets=0 или totalFluxLm не задан), делить
  // на него нельзя — вся таблица обнулится. В этом случае, как и при явной
  // отрицательной "числе ламп", трактуем таблицу как уже абсолютные канделы.
  const isAbsolute = numLampsRaw < 0 || totalFluxLm <= 0;
  const numLamps = Math.max(1, Math.abs(Math.round(numLampsRaw)) || 1);
  const scale = isAbsolute ? convFactor : (convFactor * totalFluxLm) / 1000;

  const numVertAngles = ng;
  const numHorizAngles = sortedHoriz.length;
  const candela = new Float64Array(numHorizAngles * numVertAngles);
  for (let iH = 0; iH < numHorizAngles; iH++) {
    for (let iG = 0; iG < numVertAngles; iG++) {
      candela[iH * numVertAngles + iG] = Math.max(0, sortedRaw[iH][iG] * scale);
    }
  }

  const mmToM = (v: number) => v / 1000;
  const openingLength = loLength || lumLength;
  const openingHeights = [loHeightC0, loHeightC90, loHeightC180, loHeightC270].filter((h) => h !== 0);
  const openingHeight = openingHeights.length ? Math.max(...openingHeights) : 0;

  let width: number;
  let length: number;
  const height = mmToM(openingHeight);
  if (openingLength === 0 && loWidth === 0) {
    width = 0;
    length = 0;
  } else if (loWidth === 0) {
    // Ширина не задана — по конвенции EULUMDAT это круглая/эллиптическая
    // светящая поверхность, длина/диаметр указан в поле "длина".
    width = -mmToM(Math.abs(openingLength));
    length = 0;
  } else {
    width = mmToM(loWidth);
    length = mmToM(openingLength);
  }

  const keywords = [
    { key: 'MANUFAC', value: company },
    { key: 'LUMINAIRE', value: luminaireName },
    { key: 'LUMCAT', value: luminaireNo },
    { key: 'TEST', value: reportNo },
    ...(lampType ? [{ key: 'LAMP', value: lampType }] : []),
    ...(cct ? [{ key: 'CCT', value: cct }] : []),
    ...(cri ? [{ key: 'CRI', value: cri }] : []),
    { key: '_LDT_SOURCE', value: `EULUMDAT: ${fileName || dateUser}`.trim() },
  ].filter((k) => k.value && k.value.trim().length > 0);

  warnings.push({
    code: 'ldt-import',
    message: `Файл импортирован из EULUMDAT (.ldt) и сконвертирован в модель LM-63. Downward Flux Fraction ${fmtPct(dff)} и Light Output Ratio ${fmtPct(lorl)} из исходного файла в поля LM-63 не переносятся — при необходимости сверьте отдельно. Сохранение всегда выполняется в формате IES.`,
    severity: 'info',
  });

  const doc: PhotometryDoc = {
    format: 'LM-63-2002',
    keywords,
    tilt: { mode: 'NONE' },
    numLamps,
    lumensPerLamp: isAbsolute ? -1 : numLamps > 0 ? totalFluxLm / numLamps : totalFluxLm,
    candelaMultiplier: 1,
    numVertAngles,
    numHorizAngles,
    photometricType: 1,
    unitsType: 2,
    width,
    length,
    height,
    ballastFactor: 1,
    futureUse: 1,
    inputWatts: wattage,
    vertAngles: gAngles,
    horizAngles: sortedHoriz,
    candela,
    sourceEncoding,
    warnings,
  };

  return { doc };
}
