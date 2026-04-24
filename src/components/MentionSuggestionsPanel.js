import React from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { modalTokens } from './modalTokens';
import {
  buildLocalInviteDisplayName,
  buildLocalInviteUserDescription,
} from '../utils/localInviteUsers';
import { scaleFont } from '../utils/responsive';

export default function MentionSuggestionsPanel({
  activeKeyword = '',
  animatedStyle,
  bottomInset = 12,
  bottomOffset = 0,
  emptyText = '\u6ca1\u6709\u627e\u5230\u5339\u914d\u7528\u6237\uff0c\u6362\u4e2a\u5173\u952e\u8bcd\u8bd5\u8bd5',
  headerHint = '\u70b9\u51fb\u5373\u53ef\u63d0\u53ca',
  loading = false,
  loadingText = '\u6b63\u5728\u641c\u7d22\u76f8\u5173\u7528\u6237...',
  enableBackdrop = false,
  onBackdropPress,
  onSelect,
  panelMaxHeight,
  listMaxHeight,
  showHeader = true,
  users = [],
  placement = 'overlay',
  variant = 'default',
  keyboardInlineContentPadding = 10,
  keyboardInlineItemStyle = null,
  keyboardInlineTransparentItem = false,
  keyboardInlineSeamless = false,
}) {
  const hasKeyword = Boolean(String(activeKeyword ?? '').trim());
  const isKeyboardInlineVariant = variant === 'keyboard-inline';
  const isEmbeddedPlacement = placement === 'embedded';
  const title = hasKeyword ? `\u641c\u7d22 @${activeKeyword}` : '\u63a8\u8350\u7528\u6237';
  const countText = loading ? '\u641c\u7d22\u4e2d' : `${users.length}\u4eba`;
  const avatarSize = isKeyboardInlineVariant ? 52 : 38;
  const verifiedIconSize = isKeyboardInlineVariant ? 15 : 14;
  const chevronSize = isKeyboardInlineVariant ? 18 : 16;

  const renderStatus = (iconName, text, iconColor) => (
    <View
      style={[
        styles.status,
        isKeyboardInlineVariant && styles.statusKeyboardInline,
        {
          paddingBottom: bottomInset + 12,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={modalTokens.danger} />
      ) : (
        <Ionicons name={iconName} size={18} color={iconColor} />
      )}
      <Text style={styles.statusTitle}>
        {loading ? '\u6b63\u5728\u67e5\u627e\u53ef\u63d0\u53ca\u7684\u7528\u6237' : emptyText}
      </Text>
      {!loading ? <Text style={styles.statusHint}>{headerHint}</Text> : null}
      {loading ? <Text style={styles.statusHint}>{loadingText}</Text> : null}
    </View>
  );

  return (
    <View
      pointerEvents={isEmbeddedPlacement ? 'auto' : 'box-none'}
      style={[styles.layer, isEmbeddedPlacement && styles.layerEmbedded]}
    >
      {enableBackdrop ? <Pressable style={styles.backdrop} onPress={onBackdropPress} /> : null}

      <Animated.View
        style={[
          styles.overlay,
          isEmbeddedPlacement && styles.overlayEmbedded,
          isKeyboardInlineVariant && styles.overlayKeyboardInline,
          isKeyboardInlineVariant && keyboardInlineSeamless && styles.overlayKeyboardInlineSeamless,
          isEmbeddedPlacement && isKeyboardInlineVariant && styles.overlayKeyboardInlineEmbedded,
          animatedStyle,
          isEmbeddedPlacement
            ? {
                maxHeight: panelMaxHeight,
              }
            : {
                bottom: Math.max(Number(bottomOffset) || 0, 0),
                maxHeight: panelMaxHeight,
              },
        ]}
      >
        {showHeader ? (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons
                name={hasKeyword ? 'search-outline' : 'at-outline'}
                size={16}
                color="#64748b"
              />
              <Text style={styles.headerText} numberOfLines={1}>
                {title}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.headerHint}>{headerHint}</Text>
              <Text style={styles.headerCountText}>{countText}</Text>
            </View>
          </View>
        ) : null}

        {loading ? (
          renderStatus('search-outline', loadingText, modalTokens.primary)
        ) : users.length > 0 ? (
          <FlatList
            data={users}
            keyExtractor={(item, index) =>
              String(item?.id ?? item?.userId ?? `${buildLocalInviteDisplayName(item)}-${index}`)
            }
            horizontal={isKeyboardInlineVariant}
            style={[
              styles.list,
              isKeyboardInlineVariant && styles.listKeyboardInline,
              {
                maxHeight: listMaxHeight,
              },
            ]}
            contentContainerStyle={{
              paddingTop: isKeyboardInlineVariant ? 12 : 0,
              paddingBottom: isKeyboardInlineVariant ? 12 : bottomInset,
              paddingHorizontal: isKeyboardInlineVariant ? keyboardInlineContentPadding : 0,
            }}
            scrollEnabled
            nestedScrollEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            renderItem={({ item: user, index }) => {
              const displayName = buildLocalInviteDisplayName(user);
              const description = buildLocalInviteUserDescription(user);
              const username = String(user?.username ?? '').trim().replace(/^@+/, '');
              const secondaryText = [username ? `@${username}` : '', description]
                .filter(Boolean)
                .join(' \u00b7 ');

              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.item,
                    isKeyboardInlineVariant && styles.itemKeyboardInline,
                    isKeyboardInlineVariant &&
                      keyboardInlineTransparentItem &&
                      styles.itemKeyboardInlineTransparent,
                    isKeyboardInlineVariant && keyboardInlineItemStyle,
                    index > 0 && !isKeyboardInlineVariant && styles.itemBorder,
                    index > 0 && isKeyboardInlineVariant && styles.itemKeyboardInlineSpacing,
                    pressed && styles.itemPressed,
                  ]}
                  android_ripple={{
                    color: 'rgba(37, 99, 235, 0.06)',
                  }}
                  onPress={() => onSelect?.(user)}
                >
                  {({ pressed }) => (
                    <>
                      <Avatar uri={user.avatar} name={displayName} size={avatarSize} />
                      <View style={[styles.meta, isKeyboardInlineVariant && styles.metaKeyboardInline]}>
                        <View style={styles.nameRow}>
                          <Text
                            style={[styles.name, isKeyboardInlineVariant && styles.nameKeyboardInline]}
                            numberOfLines={1}
                          >
                            {displayName}
                          </Text>
                          {Number(user?.verified || 0) > 0 ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={verifiedIconSize}
                              color="#3b82f6"
                            />
                          ) : null}
                        </View>
                        {!isKeyboardInlineVariant ? (
                          <Text
                            style={[styles.desc, isKeyboardInlineVariant && styles.descKeyboardInline]}
                            numberOfLines={1}
                          >
                            {secondaryText ||
                              '\u9009\u62e9\u540e\u5c06\u63d2\u5165\u5230\u5f53\u524d\u5149\u6807\u4f4d\u7f6e'}
                          </Text>
                        ) : null}
                      </View>
                      {!isKeyboardInlineVariant ? (
                        <Ionicons
                          name="chevron-forward"
                          size={chevronSize}
                          color={pressed ? modalTokens.primary : '#9aa4b2'}
                        />
                      ) : null}
                    </>
                  )}
                </Pressable>
              );
            }}
          />
        ) : (
          renderStatus('person-outline', emptyText, modalTokens.textMuted)
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  layerEmbedded: {
    position: 'relative',
    top: 'auto',
    right: 'auto',
    bottom: 'auto',
    left: 'auto',
    zIndex: 0,
  },
  backdrop: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderTopColor: '#e8edf3',
    zIndex: 20,
  },
  overlayEmbedded: {
    position: 'relative',
    left: 'auto',
    right: 'auto',
    bottom: 'auto',
    zIndex: 0,
  },
  overlayKeyboardInline: {
    left: 12,
    right: 12,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopWidth: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: -6,
    },
    elevation: 10,
  },
  overlayKeyboardInlineSeamless: {
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopWidth: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 0,
  },
  overlayKeyboardInlineEmbedded: {
    left: 'auto',
    right: 'auto',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 0,
    marginBottom: 14,
  },
  header: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8edf3',
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  headerText: {
    marginLeft: 8,
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  headerRight: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  headerHint: {
    fontSize: scaleFont(11),
    color: modalTokens.textMuted,
  },
  headerCountText: {
    marginTop: 2,
    fontSize: scaleFont(11),
    color: modalTokens.textSecondary,
    fontWeight: '500',
  },
  list: {
    maxHeight: 320,
    backgroundColor: '#ffffff',
  },
  listKeyboardInline: {
    borderRadius: 0,
    maxHeight: 118,
    backgroundColor: 'transparent',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 66,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  itemKeyboardInline: {
    width: 78,
    minHeight: 96,
    paddingHorizontal: 4,
    paddingVertical: 4,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderRadius: 16,
  },
  itemKeyboardInlineTransparent: {
    backgroundColor: 'transparent',
  },
  itemKeyboardInlineSpacing: {
    marginLeft: 8,
  },
  itemBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eef2f6',
  },
  itemPressed: {
    backgroundColor: '#f8fbff',
  },
  meta: {
    flex: 1,
    marginLeft: 10,
    marginRight: 10,
    minWidth: 0,
  },
  metaKeyboardInline: {
    width: '100%',
    marginLeft: 0,
    marginRight: 0,
    marginTop: 8,
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  name: {
    flexShrink: 1,
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: modalTokens.textPrimary,
  },
  nameKeyboardInline: {
    maxWidth: 60,
    fontSize: scaleFont(12),
    fontWeight: '500',
    textAlign: 'center',
  },
  desc: {
    marginTop: 4,
    fontSize: scaleFont(12),
    color: modalTokens.textSecondary,
    lineHeight: scaleFont(16),
  },
  status: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 22,
    backgroundColor: '#ffffff',
  },
  statusKeyboardInline: {
    minHeight: 96,
  },
  statusTitle: {
    marginTop: 10,
    fontSize: scaleFont(13),
    color: modalTokens.textPrimary,
    fontWeight: '500',
    textAlign: 'center',
  },
  statusHint: {
    marginTop: 6,
    fontSize: scaleFont(12),
    color: modalTokens.textSecondary,
    textAlign: 'center',
    lineHeight: scaleFont(18),
  },
});
