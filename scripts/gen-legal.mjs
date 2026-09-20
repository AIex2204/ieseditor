// Собирает статические HTML-страницы правовых документов из Markdown в docs/.
// Страницы кладутся в public/ и попадают на сайт как обычная статика — со
// стабильными адресами, которые можно указать в cookie-уведомлении, в «О
// программе» и в РСЯ.
//
// Из публичной версии убираются внутренние пометки для юриста: вводный блок
// «это черновик…» (строки, начинающиеся с `>`), слово «(черновик)» в
// заголовке и вставки в угловых скобках `<...>` — на сайте документ должен
// читаться как действующий. Полные пометки остаются в исходном .md в репо.
//
// Запуск: npm run gen:legal (или node scripts/gen-legal.mjs). Markdown здесь
// простой и известный, поэтому конвертер намеренно поддерживает только те
// конструкции, что реально встречаются: заголовки #/##/###, абзацы, списки
// «- », жирный **…** и код `…`.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const abs = (rel) => fileURLToPath(new URL(rel, root));

const PAGES = [
  { md: 'docs/ПОЛЬЗОВАТЕЛЬСКОЕ-СОГЛАШЕНИЕ.md', out: 'public/polzovatelskoe-soglashenie.html', title: 'Пользовательское соглашение' },
  { md: 'docs/ПОЛИТИКА-ОБРАБОТКИ-ДАННЫХ.md', out: 'public/politika-obrabotki-dannyh.html', title: 'Политика обработки персональных данных' },
];

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Инлайн: сначала убираем редакторские вставки <...>, затем **жирный** и `код`.
function inline(text) {
  let t = text.replace(/<[^>]*>/g, '').replace(/\(черновик\)/g, '').trimEnd();
  t = esc(t);
  // голые ссылки делаем кликабельными (хвостовую пунктуацию не захватываем)
  t = t.replace(/(https?:\/\/[^\s<]+?)([.,;)]*)(?=\s|$)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>$2');
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/`(.+?)`/g, '<code>$1</code>');
  return t;
}

function mdToBody(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let para = [];
  let list = [];
  const flushPara = () => {
    if (para.length) {
      // Мягко перенесённые строки абзаца склеиваются пробелом, но строка,
      // начинающаяся с «**подпись:**» (шапка «Редакция/Правообладатель/…»),
      // начинает новую визуальную строку внутри абзаца.
      const parts = [];
      let cur = [];
      for (const ln of para) {
        if (cur.length && /^\*\*/.test(ln)) {
          parts.push(cur.join(' '));
          cur = [ln];
        } else {
          cur.push(ln);
        }
      }
      parts.push(cur.join(' '));
      out.push(`<p>${parts.map(inline).join('<br>')}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`);
      list = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('>')) continue; // вводный блок «черновик» — не для сайта
    if (line.trim() === '') {
      flushPara();
      flushList();
      continue;
    }
    let m;
    if ((m = line.match(/^###\s+(.*)/))) {
      flushPara();
      flushList();
      out.push(`<h3>${inline(m[1])}</h3>`);
    } else if ((m = line.match(/^##\s+(.*)/))) {
      flushPara();
      flushList();
      out.push(`<h2>${inline(m[1])}</h2>`);
    } else if ((m = line.match(/^#\s+(.*)/))) {
      flushPara();
      flushList();
      out.push(`<h1>${inline(m[1])}</h1>`);
    } else if ((m = line.match(/^-\s+(.*)/))) {
      flushPara();
      list.push(m[1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return out.join('\n');
}

function page(title, body) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://ieseditor.ru/${title.canonical}">
<title>${esc(title.text)} — Редактор IES файлов</title>
<style>
@font-face{font-family:'PT Sans';font-weight:400;font-display:swap;src:url('/fonts/pt-sans-400-cyrillic.woff2') format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116;}
@font-face{font-family:'PT Sans';font-weight:400;font-display:swap;src:url('/fonts/pt-sans-400-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+2000-206F,U+2116;}
@font-face{font-family:'PT Sans';font-weight:700;font-display:swap;src:url('/fonts/pt-sans-700-cyrillic.woff2') format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116;}
@font-face{font-family:'PT Sans';font-weight:700;font-display:swap;src:url('/fonts/pt-sans-700-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+2000-206F,U+2116;}
:root{--bg:#fff;--text:#1a1a1a;--muted:#707070;--accent:#f39600;--border:#e0e0e0;}
html,body{margin:0;background:var(--bg);color:var(--text);font-family:'PT Sans',Arial,sans-serif;font-size:15px;line-height:1.55;}
.wrap{max-width:760px;margin:0 auto;padding:32px 20px 72px;}
.back{display:inline-block;margin-bottom:24px;color:var(--muted);text-decoration:none;font-size:13px;}
.back:hover{color:var(--accent);}
h1{font-size:26px;line-height:1.25;margin:0 0 20px;}
h2{font-size:18px;margin:34px 0 10px;}
h3{font-size:15px;margin:22px 0 8px;}
p{margin:0 0 12px;}
ul{margin:0 0 12px;padding-left:22px;}
li{margin:0 0 5px;}
code{font-family:Consolas,monospace;font-size:0.92em;background:#f0f0f0;padding:1px 4px;}
strong{font-weight:700;}
a{color:var(--accent);}
.foot{margin-top:48px;padding-top:16px;border-top:1px solid var(--border);font-size:13px;color:var(--muted);}
</style>
</head>
<body>
<div class="wrap">
<a class="back" href="/">← Редактор IES файлов</a>
${body}
<p class="foot">www.ieseditor.ru</p>
</div>
</body>
</html>
`;
}

for (const { md, out, title } of PAGES) {
  const src = readFileSync(abs(md), 'utf-8');
  const body = mdToBody(src);
  const canonical = out.replace(/^public\//, '');
  const html = page({ text: title, canonical }, body);
  writeFileSync(abs(out), html, 'utf-8');
  console.log(`${md} → ${out}`);
}
