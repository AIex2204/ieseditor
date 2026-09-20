import { existsSync, readFileSync } from 'node:fs';
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

// Номер версии берётся из package.json, чтобы он был в одном месте и совпадал
// с вершиной CHANGELOG.md. В «О программе» показываем версию и дату сборки:
// без них по жалобе нельзя понять, какая сборка у пользователя в браузере.
const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8')) as {
  version: string;
};
const buildDate = new Date().toISOString().slice(0, 10);

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  test: {
    environment: 'node',
    include: samplesAvailable ? ['tests/**/*.test.ts'] : ['tests/ldt.test.ts'],
  },
});
