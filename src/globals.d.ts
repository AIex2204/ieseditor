// Подставляются сборщиком (см. vite.config.ts): номер версии из package.json
// и дата сборки. Нужны, чтобы пользователь мог назвать версию, в которой он
// что-то увидел, а журнал изменений — CHANGELOG.md.
declare const __APP_VERSION__: string;
declare const __BUILD_DATE__: string;
