import { useEffect, useMemo, useState } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';
import userApi from '../services/api/userApi';
import {
  mergeLocalInviteUsers,
  normalizePublicUserSearchResponse,
} from '../utils/localInviteUsers';
import {
  DEFAULT_MENTION_PANEL_BASE_OFFSET,
  MENTION_TRAY_DEFAULT_ROWS,
  MENTION_TRAY_HEADER_HEIGHT,
  MENTION_TRAY_ITEM_HEIGHT,
  MENTION_TRAY_SEARCH_ROWS,
  MENTION_TRAY_STATUS_HEIGHT,
  buildMentionTextParts,
  DEFAULT_MENTION_KEYBOARD_MAX_HEIGHT,
  DEFAULT_MENTION_KEYBOARD_MIN_HEIGHT,
  DEFAULT_MENTION_KEYBOARD_VISIBLE_RATIO,
  DEFAULT_MENTION_PANEL_MAX_HEIGHT,
  DEFAULT_MENTION_SEARCH_LIMIT,
  getActiveMention,
  resolveMentionValue,
} from '../utils/mentionComposer';

export default function useMentionComposer({
  visible,
  text,
  onChangeText,
  inputRef,
  windowHeight,
  bottomInset = 12,
  recommendedUsers = [],
  currentUserId = '',
  searchLimit = DEFAULT_MENTION_SEARCH_LIMIT,
  panelBaseMaxHeight = DEFAULT_MENTION_PANEL_MAX_HEIGHT,
  baseBottomOffset = DEFAULT_MENTION_PANEL_BASE_OFFSET,
  keyboardPanelMaxHeight = DEFAULT_MENTION_KEYBOARD_MAX_HEIGHT,
  keyboardPanelMinHeight = DEFAULT_MENTION_KEYBOARD_MIN_HEIGHT,
  keyboardVisibleRatio = DEFAULT_MENTION_KEYBOARD_VISIBLE_RATIO,
  onInvalidMention = null,
}) {
  const panelAnim = useMemo(() => new Animated.Value(0), []);
  const [selection, setSelection] = useState({
    start: 0,
    end: 0,
  });
  const [mentionUsers, setMentionUsers] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [renderMentionPanel, setRenderMentionPanel] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const mentionBottomInset = Math.max(bottomInset, 12);
  const activeMention = useMemo(() => getActiveMention(text, selection), [selection, text]);
  const highlightedTextParts = useMemo(
    () => buildMentionTextParts(text, activeMention),
    [activeMention, text]
  );
  const candidateUsers = useMemo(() => {
    const sourceUsers = activeMention?.keyword ? mentionUsers : recommendedUsers;
    const normalizedCurrentUserId = String(currentUserId ?? '').trim();

    return mergeLocalInviteUsers(sourceUsers)
      .filter(user => {
        const normalizedUserId = String(user?.userId ?? user?.id ?? '').trim();

        if (!normalizedUserId) {
          return false;
        }

        if (normalizedCurrentUserId && normalizedUserId === normalizedCurrentUserId) {
          return false;
        }

        return true;
      })
      .slice(0, searchLimit);
  }, [activeMention?.keyword, currentUserId, mentionUsers, recommendedUsers, searchLimit]);
  const shouldShowMentionPanel = Boolean(visible && activeMention);
  const hasActiveKeyword = Boolean(String(activeMention?.keyword ?? '').trim());
  const visibleViewportHeight = Math.max(windowHeight - keyboardHeight, 0);
  const panelHeightLimit = isKeyboardVisible
    ? Math.max(
        keyboardPanelMinHeight,
        Math.min(keyboardPanelMaxHeight, visibleViewportHeight * keyboardVisibleRatio)
      )
    : Math.min(panelBaseMaxHeight, windowHeight * 0.44);
  const preferredVisibleRows = hasActiveKeyword
    ? MENTION_TRAY_SEARCH_ROWS
    : MENTION_TRAY_DEFAULT_ROWS;
  const trayContentHeight =
    mentionLoading || candidateUsers.length === 0
      ? MENTION_TRAY_STATUS_HEIGHT
      : Math.min(candidateUsers.length, preferredVisibleRows) * MENTION_TRAY_ITEM_HEIGHT;
  const panelMaxHeight = Math.min(
    panelHeightLimit,
    MENTION_TRAY_HEADER_HEIGHT + trayContentHeight + mentionBottomInset
  );
  const listMaxHeight = Math.max(panelMaxHeight - MENTION_TRAY_HEADER_HEIGHT - mentionBottomInset, 72);
  const panelAnimatedStyle = useMemo(
    () => ({
      opacity: panelAnim,
      transform: [
        {
          translateY: panelAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [16, 0],
          }),
        },
        {
          scale: panelAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.985, 1],
          }),
        },
      ],
    }),
    [panelAnim]
  );
  const panelBottomOffset = Math.max(baseBottomOffset, 0);

  const focusInput = () => {
    setTimeout(() => {
      inputRef?.current?.focus();
    }, 60);
  };

  const handleSelectionChange = event => {
    const nextSelection = event?.nativeEvent?.selection;

    if (!nextSelection) {
      return;
    }

    setSelection(nextSelection);
  };

  const handleMentionPress = (options = {}) => {
    const { focusInput: shouldFocusInput = true } = options || {};
    const selectionStart = Number(selection?.start);
    const selectionEnd = Number(selection?.end);
    const start = Number.isFinite(selectionStart) ? selectionStart : String(text ?? '').length;
    const end = Number.isFinite(selectionEnd) ? selectionEnd : start;

    if (
      activeMention &&
      start >= activeMention.start &&
      end <= activeMention.end
    ) {
      setSelection({
        start,
        end,
      });

      if (shouldFocusInput) {
        focusInput();
      }
      return;
    }

    const previousChar = start > 0 ? text[start - 1] : '';
    const prefix = previousChar && !/\s/.test(previousChar) ? ' @' : '@';
    const nextText = `${text.slice(0, start)}${prefix}${text.slice(end)}`;
    const nextCursor = start + prefix.length;

    onChangeText?.(nextText);
    setSelection({
      start: nextCursor,
      end: nextCursor,
    });
    if (shouldFocusInput) {
      focusInput();
    }
  };

  const handleMentionSelect = user => {
    if (!activeMention) {
      return;
    }

    const mentionValue = resolveMentionValue(user);
    if (!mentionValue) {
      onInvalidMention?.();
      return;
    }

    const mentionText = `@${mentionValue}`;
    const nextText = `${text.slice(0, activeMention.start)}${mentionText} ${text.slice(activeMention.end)}`;
    const nextCursor = activeMention.start + mentionText.length + 1;

    onChangeText?.(nextText);
    setSelection({
      start: nextCursor,
      end: nextCursor,
    });
    setMentionUsers([]);
    focusInput();
  };

  useEffect(() => {
    if (!visible) {
      setMentionUsers([]);
      setMentionLoading(false);
      setRenderMentionPanel(false);
      panelAnim.setValue(0);
      return undefined;
    }

    const cursor = String(text ?? '').length;
    setSelection({
      start: cursor,
      end: cursor,
    });

    return undefined;
  }, [panelAnim, visible]);

  useEffect(() => {
    if (!visible) {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
      return undefined;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const frameChangeEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : null;
    const syncKeyboardState = event => {
      const nextKeyboardHeight = event?.endCoordinates?.height || 0;
      const keyboardScreenY = event?.endCoordinates?.screenY ?? windowHeight;
      const overlapFromScreenY = Math.max(windowHeight - keyboardScreenY, 0);
      const resolvedKeyboardHeight = Math.max(nextKeyboardHeight, overlapFromScreenY);

      setKeyboardHeight(resolvedKeyboardHeight);
      setIsKeyboardVisible(resolvedKeyboardHeight > 0);
    };
    const resetKeyboardState = () => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    };

    const showSubscription = Keyboard.addListener(showEvent, syncKeyboardState);
    const hideSubscription = Keyboard.addListener(hideEvent, resetKeyboardState);
    const frameChangeSubscription = frameChangeEvent
      ? Keyboard.addListener(frameChangeEvent, syncKeyboardState)
      : null;

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      frameChangeSubscription?.remove();
    };
  }, [visible, windowHeight]);

  useEffect(() => {
    const normalizedKeyword = String(activeMention?.keyword ?? '').trim();

    if (!normalizedKeyword) {
      setMentionUsers([]);
      setMentionLoading(false);
      return undefined;
    }

    let isActive = true;
    const timer = setTimeout(async () => {
      try {
        setMentionLoading(true);
        const response = await userApi.searchPublicProfiles(normalizedKeyword, searchLimit);
        if (!isActive) {
          return;
        }
        setMentionUsers(normalizePublicUserSearchResponse(response));
      } catch (error) {
        if (!isActive) {
          return;
        }
        console.warn('Failed to search mention users:', error);
        setMentionUsers([]);
      } finally {
        if (isActive) {
          setMentionLoading(false);
        }
      }
    }, 250);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [activeMention?.keyword, searchLimit]);

  useEffect(() => {
    panelAnim.stopAnimation();

    if (shouldShowMentionPanel) {
      setRenderMentionPanel(true);
      Animated.timing(panelAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      return undefined;
    }

    Animated.timing(panelAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setRenderMentionPanel(false);
      }
    });

    return undefined;
  }, [panelAnim, shouldShowMentionPanel]);

  return {
    activeMention,
    candidateUsers,
    focusInput,
    handleMentionPress,
    handleMentionSelect,
    handleSelectionChange,
    highlightedTextParts,
    listMaxHeight,
    mentionBottomInset,
    panelAnimatedStyle,
    panelBottomOffset,
    panelMaxHeight,
    renderMentionPanel,
    selection,
    setSelection,
    shouldShowMentionPanel,
    mentionLoading,
  };
}
