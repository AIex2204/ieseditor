import { METRIKA_ID } from '../../analytics/metrika';
import { useLang } from '../../i18n/i18n';

export function AboutView() {
  const lang = useLang();
  return (
    <div className="about-view">
      <div className="about-card">
        {lang === 'en' ? <AboutEn /> : <AboutRu />}

        <p className="about-version">
          {lang === 'en' ? 'Version' : 'Версия'} {__APP_VERSION__},{' '}
          {lang === 'en' ? 'built' : 'сборка от'} {__BUILD_DATE__.split('-').reverse().join('.')}.{' '}
          <a href="https://github.com/AIex2204/ieseditor/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">
            {lang === 'en' ? 'Changelog' : 'Журнал версий'}
          </a>
        </p>

        <p className="about-domain">www.ieseditor.ru</p>
      </div>
    </div>
  );
}

function AboutRu() {
  return (
    <>
      <h2>Редактор IES файлов</h2>
      <p className="about-lead">
        Инструмент светотехника для работы с фотометрией светильников: посмотреть КСС, привести файл в порядок,
        отредактировать любое поле и сохранить корректный .ies. Работает целиком в браузере — файлы никуда не
        загружаются и остаются на вашем компьютере.
      </p>

      <h3>Что умеет</h3>
      <ul>
        <li>
          <b>Чтение.</b> Файлы .ies всех редакций LM-63 (1986, 1991, 1995, 2002, 2019, 2025) и импорт .ldt (EULUMDAT)
          с конвертацией во внутреннюю модель. Кириллица в UTF-8 и windows-1251 распознаётся автоматически. Запись —
          всегда .ies.
        </li>
        <li>
          <b>Просмотр и проверка.</b> Полярные и декартовы КСС в плоскостях C0–C180 и C90–C270, полный угол 2γ½ и тип
          КСС по каждой плоскости отдельно. Рядом — поток, поток вниз/вверх, DFF/UFF, КПД, лм/Вт, Imax в канделах и
          кд/клм. Отдельная проверка файла сверяет заявленный поток с расчётным и ищет признаки недостоверных данных —
          то, чем грешат файлы от лабораторий и сторонних производителей.
        </li>
        <li>
          <b>Обработка.</b> Пересчёт под нужный световой поток, поворот по трём углам с шагом 0,1°, выравнивание по
          максимуму или по центру тяжести потока, симметризация, сглаживание Савицкого–Голея, чистка мусорных хвостов
          в широких углах. Световой поток при любой операции сохраняется.
        </li>
        <li>
          <b>Редактор полей.</b> Шапка и ключевые слова, TILT, числовые поля, форма светового отверстия (круг,
          цилиндр, эллипс, сфера), угловые сетки с пересчётом КСС интерполяцией и таблица силы света целиком.
        </li>
        <li>
          <b>Сравнение.</b> Две КСС на одних осях и таблица расхождений по основным показателям — удобно смотреть, что
          изменилось после обработки.
        </li>
      </ul>

      <h3>Как устроена работа с версиями</h3>
      <p>
        Правки применяются сразу и копятся в рабочем файле. Кнопка <b>«Сохранить»</b> фиксирует их как новую версию
        «…(edited v1).ies», а исходный файл возвращается к первоначальному виду — обе версии остаются в списке и их
        можно сравнить. <b>«Выгрузить IES»</b> скачивает один фотометрический файл, <b>«Выгрузить все»</b> — архив, где
        рядом с файлом лежат отчёт о проверке, отчёт об обработке, показатели для даташита, диаграммы и исходный файл
        для перепроверки. Кнопка <b>«Отменить изменения»</b> возвращает файл к состоянию на момент загрузки.
      </p>

      <h3>Данные и статистика</h3>
      <p>
        Фотометрические файлы обрабатываются целиком в браузере и не передаются ни на сервер сайта, ни третьим лицам.
        Открытые файлы и результаты обработки хранятся в локальном хранилище вашего браузера, чтобы работа не терялась
        при перезагрузке страницы — их можно удалить, очистив данные сайта.
        {METRIKA_ID ? (
          <>
            {' '}
            Для статистики посещений на сайте установлен счётчик Яндекс.Метрики: он собирает обезличенные данные о
            визитах. Вебвизор (запись действий на странице) выключен намеренно — иначе в запись попадали бы имена и
            содержимое ваших файлов.
          </>
        ) : (
          <> В этой сборке аналитика не подключена — страница не делает ни одного внешнего запроса.</>
        )}
      </p>

      <h3>Лицензия и исходный код</h3>
      <p>
        Программа свободная: распространяется по лицензии{' '}
        <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer">
          GNU AGPL-3.0
        </a>
        . Ею можно пользоваться и её можно дорабатывать; если вы публикуете доработанную версию или поднимаете на её
        основе сетевой сервис, исходный код доработок тоже должен быть открыт. Исходный код, история изменений и
        сведения о правообладателе —{' '}
        <a href="https://github.com/AIex2204/ieseditor" target="_blank" rel="noopener noreferrer">
          github.com/AIex2204/ieseditor
        </a>
        .
      </p>
      <p>
        В сборку входят сторонние компоненты под лицензиями MIT и ISC (React, Zustand, react-window, fflate, idb) и
        шрифт PT Sans под SIL OFL 1.1 — полные тексты лицензий лежат в файле THIRD-PARTY-NOTICES.txt рядом с
        программой. Форматы IES LM-63 и EULUMDAT реализованы по общедоступным описаниям; тексты стандартов в программу
        не входят.
      </p>

      <p className="about-docs">
        Документы:{' '}
        <a href="/polzovatelskoe-soglashenie.html" target="_blank" rel="noopener noreferrer">
          Пользовательское соглашение
        </a>{' '}
        ·{' '}
        <a href="/politika-obrabotki-dannyh.html" target="_blank" rel="noopener noreferrer">
          Политика обработки персональных данных
        </a>
      </p>

      <p className="about-note">
        Программа предоставляется «как есть», без гарантий. Результаты обработки — включая тип КСС, углы и расчётный
        поток — справочные: перед публикацией в каталоге и перед сертификацией проверяйте их по первоисточнику. Тип КСС
        и границы классификации приведены по общепринятым значениям ГОСТ Р 54350.
      </p>
    </>
  );
}

