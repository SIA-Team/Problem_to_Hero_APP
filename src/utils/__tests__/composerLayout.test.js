import {
  DEFAULT_ANDROID_FOOTER_CLEARANCE,
  DEFAULT_COMPOSER_INPUT_SCROLL_MARGIN,
  DEFAULT_COMPOSER_KEYBOARD_SCROLL_BUFFER,
  resolveComposerFooterPadding,
  resolveComposerInputScrollTarget,
  resolveComposerKeyboardMetrics,
  resolveComposerScrollPadding,
  resolveComposerTopInset,
} from '../composerLayout';

describe('composerLayout', () => {
  it('prefers the launch safe-area top inset on iOS when runtime inset is missing', () => {
    expect(
      resolveComposerTopInset({
        platform: 'ios',
        topInset: 0,
        initialTopInset: 47,
      })
    ).toBe(47);
  });

  it('keeps Android top inset at least as large as the status bar height', () => {
    expect(
      resolveComposerTopInset({
        platform: 'android',
        topInset: 0,
        initialTopInset: 0,
        statusBarHeight: 24,
      })
    ).toBe(24);
  });

  it('lifts the iOS footer by the full keyboard height so the toolbar clears the keyboard', () => {
    expect(
      resolveComposerKeyboardMetrics({
        platform: 'ios',
        windowHeight: 844,
        keyboardHeight: 336,
        keyboardScreenY: 508,
        footerBottomInset: 34,
      })
    ).toEqual({
      effectiveKeyboardHeight: 336,
      footerOffset: 336,
      overlayOffset: 336,
    });
  });

  it('adds an Android clearance so the footer never sits on the keyboard edge', () => {
    expect(
      resolveComposerKeyboardMetrics({
        platform: 'android',
        windowHeight: 800,
        keyboardHeight: 280,
        keyboardScreenY: 520,
        footerBottomInset: 16,
      })
    ).toEqual({
      effectiveKeyboardHeight: 280,
      footerOffset: 280 + DEFAULT_ANDROID_FOOTER_CLEARANCE,
      overlayOffset: 280,
    });
  });

  it('drops footer bottom padding while the keyboard is visible without going negative', () => {
    expect(
      resolveComposerFooterPadding({
        footerPaddingBottom: 42,
        footerBottomInset: 34,
        keyboardOffset: 100,
      })
    ).toBe(8);

    expect(
      resolveComposerFooterPadding({
        footerPaddingBottom: 20,
        footerBottomInset: 34,
        keyboardOffset: 100,
      })
    ).toBe(0);
  });

  it('adds extra scroll room while the keyboard is visible so footer tools do not trap identity options', () => {
    expect(
      resolveComposerScrollPadding({
        basePaddingBottom: 24,
        keyboardVisible: false,
      })
    ).toBe(24);

    expect(
      resolveComposerScrollPadding({
        basePaddingBottom: 24,
        keyboardVisible: true,
      })
    ).toBe(24 + DEFAULT_COMPOSER_KEYBOARD_SCROLL_BUFFER);
  });

  it('keeps the composer input near the top of the viewport when typing resumes after scrolling', () => {
    expect(
      resolveComposerInputScrollTarget({
        inputTop: 180,
      })
    ).toBe(180 - DEFAULT_COMPOSER_INPUT_SCROLL_MARGIN);

    expect(
      resolveComposerInputScrollTarget({
        inputTop: 8,
      })
    ).toBe(0);
  });
});
