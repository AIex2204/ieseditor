// Английские переводы по русскому оригиналу (ключ = русская строка из UI).
// Нет ключа — показывается русский (безопасный откат). Длинная проза (About,
// многострочные подсказки) переводится ветвлением прямо в компонентах и здесь
// не дублируется.
export const EN: Record<string, string> = {
  // --- навигация и заголовок ---
  'Редактор IES файлов': 'IES File Editor',
  Файлы: 'Files',
  Сравнение: 'Compare',
  'О программе': 'About',
  Сохранить: 'Save',
  'Выгрузить IES': 'Download IES',
  'Выгрузить все': 'Download all',
  'Готовим архив…': 'Building archive…',
  'Зафиксировать правки как новую версию файла «…(edited vN).ies». Исходный файл вернётся к первоначальному виду — их можно сравнить на вкладке «Сравнение».':
    'Save the edits as a new file version “…(edited vN).ies”. The source file reverts to its original state, so the two can be compared on the Compare tab.',
  'Скачать только фотометрический файл .ies, без отчётов и диаграмм': 'Download just the .ies photometric file, without reports or charts',
  'Скачать архив: файл .ies, отчёт о проверке, отчёт об обработке, показатели для даташита, диаграммы и исходный файл':
    'Download an archive: the .ies file, a check report, a processing report, datasheet metrics, charts and the source file',

  // --- виды графиков / масштаб ---
  Полярные: 'Polar',
  Декарт: 'Cartesian',
  'Редактор полей': 'Field editor',
  Шкала: 'Scale',
  'абсолютная (кд)': 'absolute (cd)',
  'относительная (%)': 'relative (%)',
  абсолютная: 'absolute',
  относительная: 'relative',

  // --- боковая панель файлов ---
  'Перетащите .ies/.ldt или нажмите, чтобы выбрать': 'Drag a .ies/.ldt file here, or click to choose',
  'Файлы не загружены': 'No files loaded',
  '+ Добавить файл': '+ Add file',
  'Убрать из списка': 'Remove from list',
  'Это не .ies и не .ldt файл': 'This is not a .ies or .ldt file',
  'Файл слишком большой': 'File is too large',

  // --- пустой экран / демо / сравнение ---
  'Загрузите один или несколько .ies / .ldt файлов, чтобы увидеть кривую силы света.':
    'Load one or more .ies / .ldt files to see the luminous intensity curve.',
  'Открыть демо-файл': 'Open a demo file',
  'Для сравнения нужно как минимум два файла.': 'Comparison needs at least two files.',

  // --- мобильная версия ---
  'Загрузить .ies / .ldt': 'Load .ies / .ldt',
  'Файл обрабатывается прямо на телефоне и никуда не отправляется.': 'The file is processed right on your phone and is never uploaded.',
  заменить: 'replace',
  'C0–C180 (продольная)': 'C0–C180 (longitudinal)',
  'C90–C270 (поперечная)': 'C90–C270 (transverse)',
  'Политика данных': 'Privacy policy',
  Соглашение: 'Terms',

  // --- инструменты (названия) ---
  Поток: 'Flux',
  Поворот: 'Rotate',
  Выравнивание: 'Align',
  Симметризация: 'Symmetrize',
  Сглаживание: 'Smooth',
  Чистка: 'Clean',
  Инструменты: 'Tools',
  'Отменить изменения': 'Discard changes',
  'Вернуть файл к исходному состоянию, отменив все правки': 'Revert the file to its original state, discarding all edits',
  'Недоступно для файлов Type A/B — обработка рассчитана на Type C': 'Unavailable for Type A/B files — processing is designed for Type C',
  Применить: 'Apply',
  'Применено ✓': 'Applied ✓',

  // мобильные подсказки инструментов
  'Совместит максимум КСС с осью — по центру тяжести потока.': 'Aligns the beam peak with the axis — by the flux centroid.',
  'Усреднит КСС по плоскостям C0–C180 и C90–C270.': 'Averages the distribution over the C0–C180 and C90–C270 planes.',
  'Уберёт шум гониометра вдоль γ (окно 11 точек).': 'Removes goniometer noise along γ (11-point window).',
  'Обнулит мусорные хвосты в широких углах (автоопределение).': 'Zeroes out junk tails at wide angles (auto-detected).',

  // --- поля инструментов ---
  Метод: 'Method',
  'По максимуму силы света': 'By peak intensity',
  'По центру тяжести потока': 'By flux centroid',
  'Выровнять в плоскости C0–C180': 'Align in the C0–C180 plane',
  'Выровнять в плоскости C90–C270': 'Align in the C90–C270 plane',
  'Выберите хотя бы одну плоскость': 'Select at least one plane',
  'Световой поток, лм': 'Luminous flux, lm',
  'Спин по азимуту C, °': 'Spin about azimuth C, °',
  'Наклон C0–C180, °': 'Tilt C0–C180, °',
  'Наклон C90–C270, °': 'Tilt C90–C270, °',
  'Наклон в плоскости C0–C180, °': 'Tilt in the C0–C180 plane, °',
  'Наклон в плоскости C90–C270, °': 'Tilt in the C90–C270 plane, °',
  'Окно (точек)': 'Window (points)',
  'Степень полинома': 'Polynomial order',
  'также сглаживать по азимуту C': 'also smooth along azimuth C',
  'не трогать пик': 'protect the peak',
  'Осевая (полная, схлопнуть в одну плоскость)': 'Axial (full, collapse to one plane)',
  'По плоскости C0–C180': 'By the C0–C180 plane',
  'По плоскости C90–C270': 'By the C90–C270 plane',
  'Сжать таблицу C-плоскостей': 'Compress the C-plane table',
  'Мощность, Вт': 'Power, W',
  'Светоотдача, лм/Вт': 'Efficacy, lm/W',
  'Не трогать до угла, °': 'Keep intact up to angle, °',
  'плавный спуск вместо жёсткого нуля': 'smooth fall-off instead of a hard zero',

  // --- панель показателей ---
  Показатели: 'Metrics',
  'Поток Φ, лм': 'Flux Φ, lm',
  'Поток вниз / вверх, лм': 'Flux down / up, lm',
  'Доля вниз/вверх (DFF/UFF)': 'Down/up fraction (DFF/UFF)',
  КПД: 'Efficiency',
  'Отдача, лм/Вт': 'Efficacy, lm/W',
  'Imax, кд': 'Imax, cd',
  'Imax, кд/клм': 'Imax, cd/klm',
  'Направление Imax': 'Imax direction',
  'Полный угол 2γ½': 'Beam angle 2γ½',
  'Тип КСС': 'Distribution type',
  'не достигается': 'not reached',
  'Полный угол на половине максимума силы света этой плоскости.': 'Full angle at half the peak intensity of this plane.',
  'DFF (Downward Flux Fraction) — доля светового потока, уходящая в нижнюю полусферу (γ < 90°); UFF (Upward Flux Fraction) — в верхнюю (γ > 90°). В сумме дают 100%.':
    'DFF (Downward Flux Fraction) — the share of luminous flux going into the lower hemisphere (γ < 90°); UFF (Upward Flux Fraction) — into the upper (γ > 90°). They sum to 100%.',

  // названия типов КСС (ГОСТ Р 54350)
  концентрированная: 'concentrated (К)',
  глубокая: 'deep (Г)',
  косинусная: 'cosine (Д)',
  полуширокая: 'semi-wide (Л)',
  широкая: 'wide (Ш)',
  равномерная: 'uniform (М)',

  // --- вкладки редактора полей ---
  'Формат и ключевые слова': 'Format & keywords',
  'Числовые поля': 'Numeric fields',
  'Форма светильника': 'Luminaire shape',
  'Угловые сетки': 'Angle grids',
  'Таблица кд': 'Candela table',

  // --- редактор: числовые поля ---
  'Число ламп': 'Number of lamps',
  'Поток лампы, лм (−1 = абсолютная фотометрия)': 'Lamp flux, lm (−1 = absolute photometry)',
  'Множитель силы света': 'Candela multiplier',
  'Ширина, м': 'Width, m',
  'Длина, м': 'Length, m',
  'Высота, м': 'Height, m',
  'Потребляемая мощность, Вт': 'Input power, W',
  'Тип фотометрии': 'Photometric type',
  '1 — Type C': '1 — Type C',
  '2 — Type B': '2 — Type B',
  '3 — Type A': '3 — Type A',

  // --- редактор: формат/ключевые слова ---
  'Версия LM-63': 'LM-63 version',
  'Имя файла': 'File name',
  Множители: 'Multipliers',
  'Режим': 'Mode',
  'Углы, °': 'Angles, °',
  '+ ключевое слово': '+ keyword',
  Удалить: 'Remove',
  'Внешний файл': 'External file',
  'INCLUDE (пары угол/множитель в этом файле)': 'INCLUDE (angle/factor pairs in this file)',
  Ключ: 'Key',
  Значение: 'Value',

  // --- редактор: форма ---
  'Форма светового отверстия': 'Luminous opening shape',
  'Геометрия лампы-светильника': 'Luminaire geometry',
  Форма: 'Shape',
  'Диаметр, м': 'Diameter, m',
  'Длина (плоскость C0–C180), м': 'Length (C0–C180 plane), m',
  'Ширина (плоскость C90–C270), м': 'Width (C90–C270 plane), m',
  'Прямоугольник / прямоугольный бокс': 'Rectangle / rectangular box',
  'Точка (безразмерный источник)': 'Point (dimensionless source)',
  'Диск (плоский круг)': 'Disc (flat circle)',
  'Вертикальный цилиндр': 'Vertical cylinder',
  'Сфера / эллипсоид': 'Sphere / ellipsoid',
  'Эллипс вдоль длины (плоскость C0–C180)': 'Ellipse along length (C0–C180 plane)',
  'Эллипс вдоль ширины (плоскость C90–C270)': 'Ellipse along width (C90–C270 plane)',
  'Другое (нестандартная комбинация)': 'Other (non-standard combination)',
  'Источник считается точечным: все три размера равны нулю.': 'The source is treated as a point: all three sizes are zero.',

  // --- редактор: угловые сетки ---
  'Угловые сетки γ и C': 'γ and C angle grids',
  'γ (надир → зенит), °, через пробел': 'γ (nadir → zenith), °, space-separated',
  'C (азимут), °, через пробел': 'C (azimuth), °, space-separated',
  'Пересчитать КСС на новую сетку': 'Resample the distribution to the new grid',
  'Нужно минимум 2 угла γ и 1 угол C': 'Need at least 2 γ angles and 1 C angle',

  // --- редактор: таблица кд ---
  'Таблица силы света (кд)': 'Luminous intensity table (cd)',
  значений: 'values',
  'плоскостей ×': 'planes ×',
  'углов =': 'angles =',

  // --- проверка файла / предупреждения / изменения ---
  'Проверка файла': 'File check',
  Предупреждения: 'Warnings',
  'Изменения относительно исходного': 'Changes vs. the original',
  'Скопировать отчёт': 'Copy report',
  Скопировано: 'Copied',
  'Скопировать отчёт, чтобы отправить поставщику': 'Copy the report to send to the supplier',
  Скрыть: 'Hide',
  'Скрыть пройденные': 'Hide passed',
  'Пройдено проверок': 'Checks passed',

  // --- сравнение ---
  'Файл A': 'File A',
  'Файл B': 'File B',
  Показатель: 'Metric',
  'КПД, %': 'Efficiency, %',

  // --- cookie ---
  'Сайт использует cookie только для обезличенной статистики посещений (Яндекс.Метрика).':
    'This site uses cookies only for anonymous visit statistics (Yandex.Metrica).',
  'Политика обработки данных': 'Privacy policy',
  Понятно: 'Got it',
  'Уведомление о файлах cookie': 'Cookie notice',

  // --- прочее ---
  'Сбросить текст': 'Reset text',
  // --- дополнено при проводке ---
  'это не .ies и не .ldt файл': 'not a .ies or .ldt file',
  'файл слишком большой': 'file is too large',
  'МБ': 'MB',
  'Достигнут лимит в N файлов — удалите один из списка, чтобы загрузить новый.':
    'File limit of N reached — remove one from the list to load a new file.',
  'Обе плоскости в общей шкале (Imax всей КСС) — можно сравнивать величину между плоскостями':
    'Both planes on a shared scale (the whole-curve Imax) — magnitudes are comparable between planes',
  'Каждая плоскость нормирована к своему собственному максимуму — форма луча всегда доходит до края':
    'Each plane is normalized to its own peak — the beam shape always reaches the edge',
  'Опорное значение': 'Reference value',
  'Расчётное по КСС': 'Computed from the curve',
  'Заявленное (шапка файла)': 'Declared (file header)',
  'Поток, лм': 'Flux, lm',
  'Поток должен быть положительным': 'Flux must be positive',
  'Мощность в файле не задана — укажите её, чтобы считать светоотдачу.':
    'Power is not set in the file — enter it to compute efficacy.',
  'Вернуть углы к нулю — КСС вернётся к состоянию на момент открытия инструмента':
    'Reset angles to zero — the distribution returns to its state when the tool was opened',
  'Также сглаживать по азимуту C': 'Also smooth along azimuth C',
  'Не трогать пик': 'Protect the peak',
  'Сжать таблицу C после симметризации': 'Compress the C table after symmetrizing',
  'Выберите хотя бы одну ось': 'Select at least one axis',
  'Порог "внезапности" обрыва': 'Cut-off abruptness threshold',
  'Потолок по модулю, % от Imax': 'Magnitude cap, % of Imax',
  'Плавный спад вместо жёсткого нуля': 'Smooth fall-off instead of a hard zero',
  'Число ламп ': 'Number of lamps ',
  'Заявленное в файле': 'Declared in file',
  'Проблем не обнаружено': 'No problems found',
  'Обе кривые в реальных канделах — если светильники сильно различаются по яркости, слабая кривая может быть почти не видна':
    'Both curves in real candelas — if the luminaires differ a lot in brightness, the dimmer curve may be nearly invisible',
  'Каждая кривая нормирована к своему максимуму — форма луча сравнима, даже если яркость различается в разы':
    'Each curve normalized to its own peak — beam shapes are comparable even if brightness differs greatly',
  '1 — вертикальная': '1 — vertical',
  '2 — горизонтальная симметричная': '2 — horizontal symmetric',
  '3 — горизонтальная несимметричная': '3 — horizontal asymmetric',
  'н/д': 'n/a',
  'Проблем не найдено': 'No problems found',
  'Есть замечания': 'Some remarks',
  'Найдены проблемы': 'Problems found',
  'Справочник': 'Reference',
};
