const GENERIC_ERROR_MESSAGE =
  '\u64cd\u4f5c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5';
const GENERIC_WARNING_MESSAGE = '\u8bf7\u7a0d\u540e\u91cd\u8bd5';
const GENERIC_INFO_MESSAGE = '\u63d0\u793a';

const COMMON_MESSAGE_KEYS = [
  'userMessage',
  'displayMessage',
  'msg',
  'message',
  'errorMessage',
  'error',
  'description',
  'detail',
];

const PRODUCT_MESSAGE_RULES = [
  {
    match: text => text.includes('发布后不允许新增、编辑或删除回答补充'),
    message: '当前回答暂不支持继续补充，请稍后再试。',
  },
  {
    match: text => text.includes('不允许新增、编辑或删除问题补充'),
    message: '当前问题暂不支持继续补充，请稍后再试。',
  },
];

const normalizeFallback = (fallback, type = 'error') => {
  if (typeof fallback === 'string' && fallback.trim()) {
    return fallback.trim();
  }

  switch (type) {
    case 'warning':
      return GENERIC_WARNING_MESSAGE;
    case 'success':
    case 'info':
      return GENERIC_INFO_MESSAGE;
    case 'error':
    default:
      return GENERIC_ERROR_MESSAGE;
  }
};

const unwrapQuotedMessage = (value) => {
  const text = String(value ?? '').trim();
  if (!text) {
    return '';
  }

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith('\'') && text.endsWith('\''))
  ) {
    return text.slice(1, -1).trim();
  }

  return text;
};

const looksLikeTechnicalMessage = (text) => {
  if (!text) {
    return false;
  }

  return (
    /api调用失败|接口调用失败/i.test(text) ||
    /\[object Object\]/i.test(text) ||
    /request failed with status code/i.test(text) ||
    /network error/i.test(text) ||
    /网络连接失败|网络请求失败|请求失败，请检查网络/i.test(text) ||
    /axioserror/i.test(text) ||
    /typeerror|syntaxerror|referenceerror|rangeerror/i.test(text) ||
    /\bat\s+\S+\s*\(/.test(text) ||
    /https?:\/\//i.test(text) ||
    /exception/i.test(text)
  );
};

const extractMessageFromJsonLikeString = (text) => {
  if (!text) {
    return '';
  }

  const keyMatch = text.match(
    /"(userMessage|displayMessage|msg|message|errorMessage|description|detail)"\s*:\s*"([^"]+)"/i
  );
  if (keyMatch?.[2]) {
    return keyMatch[2].trim();
  }

  const singleQuoteMatch = text.match(
    /'(userMessage|displayMessage|msg|message|errorMessage|description|detail)'\s*:\s*'([^']+)'/i
  );
  if (singleQuoteMatch?.[2]) {
    return singleQuoteMatch[2].trim();
  }

  return '';
};

function extractFromObject(value, fallback, type, visited) {
  if (!value || typeof value !== 'object') {
    return '';
  }

  if (visited.has(value)) {
    return '';
  }

  visited.add(value);

  for (const key of COMMON_MESSAGE_KEYS) {
    if (value[key] !== undefined && value[key] !== null) {
      const nested = sanitizeUserFacingMessage(value[key], fallback, type, visited);
      if (nested && nested !== fallback) {
        return nested;
      }
    }
  }

  if (value.data) {
    const nested = sanitizeUserFacingMessage(value.data, fallback, type, visited);
    if (nested && nested !== fallback) {
      return nested;
    }
  }

  if (value.response?.data) {
    const nested = sanitizeUserFacingMessage(
      value.response.data,
      fallback,
      type,
      visited
    );
    if (nested && nested !== fallback) {
      return nested;
    }
  }

  return '';
}

export function sanitizeUserFacingMessage(
  rawMessage,
  fallback,
  type = 'error',
  visited = new WeakSet()
) {
  const safeFallback = normalizeFallback(fallback, type);

  if (rawMessage === undefined || rawMessage === null) {
    return safeFallback;
  }

  if (typeof rawMessage === 'object') {
    const nested = extractFromObject(rawMessage, safeFallback, type, visited);
    return nested || safeFallback;
  }

  let text = unwrapQuotedMessage(rawMessage);

  if (!text) {
    return safeFallback;
  }

  text = text.replace(/^error:\s*/i, '').trim();
  text = text.replace(/^(api调用失败|接口调用失败)\s*[:：]\s*/i, '').trim();

  const nestedErrorMatch = text.match(/(?:^|[:：]\s*)error:\s*(.+)$/i);
  if (nestedErrorMatch?.[1]) {
    return sanitizeUserFacingMessage(nestedErrorMatch[1], safeFallback, type, visited);
  }

  const extractedFromJson = extractMessageFromJsonLikeString(text);
  if (extractedFromJson) {
    return sanitizeUserFacingMessage(extractedFromJson, safeFallback, type, visited);
  }

  if (
    (text.startsWith('{') && text.endsWith('}')) ||
    (text.startsWith('[') && text.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(text);
      return sanitizeUserFacingMessage(parsed, safeFallback, type, visited);
    } catch (error) {
      return safeFallback;
    }
  }

  if (looksLikeTechnicalMessage(text)) {
    return safeFallback;
  }

  if (/[{}[\]"]/g.test(text) && /msg|message|code|status/i.test(text)) {
    return safeFallback;
  }

  for (const rule of PRODUCT_MESSAGE_RULES) {
    if (rule.match(text)) {
      return rule.message;
    }
  }

  return text;
}

export const getDefaultUserFacingMessage = (type = 'error') =>
  normalizeFallback('', type);
