const TWEMOJI_VERSION = '17.0.2';
const TWEMOJI_ASSET_SIZE = '72x72';
const VARIATION_SELECTOR_16 = 0xfe0f;
const ZERO_WIDTH_JOINER = 0x200d;
const KEYCAP_COMBINING_MARK = 0x20e3;
const EMOJI_CLUSTER_REGEX =
  /(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]\uFE0F?\u20E3)/u;

const graphemeSegmenter =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

export const TWEMOJI_CDN_BASE = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${TWEMOJI_VERSION}/assets/${TWEMOJI_ASSET_SIZE}`;

export function normalizeTwemojiAssetBase(baseUrl = TWEMOJI_CDN_BASE) {
  return String(baseUrl || TWEMOJI_CDN_BASE).replace(/\/+$/, '');
}

export function splitIntoGraphemes(text) {
  const normalizedText = String(text ?? '');

  if (!normalizedText) {
    return [];
  }

  if (graphemeSegmenter) {
    return Array.from(graphemeSegmenter.segment(normalizedText), segment => segment.segment);
  }

  return Array.from(normalizedText);
}

export function containsEmojiCluster(text) {
  return EMOJI_CLUSTER_REGEX.test(String(text ?? ''));
}

function shouldKeepCodePoint(codePoint, codePoints, index) {
  if (codePoint !== VARIATION_SELECTOR_16) {
    return true;
  }

  const previousCodePoint = codePoints[index - 1];
  const nextCodePoint = codePoints[index + 1];

  return (
    previousCodePoint === ZERO_WIDTH_JOINER ||
    nextCodePoint === ZERO_WIDTH_JOINER ||
    nextCodePoint === KEYCAP_COMBINING_MARK
  );
}

export function toTwemojiCodePoint(value) {
  const codePoints = Array.from(String(value ?? ''), char => char.codePointAt(0)).filter(
    codePoint => Number.isFinite(codePoint)
  );

  return codePoints
    .filter((codePoint, index) => shouldKeepCodePoint(codePoint, codePoints, index))
    .map(codePoint => codePoint.toString(16))
    .join('-');
}

export function getTwemojiAssetUrl(value, baseUrl = TWEMOJI_CDN_BASE) {
  const codePoint = toTwemojiCodePoint(value);

  if (!codePoint) {
    return '';
  }

  return `${normalizeTwemojiAssetBase(baseUrl)}/${codePoint}.png`;
}

export function splitTextIntoTwemojiParts(text) {
  const graphemes = splitIntoGraphemes(text);
  const parts = [];
  let textBuffer = '';

  graphemes.forEach(grapheme => {
    if (containsEmojiCluster(grapheme)) {
      if (textBuffer) {
        parts.push({
          type: 'text',
          value: textBuffer,
        });
        textBuffer = '';
      }

      parts.push({
        type: 'emoji',
        value: grapheme,
        url: getTwemojiAssetUrl(grapheme),
      });
      return;
    }

    textBuffer += grapheme;
  });

  if (textBuffer) {
    parts.push({
      type: 'text',
      value: textBuffer,
    });
  }

  return parts;
}

export function countDisplayCharacters(text) {
  return splitIntoGraphemes(text).length;
}
