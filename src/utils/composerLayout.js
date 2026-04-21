export const DEFAULT_ANDROID_FOOTER_CLEARANCE = 12;
export const DEFAULT_COMPOSER_SCROLL_PADDING = 24;
export const DEFAULT_COMPOSER_KEYBOARD_SCROLL_BUFFER = 104;
export const DEFAULT_COMPOSER_INPUT_SCROLL_MARGIN = 20;

export function resolveComposerTopInset({
  platform = 'ios',
  topInset = 0,
  initialTopInset = 0,
  statusBarHeight = 0,
} = {}) {
  if (platform === 'android') {
    return Math.max(topInset, initialTopInset, statusBarHeight, 0);
  }

  return Math.max(topInset, initialTopInset, 0);
}

export function resolveComposerKeyboardMetrics({
  platform = 'ios',
  windowHeight = 0,
  keyboardHeight = 0,
  keyboardScreenY = windowHeight,
  footerBottomInset = 0,
  androidFooterClearance = DEFAULT_ANDROID_FOOTER_CLEARANCE,
} = {}) {
  const overlapFromScreenY = Math.max(windowHeight - keyboardScreenY, 0);
  const effectiveKeyboardHeight = Math.max(keyboardHeight, overlapFromScreenY);

  if (platform === 'ios') {
    const offset = Math.max(effectiveKeyboardHeight, 0);

    return {
      effectiveKeyboardHeight,
      footerOffset: offset,
      overlayOffset: offset,
    };
  }

  return {
    effectiveKeyboardHeight,
    footerOffset: Math.max(effectiveKeyboardHeight + androidFooterClearance, 0),
    overlayOffset: Math.max(effectiveKeyboardHeight, 0),
  };
}

export function resolveComposerFooterPadding({
  footerPaddingBottom = 0,
  footerBottomInset = 0,
  keyboardOffset = 0,
} = {}) {
  if (keyboardOffset <= 0) {
    return footerPaddingBottom;
  }

  return Math.max(footerPaddingBottom - footerBottomInset, 0);
}

export function resolveComposerScrollPadding({
  basePaddingBottom = DEFAULT_COMPOSER_SCROLL_PADDING,
  keyboardVisible = false,
  keyboardScrollBuffer = DEFAULT_COMPOSER_KEYBOARD_SCROLL_BUFFER,
} = {}) {
  return keyboardVisible
    ? basePaddingBottom + keyboardScrollBuffer
    : basePaddingBottom;
}

export function resolveComposerInputScrollTarget({
  inputTop = 0,
  marginTop = DEFAULT_COMPOSER_INPUT_SCROLL_MARGIN,
} = {}) {
  return Math.max(inputTop - marginTop, 0);
}
