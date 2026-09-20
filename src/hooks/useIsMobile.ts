import { useEffect, useState } from 'react';

// Ниже этой ширины показываем отдельную мобильную версию с урезанным
// функционалом, а не пытаемся ужать десктопную раскладку с плотными панелями.
export const MOBILE_MAX_WIDTH = 720;

const QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
