import React from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useBottomSafeInset from '../hooks/useBottomSafeInset';
import { modalTokens } from './modalTokens';
import { scaleFont } from '../utils/responsive';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const EMOJI_GROUPS = [
  {
    key: 'smileys',
    icon: '😀',
    title: 'Smileys',
    items: [
      '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆',
      '😉', '😊', '🙂', '🙃', '😍', '🥰', '😘', '😗',
      '😋', '😛', '😜', '🤪', '😎', '🤩', '🥳', '🤗',
      '🤔', '🫠', '🥹', '😭', '😤', '😡', '😴', '🤐',
    ],
  },
  {
    key: 'people',
    icon: '🙌',
    title: 'People',
    items: [
      '👍', '👎', '👏', '🙌', '👐', '👋', '🤝', '🙏',
      '💪', '🫶', '🤞', '👌', '✌️', '🤟', '🤘', '👊',
      '✊', '🤛', '🤜', '☝️', '👇', '👀', '🙈', '🙉',
      '🙊', '🫡', '🙋', '💁', '🙆', '🙇', '🤦', '🤷',
    ],
  },
  {
    key: 'nature',
    icon: '🌱',
    title: 'Nature',
    items: [
      '🌱', '🌿', '☘️', '🍀', '🌵', '🌸', '🌷', '🌹',
      '🌺', '🌻', '🌞', '🌝', '⭐', '✨', '⚡', '🔥',
      '🌈', '☔', '❄️', '🌊', '🌍', '🌙', '🐶', '🐱',
      '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🦄', '🦋',
    ],
  },
  {
    key: 'food',
    icon: '🍎',
    title: 'Food',
    items: [
      '🍎', '🍐', '🍊', '🍋', '🍉', '🍇', '🍓', '🫐',
      '🍒', '🍑', '🥭', '🍍', '🥥', '🥑', '🍅', '🥕',
      '🍕', '🍔', '🍟', '🌭', '🍿', '🍜', '🍣', '🍤',
      '🍩', '🍪', '🍫', '🍰', '🎂', '☕', '🍵', '🧃',
    ],
  },
  {
    key: 'activity',
    icon: '⚽',
    title: 'Activity',
    items: [
      '⚽', '🏀', '🏐', '🎾', '🏸', '🥊', '🏓', '🎯',
      '🎮', '🕹️', '🎲', '🧩', '🎵', '🎧', '🎸', '🎹',
      '🎉', '🎊', '🎁', '🏆', '🥇', '🚀', '✈️', '📚',
      '💡', '💻', '📱', '📷', '🎬', '🧠', '💯', '✅',
    ],
  },
  {
    key: 'symbols',
    icon: '❤️',
    title: 'Symbols',
    items: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '🤎', '💔', '💕', '💖', '💗', '💘', '💝', '💞',
      '♻️', '⚠️', '❗', '❓', '‼️', '⁉️', '✅', '☑️',
      '❌', '⭕', '🔔', '💬', '🕒', '📌', '🔒', '⭐',
    ],
  },
];

function TwemojiOption({ emoji, onPress }) {
  return (
    <TouchableOpacity style={styles.emojiOption} onPress={() => onPress?.(emoji)} activeOpacity={0.72}>
      <Text style={styles.emojiGlyph}>{emoji}</Text>
    </TouchableOpacity>
  );
}

export default function TwemojiPickerSheet({
  visible,
  onClose,
  onEmojiSelected,
  title = 'Insert Emoji',
  renderInPlace = false,
}) {
  const bottomSafeInset = useBottomSafeInset(20);
  const hiddenTranslateY = renderInPlace ? 56 : SCREEN_HEIGHT;
  const [slideAnim] = React.useState(new Animated.Value(hiddenTranslateY));
  const [backdropAnim] = React.useState(new Animated.Value(0));
  const [activeGroupKey, setActiveGroupKey] = React.useState(EMOJI_GROUPS[0].key);

  React.useEffect(() => {
    if (visible) {
      slideAnim.setValue(hiddenTranslateY);
      backdropAnim.setValue(0);

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: renderInPlace ? 160 : 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: renderInPlace ? 180 : 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(hiddenTranslateY);
      backdropAnim.setValue(0);
    }
  }, [backdropAnim, hiddenTranslateY, renderInPlace, slideAnim, visible]);

  const activeGroup =
    EMOJI_GROUPS.find(group => group.key === activeGroupKey) || EMOJI_GROUPS[0];

  const handleClose = React.useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: renderInPlace ? 140 : 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: hiddenTranslateY,
        duration: renderInPlace ? 160 : 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  }, [backdropAnim, hiddenTranslateY, onClose, renderInPlace, slideAnim]);

  const handleSelectEmoji = React.useCallback(
    emoji => {
      onEmojiSelected?.(emoji);
      handleClose();
    },
    [handleClose, onEmojiSelected]
  );

  if (!visible) {
    return null;
  }

  const sheetContent = (
    <View style={[styles.overlay, renderInPlace && styles.inlineOverlay]}>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          {
            opacity: backdropAnim,
          },
        ]}
      />
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: bottomSafeInset,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.dragIndicator} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={20} color={modalTokens.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroller}
          contentContainerStyle={styles.tabBar}
        >
          {EMOJI_GROUPS.map(group => (
            <TouchableOpacity
              key={group.key}
              style={[
                styles.tabButton,
                activeGroup.key === group.key && styles.tabButtonActive,
              ]}
              onPress={() => setActiveGroupKey(group.key)}
              accessibilityRole="button"
              accessibilityLabel={group.title}
            >
              <Text style={styles.tabGlyph}>{group.icon}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          style={styles.emojiList}
          contentContainerStyle={styles.emojiGrid}
          showsVerticalScrollIndicator={false}
        >
          {activeGroup.items.map(emoji => (
            <TwemojiOption key={`${activeGroup.key}-${emoji}`} emoji={emoji} onPress={handleSelectEmoji} />
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );

  if (renderInPlace) {
    return sheetContent;
  }

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {sheetContent}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 80,
  },
  inlineOverlay: {
    zIndex: 120,
  },
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    minHeight: 340,
    maxHeight: SCREEN_HEIGHT * 0.62,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  dragIndicator: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d1d5db',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: scaleFont(16),
    fontWeight: '700',
    color: modalTokens.textPrimary,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  tabBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  tabScroller: {
    maxHeight: 76,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    flexShrink: 0,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  tabButtonActive: {
    backgroundColor: '#fee2e2',
  },
  tabGlyph: {
    fontSize: scaleFont(18),
    lineHeight: scaleFont(22),
  },
  emojiList: {
    flex: 1,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 6,
  },
  emojiOption: {
    width: '12.8%',
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  emojiGlyph: {
    fontSize: scaleFont(24),
    lineHeight: scaleFont(30),
  },
});
