#!/usr/bin/env bash
# Выкладка сайта в контейнер ieseditor (CT 120, 192.168.0.150).
#
# Сборка делается здесь, в контейнер уезжает только готовая статика — в нём
# нет ни Node.js, ни исходников, поверхность атаки минимальна.
#
# Использование:
#   ./deploy/deploy.sh                              # со счётчиком Метрики сайта
#   VITE_METRIKA_ID= ./deploy/deploy.sh             # без аналитики
#   ./deploy/deploy.sh --rollback                   # вернуть предыдущую версию
#
# Передача через tar по SSH, а не rsync: rsync нет в git-bash под Windows.
# Каталог подменяется через mv (в пределах одной ФС) — сайт не бывает пустым,
# а предыдущая версия остаётся рядом в .old для откката.

set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-ieseditor}"
WEB="/var/www/ieseditor"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${1:-}" == "--rollback" ]]; then
  echo "==> Откат на предыдущую версию"
  ssh "$DEPLOY_HOST" "test -d ${WEB}.old || { echo 'предыдущей версии нет'; exit 1; }
    rm -rf ${WEB}.rollback && mv ${WEB} ${WEB}.rollback && mv ${WEB}.old ${WEB} && mv ${WEB}.rollback ${WEB}.old
    curl -sS -o /dev/null -w 'отдача после откката: %{http_code}\n' http://127.0.0.1/"
  exit 0
fi

cd "$ROOT"

# Счётчик Метрики сайта ieseditor.ru. Не секрет — номер виден в коде
# любой страницы с счётчиком. Задан здесь, а не в исходниках, чтобы
# чужая сборка из репозитория не отправляла статистику нам, и чтобы выкладка
# без переменной не стирала счётчик с сайта (разрыв в статистике — минус
# при модерации в РСЯ). Выкладка без аналитики: VITE_METRIKA_ID= ./deploy/deploy.sh
VITE_METRIKA_ID="${VITE_METRIKA_ID-112840348}"
export VITE_METRIKA_ID

echo "==> Сборка"
if [[ -n "${VITE_METRIKA_ID:-}" ]]; then
  echo "    счётчик Метрики: ${VITE_METRIKA_ID}"
else
  echo "    без аналитики (VITE_METRIKA_ID не задан)"
fi
npm run build

echo "==> Проверка собранного"
test -f dist/index.html || { echo "нет dist/index.html — сборка не удалась"; exit 1; }
if grep -q "mc.yandex.ru" dist/assets/*.js 2>/dev/null; then
  echo "    счётчик в сборке: да"
else
  echo "    счётчик в сборке: нет"
fi
du -sh dist | sed 's/^/    размер: /'

echo "==> Передача на ${DEPLOY_HOST}"
# --owner/--group: не тащим в архив идентификаторы пользователя Windows
# --no-same-owner + --warning: в контейнере файлы получают root:root, а
# предупреждения о расхождении часов между Windows и контейнером не нужны
tar --owner=0 --group=0 --numeric-owner -czf - -C dist . | ssh "$DEPLOY_HOST" "
  set -e
  rm -rf ${WEB}.new && mkdir -p ${WEB}.new
  tar -xzf - --no-same-owner --warning=no-timestamp -C ${WEB}.new
  test -f ${WEB}.new/index.html
  rm -rf ${WEB}.old
  if [ -d ${WEB} ]; then mv ${WEB} ${WEB}.old; fi
  mv ${WEB}.new ${WEB}
  chown -R root:root ${WEB} && chmod -R a+rX ${WEB}
"

echo "==> Проверка отдачи"
ssh "$DEPLOY_HOST" "
  curl -sS -o /dev/null -w 'index.html: %{http_code}, %{size_download} байт\n' http://127.0.0.1/
  curl -sS -o /dev/null -w 'JS-бандл:   %{http_code}\n' http://127.0.0.1/\$(grep -oE 'assets/index-[^\"]+\.js' ${WEB}/index.html | head -1)
  curl -sS -o /dev/null -w 'robots.txt: %{http_code}\n' http://127.0.0.1/robots.txt
  curl -sS -o /dev/null -w 'healthz:    %{http_code}\n' http://127.0.0.1/healthz
"

echo "==> Готово. Откат при необходимости: ./deploy/deploy.sh --rollback"
