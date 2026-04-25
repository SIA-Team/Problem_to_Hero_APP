function clampSelectionValue(value, textLength) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return textLength;
  }

  return Math.max(0, Math.min(numericValue, textLength));
}

export function insertTextAtSelection(text, selection, insertedText) {
  const safeText = String(text ?? '');
  const safeInsertedText = String(insertedText ?? '');
  const textLength = safeText.length;
  const start = clampSelectionValue(selection?.start, textLength);
  const end = clampSelectionValue(selection?.end, textLength);
  const selectionStart = Math.min(start, end);
  const selectionEnd = Math.max(start, end);
  const nextText =
    safeText.slice(0, selectionStart) + safeInsertedText + safeText.slice(selectionEnd);
  const nextCursor = selectionStart + safeInsertedText.length;

  return {
    nextText,
    nextSelection: {
      start: nextCursor,
      end: nextCursor,
    },
  };
}
