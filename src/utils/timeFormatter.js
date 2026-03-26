import i18n from '../i18n';

function normalizeDateInput(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value < 1e12 ? value * 1000 : value);
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return null;
    }

    if (/^\d+$/.test(trimmedValue)) {
      const timestamp = Number(trimmedValue);
      if (Number.isFinite(timestamp)) {
        return new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp);
      }
    }

    const parsedDate = new Date(trimmedValue);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    // Some APIs return "YYYY-MM-DD HH:mm:ss", which Safari/Hermes may not parse reliably.
    const normalizedIsoLikeValue = trimmedValue.replace(' ', 'T');
    const normalizedDate = new Date(normalizedIsoLikeValue);
    if (!Number.isNaN(normalizedDate.getTime())) {
      return normalizedDate;
    }
  }

  return null;
}

/**
 * Format a timestamp or Date object into a relative time string with internationalization support
 * @param {Date|string|number} date - Date object, ISO string, or timestamp
 * @returns {string} Formatted time string (e.g., "2 hours ago", "Yesterday", "Just now")
 */
export function formatTime(date) {
  if (!date) return '';
  
  const now = new Date();
  const targetDate = normalizeDateInput(date);

  if (!targetDate) {
    return typeof date === 'string' ? date : '';
  }
  
  // Calculate time difference in milliseconds
  const diffMs = now - targetDate;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  // Just now (less than 1 minute)
  if (diffMinutes < 1) {
    return i18n.t('common.time.justNow') || i18n.t('home.justNow');
  }
  
  // Minutes ago (1-59 minutes)
  if (diffMinutes < 60) {
    const minutesText = i18n.t('common.time.minutesAgo') || i18n.t('home.minutesAgo');
    return `${diffMinutes}${minutesText}`;
  }
  
  // Hours ago (1-23 hours)
  if (diffHours < 24) {
    const hoursText = i18n.t('common.time.hoursAgo') || i18n.t('home.hoursAgo');
    return `${diffHours}${hoursText}`;
  }
  
  // Yesterday
  if (diffDays === 1) {
    return i18n.t('common.time.yesterday') || i18n.t('home.yesterday');
  }
  
  // Days ago (2-6 days)
  if (diffDays < 7) {
    const daysText = i18n.t('common.time.daysAgo') || i18n.t('home.daysAgo');
    return `${diffDays}${daysText}`;
  }
  
  // For dates older than 7 days, return formatted date
  return formatDate(targetDate);
}

/**
 * Format a date into a localized date string
 * @param {Date|string|number} date - Date object, ISO string, or timestamp
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeTime - Whether to include time (default: false)
 * @param {boolean} options.short - Use short format (default: false)
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = {}) {
  if (!date) return '';
  
  const { includeTime = false, short = false } = options;
  const targetDate = normalizeDateInput(date);

  if (!targetDate) {
    return typeof date === 'string' ? date : '';
  }
  
  // Get current locale
  const locale = i18n.locale;
  
  // 默认格式：月.日.年 (例如：3.18.2026)
  const month = targetDate.getMonth() + 1; // 不补零
  const day = targetDate.getDate(); // 不补零
  const year = targetDate.getFullYear();
  
  // 如果没有指定特殊选项，使用默认的 月.日.年 格式
  if (!includeTime && !short) {
    return `${month}.${day}.${year}`;
  }
  
  // Format based on locale (仅在指定了 short 或 includeTime 选项时使用)
  if (locale === 'zh' || locale.startsWith('zh')) {
    // Chinese format: YYYY年MM月DD日 or YYYY-MM-DD
    const monthPadded = String(month).padStart(2, '0');
    const dayPadded = String(day).padStart(2, '0');
    
    if (short) {
      const dateStr = `${year}-${monthPadded}-${dayPadded}`;
      if (includeTime) {
        const hours = String(targetDate.getHours()).padStart(2, '0');
        const minutes = String(targetDate.getMinutes()).padStart(2, '0');
        return `${dateStr} ${hours}:${minutes}`;
      }
      return dateStr;
    }
    
    const dateStr = `${year}年${monthPadded}月${dayPadded}日`;
    if (includeTime) {
      const hours = String(targetDate.getHours()).padStart(2, '0');
      const minutes = String(targetDate.getMinutes()).padStart(2, '0');
      return `${dateStr} ${hours}:${minutes}`;
    }
    return dateStr;
  } else {
    // English format: MMM DD, YYYY or MM/DD/YYYY
    if (short) {
      const monthPadded = String(month).padStart(2, '0');
      const dayPadded = String(day).padStart(2, '0');
      const dateStr = `${monthPadded}/${dayPadded}/${year}`;
      
      if (includeTime) {
        const hours = String(targetDate.getHours()).padStart(2, '0');
        const minutes = String(targetDate.getMinutes()).padStart(2, '0');
        return `${dateStr} ${hours}:${minutes}`;
      }
      return dateStr;
    }
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return targetDate.toLocaleDateString('en-US', options);
  }
}

/**
 * Format duration in seconds to MM:SS format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string (e.g., "05:30")
 */
export function formatDuration(seconds) {
  if (typeof seconds !== 'number' || seconds < 0) return '00:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
