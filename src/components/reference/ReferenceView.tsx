import { useLang, type Lang } from '../../i18n/i18n';

// Справочник по форматам IES (LM-63) и EULUMDAT (LDT) в виде аннотированных
// примеров: реальные строки небольшого валидного файла, под каждой — что это.
// Оба формата поданы одинаково. Файлы можно скачать и открыть в редакторе.
// Описание структуры форматов — общедоступный технический факт; тексты самих
// стандартов сюда не входят. Компании условные (ООО «Свет»).

interface Block {
  code: string;
  ru: string;
  en: string;
}

const IES_BLOCKS: Block[] = [
  {
    code: 'IESNA:LM-63-2002',
    ru: 'Версия стандарта LM-63 (редакция 2002 года). С этой строки начинается файл; по ней программа-читатель выбирает набор правил. Бывают редакции 1986, 1991, 1995, 2002, 2019.',
    en: 'The LM-63 standard revision (2002). The file starts with this line; a reader uses it to pick the rule set. Revisions include 1986, 1991, 1995, 2002, 2019.',
  },
  {
    code: '[TEST] 4521-2026\n[TESTLAB] Лаборатория светотехники\n[MANUFAC] ООО "Свет"\n[LUMCAT] SVET-DL-20\n[LUMINAIRE] Светодиодный даунлайт 20 Вт\n[ISSUEDATE] 2026-02-10',
    ru: 'Ключевые слова в квадратных скобках: номер протокола [TEST], лаборатория [TESTLAB], производитель [MANUFAC], артикул [LUMCAT], название [LUMINAIRE], дата [ISSUEDATE]. Состав и порядок — на усмотрение автора файла.',
    en: 'Keywords in square brackets: report number [TEST], lab [TESTLAB], manufacturer [MANUFAC], catalog number [LUMCAT], name [LUMINAIRE], date [ISSUEDATE]. Which keys appear, and their order, is up to the file’s author.',
  },
  {
    code: 'TILT=NONE',
    ru: 'Наклон при измерении. NONE — светильник измерен в штатном положении (самый частый случай). Иначе здесь были бы данные наклона (TILT=INCLUDE) или имя внешнего файла.',
    en: 'Tilt during measurement. NONE — measured in its normal position (the common case). Otherwise tilt data (TILT=INCLUDE) or an external file name would go here.',
  },
  {
    code: '1 3560 1 5 4 1 2 0.2 0.2 0.1',
    ru: 'Главная строка из 10 чисел. По порядку: 1 — число ламп; 3560 — световой поток лампы, лм (−1 означало бы абсолютную фотометрию); 1 — общий множитель силы света; 5 — число вертикальных углов γ; 4 — число горизонтальных углов C; 1 — тип фотометрии (1 = Type C); 2 — единицы габаритов (2 = метры, 1 = футы); 0.2 · 0.2 · 0.1 — ширина, длина, высота светового отверстия, м.',
    en: 'The main line of 10 numbers. In order: 1 — number of lamps; 3560 — lamp luminous flux, lm (−1 would mean absolute photometry); 1 — overall intensity multiplier; 5 — number of vertical angles γ; 4 — number of horizontal angles C; 1 — photometric type (1 = Type C); 2 — dimension units (2 = meters, 1 = feet); 0.2 · 0.2 · 0.1 — width, length, height of the luminous opening, m.',
  },
  {
    code: '1.0 1.0 25',
    ru: 'Ещё три числа: балластный коэффициент, служебное поле (future use) и потребляемая мощность — 25 Вт.',
    en: 'Three more numbers: ballast factor, a future-use field, and input power — 25 W.',
  },
  {
    code: '0 30 60 75 90',
    ru: 'Вертикальные углы γ (5 штук): от надира 0° (строго вниз) до горизонта 90°. Именно в этих направлениях измерена сила света.',
    en: 'Vertical angles γ (5 of them): from nadir 0° (straight down) to the horizon 90°. Intensity is measured in exactly these directions.',
  },
  {
    code: '0 45 90 135',
    ru: 'Горизонтальные углы C — азимут (4 штуки). У симметричных светильников хватает части круга; полный круг — 0…360°.',
    en: 'Horizontal angles C — azimuth (4 of them). Symmetric luminaires need only part of the circle; a full circle is 0…360°.',
  },
  {
    code: '1200 1050 620 210 0\n1200 1050 620 210 0\n1200 1050 620 210 0\n1200 1050 620 210 0',
    ru: 'Таблица силы света в канделах: одна строка на каждый угол C, а в строке — значения для всех углов γ по порядку. Здесь 4 × 5 = 20 чисел. Пик 1200 кд в надире, к горизонту спадает до нуля.',
    en: 'The luminous intensity table in candelas: one row per C angle, each row holding the values for all γ angles in order. Here 4 × 5 = 20 numbers. The peak is 1200 cd at nadir, falling to zero toward the horizon.',
  },
];

