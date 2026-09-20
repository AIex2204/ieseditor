// Внутренняя модель фотометрического файла IES (LM-63).
// Ядро не зависит от React — только чистые данные и функции над ними.

export type IesFormat =
  | 'LM-63-1986'
  | 'LM-63-1991'
  | 'LM-63-1995'
  | 'LM-63-2002'
  | 'LM-63-2019'
  | 'LM-63-2025';

export type SourceEncoding = 'utf-8' | 'windows-1251';

export interface Keyword {
  key: string;
  value: string;
}

export type TiltMode = 'NONE' | 'INCLUDE' | 'FILE';

export interface TiltData {
  mode: TiltMode;
  fileName?: string;
  /** Геометрия лампы: 1 = вертикальная, 2 = горизонтальная симметричная, 3 = горизонтальная несимметричная. */
  lampToLuminaireGeometry?: 1 | 2 | 3;
  angles?: number[];
  factors?: number[];
}

export type PhotometricType = 1 | 2 | 3; // 1=C, 2=B, 3=A
export type UnitsType = 1 | 2; // 1=футы, 2=метры

export interface WarningItem {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

/**
 * Полная модель фотометрического файла.
 * candela хранится в виде плоского Float64Array с индексацией
 * [ iHoriz * nVert + iVert ], где iHoriz — индекс в horizAngles (C),
 * iVert — индекс в vertAngles (γ). Значения УЖЕ умножены на candelaMultiplier
 * (то есть это "настоящие" канделы) — множитель хранится отдельно только
 * для того, чтобы знать, как он был записан в исходном файле.
 */
export interface PhotometryDoc {
  format: IesFormat;
  keywords: Keyword[];
  tilt: TiltData;

  numLamps: number;
  lumensPerLamp: number; // -1 = абсолютная фотометрия
  candelaMultiplier: number;
  numVertAngles: number;
  numHorizAngles: number;
  photometricType: PhotometricType;
  unitsType: UnitsType;
  width: number;
  length: number;
  height: number;

  ballastFactor: number;
  futureUse: number; // поле file generation type / ballast-lamp photometric factor в разных версиях
  inputWatts: number;

  vertAngles: number[]; // γ, градусы, длина numVertAngles
  horizAngles: number[]; // C, градусы, длина numHorizAngles
  /** [iHoriz * numVertAngles + iVert], реальные канделы */
  candela: Float64Array;

  sourceEncoding: SourceEncoding;
  warnings: WarningItem[];
}

export function candelaAt(doc: PhotometryDoc, iHoriz: number, iVert: number): number {
  return doc.candela[iHoriz * doc.numVertAngles + iVert];
}

export function setCandelaAt(doc: PhotometryDoc, iHoriz: number, iVert: number, value: number): void {
  doc.candela[iHoriz * doc.numVertAngles + iVert] = value;
}

export function cloneDoc(doc: PhotometryDoc): PhotometryDoc {
  return {
    ...doc,
    keywords: doc.keywords.map((k) => ({ ...k })),
    tilt: {
      ...doc.tilt,
      angles: doc.tilt.angles ? [...doc.tilt.angles] : undefined,
      factors: doc.tilt.factors ? [...doc.tilt.factors] : undefined,
    },
    vertAngles: [...doc.vertAngles],
    horizAngles: [...doc.horizAngles],
    candela: Float64Array.from(doc.candela),
    warnings: doc.warnings.map((w) => ({ ...w })),
  };
}