function AboutEn() {
  return (
    <>
      <h2>IES File Editor</h2>
      <p className="about-lead">
        A lighting engineer's tool for working with luminaire photometry: view the intensity distribution, tidy a file
        up, edit any field and save a valid .ies. It runs entirely in your browser — files are never uploaded and stay
        on your computer.
      </p>

      <h3>What it does</h3>
      <ul>
        <li>
          <b>Reading.</b> .ies files of every LM-63 revision (1986, 1991, 1995, 2002, 2019, 2025) and .ldt (EULUMDAT)
          import with conversion to the internal model. UTF-8 and windows-1251 are detected automatically. Output is
          always .ies.
        </li>
        <li>
          <b>Viewing &amp; checking.</b> Polar and Cartesian curves in the C0–C180 and C90–C270 planes, the full 2γ½
          beam angle and the distribution type per plane. Alongside — flux, downward/upward flux, DFF/UFF, efficiency,
          lm/W, Imax in candelas and cd/klm. A separate file check compares the declared flux against the computed one
          and looks for signs of unreliable data — the kind that lab and third-party files often carry.
        </li>
        <li>
          <b>Processing.</b> Rescaling to a target luminous flux, rotation about three axes in 0.1° steps, alignment by
          peak or by the flux centroid, symmetrizing, Savitzky–Golay smoothing, and cleaning junk tails at wide angles.
          Luminous flux is preserved by every operation.
        </li>
        <li>
          <b>Field editor.</b> Header and keywords, TILT, numeric fields, luminous-opening shape (circle, cylinder,
          ellipse, sphere), angle grids with interpolated resampling, and the full intensity table.
        </li>
        <li>
          <b>Comparison.</b> Two curves on the same axes and a table of differences across the main metrics — handy for
          seeing what changed after processing.
        </li>
      </ul>

      <h3>How versions work</h3>
      <p>
        Edits apply instantly and accumulate in the working file. <b>“Save”</b> commits them as a new version
        “…(edited v1).ies”, and the source file returns to its original state — both stay in the list and can be
        compared. <b>“Download IES”</b> saves a single photometric file; <b>“Download all”</b> saves an archive where,
        next to the file, sit a check report, a processing report, datasheet metrics, charts and the source file for
        re-verification. <b>“Discard changes”</b> returns the file to its state at load time.
      </p>

      <h3>Data &amp; statistics</h3>
      <p>
        Photometric files are processed entirely in the browser and are sent neither to the site's server nor to third
        parties. Open files and processing results are kept in your browser's local storage so your work survives a page
        reload — you can remove them by clearing the site's data.
        {METRIKA_ID ? (
          <>
            {' '}
            The site has a Yandex.Metrica counter for visit statistics: it collects anonymous data about visits. Session
            recording (Webvisor) is deliberately off — otherwise it would capture the names and contents of your files.
          </>
        ) : (
          <> Analytics is not enabled in this build — the page makes no external requests at all.</>
        )}
      </p>

      <h3>License &amp; source code</h3>
      <p>
        The program is free software: distributed under the{' '}
        <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer">
          GNU AGPL-3.0
        </a>{' '}
        license. You may use and modify it; if you publish a modified version or run a network service based on it, the
        source of your changes must be open too. Source code, change history and rights-holder details —{' '}
        <a href="https://github.com/AIex2204/ieseditor" target="_blank" rel="noopener noreferrer">
          github.com/AIex2204/ieseditor
        </a>
        .
      </p>
      <p>
        The build includes third-party components under the MIT and ISC licenses (React, Zustand, react-window, fflate,
        idb) and the PT Sans font under SIL OFL 1.1 — full license texts are in THIRD-PARTY-NOTICES.txt next to the
        program. The IES LM-63 and EULUMDAT formats are implemented from public descriptions; the standards' texts are
        not included.
      </p>

      <p className="about-docs">
        Documents:{' '}
        <a href="/polzovatelskoe-soglashenie.html" target="_blank" rel="noopener noreferrer">
          Terms of use
        </a>{' '}
        ·{' '}
        <a href="/politika-obrabotki-dannyh.html" target="_blank" rel="noopener noreferrer">
          Privacy policy
        </a>{' '}
        <span className="about-docs-note">(in Russian)</span>
      </p>

      <p className="about-note">
        The program is provided “as is”, without warranty. Processing results — including the distribution type, angles
        and computed flux — are for reference: verify them against the primary source before publishing in a catalog or
        before certification. The distribution type and its class boundaries follow the common values of GOST R 54350.
      </p>
    </>
  );
}