const LDT_BLOCKS: Block[] = [
  {
    code: 'ООО "Свет"',
    ru: 'Строка 1 — компания или автор файла.',
    en: 'Line 1 — the company or file author.',
  },
  {
    code: '1',
    ru: 'Ityp — тип по геометрии источника: 1 — точечный, симметричный относительно вертикальной оси; 2 — линейный; 3 — точечный с иной симметрией.',
    en: 'Ityp — source geometry type: 1 — point, symmetric about the vertical axis; 2 — linear; 3 — point with other symmetry.',
  },
  {
    code: '0',
    ru: 'Isym — вид симметрии: 0 — нет, 1 — полная вращательная, 2 — относительно C0–C180, 3 — относительно C90–C270, 4 — четверть. От этого зависит, сколько плоскостей C реально записано в файле.',
    en: 'Isym — symmetry type: 0 — none, 1 — full rotational, 2 — about C0–C180, 3 — about C90–C270, 4 — quadrant. It sets how many C planes are actually stored in the file.',
  },
  {
    code: '4\n90\n5\n22.5',
    ru: 'Четыре числа подряд: Mc — число плоскостей C (4); Dc — шаг по C (90°); Ng — число углов γ на плоскость (5); Dg — шаг по γ (22.5°).',
    en: 'Four numbers in a row: Mc — number of C planes (4); Dc — C step (90°); Ng — number of γ angles per plane (5); Dg — γ step (22.5°).',
  },
  {
    code: 'SVET-2026-014\nЛинейный светильник 25 Вт\nSVET-LN-25\nsvet-ln-25.ldt\n2026-02-10',
    ru: 'Строки 8–12: номер протокола, название светильника, его артикул, имя файла и дата измерения.',
    en: 'Lines 8–12: report number, luminaire name, its catalog number, file name and measurement date.',
  },
  {
    code: '1200\n40\n80',
    ru: 'Габариты корпуса, мм: длина 1200, ширина 40, высота 80.',
    en: 'Housing dimensions, mm: length 1200, width 40, height 80.',
  },
  {
    code: '1180\n35\n0\n0\n0\n0',
    ru: 'Размеры светящей поверхности, мм: длина 1180, ширина 35; далее высоты по плоскостям C0/C90/C180/C270 (здесь нули — плоская поверхность). Ширина 0 означала бы круглую поверхность.',
    en: 'Luminous-area sizes, mm: length 1180, width 35; then heights per the C0/C90/C180/C270 planes (zeros here — a flat surface). A width of 0 would mean a round surface.',
  },
  {
    code: '60\n85\n1\n0',
    ru: 'DFF — доля потока вниз (60%); КПД светильника LORL (85%); коэффициент пересчёта силы света в кд/1000 лм (1); угол наклона при измерении (0°).',
    en: 'DFF — downward flux fraction (60%); luminaire efficiency LORL (85%); the conversion factor to cd/1000 lm (1); measurement tilt angle (0°).',
  },
  {
    code: '1\n1\nLED\n2500\n4000\n80\n25',
    ru: 'Число наборов ламп (1) и сам набор из 6 полей: число ламп (1), тип (LED), суммарный поток (2500 лм), цветовая температура (4000 K), индекс цветопередачи (80), мощность (25 Вт).',
    en: 'Number of lamp sets (1) and the set itself, 6 fields: lamp count (1), type (LED), total flux (2500 lm), color temperature (4000 K), CRI (80), wattage (25 W).',
  },
  {
    code: '0\n0\n0\n0\n0\n0\n0\n0\n0\n0',
    ru: 'Десять коэффициентов Direct Ratios — для расчётов по индексам помещения; в модель LM-63 не переносятся.',
    en: 'Ten Direct Ratios — used for room-index calculations; not carried into the LM-63 model.',
  },
  {
    code: '0\n90\n180\n270',
    ru: 'Углы C (4 штуки) — азимутальные плоскости 0°, 90°, 180°, 270°.',
    en: 'C angles (4) — the azimuthal planes 0°, 90°, 180°, 270°.',
  },
  {
    code: '0\n22.5\n45\n67.5\n90',
    ru: 'Углы γ (5 штук) — от надира 0° до горизонта 90°.',
    en: 'γ angles (5) — from nadir 0° to the horizon 90°.',
  },
  {
    code: '445\n380\n232\n83\n0\n445\n380\n232\n83\n0\n445\n380\n232\n83\n0\n445\n380\n232\n83\n0',
    ru: 'Сила света в кд/1000 лм: по одному значению в строке, блоками по числу углов γ, для каждой плоскости C (здесь 4 × 5 = 20 значений). Нормирована на поток — при чтении умножается на заявленные лм/1000. Это главное отличие от IES, где сила света в абсолютных канделах.',
    en: 'Intensity in cd/1000 lm: one value per line, in blocks of Ng, for each C plane (here 4 × 5 = 20 values). Normalized to flux — multiplied by the declared lm/1000 on reading. This is the key difference from IES, where intensity is in absolute candelas.',
  },
];

