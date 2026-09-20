"""Добавляет подмену DNS для ieseditor.ru в основной AdGuard Home.

Разовая служебная правка. Логика по правилам HomeNet:
  - конфиг разбирается как данные (YAML), а не правится регулярками;
  - вставка текстовая и точечная — файл не переписывается целиком, иначе
    PyYAML переформатировал бы и переупорядочил весь конфиг AdGuard;
  - перед применением смысловое сравнение: проверяем, что изменился ТОЛЬКО
    список подмен и ровно на нужные записи, а все прежние остались;
  - резервная копия рядом с оригиналом.

Запускать внутри контейнера AdGuard (CT 112). Запасной резолвер .125
править не нужно — adguardhome-sync перенесёт сам.
"""

import datetime
import shutil
import sys

import yaml

CFG = '/opt/AdGuardHome/AdGuardHome.yaml'
TARGET = '192.168.0.200'  # NPM
NAMES = ['ieseditor.ru', 'www.ieseditor.ru']

original = open(CFG, encoding='utf-8').read()
before = yaml.safe_load(original)
rewrites_before = before['filtering']['rewrites']

existing = {r['domain'] for r in rewrites_before}
todo = [n for n in NAMES if n not in existing]
if not todo:
    print('все имена уже есть — менять нечего')
    sys.exit(0)

lines = original.splitlines(keepends=True)
anchor = [i for i, line in enumerate(lines) if line.rstrip('\n') == '  rewrites:']
if len(anchor) != 1:
    sys.exit(f'ожидал одну строку "  rewrites:", нашёл {len(anchor)} — отмена')

insert = []
for name in todo:
    insert += [f'    - domain: {name}\n', f'      answer: {TARGET}\n', '      enabled: true\n']
patched = ''.join(lines[: anchor[0] + 1] + insert + lines[anchor[0] + 1 :])

after = yaml.safe_load(patched)
rewrites_after = after['filtering']['rewrites']

# смысловая проверка: всё, кроме списка подмен, должно совпасть точно
skeleton_before = yaml.safe_load(original)
skeleton_after = yaml.safe_load(patched)
skeleton_before['filtering']['rewrites'] = None
skeleton_after['filtering']['rewrites'] = None
if skeleton_before != skeleton_after:
    sys.exit('изменилось что-то помимо подмен — отмена')

if len(rewrites_after) != len(rewrites_before) + len(todo):
    sys.exit('число подмен изменилось не на ожидаемое — отмена')
for record in rewrites_before:
    if record not in rewrites_after:
        sys.exit(f'потеряна прежняя подмена {record} — отмена')
for name in todo:
    if not any(r['domain'] == name and r['answer'] == TARGET and r['enabled'] for r in rewrites_after):
        sys.exit(f'новая запись {name} не подтвердилась — отмена')

backup = f'{CFG}.bak-{datetime.date.today().isoformat()}'
shutil.copy2(CFG, backup)
open(CFG, 'w', encoding='utf-8').write(patched)

print(f'добавлено: {", ".join(todo)} -> {TARGET}')
print(f'подмен было {len(rewrites_before)}, стало {len(rewrites_after)}')
print(f'резервная копия: {backup}')
