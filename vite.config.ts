import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Почти все тесты проверяют ядро на реальных фотометрических файлах из
// Input/. Эти файлы принадлежат производителям и в репозиторий не входят,
// поэтому в свежем клоне такие тесты не запускаются — вместо непонятного
// ENOENT в консоль выводится подсказка. Как подложить свои образцы,
// написано в README, раздел «Тесты».
const samplesAvailable = existsSync(fileURLToPath(new URL('./Input/', import.meta.url)));
if (!samplesAvailable) {
  console.warn(
    '\n[tests] Каталог Input/ с образцами фотометрии не найден — тесты, которым нужны реальные файлы,\n' +
      '        пропущены. Положите свои .ies в Input/ (см. README, раздел «Тесты»).\n'
  );
}

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: samplesAvailable ? ['tests/**/*.test.ts'] : ['tests/ldt.test.ts'],
  },
});