function downloadText(fileName: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function AnnotatedFile({ title, fileName, blocks, lang }: { title: string; fileName: string; blocks: Block[]; lang: Lang }) {
  const text = blocks.map((b) => b.code).join('\n') + '\n';
  return (
    <section className="ann-file">
      <div className="ann-file-head">
        <h3>{title}</h3>
        <button className="btn ann-dl" onClick={() => downloadText(fileName, text)}>
          {lang === 'en' ? 'Download example' : 'Скачать пример'}
        </button>
      </div>
      <div className="ann-list">
        {blocks.map((b, i) => (
          <div className="ann" key={i}>
            <pre className="ann-code">{b.code}</pre>
            <p className="ann-note">{lang === 'en' ? b.en : b.ru}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ReferenceView() {
  const lang = useLang();
  const en = lang === 'en';
  return (
    <div className="about-view">
      <div className="about-card reference-card">
        <h2>{en ? 'Format reference' : 'Справочник по форматам'}</h2>
        <p className="about-lead">
          {en
            ? 'Photometric files describe how a luminaire distributes light in space. There are two main formats:'
            : 'Фотометрические файлы описывают, как светильник распределяет свет в пространстве. Существуют два основных формата:'}
        </p>
        <ul className="ref-formats">
          <li>
            {en ? (
              <>
                <b>IES</b> — .ies files (the IESNA LM-63 standard, used worldwide)
              </>
            ) : (
              <>
                <b>IES</b> — файлы .ies (стандарт IESNA LM-63, распространён во всём мире)
              </>
            )}
          </li>
          <li>
            {en ? (
              <>
                <b>LDT</b> — .ldt files (EULUMDAT — a European format created in 1990 at TU Berlin)
              </>
            ) : (
              <>
                <b>LDT</b> — файлы .ldt (EULUMDAT — европейский формат, создан в 1990 г. в TU Berlin)
              </>
            )}
          </li>
        </ul>
        <p className="about-lead">
          {en
            ? 'Below is how they are built, in enough detail to read and edit files by hand. On the left is a line from a real (small) file, on the right — what it is. You can download either example and open it in the editor.'
            : 'Ниже — их устройство на уровне, достаточном, чтобы читать и править файлы вручную. Слева — строка настоящего (небольшого) файла, справа — что это. Любой пример можно скачать и открыть в редакторе.'}
        </p>

        <AnnotatedFile title="IES (IESNA LM-63)" fileName="example-svet.ies" blocks={IES_BLOCKS} lang={lang} />
        <AnnotatedFile title="EULUMDAT (.ldt)" fileName="example-svet.ldt" blocks={LDT_BLOCKS} lang={lang} />

        <p className="about-note">
          {en
            ? 'This describes the structure of the formats — a public technical fact needed for software interoperability. The texts of the standards themselves (IESNA LM-63, published by the IES; the EULUMDAT specification) are copyrighted by their rights holders and are neither included nor reproduced here. The companies in the examples are fictitious.'
            : 'Здесь описана структура форматов — общедоступный технический факт, необходимый для совместимости программ. Тексты самих стандартов (IESNA LM-63, издаваемый IES; описание EULUMDAT) охраняются авторским правом их правообладателей и в справочник не входят и не воспроизводятся. Компании в примерах вымышленные.'}
        </p>
      </div>
    </div>
  );
}
