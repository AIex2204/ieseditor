// Форма светового отверстия (п. 7 доп. правки): LM-63 кодирует не только
import { useT, useLang } from '../../i18n/i18n';
// размеры, но и форму знаком Width/Length/Height — отрицательное значение
// означает круглое/эллиптическое сечение по этой оси, модуль — диаметр.
// См. общепринятую конвенцию (AGi32/DesignLights и практику DIALux/Relux):
// точка: 0,0,0 · прямоугольник: w,l,h>0 · диск: -d,0,0 · цилиндр: -d,0,h
// · сфера/эллипсоид: -d,0,-d · эллипс вдоль длины: -w,l,h · эллипс вдоль
// ширины: w,-l,h. На саму КСС не влияет — используется расчётными
// пакетами для самозатенения в ближней зоне.
import { useState } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { DecimalInput } from '../common/DecimalInput';

type ShapeType = 'point' | 'rect' | 'disc' | 'cylinder' | 'ellipseLength' | 'ellipseWidth' | 'sphere' | 'custom';

const SHAPE_LABELS: Record<ShapeType, string> = {
  point: 'Точка (безразмерный источник)',
  rect: 'Прямоугольник / прямоугольный бокс',
  disc: 'Диск (плоский круг)',
  cylinder: 'Вертикальный цилиндр',
  ellipseLength: 'Эллипс вдоль длины (плоскость C0–C180)',
  ellipseWidth: 'Эллипс вдоль ширины (плоскость C90–C270)',
  sphere: 'Сфера / эллипсоид',
  custom: 'Другое (нестандартная комбинация)',
};

function detectShape(w: number, l: number, h: number): ShapeType {
  if (w === 0 && l === 0) return 'point';
  if (w < 0 && l === 0 && h < 0) return 'sphere';
  if (w < 0 && l === 0 && h > 0) return 'cylinder';
  if (w < 0 && l === 0 && h <= 0) return 'disc';
  if (w < 0 && l > 0) return 'ellipseLength';
  if (w > 0 && l < 0) return 'ellipseWidth';
  if (w > 0 && l > 0) return 'rect';
  return 'custom';
}

function buildDims(
  type: ShapeType,
  diameter: number,
  lengthDim: number,
  widthDim: number,
  heightDim: number
): { width: number; length: number; height: number } {
  switch (type) {
    case 'point':
      return { width: 0, length: 0, height: 0 };
    case 'disc':
      return { width: -Math.abs(diameter), length: 0, height: 0 };
    case 'cylinder':
      return { width: -Math.abs(diameter), length: 0, height: Math.abs(heightDim) };
    case 'sphere':
      return { width: -Math.abs(diameter), length: 0, height: -Math.abs(diameter) };
    case 'ellipseLength':
      return { width: -Math.abs(widthDim), length: Math.abs(lengthDim), height: Math.abs(heightDim) };
    case 'ellipseWidth':
      return { width: Math.abs(widthDim), length: -Math.abs(lengthDim), height: Math.abs(heightDim) };
    case 'rect':
    default:
      return { width: Math.abs(widthDim), length: Math.abs(lengthDim), height: Math.abs(heightDim) };
  }
}

export function ShapeEditor({ draft, onChange }: { draft: PhotometryDoc; onChange: (next: PhotometryDoc) => void }) {
  const [type, setType] = useState<ShapeType>(() => detectShape(draft.width, draft.length, draft.height));
  const [diameter, setDiameter] = useState(() => Math.abs(draft.width) || Math.abs(draft.height) || 0.1);
  const [lengthDim, setLengthDim] = useState(() => Math.abs(draft.length) || Math.abs(draft.width) || 0.1);
  const t = useT();
  const lang = useLang();
  const [widthDim, setWidthDim] = useState(() => Math.abs(draft.width) || Math.abs(draft.length) || 0.1);
  const [heightDim, setHeightDim] = useState(() => Math.abs(draft.height) || 0);

  function apply(nextType: ShapeType, d = diameter, l = lengthDim, w = widthDim, h = heightDim) {
    onChange({ ...draft, ...buildDims(nextType, d, l, w, h) });
  }

  function changeType(nextType: ShapeType) {
    setType(nextType);
    apply(nextType);
  }

  return (
    <div className="editor-section">
      <h4>{t('Форма светового отверстия')}</h4>
      <p className="tool-hint">
        {lang === 'en'
          ? 'In LM-63, Width/Length/Height encode not just sizes but the shape too: a negative value along an axis means a round/elliptical section (its absolute value is the diameter). It does not affect the distribution itself; calculation packages use it for near-field self-shadowing.'
          : 'Width/Length/Height в LM-63 кодируют не только размеры, но и форму: отрицательное значение по оси означает круглое/эллиптическое сечение (по модулю — диаметр). На саму КСС не влияет, используется расчётными пакетами для самозатенения в ближней зоне.'}
      </p>

      <label className="editor-field">
        <span>{t('Форма')}</span>
        <select value={type} onChange={(e) => changeType(e.target.value as ShapeType)}>
          {(Object.keys(SHAPE_LABELS) as ShapeType[]).map((st) => (
            <option key={st} value={st}>
              {t(SHAPE_LABELS[st])}
            </option>
          ))}
        </select>
      </label>

      {type === 'custom' && (
        <p className="tool-hint tool-hint-error">
          {lang === 'en'
            ? `Current values (Width ${draft.width}, Length ${draft.length}, Height ${draft.height}) don't fit any standard scheme. Pick a shape above to set the sizes anew, or edit the raw numbers on the Numeric fields tab.`
            : `Текущие значения (Width ${draft.width}, Length ${draft.length}, Height ${draft.height}) не укладываются ни в одну стандартную схему. Выберите форму выше, чтобы задать размеры заново, либо правьте сырые числа на вкладке «Числовые поля».`}
        </p>
      )}

      {(type === 'disc' || type === 'cylinder' || type === 'sphere') && (
        <label className="editor-field">
          <span>{t('Диаметр, м')}</span>
          <DecimalInput
            value={diameter}
            onChange={(n) => {
              setDiameter(n);
              apply(type, n, lengthDim, widthDim, heightDim);
            }}
          />
        </label>
      )}

      {(type === 'rect' || type === 'ellipseLength' || type === 'ellipseWidth') && (
        <>
          <label className="editor-field">
            <span>{t('Длина (плоскость C0–C180), м')}</span>
            <DecimalInput
              value={lengthDim}
              onChange={(n) => {
                setLengthDim(n);
                apply(type, diameter, n, widthDim, heightDim);
              }}
            />
          </label>
          <label className="editor-field">
            <span>{t('Ширина (плоскость C90–C270), м')}</span>
            <DecimalInput
              value={widthDim}
              onChange={(n) => {
                setWidthDim(n);
                apply(type, diameter, lengthDim, n, heightDim);
              }}
            />
          </label>
        </>
      )}

      {(type === 'rect' || type === 'cylinder' || type === 'ellipseLength' || type === 'ellipseWidth') && (
        <label className="editor-field">
          <span>{t('Высота, м')}</span>
          <DecimalInput
            value={heightDim}
            onChange={(n) => {
              setHeightDim(n);
              apply(type, diameter, lengthDim, widthDim, n);
            }}
          />
        </label>
      )}

      {type === 'point' && <p className="tool-hint">{t('Источник считается точечным: все три размера равны нулю.')}</p>}

      <p className="tool-hint">
        {lang === 'en' ? 'Final values in the file' : 'Итоговые значения в файле'}: Width {draft.width}, Length {draft.length}, Height {draft.height}
      </p>
    </div>
  );
}
