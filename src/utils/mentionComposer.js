export const DEFAULT_MENTION_SEARCH_LIMIT = 20;
export const DEFAULT_MENTION_PANEL_MAX_HEIGHT = 320;
export const DEFAULT_MENTION_KEYBOARD_MAX_HEIGHT = 228;
export const DEFAULT_MENTION_KEYBOARD_MIN_HEIGHT = 136;
export const DEFAULT_MENTION_KEYBOARD_VISIBLE_RATIO = 0.38;
export const DEFAULT_MENTION_PANEL_BASE_OFFSET = 72;
export const MENTION_TRAY_HEADER_HEIGHT = 54;
export const MENTION_TRAY_ITEM_HEIGHT = 68;
export const MENTION_TRAY_STATUS_HEIGHT = 92;
export const MENTION_TRAY_DEFAULT_ROWS = 4;
export const MENTION_TRAY_SEARCH_ROWS = 5;

const MENTION_BREAK_PATTERN = /[\s,，。.!?？;；:：/\\()[\]{}<>]/;
const MENTION_TOKEN_PATTERN =
  /(^|[^0-9A-Za-z_])(@[^\s,，。.!?？;；:：/\\()[\]{}<>]+)/g;

export const getActiveMention = (text, selection) => {
  const normalizedText = String(text ?? '');
  const cursor = Math.max(
    0,
    Math.min(Number(selection?.start ?? normalizedText.length) || 0, normalizedText.length)
  );
  const textBeforeCursor = normalizedText.slice(0, cursor);
  const mentionStart = textBeforeCursor.lastIndexOf('@');

  if (mentionStart < 0) {
    return null;
  }

  const previousChar = mentionStart > 0 ? textBeforeCursor[mentionStart - 1] : '';
  if (previousChar && /[0-9A-Za-z_]/.test(previousChar)) {
    return null;
  }

  const keyword = textBeforeCursor.slice(mentionStart + 1);
  if (MENTION_BREAK_PATTERN.test(keyword)) {
    return null;
  }

  return {
    start: mentionStart,
    end: cursor,
    keyword,
  };
};

export const resolveMentionValue = user => {
  const username = String(user?.username ?? '').trim().replace(/^@+/, '');
  const nickName = String(user?.nickName ?? user?.nickname ?? '').trim().replace(/^@+/, '');

  return username || nickName || '';
};

export const buildMentionTextParts = (text, activeMention) => {
  const normalizedText = String(text ?? '');

  if (!normalizedText) {
    return [];
  }

  const parts = [];
  const pattern = new RegExp(MENTION_TOKEN_PATTERN);
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(normalizedText)) !== null) {
    const prefix = match[1] ?? '';
    const mention = match[2] ?? '';
    const prefixStart = match.index;
    const mentionStart = prefixStart + prefix.length;

    if (lastIndex < prefixStart) {
      parts.push({
        text: normalizedText.slice(lastIndex, prefixStart),
        isMention: false,
      });
    }

    if (prefix) {
      parts.push({
        text: prefix,
        isMention: false,
      });
    }

    if (mention) {
      parts.push({
        text: mention,
        isMention: true,
        isActive:
          Number(activeMention?.start) === mentionStart &&
          Number(activeMention?.end) >= mentionStart + mention.length,
      });
    }

    lastIndex = mentionStart + mention.length;
  }

  if (lastIndex < normalizedText.length) {
    parts.push({
      text: normalizedText.slice(lastIndex),
      isMention: false,
    });
  }

  return parts;
};
