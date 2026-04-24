import React from 'react';
import { Keyboard } from 'react-native';
import { resolveComposerInputScrollTarget } from '../utils/composerLayout';

export default function useComposerScrollManager({
  visible,
  keyboardVisible,
  inputTop,
  runToolbarAction,
  revealOffset = 0,
}) {
  const [pendingToolbarAction, setPendingToolbarAction] = React.useState(null);
  const scrollViewRef = React.useRef(null);
  const inputFocusedRef = React.useRef(false);
  const pendingScrollFrameRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (pendingScrollFrameRef.current) {
        cancelAnimationFrame(pendingScrollFrameRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (visible && keyboardVisible && inputFocusedRef.current) {
      if (pendingScrollFrameRef.current) {
        cancelAnimationFrame(pendingScrollFrameRef.current);
      }

      pendingScrollFrameRef.current = requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({
          y: resolveComposerInputScrollTarget({
            inputTop,
            revealOffset,
          }),
          animated: true,
        });
      });
    }
  }, [inputTop, keyboardVisible, revealOffset, visible]);

  React.useEffect(() => {
    if (!visible) {
      setPendingToolbarAction(null);
      inputFocusedRef.current = false;
    }
  }, [visible]);

  React.useEffect(() => {
    if (!visible || !pendingToolbarAction) {
      return undefined;
    }

    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      runToolbarAction(pendingToolbarAction);
      setPendingToolbarAction(null);
    });

    return () => {
      hideSubscription.remove();
    };
  }, [pendingToolbarAction, runToolbarAction, visible]);

  const scrollToInput = React.useCallback((animated = true) => {
    if (!visible) {
      return;
    }

    if (pendingScrollFrameRef.current) {
      cancelAnimationFrame(pendingScrollFrameRef.current);
    }

    pendingScrollFrameRef.current = requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({
          y: resolveComposerInputScrollTarget({
            inputTop,
            revealOffset,
          }),
          animated,
        });
      });
  }, [inputTop, revealOffset, visible]);

  const handleInputFocus = React.useCallback(() => {
    inputFocusedRef.current = true;
    scrollToInput(true);
  }, [scrollToInput]);

  const handleInputBlur = React.useCallback(() => {
    inputFocusedRef.current = false;
  }, []);

  const dismissComposerKeyboard = React.useCallback(() => {
    inputFocusedRef.current = false;
    Keyboard.dismiss();
  }, []);

  const triggerToolbarAction = React.useCallback((action) => {
    if (keyboardVisible) {
      setPendingToolbarAction(action);
      dismissComposerKeyboard();
      return;
    }

    dismissComposerKeyboard();
    runToolbarAction(action);
  }, [dismissComposerKeyboard, keyboardVisible, runToolbarAction]);

  return {
    pendingToolbarAction,
    scrollViewRef,
    inputFocusedRef,
    scrollToInput,
    handleInputFocus,
    handleInputBlur,
    dismissComposerKeyboard,
    triggerToolbarAction,
  };
}
