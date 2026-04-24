import {
  REWARD_MAX_DECIMAL_PLACES,
  REWARD_MIN_AMOUNT,
} from '../constants/reward';

const INVALID_AMOUNT_FALLBACK = '$0';
const INVALID_AMOUNT_VALUE_FALLBACK = '0';
const AMOUNT_INPUT_PATTERN = /^\d+(?:\.\d{0,2})?$/;

export function sanitizeAmountInput(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const rawValue = String(value).replace(/[^\d.]/g, '');
  if (!rawValue) {
    return '';
  }

  let normalizedValue = '';
  let hasDecimalPoint = false;

  for (const char of rawValue) {
    if (char === '.') {
      if (hasDecimalPoint) {
        continue;
      }
      hasDecimalPoint = true;
    }

    normalizedValue += char;
  }

  if (normalizedValue.startsWith('.')) {
    normalizedValue = `0${normalizedValue}`;
  }

  const decimalIndex = normalizedValue.indexOf('.');
  if (decimalIndex === -1) {
    return normalizedValue;
  }

  const integerPart = normalizedValue.slice(0, decimalIndex);
  const decimalPart = normalizedValue
    .slice(decimalIndex + 1)
    .replace(/\./g, '')
    .slice(0, REWARD_MAX_DECIMAL_PLACES);

  if (normalizedValue.endsWith('.') && decimalPart.length === 0) {
    return `${integerPart}.`;
  }

  return `${integerPart}.${decimalPart}`;
}

export function parseAmountNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalizedValue = String(value).trim();
  if (!normalizedValue || !AMOUNT_INPUT_PATTERN.test(normalizedValue)) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function parseRewardAmountToCents(
  value,
  {
    required = true,
    allowZero = false,
    minAmount = REWARD_MIN_AMOUNT,
  } = {}
) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return required ? null : 0;
  }

  const amount = parseAmountNumber(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  if (amount === 0) {
    return allowZero ? 0 : null;
  }

  if (amount < minAmount) {
    return null;
  }

  return Math.round(amount * 100);
}

export function centsToAmount(value) {
  const cents = Number(value);
  if (!Number.isFinite(cents)) {
    return 0;
  }

  return Math.round(cents) / 100;
}

export function formatAmountValue(amount) {
  if (amount === null || amount === undefined || amount === '') {
    return INVALID_AMOUNT_VALUE_FALLBACK;
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) {
    return INVALID_AMOUNT_VALUE_FALLBACK;
  }

  const normalizedAmount =
    Math.round((numericAmount + Number.EPSILON) * 100) / 100;

  if (Number.isInteger(normalizedAmount)) {
    return normalizedAmount.toString();
  }

  return normalizedAmount.toString();
}

export function formatAmount(amount) {
  if (amount === null || amount === undefined || amount === '') {
    return INVALID_AMOUNT_FALLBACK;
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) {
    return INVALID_AMOUNT_FALLBACK;
  }

  return `$${formatAmountValue(numericAmount)}`;
}
