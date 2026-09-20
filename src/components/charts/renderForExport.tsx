// Диаграммы для архива рисуются отдельно, во временном контейнере за
// пределами экрана: иначе картинки зависели бы от того, какая вкладка
// открыта в момент выгрузки (на «Редакторе полей» графиков в DOM нет).
import { createRoot } from 'react-dom/client';
import type { PhotometryDoc } from '../../core/ies/types';
import { choosePlanes } from '../../core/photometry/choosePlanes';
import { findImax } from '../../core/photometry/metrics';
import type { ArchiveChartImage } from '../../core/ies/exportArchive';
import { PolarChart } from './PolarChart';
import { CartesianChart } from './CartesianChart';
import { collectChartImages } from './svgExport';

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export async function renderChartsForExport(doc: PhotometryDoc): Promise<ArchiveChartImage[]> {
  const host = document.createElement('div');
  // Контейнер должен быть в документе (иначе не разрешатся CSS-переменные и
  // шрифты), но не должен мелькать на экране.
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:920px;pointer-events:none;';
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    const planes = choosePlanes(doc);
    const radialMax = findImax(doc).value;
    const maxDirection = (() => {
      const m = findImax(doc);
      return { gamma: m.gamma, c: m.c };
    })();

    root.render(
      <div className="chart-grid">
        {planes.map((p, i) => (
          <PolarChart
            key={`polar-${p.cPlane}`}
            doc={doc}
            cPlane={p.cPlane}
            label={`КСС ${p.label}`}
            radialMax={radialMax}
            maxDirection={i === 1 ? maxDirection : undefined}
          />
        ))}
        {planes.map((p, i) => (
          <CartesianChart
            key={`cart-${p.cPlane}`}
            doc={doc}
            cPlane={p.cPlane}
            label={`Декарт ${p.label}`}
            radialMax={radialMax}
            maxDirection={i === 1 ? maxDirection : undefined}
          />
        ))}
      </div>
    );

    // двух кадров достаточно, чтобы React успел смонтировать SVG
    await nextFrame();
    await nextFrame();
    return await collectChartImages(host);
  } finally {
    root.unmount();
    host.remove();
  }
}
