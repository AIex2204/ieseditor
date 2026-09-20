// Выгрузка отрисованной диаграммы как самостоятельного изображения.
// Диаграммы рисуются CSS-переменными (var(--border) и т.п.) — вне страницы
// они не существуют, поэтому при сериализации подставляем литеральные
// значения, иначе картинка открывается чёрной или вовсе без линий.

const VAR_RE = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g;

function resolveCssVars(text: string): string {
  const root = getComputedStyle(document.documentElement);
  return text.replace(VAR_RE, (_match, name: string, fallback?: string) => {
    const value = root.getPropertyValue(name).trim();
    return value || (fallback ?? '').trim() || '#000000';
  });
}

/** Самостоятельный SVG: с размерами, белым фоном и без CSS-переменных. */
export function serializeChartSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.removeAttribute('style');

  const box = svg.viewBox.baseVal;
  const width = box && box.width > 0 ? box.width : svg.clientWidth;
  const height = box && box.height > 0 ? box.height : svg.clientHeight;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  // Шрифт текст внутри SVG наследует со страницы — в отдельном файле этого
  // наследования нет, поэтому фиксируем стек явно.
  const fontFamily = getComputedStyle(svg).fontFamily || 'Arial, sans-serif';
  clone.setAttribute('font-family', fontFamily);

  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('x', '0');
  background.setAttribute('y', '0');
  background.setAttribute('width', String(width));
  background.setAttribute('height', String(height));
  background.setAttribute('fill', '#ffffff');
  clone.insertBefore(background, clone.firstChild);

  const text = new XMLSerializer().serializeToString(clone);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${resolveCssVars(text)}`;
}

/** Растр для вставки в презентацию или каталог; scale=2 даёт запас по резкости. */
export async function svgToPngBytes(svgText: string, scale = 2): Promise<Uint8Array | null> {
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('не удалось отрисовать SVG'));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round((image.naturalWidth || 460) * scale);
    canvas.height = Math.round((image.naturalHeight || 520) * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!pngBlob) return null;
    return new Uint8Array(await pngBlob.arrayBuffer());
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Собирает SVG (и PNG) всех диаграмм, отрисованных в указанном контейнере. */
export async function collectChartImages(
  container: HTMLElement | null
): Promise<{ label: string; svg: string; png: Uint8Array | null }[]> {
  if (!container) return [];
  const charts = Array.from(container.querySelectorAll<HTMLElement>('[data-chart-label]'));
  const out: { label: string; svg: string; png: Uint8Array | null }[] = [];
  for (const chart of charts) {
    const svg = chart.querySelector('svg');
    if (!svg) continue;
    // имя берём из data-атрибута, а не из первого <text>: в полярной
    // диаграмме первым в DOM идёт не заголовок, а подпись угловой шкалы
    const label = chart.dataset.chartLabel?.trim() || `диаграмма ${out.length + 1}`;
    const svgText = serializeChartSvg(svg as SVGSVGElement);
    out.push({ label, svg: svgText, png: await svgToPngBytes(svgText) });
  }
  return out;
}
