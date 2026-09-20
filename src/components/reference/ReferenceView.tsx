import { useLang } from '../../i18n/i18n';

// Справочник по форматам IES (LM-63) и EULUMDAT (LDT). Описание структуры
// форматов — общедоступный технический факт (interoperability), а не
// воспроизведение текста стандартов. Тексты самих стандартов сюда не входят.

export function ReferenceView() {
  const lang = useLang();
  return (
    <div className="about-view">
      <div className="about-card reference-card">{lang === 'en' ? <ReferenceEn /> : <ReferenceRu />}</div>
    </div>
  );
}

function ReferenceRu() {
  return (
    <>
      <h2>Справочник по форматам</h2>
      <p className="about-lead">
        Фотометрические файлы описывают, как светильник распределяет свет в пространстве — кривую силы света (КСС).
        Два основных формата: <b>IES</b> (стандарт IESNA LM-63, распространён в США и мире) и <b>EULUMDAT</b> —
        файлы <code>.ldt</code> (европейский формат, создан в 1990 г. в TU Berlin). Ниже — их устройство на уровне,
        достаточном, чтобы читать и править файлы вручную.
      </p>

      <h3>IES (IESNA LM-63)</h3>
      <p>
        Текстовый файл. Числа идут свободным потоком: разбиты по строкам произвольно, разделители — пробелы, табуляции
        или переводы строк (иногда запятые). Порядок значений строго фиксирован.
      </p>
      <ol className="ref-struct">
        <li>
          <b>Строка формата</b> (с 1991 г.): <code>IESNA:LM-63-2002</code>, <code>IESNA:LM-63-1995</code>,{' '}
          <code>IESNA91</code>. В редакции 1986 г. её нет — файл начинается сразу с ключевых слов или с TILT.
        </li>
        <li>
          <b>Ключевые слова</b> в квадратных скобках (с 1995 г.): <code>[TEST]</code>, <code>[TESTLAB]</code>,{' '}
          <code>[MANUFAC]</code>, <code>[LUMCAT]</code> (артикул), <code>[LUMINAIRE]</code>, <code>[ISSUEDATE]</code>.
          Строка <code>[MORE]</code> продолжает предыдущее значение, если оно длинное. Порядок и состав ключей —
          на усмотрение автора файла.
        </li>
        <li>
          <b>TILT</b> — наклон при измерении: <code>TILT=NONE</code> (обычный случай), <code>TILT=INCLUDE</code>{' '}
          (данные наклона встроены ниже: геометрия лампы 1/2/3, число пар, углы, множители) или{' '}
          <code>TILT=&lt;имя_файла&gt;</code> (данные в отдельном файле).
        </li>
        <li>
          <b>Строка из 10 чисел</b> — сердце заголовка:
          <div className="ref-code">
            число_ламп · поток_лампы · множитель · N_верт · N_гор · тип_фотометрии · единицы · ширина · длина · высота
          </div>
          <ul>
            <li>
              <b>поток лампы, лм</b> — заявленный световой поток. Значение <b>−1</b> означает абсолютную фотометрию:
              таблица силы света задана в реальных канделах, а не на условную 1000 лм.
            </li>
            <li>
              <b>множитель</b> — все значения силы света умножаются на него при чтении.
            </li>
            <li>
              <b>тип фотометрии</b>: <b>1 = Type C</b> (почти все архитектурные и уличные светильники),{' '}
              <b>2 = Type B</b> (прожекторы), <b>3 = Type A</b> (автомобильная светотехника).
            </li>
            <li>
              <b>единицы</b>: <b>1 = футы</b>, <b>2 = метры</b> (относятся только к габаритам светового отверстия).
            </li>
            <li>
              <b>ширина / длина / высота</b> светового отверстия. Знак кодирует форму: <b>0</b> — точечный источник,
              положительные — прямоугольник, <b>отрицательное</b> значение по оси — круглое/эллиптическое сечение,
              а модуль — диаметр. На саму КСС не влияет; используется расчётными пакетами для учёта самозатенения.
            </li>
          </ul>
        </li>
        <li>
          <b>Строка из 3 чисел</b>: балластный коэффициент · служебное поле (future use) · потребляемая мощность, Вт.
        </li>
        <li>
          <b>Вертикальные углы γ</b> — N_верт значений. Для Type C: 0° — надир (строго вниз), 90° — горизонт, 180° —
          зенит. Диапазон 0…90 (светит только вниз) или 0…180.
        </li>
        <li>
          <b>Горизонтальные углы C</b> (азимут) — N_гор значений, 0…360°. Для симметричных КСС хватает части круга:
          один угол (осевая), 0…90 (квадрант), 0…180 (двусторонняя).
        </li>
        <li>
          <b>Таблица силы света</b>, кд: для каждого угла C по порядку — все значения по γ. Итого N_гор × N_верт чисел.
        </li>
      </ol>
      <p className="ref-note">
        Система координат Type C: единичный вектор направления{' '}
        <code>n(γ, C) = (sin γ·cos C, sin γ·sin C, cos γ)</code>, ось Z — вниз. Плоскость C0–C180 — продольная,
        C90–C270 — поперечная.
      </p>

      <h3>EULUMDAT (.ldt)</h3>
      <p>
        Строго построчный формат: <b>одна строка — одно поле</b>, порядок жёсткий, всего около 40 полей заголовка плюс
        блоки данных. В отличие от IES «свободного потока чисел» здесь нельзя переносить значения между строками.
        Всегда описывает распределение типа C.
      </p>
      <table className="ref-table">
        <thead>
          <tr>
            <th>Строки</th>
            <th>Содержание</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Компания / автор файла</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Ityp — тип по геометрии (1 точечный симметричный, 2 линейный, 3 точечный с иной симметрией)</td>
          </tr>
          <tr>
            <td>3</td>
            <td>
              <b>Isym</b> — симметрия: 0 нет, 1 полная вращательная, 2 относительно C0–C180, 3 относительно C90–C270,
              4 четверть
            </td>
          </tr>
          <tr>
            <td>4–7</td>
            <td>Mc — число плоскостей C; Dc — шаг по C; Ng — число углов γ на плоскость; Dg — шаг по γ</td>
          </tr>
          <tr>
            <td>8–12</td>
            <td>Номер протокола, название и номер светильника, имя файла, дата/автор</td>
          </tr>
          <tr>
            <td>13–15</td>
            <td>Габариты корпуса: длина, ширина, высота, мм</td>
          </tr>
          <tr>
            <td>16–21</td>
            <td>Размеры светящей поверхности (мм); ширина 0 — круглая; высоты по плоскостям C0/C90/C180/C270</td>
          </tr>
          <tr>
            <td>22–24</td>
            <td>DFF (доля потока вниз, %), КПД светильника (LORL, %), коэффициент пересчёта в кд/клм</td>
          </tr>
          <tr>
            <td>25</td>
            <td>Угол наклона при измерении (для дорожной оптики)</td>
          </tr>
          <tr>
            <td>26</td>
            <td>Число наборов ламп; далее по 6 строк на набор: число ламп, тип, поток, цветность, CRI, мощность</td>
          </tr>
          <tr>
            <td>далее</td>
            <td>10 строк Direct Ratios (коэффициенты для индексов помещения)</td>
          </tr>
          <tr>
            <td>затем</td>
            <td>Mc значений углов C, затем Ng значений углов γ</td>
          </tr>
          <tr>
            <td>в конце</td>
            <td>
              Сила света в <b>кд/1000 лм</b> — по плоскостям C, для каждой все значения по γ. Число реально записанных
              плоскостей зависит от Isym (при полной симметрии — одна)
            </td>
          </tr>
        </tbody>
      </table>
      <p className="ref-note">
        Ключевое отличие в данных: EULUMDAT хранит силу света в <b>кд на 1000 лм</b> (нормировано на поток), а IES — в
        абсолютных канделах (или на условную 1000 лм при абсолютной фотометрии). LDT также несёт габариты, цветовую
        температуру и индекс цветопередачи, которых в IES нет.
      </p>

      <h3>Что делает этот редактор</h3>
      <p>
        Читает и <code>.ies</code> (все редакции LM-63), и <code>.ldt</code>, приводя оба к единой внутренней модели
        Type C. Файлы в футах пересчитываются в метры при загрузке. Сохранение — всегда в <code>.ies</code>. Type A/B
        конвертируются в Type C для расчётов; геометрические инструменты работают только с Type C.
      </p>

      <h3>О стандартах и правах</h3>
      <p className="about-note">
        Здесь описана <b>структура форматов</b> — общедоступный технический факт, необходимый для совместимости
        программ. Тексты самих стандартов (IESNA LM-63, издаваемый IES; описание EULUMDAT) охраняются авторским правом
        их правообладателей и в этот справочник не входят и не воспроизводятся. Значения полей, границы и допуски здесь
        справочные; для сертификации сверяйтесь с первоисточником.
      </p>
    </>
  );
}

