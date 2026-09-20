#!/bin/sh
# Сторож правки подмен DNS в AdGuard Home (запускается отложенно через
# systemd-run --on-active). Проверяет три вещи:
#   1) контрольная подмена, существовавшая до правки, отвечает как раньше;
#   2) внешнее имя резолвится — значит резолвер вообще жив;
#   3) новая подмена отвечает.
# Если что-то не сошлось — возвращает конфиг из резервной копии и
# перезапускает службу.
#
# Контрольное имя ОБЯЗАТЕЛЬНО брать из уже существующих подмен. Первая
# попытка провалилась именно на этом: взял dashy.orearm.ru, а Dashy живёт
# на корневом orearm.ru, такого поддомена в зоне нет — NXDOMAIN, и сторож
# честно откатил рабочую правку.

CFG=/opt/AdGuardHome/AdGuardHome.yaml
BAK="$CFG.bak-$(date +%F)"
LOG=/var/log/ies-dns-watchdog.log

CONTROL_NAME=vault.orearm.ru
CONTROL_EXPECT=192.168.0.200
NEW_NAME=ieseditor.ru
NEW_EXPECT=192.168.0.200
EXTERNAL_NAME=ya.ru

ask() { dig +short +time=3 +tries=2 "$1" @127.0.0.1 2>/dev/null | head -1; }

CTRL=$(ask "$CONTROL_NAME")
EXT=$(ask "$EXTERNAL_NAME")
NEW=$(ask "$NEW_NAME")

STAMP=$(date -Is)
if [ "$CTRL" = "$CONTROL_EXPECT" ] && [ -n "$EXT" ] && [ "$NEW" = "$NEW_EXPECT" ]; then
  echo "$STAMP ok: контроль=$CTRL внешнее=$EXT новое=$NEW" >> "$LOG"
  exit 0
fi

echo "$STAMP ОТКАТ: контроль=$CTRL (ждали $CONTROL_EXPECT) внешнее=$EXT новое=$NEW (ждали $NEW_EXPECT)" >> "$LOG"
if [ -f "$BAK" ]; then
  cp "$BAK" "$CFG" && systemctl restart AdGuardHome
  echo "$STAMP откат выполнен из $BAK" >> "$LOG"
else
  echo "$STAMP резервной копии $BAK нет — откат невозможен, нужна ручная проверка" >> "$LOG"
fi
