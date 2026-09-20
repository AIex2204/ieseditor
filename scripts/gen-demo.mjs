// Генерирует демонстрационный IES-файл для пустого экрана: несимметричная
// КСС со смещённым от надира максимумом, разной шириной в продольной и
// поперечной плоскостях, шумом гониометра и мусорными хвостами в широких
// углах — чтобы каждый инструмент (выравнивание, симметризация, сглаживание,
// чистка, поток, поворот) имел на демо-файле видимый эффект.
//
// Файл детерминированный (свой ГПСЧ с фиксированным зерном), поэтому
// перегенерация даёт тот же результат. Запуск: node scripts/gen-demo.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../public/demo-asymmetric.ies', import.meta.url));

// --- детерминированный ГПСЧ (LCG) ---
let seed = 20260920;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const noise = () => (rnd() - 0.5) * 2; // [-1, 1]

// --- сетка ---
const gStep = 2.5;
const cStep = 10;
const vert = [];
for (let g = 0; g <= 90 + 1e-9; g += gStep) vert.push(Math.round(g * 10) / 10);
const horiz = [];
for (let c = 0; c < 360 - 1e-9; c += cStep) horiz.push(c); // 0..350

const nV = vert.length; // 37
const nH = horiz.length; // 36

// --- модель несимметричной наклонённой КСС ---
const IMAX = 3200;
const gammaTilt = 13; // максимум смещён от надира на 13°
const cPeak = 210; // …в сторону C=210° (перекос и по фронту, и вбок)
const wLong = 22; // полуширина в продольной плоскости (узко)
const wTrans = 44; // …в поперечной (широко) — эллиптичность
const rad = (d) => (d * Math.PI) / 180;

function baseIntensity(gamma, c) {
  const gp = gammaTilt * Math.cos(rad(c - cPeak)); // смещение пика по γ зависит от азимута → наклон
  const w = wLong + (wTrans - wLong) * Math.sin(rad(c)) ** 2; // ширина зависит от плоскости
  const x = (gamma - gp) / w;
  return IMAX * Math.exp(-0.5 * x * x);
}

// нативный поток одной табличной точки надира одинаков для всех C —
// физически надир единствен; считаем его один раз как среднее по азимутам
let nadir = 0;
for (const c of horiz) nadir += baseIntensity(0, c);
nadir /= nH;

// --- заполняем таблицу с шумом и мусором ---
// candela[iH][iV]
const cd = [];
for (let iH = 0; iH < nH; iH++) {
  const c = horiz[iH];
  const row = [];
  for (let iV = 0; iV < nV; iV++) {
    const g = vert[iV];
    let v;
    if (iV === 0) {
      v = nadir; // единый надир, без шума
    } else {
      v = baseIntensity(g, c);
      v *= 1 + 0.05 * noise(); // шум гониометра ±5%
      // редкие «полки» — соседние равные значения (артефакт оцифровки)
      if (rnd() < 0.08) v = Math.round(v / 20) * 20;
      // мусорные хвосты: за пределами тела КСС почти ноль, но иногда
      // проскакивают мелкие ненулевые значения после нулей
      if (g >= 72) {
        v = rnd() < 0.25 ? IMAX * (0.001 + 0.004 * rnd()) : 0;
      }
      if (v < 0) v = 0;
    }
    row.push(v);
  }
  cd.push(row);
}

// --- зональный поток для заявленного значения в шапке ---
let flux = 0;
for (let iV = 0; iV < nV; iV++) {
  const g = vert[iV];
  const gm = iV === 0 ? 0 : (vert[iV - 1] + g) / 2;
  const gp = iV === nV - 1 ? 90 : (g + vert[iV + 1]) / 2;
  const dOmega = 2 * Math.PI * (Math.cos(rad(gm)) - Math.cos(rad(gp)));
  let mean = 0;
  for (let iH = 0; iH < nH; iH++) mean += cd[iH][iV];
  mean /= nH;
  flux += mean * dOmega;
}
const lumens = Math.round(flux);
const watts = Math.round((lumens / 125) * 10) / 10; // отдача ≈125 лм/Вт

// --- сериализация в LM-63-2002 ---
const num = (n) => (Math.round(n * 10) / 10).toString();
const lines = [];
lines.push('IESNA:LM-63-2002');
lines.push('[TEST] demo');
lines.push('[TESTLAB] IES Editor');
lines.push('[ISSUEDATE] 2026-09-20');
lines.push('[MANUFAC] ieseditor.ru');
lines.push('[LUMCAT] DEMO-ASYM');
lines.push('[LUMINAIRE] Демонстрационный светильник: несимметричная КСС');
lines.push('[MORE] Синтетический файл со смещённым максимумом, шумом и мусорными хвостами — для проверки инструментов.');
lines.push('TILT=NONE');
lines.push(`1 ${lumens} 1 ${nV} ${nH} 1 2 0.3 0.3 0.1`);
lines.push(`1.0 1.0 ${watts}`);

function wrap(nums) {
  // как в реальных файлах — переносим длинные строки, но держим читаемо
  const out = [];
  for (let i = 0; i < nums.length; i += 12) out.push(nums.slice(i, i + 12).join(' '));
  return out;
}
for (const line of wrap(vert.map((v) => num(v)))) lines.push(line);
for (const line of wrap(horiz.map((v) => num(v)))) lines.push(line);
for (let iH = 0; iH < nH; iH++) {
  for (const line of wrap(cd[iH].map((v) => num(v)))) lines.push(line);
}

writeFileSync(OUT, lines.join('\r\n') + '\r\n', 'utf8');
console.log(`demo → ${OUT}`);
console.log(`  сетка ${nV}×${nH}, поток ≈ ${lumens} лм, ${watts} Вт, максимум смещён на ${gammaTilt}° к C${cPeak}`);
