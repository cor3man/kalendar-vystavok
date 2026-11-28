// All UI strings (CLAUDE.md: no Russian text elsewhere in code).
// Printed calendar labels live here too; domain and layout import them as plain data.
export const ru = {
  appName: 'Календарь выставок',
  versionLabel: 'Версия',
  /** Web app manifest (SPEC 5.9). */
  manifestDescription: 'Календарь выставок компании: редактирование и печать в A3 и A4.',

  /** SPEC 5.9: update banner. */
  update: {
    available: 'Доступна новая версия',
    apply: 'Обновить',
    applying: 'Обновление…',
  },

  /** Month names, nominative (header band prints them in capitals). */
  months: [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ],
  /** Month names, genitive, for dates in words: "16–18 марта 2027" (SPEC 5). */
  monthsGenitive: [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ],
  /** Weekday abbreviations, Monday first (SPEC 3.3). */
  weekdaysShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  /** Followed by DD.MM.YYYY at the top right of the page (SPEC 3.2). */
  updatedPrefix: 'Обновлено:',

  /** Labels of the default Belarus holidays (SPEC Appendix B). */
  holidayLabels: {
    easter: 'Пасха',
    radunitsa: 'Радуница',
    november7: '7 ноября',
  },

  /** Palette colour names (SPEC Appendix C). */
  /** Hues of the colour grid (SPEC 5.4, Appendix C). */
  colorHues: {
    grey: 'Серый',
    red: 'Красный',
    orange: 'Оранжевый',
    yellow: 'Жёлтый',
    green: 'Зелёный',
    turquoise: 'Бирюзовый',
    blue: 'Голубой',
    lilac: 'Сиреневый',
    violet: 'Фиолетовый',
    pink: 'Розовый',
  },

  /** SPEC 5.10. */
  settings: {
    open: 'Настройки',
    title: 'Настройки',
    selectionMode: 'Выбор дней',
    selectionClickShift: 'Щелчок и Shift+щелчок',
    selectionDrag: 'Протягивание мышью',
    weekendTint: 'Цвет выходных',
    tintGrey: 'Серый',
    tintPink: 'Розовый',
    tintCustom: 'Другой…',
    customTint: 'Свой цвет выходных',
    heldMark: 'Отмечать проведённые выставки знаком ✓',
    startup: 'При запуске открывать',
    startupLast: 'Последний год и формат',
    startupCurrent: 'Текущий год, формат «Год»',
  },

  /** SPEC 5.4 colour picker. */
  colorPicker: {
    cell: (hue: string, tint: number) => `${hue}, оттенок ${String(tint)}`,
    recent: 'Последние цвета',
    more: 'Другой цвет…',
    hue: 'Оттенок',
    lightness: 'Светлота',
    preview: 'Выбранный цвет',
  },

  formats: {
    year: 'Год (A3)',
    h1: 'I полугодие (A4)',
    h2: 'II полугодие (A4)',
    split: 'II полугодие + I следующего (A3)',
  },

  toolbar: {
    year: 'Год',
    prevYear: 'Предыдущий год',
    nextYear: 'Следующий год',
    format: 'Формат',
  },

  pdf: {
    download: 'Скачать PDF',
    print: 'Печать',
    busy: 'Создание PDF…',
    error: 'Не удалось создать PDF. Попробуйте ещё раз.',
    popupBlocked:
      'Браузер не открыл новую вкладку, поэтому PDF скачан. Откройте его и нажмите «Печать».',
  },

  preview: {
    label: 'Предпросмотр календаря',
    loading: 'Загрузка шрифтов…',
  },

  loading: 'Загрузка…',

  /** SPEC 5.1 "Start" and 4.2. */
  start: {
    title: 'Папка данных',
    intro:
      'Все данные календаря хранятся в одной папке на этом компьютере. Приложение никуда их не отправляет.',
    syncHint:
      'Рекомендуем выбрать папку внутри Google Диска или OneDrive: тогда у данных будет копия в облаке.',
    create: 'Создать новую папку данных',
    createHint: 'Выберите пустую папку. В ней появятся данные с примерами выставок.',
    open: 'Открыть существующую',
    openHint: 'Выберите папку, в которой уже есть файл kalendar-data.json.',
    resume: 'Продолжить работу',
    resumeHint: 'Браузер попросит разрешение на доступ к папке данных.',
    other: 'Выбрать другую папку',
    folderHasData: 'В этой папке уже есть данные календаря. Они не будут перезаписаны.',
    openThem: 'Открыть эти данные',
    folderHasNoData:
      'В выбранной папке нет файла kalendar-data.json. Выберите папку с данными или создайте новую.',
    error: 'Не удалось открыть папку. Попробуйте ещё раз.',
  },

  /** SPEC 5.1 "Unsupported". */
  unsupported: {
    title: 'Браузер не поддерживается',
    text: 'Приложению нужен доступ к папке на компьютере. Откройте его в Google Chrome или Microsoft Edge.',
  },

  /** SPEC 4.4: invalid data file. */
  invalid: {
    title: 'Файл данных повреждён',
    text: 'Файл kalendar-data.json не удалось прочитать. Он не будет перезаписан.',
    restore: (stamp: string) => `Открыть резервную копию от ${stamp}`,
    restoreHint: 'Повреждённый файл сохранится в папке backups.',
    noBackup: 'Подходящих резервных копий нет. Обратитесь к разработчику.',
    details: 'Подробности для разработчика',
  },

  /** SPEC 4.6 and 4.4: read-only reasons. */
  readOnly: {
    otherTab: 'Приложение уже открыто в другом окне. Здесь можно только смотреть и печатать.',
    newerVersion:
      'Этот файл создан более новой версией приложения. Изменения не сохраняются — обновите страницу.',
  },

  /** SPEC 4.3: save status and errors. */
  save: {
    saved: 'Сохранено',
    saving: 'Сохранение…',
    error: 'Ошибка сохранения',
    failed:
      'Не удалось сохранить изменения. Они пока есть только в этом окне — не закрывайте его. Сохранение повторится при следующем изменении.',
    retry: 'Повторить',
    downloadBackup: 'Скачать резервную копию',
  },

  conflict: {
    title: 'Файл данных изменён вне приложения',
    text: 'Файл kalendar-data.json изменился на диске — например, его обновила программа синхронизации или другой компьютер. Автосохранение остановлено.',
    reload: 'Загрузить с диска',
    reloadHint: 'Изменения из этого окна будут потеряны.',
    overwrite: 'Перезаписать',
    overwriteHint: 'Данные из этого окна заменят файл на диске.',
  },

  /** SPEC 5.1 "Data" and 4.7. */
  data: {
    open: 'Данные',
    title: 'Данные',
    folder: 'Папка данных',
    lastSave: 'Последнее сохранение',
    never: '—',
    version: 'Версия приложения',
    backups: 'Резервные копии',
    backupsHint: 'Хранятся 30 последних копий в папке backups.',
    noBackups: 'Резервных копий пока нет.',
    sizeKb: (kb: number) => `${String(kb)} КБ`,
    restore: 'Восстановить',
    restoreConfirm: (stamp: string) =>
      `Заменить текущие данные резервной копией от ${stamp}? Текущие данные сначала будут сохранены в резервную копию.`,
    export: 'Экспорт',
    exportHint: 'Скачать все данные одним файлом JSON.',
    import: 'Импорт',
    importHint: 'Загрузить данные из файла JSON вместо текущих.',
    importTitle: 'Импорт данных',
    importConfirm: 'Текущие данные будут заменены. Перед этим они сохранятся в резервную копию.',
    importInvalid: 'Этот файл не является файлом данных календаря или повреждён.',
    importNewer: 'Этот файл создан более новой версией приложения. Обновите страницу и повторите.',
    importDo: 'Заменить данные',
    counts: {
      exhibitions: 'Выставки в каталоге',
      events: 'Выставки в календаре',
      countries: 'Страны',
      holidays: 'Праздники',
    },
    changeFolder: 'Сменить папку',
    unsavedConfirm: 'Последние изменения не сохранены и будут потеряны. Всё равно сменить папку?',
    actionError: 'Не удалось выполнить действие. Попробуйте ещё раз.',
  },

  common: {
    close: 'Закрыть',
    cancel: 'Отмена',
    confirm: 'Подтверждение',
    save: 'Сохранить',
    edit: 'Изменить',
    delete: 'Удалить',
    add: 'Добавить',
    none: '—',
  },

  /** SPEC 5.2 toolbar, editing part. */
  editing: {
    newEvent: '+ Выставка',
    undo: 'Отменить',
    redo: 'Повторить',
    undoHint: 'Отменить (Ctrl+Z)',
    redoHint: 'Повторить (Ctrl+Y)',
    catalogue: 'Каталог',
    holidays: 'Праздники',
  },

  /** SPEC 5.3: selecting days on the preview. */
  selection: {
    hint: 'Выделите дни мышью, чтобы добавить выставку. Щёлкните по выставке, чтобы изменить её.',
    hintClickShift:
      'Щёлкните первый день, затем Shift+щелчок — последний, чтобы добавить выставку. Щёлкните по выставке, чтобы изменить её.',
    shiftHint: 'Shift+щелчок — последний день',
  },

  /** SPEC 5.4. */
  eventDialog: {
    titleNew: 'Новая выставка в календаре',
    titleEdit: 'Выставка в календаре',
    titleCopy: 'Копия на следующий год',
    exhibition: 'Выставка',
    exhibitionPlaceholder: 'Начните вводить название',
    createExhibition: (name: string) => `Создать выставку «${name}»`,
    noMatches: 'Ничего не найдено',
    start: 'Начало',
    end: 'Окончание',
    city: 'Город',
    country: 'Страна',
    noCountry: 'Не указана',
    color: 'Цвет',
    darkColor: 'Цвет тёмный: чёрный текст на нём будет плохо виден при печати.',
    held: 'Выставка проведена',
    note: 'Заметка',
    noteHint: 'Только для себя, в календаре не печатается.',
    copyNextYear: 'Копировать на следующий год',
    copyHint: 'Те же дни недели через год. Проверьте даты и сохраните.',
    deleted: 'Удалено.',
    undoDelete: 'Отменить',
  },

  /** Messages for refused edits (domain EditError). */
  editErrors: {
    exhibitionRequired: 'Выберите выставку из каталога или создайте новую.',
    dateRequired: 'Укажите даты начала и окончания.',
    nameRequired: 'Введите название.',
    nameTaken: 'Такое название уже есть.',
    shortNameLines: 'Короткое название — не больше 4 строк.',
    inUse: 'Используется в календаре, поэтому удалить нельзя.',
    notFound: 'Запись не найдена: возможно, её уже удалили.',
    invalidDate: 'Неверная дата.',
    invalidColor: 'Неверный цвет.',
    unknownExhibition: 'Выставка не найдена в каталоге.',
    unknownCountry: 'Страна не найдена.',
    dateTaken: 'На эту дату уже есть праздник.',
  },

  /** SPEC 5.2 event list. */
  eventList: {
    title: 'Выставки периода',
    empty: 'В этом периоде пока нет выставок.',
    held: 'Проведена',
    planned: 'Запланирована',
    columns: {
      color: 'Цвет',
      name: 'Выставка',
      dates: 'Даты',
      city: 'Город',
      country: 'Страна',
      state: 'Статус',
    },
  },

  /** SPEC 5.7. */
  warnings: {
    title: 'Предупреждения',
    textOverflow: (name: string) => `Текст не помещается: ${name}`,
    tripleOverlap: (names: string) => `Три и более выставки в один день: ${names}`,
    missingFlag: (name: string) => `Нет флага: ${name}`,
    noHolidays: (year: number) => `Нет праздников на ${String(year)} год`,
    hint: 'Предупреждения не мешают печати.',
  },

  /** SPEC 5.5. */
  catalogue: {
    title: 'Каталог',
    exhibitionsTab: 'Выставки',
    countriesTab: 'Страны',
    addExhibition: 'Добавить выставку',
    addCountry: 'Добавить страну',
    newExhibition: 'Новая выставка',
    editExhibition: 'Выставка',
    newCountry: 'Новая страна',
    editCountry: 'Страна',
    name: 'Название',
    shortName: 'Короткое название',
    shortNameHint: 'Так оно печатается в календаре. Enter — перенос строки, не больше 4 строк.',
    preview: 'Как это выглядит в ячейке на 3 дня',
    logo: 'Логотип',
    flag: 'Флаг',
    upload: 'Загрузить…',
    removeImage: 'Убрать',
    imageHint: 'PNG, JPG или SVG.',
    defaultCity: 'Город по умолчанию',
    defaultCountry: 'Страна по умолчанию',
    defaultColor: 'Цвет по умолчанию',
    events: 'В календаре',
    noLogo: 'Без логотипа',
    noFlag: 'Без флага',
    usedBy: 'Используется в календаре:',
    imageTooLarge: 'Картинка слишком большая (больше 200 КБ даже после уменьшения).',
    imageUnreadable: 'Не удалось прочитать картинку. Загрузите PNG, JPG или SVG.',
  },

  /** SPEC 5.8. */
  holidays: {
    title: 'Праздники',
    yearTitle: (year: number) => `${String(year)} год`,
    date: 'Дата',
    label: 'Надпись',
    labelHint: 'Без надписи день просто выделяется цветом.',
    fill: 'Заполнить праздниками Беларуси',
    filled: (n: number) => `Добавлено праздников: ${String(n)}.`,
    nothingToFill: 'Все праздники Беларуси уже есть.',
    empty: 'Праздников нет.',
    deleteLabel: (date: string) => `Удалить праздник ${date}`,
  },
} as const;
