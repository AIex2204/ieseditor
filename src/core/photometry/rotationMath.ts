// Векторная геометрия для поворотов КСС. Система координат: ось Z — надир
// (γ=0, "вниз" от светильника), плоскость XY — горизонт; ось X — азимут
// C=0, ось Y — азимут C=90. n(γ,C) = (sinγ·cosC, sinγ·sinC, cosγ).
export type Vec3 = [number, number, number];
export type Mat3 = [number, number, number, number, number, number, number, number, number]; // row-major 3x3

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function directionFromAngles(gammaDeg: number, cDeg: number): Vec3 {
  const g = gammaDeg * DEG2RAD;
  const c = cDeg * DEG2RAD;
  return [Math.sin(g) * Math.cos(c), Math.sin(g) * Math.sin(c), Math.cos(g)];
}

export function anglesFromDirection([x, y, z]: Vec3): { gamma: number; c: number } {
  const zc = Math.max(-1, Math.min(1, z));
  const gamma = Math.acos(zc) * RAD2DEG;
  let c = Math.atan2(y, x) * RAD2DEG;
  if (c < 0) c += 360;
  return { gamma, c };
}

export function matVec(m: Mat3, [x, y, z]: Vec3): Vec3 {
  return [
    m[0] * x + m[1] * y + m[2] * z,
    m[3] * x + m[4] * y + m[5] * z,
    m[6] * x + m[7] * y + m[8] * z,
  ];
}

export function matMul(a: Mat3, b: Mat3): Mat3 {
  const r = new Array(9) as number[];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r[i * 3 + j] = a[i * 3 + 0] * b[0 * 3 + j] + a[i * 3 + 1] * b[1 * 3 + j] + a[i * 3 + 2] * b[2 * 3 + j];
    }
  }
  return r as Mat3;
}

export function matTranspose(m: Mat3): Mat3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

export const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function rotZ(deg: number): Mat3 {
  const t = deg * DEG2RAD;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

export function rotY(deg: number): Mat3 {
  const t = deg * DEG2RAD;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

export function rotX(deg: number): Mat3 {
  const t = deg * DEG2RAD;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

function normalize([x, y, z]: Vec3): Vec3 {
  const len = Math.sqrt(x * x + y * y + z * z) || 1;
  return [x / len, y / len, z / len];
}

/**
 * Матрица поворота, переводящая единичный вектор `from` в единичный вектор
 * `to` (формула Родрига). Используется выравниванием — построить поворот,
 * переносящий направление максимума/центра тяжести в надир.
 */
export function rotationBetweenVectors(fromRaw: Vec3, toRaw: Vec3): Mat3 {
  const from = normalize(fromRaw);
  const to = normalize(toRaw);
  const dot = from[0] * to[0] + from[1] * to[1] + from[2] * to[2];

  if (dot > 1 - 1e-12) return IDENTITY; // уже совпадают
  if (dot < -1 + 1e-12) {
    // противоположные направления — поворот на 180° вокруг любой оси,
    // перпендикулярной from
    const helper: Vec3 = Math.abs(from[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const axis = normalize(cross(from, helper));
    return rotationAboutAxis(axis, 180);
  }

  const axis = cross(from, to); // не нормируем — |axis| = sinθ, используется формулой ниже
  const s = Math.sqrt(axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2]);
  const kx = axis[0] / s;
  const ky = axis[1] / s;
  const kz = axis[2] / s;
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
  return rotationAboutAxis([kx, ky, kz], angle * RAD2DEG);
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function rotationAboutAxis(axisRaw: Vec3, deg: number): Mat3 {
  const [kx, ky, kz] = normalize(axisRaw);
  const t = deg * DEG2RAD;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const ic = 1 - c;
  return [
    c + kx * kx * ic, kx * ky * ic - kz * s, kx * kz * ic + ky * s,
    ky * kx * ic + kz * s, c + ky * ky * ic, ky * kz * ic - kx * s,
    kz * kx * ic - ky * s, kz * ky * ic + kx * s, c + kz * kz * ic,
  ];
}

/**
 * Раскладывает направление v в углы (tiltX, tiltY) такие, что
 * Ry(tiltY)·Rx(tiltX)·v = (0,0,1) — т.е. поворот вокруг оси X (наклон в
 * плоскости C90–C270), применённый первым, затем поворот вокруг оси Y
 * (наклон в плоскости C0–C180), приводят v точно в надир.
 */
export function decomposeToNadir(v: Vec3): { tiltXDeg: number; tiltYDeg: number } {
  const [sx, sy, sz] = normalize(v);
  const tiltX = Math.atan2(sy, sz) * RAD2DEG;
  const s1z = Math.sqrt(sy * sy + sz * sz);
  const tiltY = Math.atan2(-sx, s1z) * RAD2DEG;
  return { tiltXDeg: tiltX, tiltYDeg: tiltY };
}
