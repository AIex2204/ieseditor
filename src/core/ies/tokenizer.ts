// Потоковый разбор числовых данных IES.
// В реальных файлах числа разбиты по строкам произвольно (см. Input/*.ies —
// у одного файла таблица углов лежит в одной строке из 2000+ символов,
// у другого — по 9-11 чисел на строку). Поэтому весь числовой хвост файла
// читается как один поток токенов, без оглядки на переводы строк.

export class NumberTokenizer {
  private readonly tokens: string[];
  private pos = 0;

  constructor(text: string) {
    const trimmed = text.trim();
    this.tokens = trimmed.length ? trimmed.split(/[\s,]+/) : [];
  }

  hasNext(): boolean {
    return this.pos < this.tokens.length;
  }

  remaining(): number {
    return this.tokens.length - this.pos;
  }

  nextNumber(): number {
    if (this.pos >= this.tokens.length) {
      throw new Error('Неожиданный конец числовых данных IES-файла');
    }
    const raw = this.tokens[this.pos++];
    const value = Number(raw);
    if (Number.isNaN(value)) {
      throw new Error(`Не число в числовых данных IES: "${raw}"`);
    }
    return value;
  }

  nextInt(): number {
    return Math.trunc(this.nextNumber());
  }

  nextNumbers(count: number): number[] {
    const out = new Array<number>(count);
    for (let i = 0; i < count; i++) out[i] = this.nextNumber();
    return out;
  }
}
