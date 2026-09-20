import { useEffect, useRef, useState } from 'react';

// Числовое поле с запятой как разделителем дробной части (п. "запятая вместо
// точки") и без потери промежуточного ввода: обычный <input value={number}>
// сбрасывает "1," обратно на "1" на каждой перерисовке, стоит набрать
// разделитель — набрать дробное число становится физически невозможно.
// Здесь локальный текст живёт своей жизнью, пока не сложится в конечное
// число, и синхронизируется с внешним value только когда оно поменялось
// НЕ из-за нашего же onChange (напр. сброс/пересчёт извне).

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 6, useGrouping: false });
}

export interface DecimalInputProps {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function DecimalInput({ value, onChange, className, disabled, placeholder }: DecimalInputProps) {
  const [text, setText] = useState(() => formatNumber(value));
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setText(formatNumber(value));
      lastEmitted.current = value;
    }
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setText(raw);

    // промежуточный ввод ("1,", "-", "", "-,") — ждём продолжения, не парсим и не форматируем
    if (raw === '' || raw === '-' || raw.endsWith(',') || raw.endsWith('.')) return;

    const normalized = raw.replace(',', '.').replace(/\s/g, '');
    const n = Number(normalized);
    if (Number.isFinite(n)) {
      lastEmitted.current = n;
      onChange(n);
    }
  }

  function handleBlur() {
    setText(formatNumber(lastEmitted.current));
  }

  return (
    <input
      className={className}
      inputMode="decimal"
      value={text}
      disabled={disabled}
      placeholder={placeholder}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
