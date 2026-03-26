jest.mock('../../i18n', () => ({
  locale: 'zh',
  t: (key) => {
    const translations = {
      'common.time.justNow': '刚刚',
      'common.time.minutesAgo': '分钟前',
      'common.time.hoursAgo': '小时前',
      'common.time.yesterday': '昨天',
      'common.time.daysAgo': '天前',
    };

    return translations[key] || key;
  },
}));

import { formatDate, formatTime } from '../timeFormatter';

describe('timeFormatter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-25T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns preformatted relative time strings as-is', () => {
    expect(formatTime('3小时前')).toBe('3小时前');
    expect(formatTime('1天前')).toBe('1天前');
  });

  test('formats unix timestamp strings without producing NaN', () => {
    const formatted = formatDate('1710936000', { short: true });

    expect(formatted).toBeTruthy();
    expect(formatted).not.toContain('NaN');
  });

  test('formats old ISO dates into month.day.year format', () => {
    expect(formatTime('2026-03-01T12:00:00Z')).toBe('3.1.2026');
  });
});
