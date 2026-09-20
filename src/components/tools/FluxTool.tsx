import { useEffect, useMemo, useState } from 'react';
import type { PhotometryDoc } from '../../core/ies/types';
import { currentFlux, scaleFluxTo, type FluxReference } from '../../core/photometry/scaleFlux';
import { DecimalInput } from '../common/DecimalInput';
import { useLiveEdit } from './useLiveEdit';

function fmt(n: number, digits = 1): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Поток, мощность и светоотдача связаны: поток = мощность × светоотдача.
 * Правим одно — пересчитывается зависимое, а не «повисает» рассогласованным:
 *   поток → пересчитываем светоотдачу (мощность железа не изменилась);
 *   мощность → сохраняем светоотдачу, пересчитываем поток (тот же светодиод,
 *              больше тока — пропорционально больше света);
 *   светоотдача → сохраняем мощность, пересчитываем поток.
 * Изменение потока масштабирует таблицу силы света, мощность пишется в
 * поле файла.
 */
export function FluxTool({ sourceDoc }: { sourceDoc: PhotometryDoc }) {
  const { baseDoc, write } = useLiveEdit(sourceDoc);

  const [reference, setReference] = useState<FluxReference>('computed');
  const computedFlux = useMemo(() => currentFlux(baseDoc, 'computed'), [baseDoc]);
  const declaredFlux = baseDoc.lumensPerLamp > 0 ? baseDoc.lumensPerLamp * Math.max(baseDoc.numLamps, 1) : null;
  const baseline = reference === 'computed' ? computedFlux : (declaredFlux ?? computedFlux);

  // Ровно опорное значение, без округления: иначе простое открытие
  // инструмента уже масштабировало бы таблицу силы света (5997,4 → 5997)
  // и переписывало заявленный поток лампы.
  const [flux, setFlux] = useState(() => baseline);
  const [watts, setWatts] = useState(() => baseDoc.inputWatts);
  const [efficacy, setEfficacy] = useState(() => (baseDoc.inputWatts > 0 ? round2(baseline / baseDoc.inputWatts) : 0));

  function changeReference(next: FluxReference) {
    setReference(next);
    const nextBaseline = next === 'computed' ? computedFlux : (declaredFlux ?? computedFlux);
    setFlux(nextBaseline);
    if (watts > 0) setEfficacy(round2(nextBaseline / watts));
  }

  function changeFlux(v: number) {
    setFlux(v);
    if (watts > 0) setEfficacy(round2(v / watts));
  }

  function changeWatts(v: number) {
    setWatts(v);
    if (v > 0 && efficacy > 0) setFlux(round1(v * efficacy));
    else if (v > 0) setEfficacy(round2(flux / v));
  }

  function changeEfficacy(v: number) {
    setEfficacy(v);
    if (watts > 0 && v > 0) setFlux(round1(watts * v));
  }

  const valid = flux > 0;

  const preview = useMemo(() => {
    if (!valid) return null;
    // ничего не тронули — возвращаем исходный документ как есть, чтобы
    // открытие инструмента не считалось правкой файла
    if (flux === baseline && watts === baseDoc.inputWatts) return baseDoc;
    try {
      const scaled = scaleFluxTo(baseDoc, flux, reference);
      return watts === baseDoc.inputWatts ? scaled : { ...scaled, inputWatts: watts };
    } catch {
      return null;
    }
  }, [baseDoc, flux, watts, reference, baseline, valid]);

  useEffect(() => {
    if (preview) write(preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  return (
    <div className="tool-form">
      <p className="tool-hint">
        Расчётный поток: <b>{fmt(computedFlux)} лм</b>
        {declaredFlux !== null && (
          <>
            {' '}
            · заявленный: <b>{fmt(declaredFlux)} лм</b>
          </>
        )}
      </p>

      <label className="tool-field">
        <span>Опорное значение</span>
        <select value={reference} onChange={(e) => changeReference(e.target.value as FluxReference)}>
          <option value="computed">Расчётное по КСС</option>
          <option value="declared" disabled={declaredFlux === null}>
            Заявленное в файле
          </option>
        </select>
      </label>

      <label className="tool-field">
        <span>Поток, лм</span>
        <DecimalInput value={flux} onChange={changeFlux} />
      </label>

      <label className="tool-field">
        <span>Мощность, Вт</span>
        <DecimalInput value={watts} onChange={changeWatts} />
      </label>

      <label className="tool-field">
        <span>Светоотдача, лм/Вт</span>
        <DecimalInput value={efficacy} onChange={changeEfficacy} disabled={watts <= 0} />
      </label>

      {!valid && <p className="tool-hint tool-hint-error">Поток должен быть положительным</p>}
      {watts <= 0 && (
        <p className="tool-hint">Мощность в файле не задана — укажите её, чтобы считать светоотдачу.</p>
      )}
    </div>
  );
}
