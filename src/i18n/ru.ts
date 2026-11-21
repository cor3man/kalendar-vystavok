// All UI strings (CLAUDE.md: no Russian text elsewhere in code).
// Printed calendar labels live here too; domain and layout import them as plain data.
export const ru = {
  appName: 'Календарь выставок',
  versionLabel: 'Версия',

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
  palette: {
    lilac: 'Сиреневый',
    lightLilac: 'Светло-сиреневый',
    lightBlue: 'Голубой',
    grey: 'Серый',
    darkGrey: 'Тёмно-серый',
    pink: 'Розовый',
    green: 'Зелёный',
    yellow: 'Жёлтый',
    orange: 'Оранжевый',
    turquoise: 'Бирюзовый',
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
  },
} as const;