function ReferenceEn() {
  return (
    <>
      <h2>Format reference</h2>
      <p className="about-lead">
        Photometric files describe how a luminaire distributes light in space — its luminous intensity distribution.
        Two main formats: <b>IES</b> (the IESNA LM-63 standard, common in the US and worldwide) and <b>EULUMDAT</b> —{' '}
        <code>.ldt</code> files (a European format created in 1990 at TU Berlin). Below is how they are built, in
        enough detail to read and edit files by hand.
      </p>

      <h3>IES (IESNA LM-63)</h3>
      <p>
        A text file. Numbers form a free stream: split across lines arbitrarily, separated by spaces, tabs or line
        breaks (sometimes commas). The order of values is strictly fixed.
      </p>
      <ol className="ref-struct">
        <li>
          <b>Format line</b> (since 1991): <code>IESNA:LM-63-2002</code>, <code>IESNA:LM-63-1995</code>,{' '}
          <code>IESNA91</code>. The 1986 revision has none — the file starts directly with keywords or TILT.
        </li>
        <li>
          <b>Keywords</b> in square brackets (since 1995): <code>[TEST]</code>, <code>[TESTLAB]</code>,{' '}
          <code>[MANUFAC]</code>, <code>[LUMCAT]</code> (catalog number), <code>[LUMINAIRE]</code>,{' '}
          <code>[ISSUEDATE]</code>. A <code>[MORE]</code> line continues the previous value when it is long. Which
          keys appear, and their order, is up to the file's author.
        </li>
        <li>
          <b>TILT</b> — tilt during measurement: <code>TILT=NONE</code> (the usual case), <code>TILT=INCLUDE</code>{' '}
          (tilt data embedded below: lamp geometry 1/2/3, number of pairs, angles, multipliers) or{' '}
          <code>TILT=&lt;filename&gt;</code> (data in a separate file).
        </li>
        <li>
          <b>A line of 10 numbers</b> — the heart of the header:
          <div className="ref-code">
            #lamps · lumens/lamp · multiplier · N_vert · N_horiz · photometric_type · units · width · length · height
          </div>
          <ul>
            <li>
              <b>lumens per lamp</b> — the declared luminous flux. A value of <b>−1</b> means absolute photometry: the
              intensity table is in real candelas, not per a nominal 1000 lm.
            </li>
            <li>
              <b>multiplier</b> — every intensity value is multiplied by it on reading.
            </li>
            <li>
              <b>photometric type</b>: <b>1 = Type C</b> (almost all architectural and street luminaires),{' '}
              <b>2 = Type B</b> (floodlights), <b>3 = Type A</b> (automotive lighting).
            </li>
            <li>
              <b>units</b>: <b>1 = feet</b>, <b>2 = meters</b> (apply only to the luminous-opening size).
            </li>
            <li>
              <b>width / length / height</b> of the luminous opening. The sign encodes the shape: <b>0</b> — a point
              source, positive — a rectangle, a <b>negative</b> value on an axis — a round/elliptical section, with the
              absolute value being the diameter. It does not affect the distribution itself; calculation packages use
              it for self-shadowing.
            </li>
          </ul>
        </li>
        <li>
          <b>A line of 3 numbers</b>: ballast factor · future-use field · input power, W.
        </li>
        <li>
          <b>Vertical angles γ</b> — N_vert values. For Type C: 0° is nadir (straight down), 90° the horizon, 180° the
          zenith. The range is 0…90 (light only downward) or 0…180.
        </li>
        <li>
          <b>Horizontal angles C</b> (azimuth) — N_horiz values, 0…360°. Symmetric distributions need only part of the
          circle: one angle (axial), 0…90 (quadrant), 0…180 (bilateral).
        </li>
        <li>
          <b>Intensity table</b>, cd: for each C angle in order — all values over γ. In total N_horiz × N_vert numbers.
        </li>
      </ol>
      <p className="ref-note">
        Type C coordinate system: the unit direction vector{' '}
        <code>n(γ, C) = (sin γ·cos C, sin γ·sin C, cos γ)</code>, Z axis pointing down. The C0–C180 plane is
        longitudinal, C90–C270 transverse.
      </p>

      <h3>EULUMDAT (.ldt)</h3>
      <p>
        A strictly line-based format: <b>one line — one field</b>, a rigid order, about 40 header fields plus data
        blocks. Unlike the IES "free stream of numbers", values cannot be wrapped across lines here. It always
        describes a Type C distribution.
      </p>
      <table className="ref-table">
        <thead>
          <tr>
            <th>Lines</th>
            <th>Contents</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Company / file author</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Ityp — type by geometry (1 point symmetric, 2 linear, 3 point with other symmetry)</td>
          </tr>
          <tr>
            <td>3</td>
            <td>
              <b>Isym</b> — symmetry: 0 none, 1 full rotational, 2 about C0–C180, 3 about C90–C270, 4 quadrant
            </td>
          </tr>
          <tr>
            <td>4–7</td>
            <td>Mc — number of C planes; Dc — C step; Ng — number of γ angles per plane; Dg — γ step</td>
          </tr>
          <tr>
            <td>8–12</td>
            <td>Report number, luminaire name and number, file name, date/author</td>
          </tr>
          <tr>
            <td>13–15</td>
            <td>Housing dimensions: length, width, height, mm</td>
          </tr>
          <tr>
            <td>16–21</td>
            <td>Luminous-area sizes (mm); width 0 means round; heights per the C0/C90/C180/C270 planes</td>
          </tr>
          <tr>
            <td>22–24</td>
            <td>DFF (downward flux fraction, %), luminaire efficiency (LORL, %), conversion factor to cd/klm</td>
          </tr>
          <tr>
            <td>25</td>
            <td>Measurement tilt angle (for road optics)</td>
          </tr>
          <tr>
            <td>26</td>
            <td>Number of lamp sets; then 6 lines per set: lamp count, type, flux, color, CRI, wattage</td>
          </tr>
          <tr>
            <td>then</td>
            <td>10 Direct Ratios lines (coefficients for room indices)</td>
          </tr>
          <tr>
            <td>then</td>
            <td>Mc values of C angles, then Ng values of γ angles</td>
          </tr>
          <tr>
            <td>finally</td>
            <td>
              Intensity in <b>cd/1000 lm</b> — per C plane, all γ values for each. The number of planes actually stored
              depends on Isym (one, under full symmetry)
            </td>
          </tr>
        </tbody>
      </table>
      <p className="ref-note">
        The key data difference: EULUMDAT stores intensity in <b>cd per 1000 lm</b> (normalized to flux), while IES
        uses absolute candelas (or per nominal 1000 lm under absolute photometry). LDT also carries dimensions, color
        temperature and color rendering index, which IES lacks.
      </p>

      <h3>What this editor does</h3>
      <p>
        It reads both <code>.ies</code> (all LM-63 revisions) and <code>.ldt</code>, bringing both to a single internal
        Type C model. Files in feet are converted to meters on load. Output is always <code>.ies</code>. Type A/B are
        converted to Type C for calculations; the geometric tools work only with Type C.
      </p>

      <h3>On standards and rights</h3>
      <p className="about-note">
        This describes the <b>structure of the formats</b> — a public technical fact needed for software
        interoperability. The texts of the standards themselves (IESNA LM-63, published by the IES; the EULUMDAT
        specification) are copyrighted by their rights holders and are neither included nor reproduced here. Field
        meanings, boundaries and tolerances here are for reference; for certification, consult the primary source.
      </p>
    </>
  );
}
