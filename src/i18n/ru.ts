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
} as const;
